/**
 * 应用常量定义
 * 集中管理所有魔术字符串、状态值和配置常量
 */

// ============== 任务状态 ==============
export const TASK_STATUS = {
  PENDING: 'pending',
  CLAIMED: 'claimed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'done',
  FAILED: 'failed',
} as const

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS]

// ============== 风险等级 ==============
export const RISK_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const

export type RiskLevel = typeof RISK_LEVEL[keyof typeof RISK_LEVEL]

// ============== 操作结果 ==============
export const OPERATION_RESULT = {
  ALLOWED: 'allowed',
  BLOCKED: 'blocked',
} as const

export type OperationResult = typeof OPERATION_RESULT[keyof typeof OPERATION_RESULT]

// ============== 会话状态 ==============
export const SESSION_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS]

// ============== 测试状态 ==============
export const TEST_STATUS = {
  PASSED: 'passed',
  FAILED: 'failed',
  NOT_RUN: 'not_run',
} as const

export type TestStatus = typeof TEST_STATUS[keyof typeof TEST_STATUS]

// ============== 日志组件名称 ==============
export const LOG_COMPONENT = {
  AUDIT_SYSTEM: 'AuditSystem',
  GATEWAY: 'Gateway',
  PROGRAMMING_AGENT: 'ProgrammingAgent',
  TEST_ENFORCEMENT: 'TestEnforcement',
  AGENT_COMMUNICATION: 'AgentComm',
  CHANCELLERY: 'Chancellery',
  WORKFLOW_MANAGER: 'WorkflowManager',
  EXECUTION_ENGINE: 'ExecutionEngine',
  OBSERVABILITY: 'ObservabilityLayer',
  COMMUNICATION: 'CommunicationLayer',
  RESILIENCY: 'ResiliencyLayer',
  SESSION_MANAGER: 'SessionManager',
} as const

// ============== 错误分类 ==============
export const ERROR_CODE = {
  // 工作流错误
  WORKFLOW_NOT_INITIALIZED: 'ERR_001',
  NO_TASK_DECLARED: 'ERR_002',
  TASK_NOT_FOUND: 'ERR_003',
  TASK_NOT_CLAIMED: 'ERR_004',
  DEPENDENCIES_INCOMPLETE: 'ERR_005',

  // 修改错误
  MODIFICATION_PLAN_MISSING: 'ERR_101',
  MENXIA_REVIEW_REQUIRED: 'ERR_102',
  MENXIA_REVIEW_NOT_COMPLETED: 'ERR_103',
  PREVIOUS_TESTS_FAILED: 'ERR_104',

  // 文件操作错误
  FILE_READ_ERROR: 'ERR_201',
  FILE_WRITE_ERROR: 'ERR_202',
  FILE_NOT_FOUND: 'ERR_203',

  // 系统错误
  INTERNAL_ERROR: 'ERR_500',
  INVALID_INPUT: 'ERR_400',
} as const

// ============== 错误消息模板 ==============
export const ERROR_MESSAGE = {
  WORKFLOW_NOT_INITIALIZED: '工作流未初始化',
  NO_TASK_DECLARED: '没有声明当前任务',
  TASK_NOT_FOUND: '任务不存在',
  TASK_NOT_CLAIMED: '任务未被声明',
  DEPENDENCIES_INCOMPLETE: '前置任务未完成',
  MODIFICATION_PLAN_MISSING: '执行阶段必须有修改计划',
  MENXIA_REVIEW_REQUIRED: '必须经过 menxia 审核',
  MENXIA_REVIEW_NOT_COMPLETED: 'menxia 审核未完成',
  PREVIOUS_TESTS_FAILED: '上一次修改的测试失败',
} as const

// ============== 任务类型 ==============
export const TASK_TYPE = {
  UNDERSTAND: 'understand',
  PLAN: 'plan',
  MENXIA_REVIEW: 'menxia_review',
  EXECUTE: 'execute',
  VERIFY: 'verify',
} as const

export type TaskType = typeof TASK_TYPE[keyof typeof TASK_TYPE]

// ============== 工作流事件类型 ==============
export const WORKFLOW_EVENT_TYPE = {
  STARTED: 'workflow-started',
  COMPLETED: 'workflow-completed',
  FAILED: 'workflow-failed',
  TASK_ASSIGNED: 'task-assigned',
  TASK_STARTED: 'task-started',
  TASK_COMPLETED: 'task-completed',
  TASK_FAILED: 'task-failed',
  TASK_RETRIED: 'task-retried',
  CHECKPOINT_CREATED: 'checkpoint-created',
  ROLLBACK_TRIGGERED: 'rollback-triggered',
  AGENT_TIMEOUT: 'agent-timeout',
} as const

export type WorkflowEventType = typeof WORKFLOW_EVENT_TYPE[keyof typeof WORKFLOW_EVENT_TYPE]

// ============== 配置常量 ==============
export const CONFIG = {
  // 会话过期时间（毫秒）
  SESSION_EXPIRATION_MS: 1 * 60 * 60 * 1000, // 1 小时

  // Agent 心跳超时（毫秒）
  AGENT_HEARTBEAT_TIMEOUT_MS: 5 * 60 * 1000, // 5 分钟

  // 重试配置
  RETRY_INITIAL_DELAY_MS: 100,
  RETRY_MAX_DELAY_MS: 30000,
  RETRY_BACKOFF_MULTIPLIER: 2,

  // 熔断器配置
  CIRCUIT_BREAKER_THRESHOLD: 5,
  CIRCUIT_BREAKER_TIMEOUT_MS: 60000,

  // 审计系统
  AUDIT_DIR: '.opencode/audit',

  // 网关性能目标
  GATEWAY_TIMEOUT_MS: 10,
} as const

// ============== 模式 (Pattern) ==============
export const PATTERN = {
  MENXIA_TASK: /menxia|review/i,
  EXECUTION_TASK: /execute/i,
  EXECUTE_PREFIX: 'execute-',
} as const

export const TASK_PREFIXES = {
  MENXIA: 'menxia-',
  REVIEW: 'review-',
  EXECUTE: 'execute-',
} as const

// ============== 路径常量 ==============
export const PATHS = {
  OPENCODE_DIR: '.opencode',
  AUDIT_DIR: '.opencode/audit',
  WORKFLOWS_DIR: '.opencode/workflows',
  SESSIONS_DIR: '.opencode/sessions',
} as const
