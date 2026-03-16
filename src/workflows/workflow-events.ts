/**
 * 工作流事件系统 - Phase 4
 */

import { log } from "../utils.js"
import { WorkflowTask } from "../types.js"

export type WorkflowEventType =
  | "task-assigned"
  | "task-started"
  | "task-completed"
  | "task-failed"
  | "workflow-started"
  | "workflow-completed"
  | "workflow-failed"

export interface WorkflowEvent {
  id: string
  type: WorkflowEventType
  sessionId: string
  taskId?: string
  timestamp: number
  data: Record<string, any>
}

type EventListener = (event: WorkflowEvent) => void

const listeners = new Map<WorkflowEventType, EventListener[]>()
const eventHistory = new Map<string, WorkflowEvent[]>()

export function on(eventType: WorkflowEventType, callback: EventListener): void {
  if (!listeners.has(eventType)) {
    listeners.set(eventType, [])
  }
  listeners.get(eventType)!.push(callback)
  log("Events", `Listener registered: ${eventType}`)
}

export function off(eventType: WorkflowEventType, callback: EventListener): void {
  const cbs = listeners.get(eventType)
  if (!cbs) return

  const idx = cbs.indexOf(callback)
  if (idx !== -1) {
    cbs.splice(idx, 1)
  }
}

export function emit(
  sessionId: string,
  eventType: WorkflowEventType,
  data: Record<string, any> = {}
): WorkflowEvent {
  const event: WorkflowEvent = {
    id: `evt-${Date.now()}`,
    type: eventType,
    sessionId,
    taskId: data.taskId,
    timestamp: Date.now(),
    data
  }

  // Record in history
  if (!eventHistory.has(sessionId)) {
    eventHistory.set(sessionId, [])
  }
  eventHistory.get(sessionId)!.push(event)

  // Notify listeners
  const cbs = listeners.get(eventType)
  if (cbs) {
    cbs.forEach(cb => {
      try {
        cb(event)
      } catch (error) {
        log("Events", `Error in listener: ${error}`, "error")
      }
    })
  }

  log("Events", `Event emitted: ${eventType}`, "debug")
  return event
}

export function getEventHistory(sessionId: string): WorkflowEvent[] {
  return eventHistory.get(sessionId) || []
}

export function clearEventHistory(sessionId: string): void {
  eventHistory.delete(sessionId)
}

export function clearAllListeners(): void {
  listeners.clear()
  eventHistory.clear()
}
