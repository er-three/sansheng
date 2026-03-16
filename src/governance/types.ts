/**
 * 治理系统的核心类型定义
 * 包括Plan、Step、Task、Decision等数据结构
 */

// ==================== 枚举定义 ====================

export enum AgentRole {
  HUANGDI = "huangdi",       // 皇帝
  ZHONGSHU = "zhongshu",     // 中书省
  MENXIA = "menxia",         // 门下省
  SHANGSHU = "shangshu",     // 尚书省
  YIBU = "yibu",             // 吏部
  HUBU = "hubu",             // 户部
  GONGBU = "gongbu",         // 工部
  BINGBU = "bingbu",         // 兵部
  XINGBU = "xingbu",         // 刑部
}

export enum TaskStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum TaskType {
  PLAN = "plan",
  REVIEW = "review",
  EXECUTE = "execute",
  VERIFY = "verify",
}

export enum Decision {
  PASS = "pass",
  RETRY = "retry",
  SKIP = "skip",
  ESCALATE = "escalate",
}

export enum ErrorCode {
  SYNTAX_ERROR = "SYNTAX_ERROR",
  RUNTIME_ERROR = "RUNTIME_ERROR",
  TIMEOUT = "TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
  PERMISSION_ERROR = "PERMISSION_ERROR",
  UNSUPPORTED = "UNSUPPORTED",
  OTHER = "OTHER",
}

// ==================== 基础接口 ====================

export interface Timestamp {
  createdAt: Date
  updatedAt: Date
}

export interface Metadata {
  attempt?: number
  startTime?: Date
  endTime?: Date
  durationMs?: number
  [key: string]: any
}

// ==================== Plan 和 Step ====================

export interface AcceptanceCriteria {
  [key: string]: string | number | boolean
}

export interface Step {
  id: string
  name: string
  uses: AgentRole[]  // 这个Step由哪些部门执行
  dependencies: string[]  // 依赖的Step ID
  input: Record<string, any>
  outputFormat?: Record<string, any>
  acceptanceCriteria: AcceptanceCriteria
  prompt?: string
  metadata?: Metadata
}

export interface Plan {
  id: string
  domain: string
  createdBy: AgentRole
  steps: Step[]
  dependencyGraph: Record<string, string[]>
  criticalPath: string[]
  estimatedDurationMinutes: number
  metadata?: Metadata
}

// ==================== Task ====================

export interface TaskInput {
  stepId: string
  ministry: AgentRole
  prompt: string
  input?: Record<string, any>
  deadline?: Date
  priority?: "high" | "normal" | "low"
}

export interface TaskResult {
  status: "success" | "failure"
  output?: Record<string, any>
  error?: ErrorInfo
  duration?: number
}

export interface ErrorInfo {
  code: ErrorCode
  message: string
  details?: Record<string, any>
  recoverySuggestion?: string
}

export interface Task {
  id: string
  taskId: string  // UUID
  createdAt: Date
  createdBy: AgentRole
  taskType: TaskType
  stepId: string
  stepName: string
  ministry: AgentRole
  prompt: string
  input?: Record<string, any>
  deadline?: Date
  priority: "high" | "normal" | "low"
  dependencies: TaskDependency[]
  status: TaskStatus
  result?: TaskResult
  error?: ErrorInfo
  metadata: Metadata
  retryCount: number
}

export interface TaskDependency {
  type: "step" | "task"
  id: string
  requiredStatus: TaskStatus
}

// ==================== 验证和决策 ====================

export interface VerificationResult {
  stepId: string
  status: "pass" | "fail"
  criteria: Record<string, { expected: any; actual: any; pass: boolean }>
  issues?: string[]
  failureCount?: number
}

export interface DecisionContext {
  stepId: string
  verification: VerificationResult
  previousAttempts: number
  suggestedAction?: Decision
}

export interface DecisionResult {
  decision: Decision
  reason: string
  retryInstructions?: string
  escalationReason?: string
  metadata?: Metadata
}

// ==================== 执行状态 ====================

export interface ExecutionState {
  executionId: string
  planId: string
  status: "running" | "completed" | "failed"
  startTime: Date
  endTime?: Date
  completedSteps: Set<string>
  failedSteps: Map<string, number>  // stepId -> failureCount
  inProgressTasks: Map<string, Task>  // taskId -> Task
  decisions: Map<string, DecisionResult>  // stepId -> Decision
}

export interface ExecutionReport {
  executionId: string
  planId: string
  duration: number
  totalSteps: number
  completedSteps: number
  failedSteps: number
  inProgressSteps: number
  pendingSteps: number
  statistics: {
    totalAttempts: number
    successRate: number
    averageStepDuration: number
  }
  stepResults: Map<string, StepResult>
  timeline: ExecutionTimeline[]
}

export interface StepResult {
  stepId: string
  name: string
  status: "completed" | "failed" | "pending"
  attempts: number
  outputs: Record<string, any>
  errors?: ErrorInfo[]
  duration: number
}

export interface ExecutionTimeline {
  timestamp: Date
  eventType: "step_started" | "step_completed" | "step_failed" | "decision_made"
  stepId: string
  details: Record<string, any>
}

// ==================== 通信协议 ====================

export interface ShangshuReport {
  reportType: "step_completion" | "verification_request" | "escalation"
  timestamp: Date
  stepId: string
  stepResult?: StepResult
  verificationRequest?: string
}

export interface MenxiaDecision {
  decision: Decision
  timestamp: Date
  stepId: string
  reasoning: Record<string, any>
  nextAction: {
    action: Decision
    targetStep?: string
    instructions?: string
  }
}

// ==================== 部门输出格式 ====================

export interface YibuOutput {
  issues: {
    file: string
    line: number
    severity: "error" | "warning" | "info"
    message: string
  }[]
  summary: {
    totalIssues: number
    critical: number
    warnings: number
  }
}

export interface HubuOutput {
  results: {
    title: string
    url: string
    snippet: string
    relevanceScore: number
  }[]
  documentation?: string
}

export interface GongbuOutput {
  filesCreated: string[]
  filesModified: string[]
  fileDetails: {
    path: string
    type: "created" | "modified"
    changes: string
  }[]
}

export interface BingbuOutput {
  testResults: {
    passed: number
    failed: number
    skipped: number
    duration: number
  }
  coverage: {
    lineCoverage: number
    branchCoverage: number
    functionCoverage: number
  }
  details: {
    testName: string
    status: "pass" | "fail"
    error?: string
  }[]
}

export interface XingbuOutput {
  diagnosis: {
    errorType: string
    rootCause: string
    affectedComponents: string[]
    severity: "critical" | "high" | "medium" | "low"
  }
  solution?: {
    immediateAction: string
    longTermSolution: string
  }
}

// ==================== 配置接口 ====================

export interface GovernanceConfig {
  maxRetries: number
  stepTimeoutSeconds: number
  globalTimeoutSeconds: number
  parallelStepLimit: number
  enableLogging: boolean
  logLevel: "debug" | "info" | "warn" | "error"
}

export interface AgentConfig {
  role: AgentRole
  model?: string
  temperature?: number
  maxSteps?: number
  tools: Record<string, boolean>
  permissions?: string[]
}
