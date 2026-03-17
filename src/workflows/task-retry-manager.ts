/**
 * 任务重试和超时管理器 - Phase 4
 */

import { log } from "../utils.js"
import { WorkflowTask } from "../types.js"
import { getTaskQueue } from "../session/task-queue.js"

export interface RetryPolicy {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  timeoutMs: number
}

export interface TaskRetryRecord {
  taskId: string
  retryCount: number
  lastRetryTime: number
  nextRetryTime: number
  errors: string[]
  status: "pending_retry" | "max_retries_exceeded" | "success"
}

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  timeoutMs: 300000
}

const retryRecords = new Map<string, TaskRetryRecord>()
const taskTimeouts = new Map<string, number>()
let globalRetryPolicy = { ...DEFAULT_RETRY_POLICY }

export function configureRetryPolicy(policy: Partial<RetryPolicy>): void {
  globalRetryPolicy = { ...DEFAULT_RETRY_POLICY, ...policy }
  log("RetryManager", `Retry policy configured: max=${globalRetryPolicy.maxRetries} retries`)
}

export function recordTaskFailure(taskId: string, error: string): TaskRetryRecord {
  let record = retryRecords.get(taskId)

  if (!record) {
    record = {
      taskId,
      retryCount: 0,
      lastRetryTime: Date.now(),
      nextRetryTime: 0,
      errors: [],
      status: "pending_retry"
    }
    retryRecords.set(taskId, record)
  }

  record.retryCount++
  record.lastRetryTime = Date.now()
  record.errors.push(error)

  const delayMs = Math.min(
    globalRetryPolicy.initialDelayMs * Math.pow(globalRetryPolicy.backoffMultiplier, record.retryCount - 1),
    globalRetryPolicy.maxDelayMs
  )
  record.nextRetryTime = Date.now() + delayMs

  if (record.retryCount >= globalRetryPolicy.maxRetries) {
    record.status = "max_retries_exceeded"
    log("RetryManager", `Task ${taskId} max retries exceeded (${record.retryCount})`, "error")
  } else {
    log("RetryManager", `Task ${taskId} scheduled for retry in ${delayMs}ms (attempt ${record.retryCount})`, "warn")
  }

  return record
}

export function getRetryRecord(taskId: string): TaskRetryRecord | null {
  return retryRecords.get(taskId) || null
}

export function shouldRetryTask(taskId: string): boolean {
  const record = retryRecords.get(taskId)
  if (!record) return false
  if (record.status !== "pending_retry") return false
  return Date.now() >= record.nextRetryTime
}

export function getRetryableTaskIds(sessionId: string): string[] {
  const queue = getTaskQueue(sessionId)
  if (!queue) return []

  return queue.tasks
    .filter(t => t.status === "failed" && shouldRetryTask(t.id))
    .map(t => t.id)
}

export function setTaskTimeout(taskId: string): void {
  taskTimeouts.set(taskId, Date.now() + globalRetryPolicy.timeoutMs)
}

export function isTaskTimedOut(taskId: string): boolean {
  const timeout = taskTimeouts.get(taskId)
  if (!timeout) return false
  return Date.now() > timeout
}

export function clearTaskTimeout(taskId: string): void {
  taskTimeouts.delete(taskId)
}

export function generateRetryReport(sessionId: string): string {
  const queue = getTaskQueue(sessionId)
  if (!queue) return "No task queue"

  const allRetries = Array.from(retryRecords.values())
  const pendingRetries = allRetries.filter(r => r.status === "pending_retry")
  const exceeded = allRetries.filter(r => r.status === "max_retries_exceeded")

  const lines = [
    "═══════════════════════════════════════════",
    "Task Retry Report",
    "═══════════════════════════════════════════",
    "",
    `[chart] Summary`,
    `  - Total Retry Records: ${allRetries.length}`,
    `  - Pending Retry: ${pendingRetries.length}`,
    `  - Max Exceeded: ${exceeded.length}`,
    ""
  ]

  if (pendingRetries.length > 0) {
    lines.push("⏳ Pending Retries")
    pendingRetries.forEach(r => {
      const nextIn = Math.max(0, r.nextRetryTime - Date.now())
      lines.push(`  - ${r.taskId}: retry ${r.retryCount}, next in ${Math.round(nextIn/1000)}s`)
    })
    lines.push("")
  }

  if (exceeded.length > 0) {
    lines.push("[NO] Max Retries Exceeded")
    exceeded.forEach(r => {
      lines.push(`  - ${r.taskId}: ${r.retryCount} attempts`)
      r.errors.forEach((e, i) => {
        lines.push(`    Attempt ${i+1}: ${e.substring(0, 60)}`)
      })
    })
  }

  return lines.join("\n")
}

export function clearRetryRecords(): void {
  retryRecords.clear()
  taskTimeouts.clear()
}
