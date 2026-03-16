/**
 * 执行日志系统 - 结构化记录 Agent 的所有决策和输出
 *
 * 用于改进系统可观测性 (Observability)，便于调试和审计
 * - 每个 Agent 执行记录完整上下文
 * - 支持追溯关键决策点
 * - 用于后续分析 Agent 行为
 */

/**
 * 单个 Agent 执行记录
 */
export interface ExecutionLogEntry {
  id: string                        // 日志唯一ID (UUID)
  timestamp: string                 // ISO 8601
  sessionId: string
  agentName: string
  taskId?: string

  // 输入信息
  input: {
    prompt?: string
    data?: Record<string, unknown>
  }

  // 执行过程
  decision?: {
    type: string                     // 决策类型：validate/modify/escalate/approve/reject
    rationale?: string               // 为什么做这个决策
    alternatives?: string[]          // 考虑过的其他选项
  }

  // 输出信息
  output?: {
    type: string                     // JSON/TEXT/ERROR
    status: "success" | "failure" | "partial"
    data?: unknown                   // 实际输出数据
    error?: string                   // 如果失败，错误信息
  }

  // 性能信息
  duration_ms: number                // 执行时间
  tokens_used?: number               // 如果适用

  // 追溯信息
  depends_on?: string[]              // 依赖的前置记录 IDs
  blocked_by?: string[]              // 被什么阻止了（如果适用）
}

/**
 * 执行日志集合 - 按 sessionId 分组存储
 */
const executionLogs = new Map<string, ExecutionLogEntry[]>()

/**
 * 生成日志 ID
 */
function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 记录 Agent 执行
 */
export function logAgentExecution(
  sessionId: string,
  entry: Omit<ExecutionLogEntry, "id" | "timestamp">
): void {
  const logEntry: ExecutionLogEntry = {
    ...entry,
    id: generateLogId(),
    timestamp: new Date().toISOString()
  }

  if (!executionLogs.has(sessionId)) {
    executionLogs.set(sessionId, [])
  }

  executionLogs.get(sessionId)!.push(logEntry)
}

/**
 * 获取 Agent 的执行历史
 */
export function getAgentExecutionHistory(
  sessionId: string,
  agentName: string
): ExecutionLogEntry[] {
  const logs = executionLogs.get(sessionId) || []
  return logs.filter(log => log.agentName === agentName)
}

/**
 * 获取完整的执行日志（用于调试）
 */
export function getFullExecutionLog(sessionId: string): ExecutionLogEntry[] {
  return executionLogs.get(sessionId) || []
}

/**
 * 生成执行日志报告
 */
export function generateExecutionReport(sessionId: string): string {
  const logs = executionLogs.get(sessionId) || []

  if (logs.length === 0) {
    return "No execution logs found"
  }

  const report: string[] = [
    `# Execution Log Report`,
    `Session: ${sessionId}`,
    `Total Entries: ${logs.length}`,
    ``,
    `## Timeline`,
    ...logs.map(log => {
      const agent = log.agentName.padEnd(12)
      const status = log.output?.status || "unknown"
      const duration = `${log.duration_ms}ms`
      return `${log.timestamp} | ${agent} | ${status.padEnd(8)} | ${duration.padStart(8)} | ${log.output?.data ? "✓" : "–"}`
    }),
    ``,
    `## Decision Trace`,
    ...logs
      .filter(log => log.decision)
      .map(log => `${log.agentName} (${log.taskId}): ${log.decision?.type} — ${log.decision?.rationale || "—"}`),
    ``,
    `## Errors`,
    ...logs
      .filter(log => log.output?.error)
      .map(log => `${log.agentName}: ${log.output?.error}`)
  ]

  return report.join("\n")
}

/**
 * 追溯单个决策的完整上下文
 */
export function traceDecisionContext(sessionId: string, logId: string): ExecutionLogEntry[] {
  const logs = executionLogs.get(sessionId) || []
  const targetLog = logs.find(log => log.id === logId)

  if (!targetLog) {
    return []
  }

  // 构建依赖链
  const context: ExecutionLogEntry[] = [targetLog]
  const visited = new Set<string>([logId])
  const queue = [...(targetLog.depends_on || [])]

  while (queue.length > 0) {
    const depId = queue.shift()!

    if (visited.has(depId)) continue
    visited.add(depId)

    const depLog = logs.find(log => log.id === depId)
    if (depLog) {
      context.push(depLog)
      queue.push(...(depLog.depends_on || []))
    }
  }

  return context.reverse()
}

/**
 * 分析 Agent 的决策模式
 */
export function analyzeAgentBehavior(sessionId: string, agentName: string) {
  const logs = getAgentExecutionHistory(sessionId, agentName)

  const decisions = logs
    .filter(log => log.decision)
    .map(log => log.decision!.type)

  const decisionCounts = decisions.reduce((acc, decision) => {
    acc[decision] = (acc[decision] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const successRate = logs.filter(log => log.output?.status === "success").length / logs.length
  const avgDuration = logs.reduce((sum, log) => sum + log.duration_ms, 0) / logs.length

  return {
    totalExecutions: logs.length,
    decisionDistribution: decisionCounts,
    successRate: (successRate * 100).toFixed(1) + "%",
    averageDuration_ms: Math.round(avgDuration),
    errors: logs.filter(log => log.output?.error).length
  }
}

/**
 * 清空日志（通常用于 session 清理）
 */
export function clearExecutionLogs(sessionId: string): void {
  executionLogs.delete(sessionId)
}

/**
 * 获取内存使用统计
 */
export function getLogMemoryStats() {
  let totalEntries = 0
  for (const entries of executionLogs.values()) {
    totalEntries += entries.length
  }

  return {
    sessions: executionLogs.size,
    totalEntries,
    averageEntriesPerSession: totalEntries / executionLogs.size || 0
  }
}
