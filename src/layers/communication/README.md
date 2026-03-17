# CommunicationLayer - 通信层

## 概述

通信层负责 **Agent 任务通知、事件驱动、消息队列**，是系统各组件之间的沟通枢纽。

## 核心职责

```
ExecutionLayer 完成任务
      [down]
[EventEmitter] 发射事件 (task-completed)
      [down]
[MessageQueue] 入队 → 去重 → 优先级排序
      [down]
[AgentNotifier] 向 Agent 发送任务通知
      [down]
[NotificationManager] 管理重试 → 失败告警
      [down]
系统内其他层捕获事件 → ObservabilityLayer 记录
```

## 模块详解

### agent-notifier.ts (优化版，≈ 140 行)

**用途**：向指定 Agent 发送任务通知，跟踪通知状态。

**关键功能**：
1. **任务分配**：向 Agent 发送要执行的任务
2. **通知跟踪**：记录通知是否被发送、接收、执行
3. **失败处理**：处理无法送达的通知
4. **SLA 监控**：跟踪 Agent 响应时间

**接口**：
```typescript
/**
 * 向 Agent 发送任务
 */
export async function notifyAgentOfTask(
  agentName: string,
  task: Task
): Promise<NotificationResult>

/**
 * 获取 Agent 的待处理通知
 */
export function getAgentNotifications(
  agentName: string
): TaskNotification[]

/**
 * 标记通知已处理
 */
export function markNotificationProcessed(
  notificationId: string
): void

/**
 * 检查 SLA 违反情况
 */
export function detectSLAViolations(): SLAViolation[]
```

**通知数据结构**：
```typescript
interface TaskNotification {
  id: string
  agentName: string
  task: Task
  sentAt: number
  receivedAt?: number
  processedAt?: number
  status: 'pending' | 'sent' | 'received' | 'processed' | 'failed'
  retryCount: number
  error?: string
}

interface SLA {
  agentName: string
  maxResponseTimeMs: number = 5000     // 最长响应时间
  maxProcessingTimeMs: number = 30000  // 最长处理时间
}
```

---

### event-emitter.ts (优化版，≈ 130 行)

**用途**：实现发布/订阅事件系统，所有关键事件通过此模块分发。

**事件类型**：
```typescript
type WorkflowEventType =
  | 'workflow-started'       // 工作流开始
  | 'workflow-completed'     // 工作流完成
  | 'workflow-failed'        // 工作流失败
  | 'task-assigned'          // 任务分配
  | 'task-started'           // 任务开始
  | 'task-completed'         // 任务完成
  | 'task-failed'            // 任务失败
  | 'task-retried'           // 任务重试
  | 'checkpoint-created'     // 检查点创建
  | 'rollback-triggered'     // 回滚触发
  | 'agent-timeout'          // Agent 超时
```

**接口**：
```typescript
/**
 * 订阅事件
 */
export function on(
  eventType: WorkflowEventType,
  handler: (event: WorkflowEvent) => void
): UnsubscribeFn

/**
 * 取消订阅
 */
export function off(
  eventType: WorkflowEventType,
  handler: (event: WorkflowEvent) => void
): void

/**
 * 发射事件
 */
export function emit(
  eventType: WorkflowEventType,
  event: WorkflowEvent
): void

/**
 * 获取事件历史
 */
export function getEventHistory(
  sessionId: string
): WorkflowEvent[]

/**
 * 清理事件历史
 */
export function clearEventHistory(sessionId: string): void
```

**事件数据结构**：
```typescript
interface WorkflowEvent {
  id: string
  type: WorkflowEventType
  sessionId: string
  timestamp: number
  taskId?: string
  agentName?: string
  data: Record<string, any>    // 事件特定数据
  error?: string
}
```

**发射示例**：
```typescript
// 在 ExecutionLayer 任务完成时
emit('task-completed', {
  id: generateId(),
  type: 'task-completed',
  sessionId,
  timestamp: Date.now(),
  taskId: task.id,
  agentName: task.agent,
  data: {
    result: taskResult,
    duration: executionTime
  }
})
```

---

### message-queue.ts (新增，≈ 150 行)

**用途**：管理消息队列，支持优先级、去重、批量处理。

**关键功能**：
1. **FIFO 队列**：基础消息排队
2. **优先级**：高优先级消息优先处理
3. **去重**：防止重复消息
4. **批量处理**：支持批量消费消息
5. **死信队列**：处理失败消息

**接口**：
```typescript
/**
 * 入队消息
 */
export function enqueueMessage(
  message: Message,
  priority: number = 0  // 优先级越高越先处理
): string  // 消息 ID

/**
 * 出队消息
 */
export function dequeueMessage(
  batchSize: number = 1
): Message[]

/**
 * 标记消息处理完毕
 */
export function ackMessage(messageId: string): void

/**
 * 获取队列大小
 */
export function getQueueSize(): number

/**
 * 获取死信队列消息
 */
export function getDeadLetterMessages(): Message[]
```

**消息数据结构**：
```typescript
interface Message {
  id: string
  type: string                    // 消息类型
  sessionId: string
  content: Record<string, any>
  priority: number = 0            // 优先级
  retryCount: number = 0
  maxRetries: number = 3
  createdAt: number
  processedAt?: number
  error?: string
}

// 优先级约定：
// 1. 系统事件（告警、错误）：priority = 10
// 2. 工作流事件（任务完成）：priority = 5
// 3. 监控数据：priority = 1
// 4. 普通消息：priority = 0
```

---

### notification-manager.ts (新增，≈ 120 行)

**用途**：管理通知路由和重试，支持多通道。

**通知通道**：
1. **内存**：内存中的回调函数
2. **事件**：通过 EventEmitter 广播
3. **消息队列**：通过 MessageQueue 异步处理
4. **日志**：通过 Logger 记录

**接口**：
```typescript
/**
 * 发送通知
 */
export async function sendNotification(
  notification: Notification,
  channels: NotificationChannel[] = ['event', 'queue']
): Promise<NotificationResult>

/**
 * 获取未发送的通知
 */
export function getPendingNotifications(): Notification[]

/**
 * 重试失败的通知
 */
export async function retryFailedNotifications(): Promise<number>

/**
 * 订阅通知
 */
export function onNotification(
  handler: (notification: Notification) => void
): UnsubscribeFn
```

**通知数据结构**：
```typescript
interface Notification {
  id: string
  type: 'task-assignment' | 'task-completion' | 'error-alert' | 'status-update'
  recipient: string                   // Agent 名称或目标
  title: string
  message: string
  data?: Record<string, any>
  channels?: NotificationChannel[]
  retryCount?: number
  maxRetries?: number = 3
}

type NotificationChannel = 'memory' | 'event' | 'queue' | 'log'
```

---

### communication-types.ts (≈ 100 行)

**内容**：
```typescript
// Agent 注册
export interface AgentRegistration {
  agentName: string
  isOnline: boolean
  lastSeen: number
  capabilities: string[]       // 此 Agent 能处理的任务类型
}

// 任务通知
export interface TaskNotification {
  id: string
  agentName: string
  task: Task
  sentAt: number
  receivedAt?: number
  processedAt?: number
  status: NotificationStatus
  retryCount: number
  error?: string
}

export type NotificationStatus = 'pending' | 'sent' | 'received' | 'processed' | 'failed'

// SLA
export interface TaskSLA {
  agentName: string
  maxResponseTimeMs: number
  maxProcessingTimeMs: number
}

// 工作流事件
export interface WorkflowEvent {
  id: string
  type: WorkflowEventType
  sessionId: string
  timestamp: number
  taskId?: string
  agentName?: string
  data: Record<string, any>
  error?: string
}

export type WorkflowEventType =
  | 'workflow-started'
  | 'workflow-completed'
  | 'workflow-failed'
  | 'task-assigned'
  | 'task-started'
  | 'task-completed'
  | 'task-failed'
  | 'task-retried'
  | 'checkpoint-created'
  | 'rollback-triggered'
  | 'agent-timeout'
```

---

## 事件流示例

```typescript
// 1. ExecutionLayer 完成任务
const result = await agent.execute(task)

// 2. 发射事件
emit('task-completed', {
  taskId: task.id,
  agentName: agent.name,
  data: { result }
})

// 3. 多个订阅者收到事件

// 订阅者 1：ObservabilityLayer 记录指标
on('task-completed', (event) => {
  recordTaskCompletion(event.taskId, event.data.result)
})

// 订阅者 2：ResiliencyLayer 检查是否需要恢复
on('task-completed', (event) => {
  if (event.data.result.status === 'failed') {
    determineRecoveryStrategy(event)
  }
})

// 订阅者 3：CommunicationLayer 通知后续任务
on('task-completed', (event) => {
  const nextTasks = getNextTasks(event.taskId)
  nextTasks.forEach(task => {
    notifyAgentOfTask(task.agent, task)
  })
})

// 4. 同时入队到消息队列（用于异步处理）
enqueueMessage({
  type: 'task-completed',
  sessionId: event.sessionId,
  content: event,
  priority: 5
})
```

---

## 集成示例

```typescript
import {
  on,
  emit,
  notifyAgentOfTask,
  sendNotification
} from './communication/index.js'

// 初始化事件监听
on('task-completed', handleTaskCompletion)
on('workflow-failed', handleWorkflowFailure)

// 分配任务给 Agent
await notifyAgentOfTask('gongbu', {
  id: 'task-123',
  name: 'implement-feature',
  agent: 'gongbu',
  input: { feature: 'new-auth' }
})

// 发送通知
await sendNotification({
  id: 'notif-123',
  type: 'task-assignment',
  recipient: 'gongbu',
  title: 'New Task',
  message: 'You have a new task: implement-feature'
}, ['event', 'queue'])
```

---

## 相关文档

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - 总体架构
- [workflow-events.ts](./event-emitter.ts) - 事件系统实现
