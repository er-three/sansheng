# Layers - 四个功能层

## 概述

此目录包含 WorkflowManager 的四个核心功能层，每一层负责不同的职能。

## 层级架构

```
WorkflowManager
├── ExecutionLayer       # 执行引擎（任务调度和执行）
├── ObservabilityLayer   # 可观测性（监控和分析）
├── ResiliencyLayer      # 弹性层（容错和恢复）
└── CommunicationLayer   # 通信层（Agent 通知和事件）
```

## 各层详解

### execution/ - 执行引擎层

**职责**：
- 任务队列管理
- Recipe 解析
- 依赖关系管理
- 执行协调

**关键模块**：
- `task-queue.ts` - 任务队列（优化版，≈ 200 行）
- `recipe-resolver.ts` - Recipe 解析器（新，≈ 250 行）
- `dependency-manager.ts` - 依赖管理（优化版，≈ 150 行）
- `execution-coordinator.ts` - 执行协调（新，≈ 180 行）
- `execution-types.ts` - 类型定义（≈ 150 行）

**设计原则**：
- 使用拓扑排序实现任务调度
- 循环依赖检测
- 支持并行任务执行
- 错误转发到 ResiliencyLayer

**集成示例**：
```typescript
import { ExecutionLayer } from './layers/execution/index.js'

const execution = new ExecutionLayer()
const result = await execution.executeWorkflow(workflow)
```

---

### observability/ - 可观测性层

**职责**：
- Agent 心跳监控
- 工作流分析
- 审计日志持久化
- 性能指标收集

**关键模块**：
- `heartbeat-monitor.ts` - Agent 心跳（≈ 150 行）
- `analytics-collector.ts` - 分析数据（≈ 120 行）
- `audit-logger.ts` - 审计日志（≈ 180 行，文件持久化）
- `metrics-aggregator.ts` - 指标聚合（新，≈ 120 行）
- `observability-types.ts` - 类型定义（≈ 100 行）

**数据持久化**：
- 审计记录保存到 `.opencode/audit/{sessionId}.json`
- 支持离线查询和报告生成

**集成示例**：
```typescript
import { ObservabilityLayer } from './layers/observability/index.js'

const obs = new ObservabilityLayer()
obs.recordTaskStart(taskId)
obs.recordTaskCompletion(taskId, result)
const report = obs.generateAuditReport()
```

---

### resiliency/ - 弹性层

**职责**：
- 自动重试管理
- 错误恢复策略
- 工作流回滚
- 熔断器（Circuit Breaker）

**关键模块**：
- `retry-manager.ts` - 重试管理（≈ 120 行）
- `recovery-handler.ts` - 错误恢复（≈ 140 行）
- `rollback-manager.ts` - 回滚管理（≈ 100 行）
- `circuit-breaker.ts` - 熔断器（新，≈ 140 行）
- `resiliency-types.ts` - 类型定义（≈ 120 行）

**恢复策略**：
- `retry` - 指数退避重试
- `skip` - 跳过失败的任务
- `rollback` - 回滚到前一检查点
- `alert` - 触发告警
- `abort` - 中止整个工作流

**集成示例**：
```typescript
import { ResiliencyLayer } from './layers/resiliency/index.js'

const resilience = new ResiliencyLayer()
const strategy = resilience.getRecoveryStrategy(error)
await resilience.executeRecoveryStrategy(strategy)
```

---

### communication/ - 通信层

**职责**：
- Agent 任务通知
- 事件驱动系统
- 消息队列管理
- 通知管理

**关键模块**：
- `agent-notifier.ts` - Agent 通知（≈ 140 行）
- `event-emitter.ts` - 事件发射器（≈ 130 行）
- `message-queue.ts` - 消息队列（新，≈ 150 行）
- `notification-manager.ts` - 通知管理（新，≈ 120 行）
- `communication-types.ts` - 类型定义（≈ 100 行）

**事件类型**：
- `task-assigned` - 任务分配给 Agent
- `task-completed` - Agent 完成任务
- `task-failed` - 任务执行失败
- `workflow-started` - 工作流开始
- `workflow-completed` - 工作流完成
- `workflow-failed` - 工作流失败

**集成示例**：
```typescript
import { CommunicationLayer } from './layers/communication/index.js'

const comm = new CommunicationLayer()

// 发送事件
comm.emit('task-assigned', { taskId, agentName })

// 订阅事件
comm.on('task-completed', (event) => {
  // 处理完成事件
})
```

---

## 层间通信

```
ExecutionLayer ←→ ResiliencyLayer
      [down]              [down]
      └────→ ObservabilityLayer
                      [down]
                CommunicationLayer
```

**通信流**：
1. ExecutionLayer 执行任务
2. 每个操作都记录到 ObservabilityLayer
3. 失败时触发 ResiliencyLayer 的恢复
4. 重要事件通过 CommunicationLayer 通知

---

## 添加新层的步骤

```
1. 在此目录创建新层目录（如 `security/`）

2. 创建模块文件：
   ├─ main-module.ts         # 核心实现
   ├─ layer-types.ts         # 类型定义
   └─ index.ts               # 导出接口

3. 在 WorkflowManager 中集成新层

4. 编写单元测试（test/unit/layers/new-layer.test.ts）

5. 更新此 README 和 ARCHITECTURE.md
```

---

## 性能考虑

- **ExecutionLayer**：O(V + E) 拓扑排序，其中 V=任务数，E=依赖数
- **ObservabilityLayer**：异步批量写入审计日志（避免阻塞）
- **ResiliencyLayer**：指数退避防止级联失败
- **CommunicationLayer**：消息队列防止事件丢失

---

## 相关文档

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - 总体架构说明
- 各层的 README 文件
