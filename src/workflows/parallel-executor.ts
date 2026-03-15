/**
 * 并行执行管理器 - Phase 4
 */

import { log } from "../utils.js"
import { WorkflowTask } from "../types.js"
import { getTaskQueue } from "../session/task-queue.js"

export interface ParallelTaskGroup {
  groupId: string
  taskIds: string[]
  status: "pending" | "in_progress" | "completed" | "failed"
  createdAt: number
}

const parallelGroups = new Map<string, ParallelTaskGroup[]>()

export function createParallelGroup(sessionId: string, taskIds: string[]): ParallelTaskGroup {
  const group: ParallelTaskGroup = {
    groupId: `pg-${Date.now()}`,
    taskIds,
    status: "pending",
    createdAt: Date.now()
  }

  if (!parallelGroups.has(sessionId)) {
    parallelGroups.set(sessionId, [])
  }
  parallelGroups.get(sessionId)!.push(group)

  log("ParallelExecutor", `Parallel group created: ${group.groupId} with ${taskIds.length} tasks`)
  return group
}

export function getParallelGroups(sessionId: string): ParallelTaskGroup[] {
  return parallelGroups.get(sessionId) || []
}

export function getReadyTasks(sessionId: string): WorkflowTask[] {
  const queue = getTaskQueue(sessionId)
  if (!queue) return []

  return queue.tasks.filter(t => {
    if (t.status !== "pending") return false
    const depsCompleted = t.dependencies.every(d => queue.completedTasks.includes(d))
    return depsCompleted
  })
}

export function startParallelGroup(sessionId: string, groupId: string): boolean {
  const groups = parallelGroups.get(sessionId)
  const group = groups?.find(g => g.groupId === groupId)

  if (!group) return false

  group.status = "in_progress"
  log("ParallelExecutor", `Started parallel group: ${groupId}`)
  return true
}

export function completeParallelGroup(sessionId: string, groupId: string): boolean {
  const groups = parallelGroups.get(sessionId)
  const group = groups?.find(g => g.groupId === groupId)

  if (!group) return false

  group.status = "completed"
  return true
}

export function clearParallelGroups(sessionId: string): void {
  parallelGroups.delete(sessionId)
}
