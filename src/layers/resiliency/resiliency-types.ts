/**
 * 弹性层类型定义
 */

export interface RetryPolicy {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryableErrors: RegExp[]
}

export type RecoveryStrategy = 'retry' | 'skip' | 'rollback' | 'alert' | 'abort'

export interface WorkflowCheckpoint {
  id: string
  label: string
  sessionId: string
  timestamp: number
  taskStates: Map<string, TaskState>
  completedTaskIds: string[]
  variables: Record<string, any>
}

export interface TaskState {
  taskId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  output?: any
  error?: string
}

export type CircuitState = 'Closed' | 'Open' | 'HalfOpen'

export interface CircuitBreakerConfig {
  failureThreshold: number
  successThreshold: number
  timeout: number
  halfOpenMaxRequests: number
}
