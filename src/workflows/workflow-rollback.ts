/**
 * 工作流回滚系统 - Phase 4
 */

import { log } from "../utils.js"
import { WorkflowTask } from "../types.js"
import { getTaskQueue, completeTask } from "../session/task-queue.js"

export interface WorkflowCheckpoint {
  id: string
  sessionId: string
  timestamp: number
  completedTaskIds: string[]
  taskStates: Map<string, any>
  description: string
}

const checkpoints = new Map<string, WorkflowCheckpoint[]>()

export function createCheckpoint(
  sessionId: string,
  description: string
): WorkflowCheckpoint | null {
  const queue = getTaskQueue(sessionId)
  if (!queue) return null

  const checkpoint: WorkflowCheckpoint = {
    id: `cp-${Date.now()}`,
    sessionId,
    timestamp: Date.now(),
    completedTaskIds: [...queue.completedTasks],
    taskStates: new Map(queue.tasks.map(t => [t.id, { ...t }])),
    description
  }

  if (!checkpoints.has(sessionId)) {
    checkpoints.set(sessionId, [])
  }
  checkpoints.get(sessionId)!.push(checkpoint)

  log("Rollback", `Checkpoint created: ${checkpoint.id} - ${description}`)
  return checkpoint
}

export function listCheckpoints(sessionId: string): WorkflowCheckpoint[] {
  return checkpoints.get(sessionId) || []
}

export function getCheckpoint(sessionId: string, checkpointId: string): WorkflowCheckpoint | null {
  const scp = checkpoints.get(sessionId)
  return scp?.find(cp => cp.id === checkpointId) || null
}

export function rollbackToCheckpoint(sessionId: string, checkpointId: string): boolean {
  const checkpoint = getCheckpoint(sessionId, checkpointId)
  if (!checkpoint) {
    log("Rollback", `Checkpoint not found: ${checkpointId}`, "error")
    return false
  }

  const queue = getTaskQueue(sessionId)
  if (!queue) return false

  // Reset completed tasks
  queue.completedTasks = [...checkpoint.completedTaskIds]

  // Reset task states
  checkpoint.taskStates.forEach((state, taskId) => {
    const task = queue.tasks.find(t => t.id === taskId)
    if (task && state) {
      Object.assign(task, state)
    }
  })

  log("Rollback", `Rolled back to checkpoint: ${checkpointId}`)
  return true
}

export function deleteCheckpoint(sessionId: string, checkpointId: string): boolean {
  const scp = checkpoints.get(sessionId)
  if (!scp) return false

  const idx = scp.findIndex(cp => cp.id === checkpointId)
  if (idx === -1) return false

  scp.splice(idx, 1)
  return true
}

export function clearCheckpoints(sessionId: string): void {
  checkpoints.delete(sessionId)
}
