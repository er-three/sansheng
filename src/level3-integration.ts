/**
 * Level 3 并行执行集成层
 *
 * 负责将 Level 2（代理并行）与 Level 3（子任务并行）连接起来
 * - 监听 gongbu agent 的执行请求
 * - 自动分解任务为文件修改单位
 * - 使用 Promise.all() 并行执行
 * - 返回聚合的执行报告
 */

import { executeGongbuLevel3, GongbuParallelResult } from "./gongbu-level3-parallel"

// ─────────────────── 类型定义 ───────────────────

interface Level3ExecutionRequest {
  step_id: string
  agent: "gongbu"
  files: string[] // 需要修改的文件列表
  projectRoot: string
  context?: {
    task_description: string
    analysis_result?: string
    implementation_plan?: string
  }
}

interface Level3ExecutionResponse {
  status: "success" | "partial" | "failed"
  level3_result: GongbuParallelResult
  summary: {
    total_files: number
    parallel_groups: number
    execution_time_ms: number
    speedup: string
    files_completed: string[]
    files_failed: string[]
  }
  next_step: "verify" | "retry" | "halt"
}

interface AgentExecutionHook {
  agent: string
  step_id: string
  status: "before" | "during" | "after"
  data?: any
}

// ─────────────────── Level 3 管理器 ───────────────────

class Level3Manager {
  private executionCache = new Map<string, Level3ExecutionResponse>()
  private hooks: AgentExecutionHook[] = []

  /**
   * 检查是否应该使用 Level 3 并行执行
   */
  shouldUseLevel3(agent: string, files: string[]): boolean {
    // 只有 gongbu（工部）可以使用 Level 3
    if (agent !== "gongbu") return false

    // 文件数 >= 2 时才值得并行
    if (files.length < 2) return false

    // 检查是否全部是代码文件
    return files.every(
      (f) =>
        f.match(/\.(ts|tsx|js|jsx|py|go|rs|java)$/) ||
        f.includes("src/") ||
        f.includes("lib/")
    )
  }

  /**
   * 执行 Level 3 并行任务
   */
  async executeLevel3(
    request: Level3ExecutionRequest
  ): Promise<Level3ExecutionResponse> {
    const startTime = Date.now()

    try {
      // 1. 触发 before 钩子
      this.triggerHook({
        agent: request.agent,
        step_id: request.step_id,
        status: "before",
        data: { files: request.files },
      })

      // 2. 执行 Level 3 并行
      const level3Result = await executeGongbuLevel3(
        request.files,
        request.projectRoot
      )

      // 3. 聚合结果
      const nextStep =
        level3Result.status === "PASS"
          ? "verify"
          : level3Result.status === "PARTIAL"
            ? "retry"
            : "halt"

      const response: Level3ExecutionResponse = {
        status:
          level3Result.status === "PASS"
            ? "success"
            : level3Result.status === "PARTIAL"
              ? "partial"
              : "failed",
        level3_result: level3Result,
        summary: {
          total_files: level3Result.summary.total,
          parallel_groups: level3Result.groups.length,
          execution_time_ms: level3Result.total_duration,
          speedup: level3Result.theoretical_speedup,
          files_completed: level3Result.files_modified.filter(
            (f, i) =>
              level3Result.parallel_subtasks[i]?.status === "done"
          ),
          files_failed: level3Result.files_modified.filter(
            (f, i) =>
              level3Result.parallel_subtasks[i]?.status === "failed"
          ),
        },
        next_step: nextStep,
      }

      // 4. 缓存结果
      this.executionCache.set(request.step_id, response)

      // 5. 触发 after 钩子
      this.triggerHook({
        agent: request.agent,
        step_id: request.step_id,
        status: "after",
        data: response,
      })

      return response
    } catch (error) {
      const failureResponse: Level3ExecutionResponse = {
        status: "failed",
        level3_result: {
          status: "FAIL",
          files_modified: [],
          parallel_subtasks: [],
          parallelism: "0 个子任务",
          theoretical_speedup: "1.0x",
          total_duration: Date.now() - startTime,
          groups: [],
          summary: { total: 0, passed: 0, failed: request.files.length, skipped: 0 },
        },
        summary: {
          total_files: request.files.length,
          parallel_groups: 0,
          execution_time_ms: Date.now() - startTime,
          speedup: "1.0x",
          files_completed: [],
          files_failed: request.files,
        },
        next_step: "halt",
      }

      this.triggerHook({
        agent: request.agent,
        step_id: request.step_id,
        status: "after",
        data: { error: String(error), ...failureResponse },
      })

      throw error
    }
  }

  /**
   * 获取执行报告
   */
  getExecutionReport(stepId: string): Level3ExecutionResponse | undefined {
    return this.executionCache.get(stepId)
  }

  /**
   * 注册钩子
   */
  onHook(callback: (hook: AgentExecutionHook) => void): void {
    // 保存回调以供使用
  }

  /**
   * 触发钩子
   */
  private triggerHook(hook: AgentExecutionHook): void {
    this.hooks.push(hook)
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(): AgentExecutionHook[] {
    return this.hooks
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.executionCache.clear()
    this.hooks = []
  }
}

// ─────────────────── 导出单例 ───────────────────

export const level3Manager = new Level3Manager()

// ─────────────────── 工具函数：集成到 Plugin ───────────────────

/**
 * 为 Plugin tool.execute.after 钩子提供的 Level 3 处理函数
 */
export async function handleLevel3Execution(input: {
  agent: string
  step_id: string
  files: string[]
  projectRoot: string
  context?: any
}): Promise<Level3ExecutionResponse | null> {
  // 检查是否应该使用 Level 3
  if (!level3Manager.shouldUseLevel3(input.agent, input.files)) {
    return null
  }

  // 执行 Level 3
  return await level3Manager.executeLevel3({
    step_id: input.step_id,
    agent: input.agent as "gongbu",
    files: input.files,
    projectRoot: input.projectRoot,
    context: input.context,
  })
}

/**
 * 格式化 Level 3 执行报告
 */
export function formatLevel3Report(response: Level3ExecutionResponse): string {
  const lines: string[] = []

  lines.push("")
  lines.push("═".repeat(70))
  lines.push("【⚡ Level 3 子任务并行执行报告】")
  lines.push("═".repeat(70))
  lines.push("")

  // 状态概览
  const statusEmoji =
    response.status === "success"
      ? "✅"
      : response.status === "partial"
        ? "⚠️"
        : "❌"
  lines.push(`${statusEmoji} 状态: ${response.status.toUpperCase()}`)
  lines.push(`📁 总文件数: ${response.summary.total_files}`)
  lines.push(`📊 并行分组: ${response.summary.parallel_groups} 组`)
  lines.push(`⏱️  执行耗时: ${(response.summary.execution_time_ms / 1000).toFixed(2)}s`)
  lines.push(`🚀 加速比: ${response.summary.speedup}`)
  lines.push(`➡️  下一步: ${response.next_step}`)
  lines.push("")

  // 执行分组详情
  if (response.level3_result.groups.length > 0) {
    lines.push("### 执行分组详情")
    for (const group of response.level3_result.groups) {
      const icon = group.canParallel ? "⚡" : "▶️"
      lines.push(
        `${icon} 第 ${group.level + 1} 层（${group.subtasks.length} 个任务${group.canParallel ? "，可并行" : ""}）`
      )

      for (let i = 0; i < group.subtasks.length; i++) {
        const subtask = group.subtasks[i]
        const prefix = i === group.subtasks.length - 1 ? "└─" : "├─"
        const statusIcon =
          subtask.status === "done"
            ? "✅"
            : subtask.status === "failed"
              ? "❌"
              : "⏳"
        const duration = subtask.duration
          ? `${(subtask.duration / 1000).toFixed(2)}s`
          : "pending"
        lines.push(`  ${prefix} ${statusIcon} ${subtask.name} (${duration})`)
      }
    }
    lines.push("")
  }

  // 完成/失败文件列表
  if (response.summary.files_completed.length > 0) {
    lines.push("✅ 完成的文件:")
    response.summary.files_completed.forEach((f) => lines.push(`   - ${f}`))
    lines.push("")
  }

  if (response.summary.files_failed.length > 0) {
    lines.push("❌ 失败的文件:")
    response.summary.files_failed.forEach((f) => lines.push(`   - ${f}`))
    lines.push("")
  }

  lines.push("═".repeat(70))

  return lines.join("\n")
}

export default level3Manager
