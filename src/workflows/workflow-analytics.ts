/**
 * 工作流分析系统 - Phase 4
 */

import { log } from "../utils.js"
import { getTaskQueue } from "../session/task-queue.js"

export interface WorkflowMetrics {
  sessionId: string
  totalTasks: number
  completedTasks: number
  failedTasks: number
  averageDuration: number
  successRate: number
  bottleneckTask?: string
  agentThroughput: Map<string, number>
}

const metricsStore = new Map<string, WorkflowMetrics>()

export function recordTaskDuration(sessionId: string, taskName: string, durationMs: number): void {
  log("Analytics", `Task ${taskName} took ${durationMs}ms`, "debug")
}

export function calculateMetrics(sessionId: string): WorkflowMetrics {
  const queue = getTaskQueue(sessionId)

  const metrics: WorkflowMetrics = {
    sessionId,
    totalTasks: queue?.tasks.length || 0,
    completedTasks: queue?.completedTasks.length || 0,
    failedTasks: queue?.tasks.filter(t => t.status === "failed").length || 0,
    averageDuration: 0,
    successRate: 0,
    agentThroughput: new Map()
  }

  if (metrics.totalTasks > 0) {
    metrics.successRate = (metrics.completedTasks / metrics.totalTasks) * 100
  }

  metricsStore.set(sessionId, metrics)
  return metrics
}

export function getMetrics(sessionId: string): WorkflowMetrics | null {
  return metricsStore.get(sessionId) || null
}

export function generateAnalyticsReport(sessionId: string): string {
  const metrics = calculateMetrics(sessionId)

  const lines = [
    "═══════════════════════════════════════════",
    "Workflow Analytics Report",
    "═══════════════════════════════════════════",
    "",
    `📊 Task Metrics`,
    `  - Total Tasks: ${metrics.totalTasks}`,
    `  - Completed: ${metrics.completedTasks}`,
    `  - Failed: ${metrics.failedTasks}`,
    `  - Success Rate: ${metrics.successRate.toFixed(1)}%`,
    "",
    `⏱️ Performance`,
    `  - Average Duration: ${metrics.averageDuration}ms`,
    metrics.bottleneckTask ? `  - Bottleneck: ${metrics.bottleneckTask}` : ""
  ]

  return lines.filter(l => l.length > 0).join("\n")
}

export function clearAnalytics(sessionId: string): void {
  metricsStore.delete(sessionId)
}
