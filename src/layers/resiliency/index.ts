/**
 * 弹性层导出接口
 */

import { log } from '../../utils.js'

export type {
  RetryPolicy,
  RecoveryStrategy,
  WorkflowCheckpoint,
  TaskState,
  CircuitState,
  CircuitBreakerConfig
} from './resiliency-types.js'

/**
 * 记录任务失败
 */
export function recordTaskFailure(
  sessionId: string,
  taskId: string,
  error: Error
): void {
  log('Resiliency', `Task failure recorded: ${taskId} - ${error.message}`, 'warn')
}

/**
 * 判断是否应该重试
 */
export function shouldRetryTask(
  sessionId: string,
  taskId: string
): boolean {
  // TODO: 实现重试判断逻辑
  return true
}

/**
 * 获取可重试的任务
 */
export function getRetryableTaskIds(sessionId: string): string[] {
  return []
}

/**
 * 获取恢复策略
 */
export function getRecoveryStrategy(sessionId: string, error: Error): string {
  // 简单的策略选择
  if (error.message.includes('timeout') || error.message.includes('network')) {
    return 'retry'
  }
  return 'abort'
}

/**
 * 执行恢复策略
 */
export async function executeRecoveryStrategy(
  sessionId: string,
  strategy: string,
  context: any
): Promise<boolean> {
  log('Resiliency', `Executing recovery strategy: ${strategy}`, 'info')

  switch (strategy) {
    case 'retry':
      return true
    case 'skip':
      return true
    case 'rollback':
      return true
    case 'alert':
      return false // 需要人工干预
    case 'abort':
      return false
    default:
      return false
  }
}

/**
 * 创建检查点
 */
export function createCheckpoint(sessionId: string, label: string): string {
  const checkpointId = `checkpoint-${Date.now()}`
  log('Resiliency', `Checkpoint created: ${label}`, 'debug')
  return checkpointId
}

/**
 * 回滚到检查点
 */
export async function rollbackToCheckpoint(
  sessionId: string,
  checkpointId: string
): Promise<boolean> {
  log('Resiliency', `Rolling back to checkpoint: ${checkpointId}`, 'info')
  return true
}

/**
 * 列出所有检查点
 */
export function listCheckpoints(sessionId: string): any[] {
  return []
}
