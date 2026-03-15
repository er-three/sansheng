/**
 * 核心类型定义模块
 *
 * 包含 WorkflowManager 和相关系统的所有关键类型。
 * 这些类型是系统中最基础的，被所有其他模块引用。
 *
 * 类型体系：
 *   - WorkflowDefinition: 工作流定义（用户输入）
 *   - WorkflowStatus: 工作流执行状态
 *   - WorkflowResult: 工作流执行结果
 *   - ManagerConfig: WorkflowManager 配置
 */

/**
 * 工作流定义 - 用户提交的工作流
 */
export interface WorkflowDefinition {
  sessionId: string                   // 会话 ID
  intent: string                      // 用户意图描述
  domain?: string                     // 工作域（可选，可自动识别）
  variables?: Record<string, any>     // 执行变量
  recipe?: WorkflowRecipe             // 自定义 Recipe（可选）
  metadata?: Record<string, any>      // 元数据（如优先级等）
}

/**
 * 工作流 Recipe - 工作流模板定义
 */
export interface WorkflowRecipe {
  name: string
  version: string
  description?: string
  steps: RecipeStep[]
  parallel?: boolean                  // 步骤是否可以并行执行
  timeout?: number                    // 超时时间（毫秒）
}

/**
 * Recipe 步骤
 */
export interface RecipeStep {
  id: string
  name: string
  agent: string                       // 执行此步骤的 Agent
  dependencies?: string[]             // 依赖的步骤 ID
  parallel?: boolean
  retryable?: boolean
  input?: Record<string, any>
  condition?: string                  // 执行条件（可选）
}

/**
 * 工作流状态
 */
export type WorkflowStatus =
  | 'pending'                         // 等待执行
  | 'running'                         // 执行中
  | 'paused'                          // 暂停
  | 'completed'                       // 完成
  | 'failed'                          // 失败
  | 'rolled_back'                     // 已回滚

/**
 * 工作流执行结果
 */
export interface WorkflowResult {
  success: boolean
  status: WorkflowStatus
  output: Record<string, any>         // 最终输出
  errors: string[]
  warnings: string[]
  duration: number                    // 总执行时间（毫秒）
  taskResults: TaskResult[]           // 各任务的执行结果
  checkpoints?: WorkflowCheckpoint[]  // 创建的检查点
}

/**
 * 任务执行结果
 */
export interface TaskResult {
  taskId: string
  taskName: string
  agent: string
  status: 'completed' | 'failed' | 'skipped' | 'retried'
  output: any
  error?: string
  duration: number
  retryCount: number
  startTime: number
  endTime: number
}

/**
 * 工作流检查点
 */
export interface WorkflowCheckpoint {
  id: string
  label: string
  timestamp: number
  taskStates: Record<string, TaskState>
  completedTaskIds: string[]
  variables: Record<string, any>
}

/**
 * 任务状态快照
 */
export interface TaskState {
  taskId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  output?: any
  error?: string
}

/**
 * WorkflowManager 配置
 */
export interface WorkflowManagerConfig {
  // 执行引擎配置
  execution?: {
    timeout?: number                  // 默认任务超时（毫秒）
    maxParallel?: number              // 最大并行任务数
    retryPolicy?: {
      maxRetries: number
      initialDelayMs: number
      maxDelayMs: number
      backoffMultiplier: number
    }
  }

  // 会话配置
  session?: {
    ttl?: number                      // 会话过期时间（毫秒）
    persistenceEnabled?: boolean      // 是否启用持久化
  }

  // 审计配置
  audit?: {
    enabled?: boolean
    path?: string                     // 审计日志路径
  }

  // 缓存配置
  cache?: {
    enabled?: boolean
    ttl?: number
    maxSize?: number
  }

  // 日志配置
  logging?: {
    level?: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE'
    enableConsole?: boolean
    enableFile?: boolean
  }

  // 高级配置
  debug?: boolean
  rootPath?: string                   // 项目根路径（.opencode 所在位置）
}

/**
 * 工作流管理器接口
 */
export interface IWorkflowManager {
  initialize(config: WorkflowManagerConfig): Promise<void>
  submitWorkflow(definition: WorkflowDefinition): Promise<string>
  getWorkflowStatus(workflowId: string): WorkflowStatus | null
  getWorkflowResult(workflowId: string): WorkflowResult | null
  pauseWorkflow(workflowId: string): Promise<boolean>
  resumeWorkflow(workflowId: string): Promise<boolean>
  dispose(): Promise<void>
}

/**
 * 执行引擎接口
 */
export interface IExecutionEngine {
  executeWorkflow(definition: WorkflowDefinition): Promise<WorkflowResult>
  resolveRecipe(recipe: WorkflowRecipe): void
  validateDependencies(sessionId: string): boolean
}

/**
 * 可观测性层接口
 */
export interface IObservabilityLayer {
  recordTaskStart(taskId: string): void
  recordTaskCompletion(taskId: string, result: any): void
  recordTaskFailure(taskId: string, error: Error): void
  generateAuditReport(sessionId: string): string
  getMetrics(sessionId: string): any
}

/**
 * 弹性层接口
 */
export interface IResiliencyLayer {
  getRecoveryStrategy(error: Error): string
  executeRecoveryStrategy(strategy: string, context: any): Promise<boolean>
  createCheckpoint(sessionId: string, label: string): string
  rollbackToCheckpoint(sessionId: string, checkpointId: string): Promise<boolean>
}

/**
 * 通信层接口
 */
export interface ICommunicationLayer {
  notifyAgent(agentName: string, task: any): Promise<any>
  emit(eventType: string, event: any): void
  on(eventType: string, handler: (event: any) => void): void
}

/**
 * 会话管理器接口
 */
export interface ISessionManager {
  createSession(sessionId: string): void
  getSessionMetadata(sessionId: string): any
  pauseSession(sessionId: string): boolean
  resumeSession(sessionId: string): boolean
  completeSession(sessionId: string): boolean
  setVariable(sessionId: string, key: string, value: any): void
  getVariable(sessionId: string, key: string): any
}
