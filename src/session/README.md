# Session - 会话管理

## 概述

此目录管理 **工作流会话的生命周期、状态和持久化**，是系统中所有信息的容器。

## 核心概念

### Session（会话）

一个 Session 代表一次**完整的工作流执行**，从开始到结束。每个 OpenCode 用户请求都会产生一个新的 Session。

```
Session 生命周期：
[Created] → [Active] ⟷ [Paused] → [Completed/Failed]
```

### Session 包含的数据

```typescript
interface SessionData {
  // 基本信息
  sessionId: string
  createdAt: number

  // 工作流信息
  workflowId?: string
  domain?: string
  intent?: string

  // 状态
  status: SessionStatus                  // active, paused, completed, failed, expired
  pauseCount: number
  totalDuration: number

  // 执行数据
  variables: Record<string, any>         // 工作流变量
  taskResults: Map<string, TaskResult>   // 任务执行结果
  executionHistory: ExecutionEvent[]     // 执行历史

  // 错误和恢复
  lastError?: Error
  recoveryAttempts: number

  // 检查点
  checkpoints: WorkflowCheckpoint[]
  currentCheckpointId?: string
}
```

## 目录结构

```
session/
├── session-manager.ts                # 会话管理器（核心，≈ 200 行）
├── session-state.ts                  # 会话状态存储（≈ 150 行）
├── session-persistence.ts            # 会话持久化（≈ 180 行）
├── session-types.ts                  # 类型定义（≈ 100 行）
└── README.md                         # 本文件
```

## 模块详解

### session-manager.ts (核心，≈ 200 行)

**用途**：管理 Session 的完整生命周期。

**关键功能**：
1. **创建会话**：初始化新会话
2. **暂停/恢复**：支持会话的暂停和恢复
3. **完成/失败**：标记会话完成或失败
4. **查询元数据**：获取会话信息
5. **过期管理**：自动清理过期会话

**接口**：
```typescript
/**
 * 创建新会话
 */
export function createSession(
  sessionId: string,
  intent?: string
): SessionMetadata

/**
 * 获取会话元数据
 */
export function getSessionMetadata(
  sessionId: string
): SessionMetadata | null

/**
 * 暂停会话（用户主动暂停或系统故障恢复）
 */
export function pauseSession(sessionId: string): boolean

/**
 * 恢复会话
 */
export function resumeSession(sessionId: string): boolean

/**
 * 标记会话完成
 */
export function completeSession(sessionId: string): boolean

/**
 * 标记会话失败
 */
export function failSession(sessionId: string): boolean

/**
 * 检查会话是否过期（1 小时）
 */
export function checkSessionExpiration(sessionId: string): SessionStatus

/**
 * 获取所有活跃会话
 */
export function getAllActiveSessions(): SessionMetadata[]

/**
 * 删除会话
 */
export function deleteSession(sessionId: string): boolean

/**
 * 清理所有会话（用于测试）
 */
export function clearSessions(): void
```

**会话元数据**：
```typescript
interface SessionMetadata {
  sessionId: string
  createdAt: number
  startedAt?: number
  pausedAt?: number
  completedAt?: number
  status: SessionStatus
  totalDuration: number              // 总执行时间
  pauseCount: number                 // 被暂停的次数
}

type SessionStatus = 'active' | 'paused' | 'completed' | 'expired' | 'failed'
```

---

### session-state.ts (≈ 150 行)

**用途**：管理会话的执行状态，包括变量、任务结果等。

**关键功能**：
1. **变量管理**：局部变量（限定在此会话）
2. **任务结果存储**：缓存任务执行结果
3. **执行历史**：记录关键执行事件
4. **临时数据**：会话级别的临时数据

**接口**：
```typescript
/**
 * 设置会话变量
 */
export function setSessionVariable(
  sessionId: string,
  key: string,
  value: any
): void

/**
 * 获取会话变量
 */
export function getSessionVariable(
  sessionId: string,
  key: string
): any

/**
 * 获取所有会话变量
 */
export function getSessionVariables(sessionId: string): Record<string, any>

/**
 * 保存任务结果
 */
export function saveTaskResult(
  sessionId: string,
  taskId: string,
  result: TaskResult
): void

/**
 * 获取任务结果
 */
export function getTaskResult(
  sessionId: string,
  taskId: string
): TaskResult | null

/**
 * 记录执行事件
 */
export function recordExecutionEvent(
  sessionId: string,
  event: ExecutionEvent
): void

/**
 * 获取执行历史
 */
export function getExecutionHistory(sessionId: string): ExecutionEvent[]

/**
 * 清理会话状态（会话完成时）
 */
export function clearSessionState(sessionId: string): void
```

---

### session-persistence.ts (≈ 180 行)

**用途**：将会话数据保存到磁盘，支持恢复。

**存储位置**：
```
.opencode/
└── sessions/
    ├── session-1.json              # Session 1 的状态快照
    ├── session-2.json              # Session 2 的状态快照
    └── session-index.json          # 索引（快速查询活跃会话）
```

**关键功能**：
1. **保存会话快照**：定期或关键时刻保存
2. **恢复会话状态**：系统重启后恢复
3. **版本控制**：支持会话版本历史
4. **清理策略**：自动清理过期会话文件

**接口**：
```typescript
/**
 * 保存会话到磁盘
 */
export function saveSessionSnapshot(
  root: string,
  sessionId: string
): void

/**
 * 从磁盘恢复会话
 */
export function loadSessionSnapshot(
  root: string,
  sessionId: string
): SessionSnapshot | null

/**
 * 检查是否有持久化的会话
 */
export function hasPersistedSession(
  root: string,
  sessionId: string
): boolean

/**
 * 删除持久化的会话
 */
export function deletePersistedSession(
  root: string,
  sessionId: string
): void

/**
 * 列出所有持久化的会话
 */
export function listPersistedSessions(root: string): SessionSnapshot[]

/**
 * 清理过期的会话文件（> 30 天）
 */
export function cleanupExpiredSessions(root: string): void
```

**会话快照**：
```typescript
interface SessionSnapshot {
  version: string = '1.0'
  sessionId: string
  metadata: SessionMetadata
  state: SessionState
  savedAt: number
  checksum?: string                  // 用于检测文件篡改
}

interface SessionState {
  variables: Record<string, any>
  taskResults: Record<string, TaskResult>
  executionHistory: ExecutionEvent[]
  currentCheckpointId?: string
  checkpoints: WorkflowCheckpoint[]
}
```

---

### session-types.ts (≈ 100 行)

**内容**：
```typescript
// 会话元数据
export interface SessionMetadata {
  sessionId: string
  createdAt: number
  startedAt?: number
  pausedAt?: number
  completedAt?: number
  status: SessionStatus
  totalDuration: number
  pauseCount: number
}

export type SessionStatus = 'active' | 'paused' | 'completed' | 'expired' | 'failed'

// 会话状态
export interface SessionState {
  variables: Record<string, any>
  taskResults: Map<string, TaskResult>
  executionHistory: ExecutionEvent[]
  currentCheckpointId?: string
  checkpoints: WorkflowCheckpoint[]
}

// 会话快照
export interface SessionSnapshot {
  version: string
  sessionId: string
  metadata: SessionMetadata
  state: SessionState
  savedAt: number
  checksum?: string
}

// 执行事件
export interface ExecutionEvent {
  timestamp: number
  type: string                       // 'task-start', 'task-complete', 'error', 等
  taskId?: string
  data: Record<string, any>
}

// 任务结果
export interface TaskResult {
  taskId: string
  status: 'completed' | 'failed' | 'skipped'
  output: any
  error?: string
  duration: number
  retryCount: number
}
```

---

## 会话生命周期示例

```typescript
import {
  createSession,
  setSessionVariable,
  saveTaskResult,
  pauseSession,
  resumeSession,
  completeSession,
  saveSessionSnapshot
} from './session/index.js'

// 1. 创建会话
const sessionId = 'session-' + Date.now()
createSession(sessionId, 'extract assets from src/')

// 2. 设置执行参数
setSessionVariable(sessionId, 'module_name', 'asset-manager')
setSessionVariable(sessionId, 'asset_type', 'service')

// 3. 执行任务，保存结果
saveTaskResult(sessionId, 'task-1', {
  taskId: 'task-1',
  status: 'completed',
  output: { assets: [...] },
  duration: 1234,
  retryCount: 0
})

// 4. 如果需要暂停（例如等待用户输入）
pauseSession(sessionId)
saveSessionSnapshot(rootDir, sessionId)

// 5. 恢复会话（系统重启后或用户继续）
resumeSession(sessionId)

// 6. 继续执行更多任务...

// 7. 完成会话
completeSession(sessionId)
saveSessionSnapshot(rootDir, sessionId)

// 8. 报告生成
const report = generateSessionReport(sessionId)
```

---

## 性能考虑

1. **内存使用**：活跃会话数通常不超过 100，每个会话 < 10MB
2. **磁盘使用**：每个会话快照 < 1MB，按需保存
3. **查询速度**：索引文件允许 O(1) 查询
4. **并发**：使用互斥锁保护共享状态

---

## 相关文档

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - 总体架构
- [session-lifecycle.ts](./session-manager.ts) - 会话管理实现
