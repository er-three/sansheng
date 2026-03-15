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
