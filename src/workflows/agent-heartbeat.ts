/**
 * Agent 心跳监测系统 - Phase 4
 *
 * 职责：
 * - 跟踪Agent活动和任务进度
 * - 检测超时/卡住的Agent
 * - 自动重新分配超时任务
 * - 生成Agent健康报告
 */

import { log } from "../utils.js"
import { WorkflowTask } from "../types.js"
import { getTaskQueue } from "../session/task-queue.js"

/**
 * Agent心跳记录
 */
export interface AgentHeartbeat {
  agentName: string
  lastActivity: number // timestamp
  lastTaskId: string | null
  status: "healthy" | "idle" | "timeout" | "dead"
  taskDuration: number // ms
  failureCount: number
}

/**
 * 超时配置
 */
export interface HeartbeatConfig {
  taskTimeoutSeconds: number // 任务超时时间（默认5分钟）
  checkIntervalSeconds: number // 检查间隔（默认30秒）
  maxFailures: number // 最大失败次数标记为dead
}

// 全局心跳追踪
const agentHeartbeats = new Map<string, AgentHeartbeat>()
const taskStartTime = new Map<string, number>() // taskId -> startTime

// 默认配置
const DEFAULT_CONFIG: HeartbeatConfig = {
  taskTimeoutSeconds: 300, // 5 minutes
  checkIntervalSeconds: 30,
  maxFailures: 3
}

let globalConfig = { ...DEFAULT_CONFIG }

/**
 * 配置心跳系统
 */
export function configureHeartbeat(config: Partial<HeartbeatConfig>): void {
  globalConfig = { ...DEFAULT_CONFIG, ...config }
  log("AgentHeartbeat", `Heartbeat configured: timeout=${globalConfig.taskTimeoutSeconds}s`)
}

/**
 * 记录Agent活动（任务开始或进行中）
 */
export function recordAgentActivity(agentName: string, taskId: string): void {
  const now = Date.now()

  // 如果是新任务，记录开始时间
  if (!taskStartTime.has(taskId)) {
    taskStartTime.set(taskId, now)
  }

  // 更新或创建心跳记录
  if (agentHeartbeats.has(agentName)) {
    const heartbeat = agentHeartbeats.get(agentName)!
    heartbeat.lastActivity = now
    heartbeat.lastTaskId = taskId
    heartbeat.status = "healthy"
  } else {
    agentHeartbeats.set(agentName, {
      agentName,
      lastActivity: now,
      lastTaskId: taskId,
      status: "healthy",
      taskDuration: 0,
      failureCount: 0
    })
  }

  log("AgentHeartbeat", `Agent ${agentName} activity recorded for task ${taskId}`, "debug")
}

/**
 * 记录任务完成（计算任务耗时）
 */
export function recordTaskCompletion(agentName: string, taskId: string): number {
  const startTime = taskStartTime.get(taskId)
  const duration = startTime ? Date.now() - startTime : 0

  if (agentHeartbeats.has(agentName)) {
    const heartbeat = agentHeartbeats.get(agentName)!
    heartbeat.taskDuration = duration
    heartbeat.lastActivity = Date.now()
    heartbeat.lastTaskId = null // Agent is now idle
  }

  taskStartTime.delete(taskId)
  log("AgentHeartbeat", `Task ${taskId} completed by ${agentName} in ${duration}ms`, "debug")

  return duration
}

/**
 * 检测超时的任务和Agent
 */
export function detectTimeouts(sessionId: string): {
  timedOutTasks: WorkflowTask[]
  deadAgents: string[]
} {
  const queue = getTaskQueue(sessionId)
  if (!queue) {
    return { timedOutTasks: [], deadAgents: [] }
  }

  const now = Date.now()
  const timeoutMs = globalConfig.taskTimeoutSeconds * 1000
  const timedOutTasks: WorkflowTask[] = []
  const deadAgents = new Set<string>()

  // 检查所有claimed的任务
  queue.tasks.forEach(task => {
    if (task.status === "claimed" || task.status === "in_progress") {
      const claimedBy = task.claimedBy
      if (!claimedBy) return

      const heartbeat = agentHeartbeats.get(claimedBy)
      if (!heartbeat) return

      const inactiveDuration = now - heartbeat.lastActivity
      if (inactiveDuration > timeoutMs) {
        timedOutTasks.push(task)
        heartbeat.status = "timeout"

        // 如果多次超时，标记为dead
        heartbeat.failureCount++
        if (heartbeat.failureCount >= globalConfig.maxFailures) {
          heartbeat.status = "dead"
          deadAgents.add(claimedBy)
          log(
            "AgentHeartbeat",
            `Agent ${claimedBy} marked as DEAD (${heartbeat.failureCount} failures)`,
            "error"
          )
        } else {
          log(
            "AgentHeartbeat",
            `Task ${task.id} TIMEOUT: Agent ${claimedBy} inactive for ${Math.round(inactiveDuration / 1000)}s`,
            "warn"
          )
        }
      }
    }
  })

  return { timedOutTasks, deadAgents: Array.from(deadAgents) }
}

/**
 * 获取Agent健康状态
 */
export function getAgentHealth(agentName: string): AgentHeartbeat | null {
  const heartbeat = agentHeartbeats.get(agentName)
  if (!heartbeat) {
    return null
  }

  // 更新状态
  heartbeat.status = updateAgentStatus(heartbeat) as any

  return heartbeat
}

/**
 * 获取所有Agent健康状态
 */
export function getAllAgentHealth(): AgentHeartbeat[] {
  const all = Array.from(agentHeartbeats.values())
  return all.map(hb => ({
    ...hb,
    status: updateAgentStatus(hb) as any
  }))
}

/**
 * 更新Agent状态
 */
function updateAgentStatus(heartbeat: AgentHeartbeat): string {
  // 检查死亡状态优先级最高
  if (heartbeat.status === "dead") {
    return "dead"
  }

  // 如果没有当前任务，则是idle
  if (heartbeat.lastTaskId === null) {
    return "idle"
  }

  const now = Date.now()
  const inactiveDuration = now - heartbeat.lastActivity

  if (inactiveDuration > globalConfig.taskTimeoutSeconds * 1000) {
    return "timeout"
  }

  return "healthy"
}

/**
 * 生成健康报告
 */
export function generateHealthReport(sessionId: string): string {
  const queue = getTaskQueue(sessionId)
  if (!queue) {
    return "No task queue found for session"
  }

  const allAgents = getAllAgentHealth()
  const { timedOutTasks, deadAgents } = detectTimeouts(sessionId)

  const healthyCount = allAgents.filter(a => a.status === "healthy").length
  const timeoutCount = allAgents.filter(a => a.status === "timeout").length
  const deadCount = allAgents.filter(a => a.status === "dead").length
  const idleCount = allAgents.filter(a => a.status === "idle").length

  const lines = [
    "═══════════════════════════════════════════",
    "Agent Health Report",
    "═══════════════════════════════════════════",
    "",
    "[chart] Summary",
    `  - Total Agents: ${allAgents.length}`,
    `  - Healthy: ${healthyCount}`,
    `  - Idle: ${idleCount}`,
    `  - Timeout: ${timeoutCount}`,
    `  - Dead: ${deadCount}`,
    ""
  ]

  if (timedOutTasks.length > 0) {
    lines.push("[WARN] Timed Out Tasks")
    timedOutTasks.forEach(task => {
      lines.push(`  - ${task.id}: ${task.name} (claimed by ${task.claimedBy})`)
    })
    lines.push("")
  }

  if (deadAgents.length > 0) {
    lines.push("💀 Dead Agents")
    deadAgents.forEach(agent => {
      lines.push(`  - ${agent}`)
    })
    lines.push("")
  }

  lines.push("📋 Agent Details")
  allAgents.forEach(agent => {
    const status =
      agent.status === "healthy" ? "[PASS]" : agent.status === "timeout" ? "⚠" : "✗"
    lines.push(`  ${status} ${agent.agentName}`)
    lines.push(`     Status: ${agent.status}`)
    lines.push(`     Last Activity: ${new Date(agent.lastActivity).toISOString()}`)
    if (agent.lastTaskId) {
      lines.push(`     Current Task: ${agent.lastTaskId}`)
    }
    if (agent.taskDuration > 0) {
      lines.push(`     Last Duration: ${agent.taskDuration}ms`)
    }
    if (agent.failureCount > 0) {
      lines.push(`     Failures: ${agent.failureCount}`)
    }
  })

  lines.push("")
  lines.push("📈 Configuration")
  lines.push(`  - Task Timeout: ${globalConfig.taskTimeoutSeconds}s`)
  lines.push(`  - Check Interval: ${globalConfig.checkIntervalSeconds}s`)
  lines.push(`  - Max Failures: ${globalConfig.maxFailures}`)

  return lines.join("\n")
}

/**
 * 重置Agent失败计数（任务成功完成）
 */
export function resetAgentFailureCount(agentName: string): void {
  if (agentHeartbeats.has(agentName)) {
    const heartbeat = agentHeartbeats.get(agentName)!
    heartbeat.failureCount = 0
    heartbeat.status = "healthy"
  }
}

/**
 * 清空心跳数据（测试清理）
 */
export function clearHeartbeats(): void {
  agentHeartbeats.clear()
  taskStartTime.clear()
  log("AgentHeartbeat", "All heartbeat data cleared")
}
