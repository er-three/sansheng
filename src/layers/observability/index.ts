/**
 * 可观测性层导出接口
 */

import { log } from '../../utils.js'

export type { AgentHeartbeat, WorkflowMetrics, AuditRecord, LogEntry } from './observability-types.js'

/**
 * 记录任务启动
 */
export function recordTaskStart(taskId: string): void {
  log('Observability', `Task started: ${taskId}`, 'info')
}

/**
 * 记录任务完成
 */
export function recordTaskCompletion(taskId: string, result: any): void {
  log('Observability', `Task completed: ${result?.status || 'unknown'}`, 'info')
}

/**
 * 记录任务失败
 */
export function recordTaskFailure(taskId: string, error: Error): void {
  log('Observability', `Task failed: ${error.message}`, 'error')
}

/**
 * 生成审计报告
 */
export function generateAuditReport(sessionId: string): string {
  return `Audit Report for Session: ${sessionId}\nGenerated: ${new Date().toISOString()}`
}

/**
 * 获取工作流指标
 */
export function getMetrics(sessionId: string): Record<string, any> {
  return {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    successRate: 0,
    averageDuration: 0
  }
}

/**
 * 记录审计事件
 */
export function recordAuditEvent(sessionId: string, event: any): void {
  log('Observability', `Audit event recorded: ${event.type}`, 'debug')
}
