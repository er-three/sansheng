/**
 * 统一的类型定义
 * 所有模块共享的接口和类型
 */

// ─────────────────── 约束相关 ───────────────────

export interface ConstraintDefinition {
  name: string
  content: string
  source: string
  priority: "high" | "medium" | "low"
}

// ─────────────────── 并行执行 ───────────────────

export interface ParallelTask {
  agent: string
  status: "pending" | "done" | "failed"
  error?: string
}

export interface ParallelStep {
  step_id: string
  tasks: ParallelTask[]
  all_done: boolean
  started_at: string
}

export interface PipelineState {
  completed: string[]
  current: string | null
  failed: string | null
  started_at: string
  parallel_execution?: ParallelStep | null
}

// ─────────────────── 注册表和配置 ───────────────────

export interface Registry {
  version: string
  active_domain: string
  variables: Record<string, string>
  pipeline_state?: PipelineState
  cache_settings?: {
    enabled: boolean
    strategy: "multi-level" | "memory-only"
    ttl_seconds?: number
  }
}

export interface DomainConfig {
  name: string
  description: string
  constraints: string[]
  pipeline: StepConfig[]
}

// ─────────────────── 流水线和步骤 ───────────────────

export interface VerificationCriterion {
  type:
    | "file_exists"
    | "file_not_empty"
    | "file_size_min"
    | "no_error_keywords"
    | "timeout"
    | "agent_all_done"
    | "custom"
    | "build_success"
  path?: string
  bytes?: number
  keywords?: string[]
  max_seconds?: number
  count?: number
  condition?: string
  error_msg?: string
}

export interface StepConfig {
  id: string
  name: string
  skill: string
  uses: string[]
  depends_on?: string[]
  success_criteria?: VerificationCriterion[]
  failure_criteria?: VerificationCriterion[]
  retry_max?: number
  on_success?: "continue" | "halt"
  on_failure?: "retry" | "halt" | "skip"
}

export interface StepResult {
  step_id: string
  step_name: string
  status: "success" | "failed" | "partial"
  passed_criteria: string[]
  failed_criteria: string[]
  details: Record<string, unknown>
  timestamp: number
}

export interface PipelineStepStatus {
  step_id: string
  status: "pending" | "in_progress" | "success" | "failed" | "partial"
  result?: StepResult
  retry_count: number
}

// ─────────────────── Session 状态 ───────────────────

export interface SessionState {
  sessionId: string
  constraintsInjected: boolean
  constraints: ConstraintDefinition[]
  timestamp: number
  domain: string
  agent: string
}

// ─────────────────── 全局约束 ───────────────────

export interface GlobalConstraints {
  universal?: Array<{ name: string; content: string; priority: string }>
  agent_implementation?: Array<{ name: string; content: string; priority: string }>
  agent_code_review?: Array<{ name: string; content: string; priority: string }>
  agent_verification?: Array<{ name: string; content: string; priority: string }>
  parallel_execution?: Array<{ name: string; content: string; priority: string }>
  [key: string]: any
}

// ─────────────────── 任务队列系统 ───────────────────

export interface WorkflowTask {
  id: string
  name: string
  agent: string
  description: string
  status: "pending" | "claimed" | "in_progress" | "done" | "failed"
  claimedBy?: string
  claimedAt?: number
  completedAt?: number
  dependencies: string[]
  outputs?: Record<string, any>
  error?: string
}

export interface TaskQueue {
  sessionId: string
  tasks: WorkflowTask[]
  currentTask: string | null
  completedTasks: string[]
  recipeType: "simple" | "medium" | "complex" | "high_risk"
  createdAt: number
  updatedAt: number
}

// ─────────────────── 流程配方系统 ───────────────────

export interface WorkflowRecipe {
  id: string
  name: string
  description: string
  steps: string[]
  canParallel?: string[][]
  criticalPath: string[]
  taskType: "simple" | "medium" | "complex" | "high_risk"
}

export interface RecipeContext {
  recipeId: string
  taskType: string
  description: string
  selectedAt: number
}

// ─────────────────── 验证结果 ───────────────────

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  data?: any
}

// ─────────────────── 新架构类型 (Phase 4+) ───────────────────

/**
 * 工作流定义 - 用户提交的工作流
 */
export interface WorkflowDefinition {
  sessionId: string
  intent: string
  domain?: string
  variables?: Record<string, any>
  recipe?: WorkflowRecipeDefinition
  metadata?: Record<string, any>
}

/**
 * 工作流 Recipe 定义（新架构）
 */
export interface WorkflowRecipeDefinition {
  name: string
  version: string
  description?: string
  steps: RecipeStepDefinition[]
  parallel?: boolean
  timeout?: number
}

/**
 * Recipe 步骤定义
 */
export interface RecipeStepDefinition {
  id: string
  name: string
  agent: string
  dependencies?: string[]
  parallel?: boolean
  retryable?: boolean
  input?: Record<string, any>
  condition?: string
}

/**
 * 工作流执行结果
 */
export interface WorkflowExecutionResult {
  success: boolean
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'rolled_back'
  output: Record<string, any>
  errors: string[]
  warnings: string[]
  duration: number
  taskResults: TaskExecutionResult[]
}

/**
 * 任务执行结果
 */
export interface TaskExecutionResult {
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
 * Agent 注册信息
 */
export interface AgentRegistration {
  agentName: string
  isOnline: boolean
  lastSeen: number
  capabilities: string[]
}

/**
 * 工作流事件
 */
export interface WorkflowEvent {
  id: string
  type: string
  sessionId: string
  timestamp: number
  taskId?: string
  agentName?: string
  data: Record<string, any>
  error?: string
}
