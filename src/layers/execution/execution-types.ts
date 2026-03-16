/**
 * 执行引擎层类型定义
 */

export interface Task {
  id: string
  name: string
  agent: string
  dependencies: string[]
  parallel?: boolean
  retryable?: boolean
  timeout?: number
  input?: Record<string, any>
}

export interface TaskExecutionResult {
  taskId: string
  status: 'completed' | 'failed' | 'skipped' | 'retried'
  output: any
  error?: string
  duration: number
  retryCount: number
}

export interface TaskQueue {
  tasks: Task[]
  completed: Set<string>
  failed: Set<string>
}

export interface DependencyValidationResult {
  valid: boolean
  cycles: string[][]
  unreachable: string[]
}
