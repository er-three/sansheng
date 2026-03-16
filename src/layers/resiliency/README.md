# ResiliencyLayer - 弹性层

## 概述

弹性层负责**容错和恢复**，确保工作流即使遇到失败也能自动恢复。

## 核心职责

```
ExecutionLayer 任务失败
      ↓
[ErrorRecoveryHandler] 分析错误 → 选择恢复策略
      ↓
├─ [RetryManager] 重试（指数退避）
├─ [RollbackManager] 回滚（恢复到检查点）
├─ [CircuitBreaker] 熔断（防止级联失败）
└─ [RecoveryHandler] 执行恢复操作
      ↓
继续执行或中止工作流
```

## 模块详解

### retry-manager.ts (优化版，≈ 120 行)

**用途**：管理失败任务的重试策略，使用指数退避算法。

**关键功能**：
1. **重试计数**：跟踪每个任务的重试次数
2. **指数退避**：计算重试延迟（2^retryCount）
3. **重试限制**：设置最大重试次数
4. **重试条件**：确定是否应该重试

**配置参数**：
```typescript
interface RetryPolicy {
  maxRetries: number = 3              // 最大重试次数
  initialDelayMs: number = 100        // 初始延迟（毫秒）
  maxDelayMs: number = 30000          // 最大延迟（毫秒）
  backoffMultiplier: number = 2       // 退避倍数
  retryableErrors: RegExp[]           // 可重试的错误模式
}
```

**接口**：
```typescript
/**
 * 记录任务失败
 */
export function recordTaskFailure(
  sessionId: string,
  taskId: string,
  error: Error
): void

/**
 * 判断是否应该重试
 */
export function shouldRetryTask(
  sessionId: string,
  taskId: string
): boolean

/**
 * 计算重试延迟
 */
export function calculateRetryDelay(
  sessionId: string,
  taskId: string
): number

/**
 * 获取所有可重试的任务
 */
export function getRetryableTaskIds(sessionId: string): string[]
```

**算法**：
```
延迟 = min(初始延迟 × 2^(重试次数), 最大延迟)

例如：初始延迟 = 100ms，倍数 = 2
  第 1 次重试：100ms
  第 2 次重试：200ms
  第 3 次重试：400ms
  第 4 次重试：800ms（如果最大延迟 = 1000ms，则为 1000ms）
```

---

### recovery-handler.ts (优化版，≈ 140 行)

**用途**：根据错误类型选择和执行恢复策略。

**恢复策略**：
```typescript
type RecoveryStrategy = 'retry' | 'skip' | 'rollback' | 'alert' | 'abort'

// retry: 重新执行任务（由 RetryManager 处理）
// skip: 跳过失败任务，继续下一个
// rollback: 回滚到前一检查点（由 RollbackManager 处理）
// alert: 触发告警，等待人工干预
// abort: 中止整个工作流
```

**接口**：
```typescript
/**
 * 注册错误处理器
 */
export function registerErrorHandler(
  sessionId: string,
  errorPattern: RegExp,
  strategy: RecoveryStrategy,
  maxAttempts: number,
  description: string
): void

/**
 * 获取恢复策略
 */
export function getRecoveryStrategy(
  sessionId: string,
  error: Error
): RecoveryStrategy

/**
 * 设置默认恢复策略
 */
export function setDefaultStrategy(
  sessionId: string,
  strategy: RecoveryStrategy
): void

/**
 * 执行恢复
 */
export async function executeRecoveryStrategy(
  sessionId: string,
  strategy: RecoveryStrategy,
  context: RecoveryContext
): Promise<boolean>  // 是否成功恢复
```

**错误模式示例**：
```typescript
// 网络错误 → 重试
registerErrorHandler(
  sessionId,
  /Network error|timeout/i,
  'retry',
  3,
  '网络连接问题，自动重试'
)

// 权限错误 → 中止
registerErrorHandler(
  sessionId,
  /Permission denied|Unauthorized/i,
  'abort',
  0,
  '权限不足，无法继续'
)

// 非关键任务失败 → 跳过
registerErrorHandler(
  sessionId,
  /Optional step failed/i,
  'skip',
  0,
  '可选步骤失败，继续执行'
)
```

---

### rollback-manager.ts (优化版，≈ 100 行)

**用途**：管理检查点和工作流回滚。

**关键概念**：
- **检查点**：保存工作流状态的快照
- **回滚**：恢复到前一个检查点
- **粒度**：可以按任务或阶段创建检查点

**接口**：
```typescript
/**
 * 创建检查点（保存当前状态）
 */
export function createCheckpoint(
  sessionId: string,
  label: string
): string  // 检查点 ID

/**
 * 回滚到指定检查点
 */
export async function rollbackToCheckpoint(
  sessionId: string,
  checkpointId: string
): Promise<boolean>

/**
 * 列出所有检查点
 */
export function listCheckpoints(sessionId: string): WorkflowCheckpoint[]

/**
 * 删除检查点
 */
export function deleteCheckpoint(
  sessionId: string,
  checkpointId: string
): boolean
```

**检查点数据结构**：
```typescript
interface WorkflowCheckpoint {
  id: string
  label: string
  sessionId: string
  timestamp: number
  taskStates: Map<string, TaskState>   // 任务状态快照
  completedTaskIds: string[]           // 已完成的任务
  variables: Record<string, any>       // 当前变量值
}
```

**使用场景**：
```typescript
// 在关键步骤前创建检查点
createCheckpoint(sessionId, 'before-deployment')

// 如果部署失败，回滚
await rollbackToCheckpoint(sessionId, checkpointId)

// 重新执行从回滚点开始的任务
```

---

### circuit-breaker.ts (新增，≈ 140 行)

**用途**：实现熔断器模式，防止级联失败。

**状态机**：
```
[Closed] ──fail──→ [Open]
  ↑                  │
  └──success────────┴─→ [HalfOpen] ──success→ [Closed]
                            │
                          fail → [Open]
```

**状态说明**：
- **Closed**：正常状态，请求通过
- **Open**：故障状态，拒绝请求（快速失败）
- **HalfOpen**：恢复测试，允许部分请求通过

**接口**：
```typescript
/**
 * 记录请求（成功或失败）
 */
export function recordRequest(
  circuitName: string,
  success: boolean
): void

/**
 * 检查熔断器状态
 */
export function isCircuitOpen(circuitName: string): boolean

/**
 * 获取熔断器状态
 */
export function getCircuitStatus(circuitName: string): CircuitState

/**
 * 手动打开/关闭熔断器
 */
export function setCircuitState(
  circuitName: string,
  state: CircuitState
): void
```

**配置参数**：
```typescript
interface CircuitBreakerConfig {
  failureThreshold: number = 5         // 失败次数阈值
  successThreshold: number = 2         // 恢复成功次数阈值
  timeout: number = 60000              // Open 状态持续时间（毫秒）
  halfOpenMaxRequests: number = 3      // HalfOpen 状态最多允许请求数
}
```

---

### resiliency-types.ts (≈ 120 行)

**内容**：
```typescript
// 重试策略
export interface RetryPolicy {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryableErrors: RegExp[]
}

// 恢复策略
export type RecoveryStrategy = 'retry' | 'skip' | 'rollback' | 'alert' | 'abort'

// 工作流检查点
export interface WorkflowCheckpoint {
  id: string
  label: string
  sessionId: string
  timestamp: number
  taskStates: Map<string, TaskState>
  completedTaskIds: string[]
  variables: Record<string, any>
}

// 熔断器状态
export type CircuitState = 'Closed' | 'Open' | 'HalfOpen'

export interface CircuitBreakerConfig {
  failureThreshold: number
  successThreshold: number
  timeout: number
  halfOpenMaxRequests: number
}
```

---

## 恢复决策树

```
┌─ 任务失败
│
├─ 是否为临时错误（网络、超时）?
│  ├─ YES → retry（由 RetryManager 处理）
│  └─ NO → 下一步
│
├─ 是否为可选任务?
│  ├─ YES → skip
│  └─ NO → 下一步
│
├─ 是否为权限相关错误?
│  ├─ YES → alert（等待人工干预）
│  └─ NO → 下一步
│
├─ 是否有前一检查点?
│  ├─ YES → rollback（回滚到检查点）
│  └─ NO → 下一步
│
└─ 中止工作流（abort）
```

---

## 集成示例

```typescript
import {
  recordTaskFailure,
  getRecoveryStrategy,
  executeRecoveryStrategy,
  createCheckpoint,
  rollbackToCheckpoint
} from './resiliency/index.js'

// 在 ExecutionLayer 中
try {
  const result = await executeTask(task)
} catch (error) {
  // 1. 记录失败
  recordTaskFailure(sessionId, task.id, error)

  // 2. 确定恢复策略
  const strategy = getRecoveryStrategy(sessionId, error)

  // 3. 执行恢复
  const recovered = await executeRecoveryStrategy(
    sessionId,
    strategy,
    context
  )

  if (!recovered) {
    // 恢复失败，中止工作流
    throw error
  }
}

// 在关键步骤前创建检查点
createCheckpoint(sessionId, 'before-critical-step')

// 如果需要回滚
await rollbackToCheckpoint(sessionId, checkpointId)
```

---

## 相关文档

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - 总体架构
- [error-recovery.ts](./recovery-handler.ts) - 错误恢复实现
