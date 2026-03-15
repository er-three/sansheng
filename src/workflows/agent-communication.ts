/**
 * Agent 通信和通知系统 - Phase 4
 *
 * 职责：
 * - Agent注册和发现
 * - 主动任务通知（不依赖被动Hook）
 * - 任务队列轮询
 * - 任务截止日期和SLA追踪
 * - Agent消息队列管理
 */

import { log } from "../utils.js"
import { WorkflowTask } from "../types.js"
import { getTaskQueue } from "../session/task-queue.js"

/**
 * Agent注册信息
 */
export interface AgentRegistration {
  agentName: string
  registeredAt: number
  lastPolled: number | null
  isActive: boolean
  pollIntervalSeconds: number
  maxWaitSeconds: number // 任务最长等待时间
}

/**
 * 任务通知消息
 */
export interface TaskNotification {
  id: string
  taskId: string
  agentName: string
  taskName: string
  issuedAt: number
  deliveredAt?: number
  acknowledged: boolean
  retryCount: number
}

/**
 * Task SLA配置
 */
export interface TaskSLA {
  maxWaitSeconds: number // 分配后最长等待时间
  maxExecutionSeconds: number // 最长执行时间
  priority: "low" | "medium" | "high" | "critical"
}

// 全局Agent注册表
const agentRegistry = new Map<string, AgentRegistration>()

// 通知队列（按sessionId）
const notificationQueues = new Map<string, TaskNotification[]>()

// 任务SLA配置（按sessionId）
const taskSLAMap = new Map<string, Map<string, TaskSLA>>()

// 默认SLA配置
const DEFAULT_SLA: TaskSLA = {
  maxWaitSeconds: 300, // 5 minutes
  maxExecutionSeconds: 600, // 10 minutes
  priority: "medium"
}

/**
 * 注册Agent
 */
export function registerAgent(
  agentName: string,
  pollIntervalSeconds: number = 10
): AgentRegistration {
  const registration: AgentRegistration = {
    agentName,
    registeredAt: Date.now(),
    lastPolled: null,
    isActive: true,
    pollIntervalSeconds,
    maxWaitSeconds: 300
  }

  agentRegistry.set(agentName, registration)
  log("AgentComm", `Agent registered: ${agentName} (poll interval: ${pollIntervalSeconds}s)`, "debug")

  return registration
}

/**
 * 注销Agent
 */
export function unregisterAgent(agentName: string): boolean {
  const result = agentRegistry.delete(agentName)
  if (result) {
    log("AgentComm", `Agent unregistered: ${agentName}`, "debug")
  }
  return result
}

/**
 * 获取已注册的Agent列表
 */
export function getRegisteredAgents(): AgentRegistration[] {
  return Array.from(agentRegistry.values())
}

/**
 * 获取Agent注册信息
 */
export function getAgentRegistration(agentName: string): AgentRegistration | null {
  return agentRegistry.get(agentName) || null
}

/**
 * 设置Agent活动状态
 */
export function setAgentActive(agentName: string, isActive: boolean): void {
  const registration = agentRegistry.get(agentName)
  if (registration) {
    registration.isActive = isActive
    log("AgentComm", `Agent ${agentName} set to ${isActive ? "active" : "inactive"}`, "debug")
  }
}

/**
 * 记录Agent轮询
 */
export function recordAgentPoll(agentName: string): void {
  const registration = agentRegistry.get(agentName)
  if (registration) {
    registration.lastPolled = Date.now()
  }
}

/**
 * 为Agent发送任务通知
 */
export function notifyAgentOfTask(
  sessionId: string,
  agentName: string,
  task: WorkflowTask
): TaskNotification {
  // 确保通知队列存在
  if (!notificationQueues.has(sessionId)) {
    notificationQueues.set(sessionId, [])
  }

  const notification: TaskNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    taskId: task.id,
    agentName,
    taskName: task.name,
    issuedAt: Date.now(),
    acknowledged: false,
    retryCount: 0
  }

  notificationQueues.get(sessionId)!.push(notification)

  log(
    "AgentComm",
    `Notification sent: ${agentName} -> ${task.name} (${notification.id})`,
    "debug"
  )

  return notification
}

/**
 * 获取Agent的待处理通知
 */
export function getAgentNotifications(sessionId: string, agentName: string): TaskNotification[] {
  const queue = notificationQueues.get(sessionId)
  if (!queue) {
    return []
  }

  return queue.filter(n => n.agentName === agentName && !n.acknowledged)
}

/**
 * Agent确认收到通知
 */
export function acknowledgeNotification(sessionId: string, notificationId: string): boolean {
  const queue = notificationQueues.get(sessionId)
  if (!queue) {
    return false
  }

  const notification = queue.find(n => n.id === notificationId)
  if (notification) {
    notification.acknowledged = true
    notification.deliveredAt = Date.now()
    log("AgentComm", `Notification acknowledged: ${notificationId}`, "debug")
    return true
  }

  return false
}

/**
 * 重新发送未确认的通知
 */
export function retryUnacknowledgedNotifications(sessionId: string, maxRetries: number = 3) {
  const queue = notificationQueues.get(sessionId)
  if (!queue) {
    return
  }

  const now = Date.now()
  const retryTimeout = 30000 // 30秒后重试

  queue.forEach(notif => {
    if (!notif.acknowledged && notif.retryCount < maxRetries) {
      const timeSinceIssue = now - notif.issuedAt
      if (timeSinceIssue > retryTimeout) {
        notif.retryCount++
        notif.issuedAt = now // 重置计时器
        log(
          "AgentComm",
          `Retrying notification: ${notif.id} (attempt ${notif.retryCount})`,
          "warn"
        )
      }
    }
  })
}

/**
 * 清理已确认的通知
 */
export function cleanupAcknowledgedNotifications(sessionId: string): void {
  const queue = notificationQueues.get(sessionId)
  if (!queue) {
    return
  }

  const originalSize = queue.length
  notificationQueues.set(
    sessionId,
    queue.filter(n => !n.acknowledged)
  )

  const removed = originalSize - (notificationQueues.get(sessionId)?.length || 0)
  if (removed > 0) {
    log("AgentComm", `Cleaned up ${removed} acknowledged notifications`, "debug")
  }
}

/**
 * 为任务设置SLA
 */
export function setTaskSLA(sessionId: string, taskId: string, sla: Partial<TaskSLA>): void {
  if (!taskSLAMap.has(sessionId)) {
    taskSLAMap.set(sessionId, new Map())
  }

  const slasForSession = taskSLAMap.get(sessionId)!
  slasForSession.set(taskId, { ...DEFAULT_SLA, ...sla })

  log("AgentComm", `SLA set for task ${taskId}: priority=${sla.priority || "medium"}`, "debug")
}

/**
 * 获取任务SLA
 */
export function getTaskSLA(sessionId: string, taskId: string): TaskSLA {
  const slaMap = taskSLAMap.get(sessionId)
  if (slaMap && slaMap.has(taskId)) {
    return slaMap.get(taskId)!
  }
  return { ...DEFAULT_SLA }
}

/**
 * 检测SLA违反
 */
export function detectSLAViolations(sessionId: string): {
  waitTimeViolations: WorkflowTask[]
  executionTimeViolations: WorkflowTask[]
} {
  const queue = getTaskQueue(sessionId)
  if (!queue) {
    return { waitTimeViolations: [], executionTimeViolations: [] }
  }

  const now = Date.now()
  const waitTimeViolations: WorkflowTask[] = []
  const executionTimeViolations: WorkflowTask[] = []

  queue.tasks.forEach(task => {
    const sla = getTaskSLA(sessionId, task.id)

    // 检查等待时间SLA
    if (task.status === "pending" && task.claimedAt === undefined) {
      // Task被分配但未claim - 计算分配后的等待时间
      // 注意：这里我们用createdAt或其他时间戳
      const createdTime = task.claimedAt || queue.createdAt
      const waitDuration = now - createdTime
      if (waitDuration > sla.maxWaitSeconds * 1000) {
        waitTimeViolations.push(task)
        log(
          "AgentComm",
          `SLA VIOLATION: Task ${task.id} wait time exceeded (${Math.round(waitDuration / 1000)}s > ${sla.maxWaitSeconds}s)`,
          "warn"
        )
      }
    }

    // 检查执行时间SLA
    if (task.status === "in_progress" && task.claimedAt) {
      const executionDuration = now - task.claimedAt
      if (executionDuration > sla.maxExecutionSeconds * 1000) {
        executionTimeViolations.push(task)
        log(
          "AgentComm",
          `SLA VIOLATION: Task ${task.id} execution time exceeded (${Math.round(executionDuration / 1000)}s > ${sla.maxExecutionSeconds}s)`,
          "warn"
        )
      }
    }
  })

  return { waitTimeViolations, executionTimeViolations }
}

/**
 * 生成通信状态报告
 */
export function generateCommunicationReport(sessionId: string): string {
  const queue = getTaskQueue(sessionId)
  const registeredAgents = getRegisteredAgents()
  const { waitTimeViolations, executionTimeViolations } = detectSLAViolations(sessionId)
  const notificationQueue = notificationQueues.get(sessionId) || []

  const activeAgents = registeredAgents.filter(a => a.isActive)
  const inactiveAgents = registeredAgents.filter(a => !a.isActive)

  const lines = [
    "═══════════════════════════════════════════",
    "Agent Communication Report",
    "═══════════════════════════════════════════",
    "",
    "📋 Registration Status",
    `  - Total Registered: ${registeredAgents.length}`,
    `  - Active: ${activeAgents.length}`,
    `  - Inactive: ${inactiveAgents.length}`,
    ""
  ]

  if (activeAgents.length > 0) {
    lines.push("✓ Active Agents")
    activeAgents.forEach(agent => {
      const lastPoll = agent.lastPolled
        ? new Date(agent.lastPolled).toISOString()
        : "Never"
      lines.push(`  - ${agent.agentName}: poll interval ${agent.pollIntervalSeconds}s, last poll ${lastPoll}`)
    })
    lines.push("")
  }

  if (inactiveAgents.length > 0) {
    lines.push("✗ Inactive Agents")
    inactiveAgents.forEach(agent => {
      lines.push(`  - ${agent.agentName}`)
    })
    lines.push("")
  }

  lines.push("📬 Notifications")
  lines.push(`  - Total in queue: ${notificationQueue.length}`)
  lines.push(`  - Pending: ${notificationQueue.filter(n => !n.acknowledged).length}`)
  lines.push(`  - Delivered: ${notificationQueue.filter(n => n.acknowledged).length}`)
  lines.push("")

  if (waitTimeViolations.length > 0 || executionTimeViolations.length > 0) {
    lines.push("⚠️ SLA Violations")
    if (waitTimeViolations.length > 0) {
      lines.push(`  - Wait Time Violations: ${waitTimeViolations.length}`)
      waitTimeViolations.forEach(task => {
        lines.push(`    - ${task.id}: ${task.name}`)
      })
    }
    if (executionTimeViolations.length > 0) {
      lines.push(`  - Execution Time Violations: ${executionTimeViolations.length}`)
      executionTimeViolations.forEach(task => {
        lines.push(`    - ${task.id}: ${task.name}`)
      })
    }
    lines.push("")
  }

  lines.push("📊 Task Queue Status")
  if (queue) {
    lines.push(`  - Total Tasks: ${queue.tasks.length}`)
    lines.push(`  - Pending: ${queue.tasks.filter(t => t.status === "pending").length}`)
    lines.push(`  - In Progress: ${queue.tasks.filter(t => t.status === "in_progress").length}`)
    lines.push(`  - Completed: ${queue.completedTasks.length}`)
  }

  return lines.join("\n")
}

/**
 * 清空所有通信数据（测试清理）
 */
export function clearCommunicationData(): void {
  agentRegistry.clear()
  notificationQueues.clear()
  taskSLAMap.clear()
  log("AgentComm", "All communication data cleared")
}
