/**
 * 任务队列系统 - Phase 1 核心
 *
 * 功能：
 * - 维护任务队列的状态和流程
 * - 防止 Agent 跳过步骤
 * - 强制任务依赖关系
 * - 提供任务队列可见性
 */

import { WorkflowTask, TaskQueue } from "../types.js"
import { log, syncCompletedTasksSet, isTaskCompleted } from "../utils.js"

// 全局任务队列存储（按 sessionId）
const taskQueues = new Map<string, TaskQueue>()

/**
 * 创建新的任务队列
 */
export function createTaskQueue(
  sessionId: string,
  recipeType: "simple" | "medium" | "complex" | "high_risk"
): TaskQueue {
  const queue: TaskQueue = {
    sessionId,
    tasks: [],
    currentTask: null,
    completedTasks: [],
    recipeType,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  taskQueues.set(sessionId, queue)
  log("TaskQueue", `Created queue for session ${sessionId} with recipe ${recipeType}`)

  return queue
}

/**
 * 获取任务队列
 */
export function getTaskQueue(sessionId: string): TaskQueue | undefined {
  return taskQueues.get(sessionId)
}

/**
 * 向队列添加任务
 */
export function addTask(sessionId: string, task: WorkflowTask): void {
  const queue = taskQueues.get(sessionId)
  if (!queue) {
    throw new Error(`[QUEUE ERROR] Session ${sessionId} 没有对应的任务队列`)
  }

  queue.tasks.push(task)
  queue.updatedAt = Date.now()
  log("TaskQueue", `Added task ${task.id}: ${task.name}`)
}

/**
 * 声明任务（Agent 开始做某个任务前必须声明）
 */
export function claimTask(sessionId: string, taskId: string, agentName: string): WorkflowTask {
  const queue = taskQueues.get(sessionId)
  if (!queue) {
    throw new Error(`[QUEUE ERROR] Session ${sessionId} 没有对应的任务队列`)
  }

  const task = queue.tasks.find(t => t.id === taskId)
  if (!task) {
    throw new Error(
      `[TASK NOT FOUND] 任务 ${taskId} 不存在。\n` +
      `可用的任务：\n${queue.tasks.map(t => `  - ${t.id}: ${t.name}`).join("\n")}`
    )
  }

  // 检查 1: 依赖是否都完成了？（使用 Set 缓存优化）
  const incompleteDeps = task.dependencies.filter(
    dep => !isTaskCompleted(dep, queue.completedTasks, queue.completedTasksSet)
  )
  if (incompleteDeps.length > 0) {
    const incompleteNames = incompleteDeps
      .map(dep => queue.tasks.find(t => t.id === dep)?.name)
      .filter(Boolean)
      .join(", ")
    throw new Error(
      `[DEPENDENCY ERROR] 任务 "${task.name}" 的前置依赖未完成：\n` +
      `  - ${incompleteNames}\n\n` +
      `必须先完成这些任务。`
    )
  }

  // 检查 2: 是否已被其他 Agent 声明？
  if (task.status !== "pending") {
    throw new Error(
      `[ALREADY CLAIMED] 任务 "${task.name}" 已被 ${task.claimedBy} 声明（状态：${task.status}）。\n` +
      `如果认为有问题，请联系 menxia 处理。`
    )
  }

  // 声明任务
  task.status = "claimed"
  task.claimedBy = agentName
  task.claimedAt = Date.now()
  queue.currentTask = taskId
  queue.updatedAt = Date.now()

  log("TaskQueue", `Task ${taskId} claimed by ${agentName}`)

  return task
}

/**
 * 完成任务
 */
export function completeTask(
  sessionId: string,
  taskId: string,
  outputs?: Record<string, any>
): WorkflowTask {
  const queue = taskQueues.get(sessionId)
  if (!queue) {
    throw new Error(`[QUEUE ERROR] Session ${sessionId} 没有对应的任务队列`)
  }

  const task = queue.tasks.find(t => t.id === taskId)
  if (!task) {
    throw new Error(`[TASK NOT FOUND] 任务 ${taskId} 不存在`)
  }

  if (task.status === "done") {
    throw new Error(`[ALREADY DONE] 任务 "${task.name}" 已完成，无需重复完成`)
  }

  task.status = "done"
  task.completedAt = Date.now()
  if (outputs) {
    task.outputs = outputs
  }

  // 添加到已完成列表（并同步 Set 缓存）
  queue.completedTasks.push(taskId)
  syncCompletedTasksSet(queue, taskId)
  queue.currentTask = null
  queue.updatedAt = Date.now()

  log("TaskQueue", `Task ${taskId} completed`)

  // 自动通知依赖此任务的 Agent
  const dependents = queue.tasks.filter(t =>
    t.dependencies.includes(taskId) && t.status === "pending"
  )
  if (dependents.length > 0) {
    log(
      "TaskQueue",
      `任务 ${taskId} 完成，以下任务现已可以开始：\n${dependents
        .map(t => `  - ${t.id}: ${t.name}`)
        .join("\n")}`
    )
  }

  return task
}

/**
 * 标记任务失败
 */
export function failTask(
  sessionId: string,
  taskId: string,
  error: string
): WorkflowTask {
  const queue = taskQueues.get(sessionId)
  if (!queue) {
    throw new Error(`[QUEUE ERROR] Session ${sessionId} 没有对应的任务队列`)
  }

  const task = queue.tasks.find(t => t.id === taskId)
  if (!task) {
    throw new Error(`[TASK NOT FOUND] 任务 ${taskId} 不存在`)
  }

  task.status = "failed"
  task.error = error
  queue.currentTask = null
  queue.updatedAt = Date.now()

  log("TaskQueue", `Task ${taskId} failed: ${error}`, "warn")

  return task
}

/**
 * 获取 Agent 可见的任务列表
 * （显示所有任务，以及每个任务的阻塞情况）
 */
export function getVisibleTasks(sessionId: string): Array<WorkflowTask & { blockedBy?: string[] }> {
  const queue = taskQueues.get(sessionId)
  if (!queue) {
    return []
  }

  return queue.tasks.map(task => {
    const blockedBy = task.dependencies.filter(
      dep => !queue.completedTasks.includes(dep)
    )

    return {
      ...task,
      blockedBy: blockedBy.length > 0 ? blockedBy : undefined
    }
  })
}

/**
 * 检查任务是否可以开始
 */
export function canStartTask(sessionId: string, taskId: string): boolean {
  const queue = taskQueues.get(sessionId)
  if (!queue) {
    return false
  }

  const task = queue.tasks.find(t => t.id === taskId)
  if (!task) {
    return false
  }

  // 依赖都完成了吗？
  return task.dependencies.every(dep => queue.completedTasks.includes(dep))
}

/**
 * 获取关键路径上的所有任务
 */
export function getCriticalPathStatus(
  sessionId: string,
  criticalPath: string[]
): Array<{ step: string; status: "pending" | "done" | "failed" }> {
  const queue = taskQueues.get(sessionId)
  if (!queue) {
    return []
  }

  return criticalPath.map(stepId => {
    const task = queue.tasks.find(t => t.id === stepId)
    return {
      step: stepId,
      status: task?.status === "done" ? "done" : task?.status === "failed" ? "failed" : "pending"
    }
  })
}

/**
 * 清空任务队列
 */
export function clearTaskQueue(sessionId: string): void {
  taskQueues.delete(sessionId)
  log("TaskQueue", `Cleared queue for session ${sessionId}`)
}

/**
 * 获取队列统计信息
 */
export function getQueueStats(sessionId: string): {
  total: number
  pending: number
  inProgress: number
  completed: number
  failed: number
} {
  const queue = taskQueues.get(sessionId)
  if (!queue) {
    return { total: 0, pending: 0, inProgress: 0, completed: 0, failed: 0 }
  }

  return {
    total: queue.tasks.length,
    pending: queue.tasks.filter(t => t.status === "pending").length,
    inProgress: queue.tasks.filter(t => t.status === "in_progress").length,
    completed: queue.tasks.filter(t => t.status === "done").length,
    failed: queue.tasks.filter(t => t.status === "failed").length
  }
}
