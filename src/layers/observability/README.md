# ObservabilityLayer - 可观测性层

## 概述

可观测性层负责**监控、分析、审计**，提供工作流执行的完整可见性。

## 核心职责

```
ExecutionLayer 执行任务
      ↓
[HeartbeatMonitor] 记录 Agent 活动 → 检测超时
      ↓
[AnalyticsCollector] 统计执行指标 → 计算成功率
      ↓
[AuditLogger] 持久化审计日志 → 存储到磁盘
      ↓
[MetricsAggregator] 聚合所有指标 → 生成报告
      ↓
可观测性信息 ← 供 Dashboard/报告使用
```

## 模块详解

### heartbeat-monitor.ts (优化版，≈ 150 行)

**用途**：监控 Agent 的活动状态，检测超时和失效。

**关键功能**：
1. **心跳记录**：记录 Agent 最后活动时间
2. **超时检测**：发现长时间无活动的 Agent
3. **健康评估**：综合多个指标评估 Agent 健康状态
4. **故障恢复触发**：触发 ResiliencyLayer 的恢复

**接口**：
```typescript
/**
 * 记录 Agent 的活动
 */
export function recordAgentActivity(
  agentName: string,
  taskId: string
): void

/**
 * 检测超时的 Agent（配置超时为 5 分钟）
 */
export function detectTimeouts(): AgentTimeout[]

/**
 * 获取 Agent 的健康状态
 */
export function getAgentHealth(agentName: string): AgentHealth

/**
 * 生成健康报告
 */
export function generateHealthReport(): string
```

**数据结构**：
```typescript
interface AgentHeartbeat {
  agentName: string
  lastActivity: number       // 时间戳
  status: 'healthy' | 'idle' | 'timeout' | 'dead'
  activeTaskCount: number
  totalTasksCompleted: number
  failureCount: number
}
```

---

### analytics-collector.ts (优化版，≈ 120 行)

**用途**：收集和分析工作流执行指标。

**关键指标**：
1. **执行时间统计**：最小、最大、平均执行时间
2. **成功率**：成功任务 / 总任务
3. **Agent 吞吐量**：单位时间内完成的任务数
4. **错误分析**：错误类型和频率

**接口**：
```typescript
/**
 * 记录任务执行时间
 */
export function recordTaskDuration(
  taskId: string,
  durationMs: number,
  success: boolean
): void

/**
 * 计算工作流指标
 */
export function calculateMetrics(sessionId: string): WorkflowMetrics

/**
 * 生成分析报告
 */
export function generateAnalyticsReport(sessionId: string): string
```

**输出指标**：
```typescript
interface WorkflowMetrics {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  successRate: number              // 百分比
  averageDuration: number          // 毫秒
  minDuration: number
  maxDuration: number
  agentThroughput: Map<string, number>  // Agent → 完成任务数
  p95Duration: number              // 95 百分位
  p99Duration: number              // 99 百分位
}
```

---

### audit-logger.ts (优化版，≈ 180 行，文件持久化)

**用途**：记录所有代码修改、审计决策、合规性事项，持久化到磁盘。

**关键功能**：
1. **操作日志**：记录每个 Agent 的操作
2. **审计跟踪**：记录代码修改的审查和批准
3. **合规报告**：生成符合规范的审计报告
4. **文件持久化**：存储到 `.opencode/audit/{sessionId}.json`

**存储位置**：
```
.opencode/
└── audit/
    ├── session-1.json          # Session 1 的审计记录
    ├── session-2.json          # Session 2 的审计记录
    └── audit-index.json        # 索引文件
```

**接口**：
```typescript
/**
 * 附加审计记录
 */
export function appendAuditRecord(
  root: string,
  sessionId: string,
  record: AuditRecord
): void

/**
 * 获取审计历史
 */
export function getAuditHistory(
  root: string,
  sessionId: string
): AuditRecord[]

/**
 * 生成可读的审计报告
 */
export function generateAuditReport(
  root: string,
  sessionId: string
): string

/**
 * 清理审计历史（用于测试）
 */
export function clearAuditHistory(root: string, sessionId: string): void
```

**审计记录结构**：
```typescript
interface AuditRecord {
  id: string                   // UUID
  timestamp: string            // ISO 8601
  sessionId: string
  agentName: string
  operation: string            // 操作类型
  taskId: string
  filesAffected: string[]
  linesChanged: number
  riskLevel: 'low' | 'medium' | 'high'
  menxiaReviewed: boolean      // 是否通过门下省审核
  testsPassed: boolean         // 测试是否通过
  gatewayChecks: string[]      // 通过的检查项
  result: 'allowed' | 'blocked'
  blockReason?: string         // 拒绝原因
}
```

**注释示例**：
```typescript
/**
 * 持久化审计记录到文件
 *
 * 流程：
 *   1. 读取现有审计文件（如果存在）
 *   2. 追加新记录
 *   3. 生成校验和（检测文件篡改）
 *   4. 原子写入（使用临时文件）
 *   5. 更新索引
 *
 * 设计原则：
 *   - 不可篡改：使用校验和保护
 *   - 高可用：写入失败时记录到日志
 *   - 效率：批量写入而非逐条写入
 */
export function appendAuditRecord(
  root: string,
  sessionId: string,
  record: AuditRecord
): void {
  // 实现
}
```

---

### metrics-aggregator.ts (新增，≈ 120 行)

**用途**：聚合所有监控数据，生成高级指标。

**关键功能**：
1. **时间序列聚合**：按时间段聚合指标
2. **百分位计算**：p50, p95, p99
3. **异常检测**：识别异常行为
4. **预测告警**：基于趋势预测问题

**接口**：
```typescript
/**
 * 聚合指标数据
 */
export function aggregateMetrics(
  timeWindow: TimeWindow
): AggregatedMetrics

/**
 * 生成性能报告
 */
export function generatePerformanceReport(
  sessionId: string
): PerformanceReport

/**
 * 检测异常（如性能下降）
 */
export function detectAnomalies(): Anomaly[]
```

---

### observability-types.ts (≈ 100 行)

**内容**：
```typescript
// 心跳接口
export interface AgentHeartbeat {
  agentName: string
  lastActivity: number
  status: AgentStatus
  activeTaskCount: number
  totalTasksCompleted: number
  failureCount: number
}

export type AgentStatus = 'healthy' | 'idle' | 'timeout' | 'dead'

// 工作流指标
export interface WorkflowMetrics {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  successRate: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  agentThroughput: Map<string, number>
  p95Duration: number
  p99Duration: number
}

// 审计记录
export interface AuditRecord {
  id: string
  timestamp: string
  sessionId: string
  agentName: string
  operation: string
  taskId: string
  filesAffected: string[]
  linesChanged: number
  riskLevel: RiskLevel
  menxiaReviewed: boolean
  testsPassed: boolean
  gatewayChecks: string[]
  result: AuditResult
  blockReason?: string
}

export type RiskLevel = 'low' | 'medium' | 'high'
export type AuditResult = 'allowed' | 'blocked'
```

---

## 集成点

### 与 ExecutionLayer 的集成

```typescript
// ExecutionLayer 在执行任务时
await recordTaskStart(taskId)
try {
  const result = await agent.execute(task)
  recordTaskCompletion(taskId, result)
} catch (error) {
  recordTaskFailure(taskId, error)
}
```

### 与 ResiliencyLayer 的集成

```typescript
// ResiliencyLayer 在触发恢复前
const metrics = calculateMetrics(sessionId)
if (metrics.successRate < 0.5) {
  // 成功率过低，可能需要中止工作流
  triggerAlert('success_rate_critical')
}
```

### 与 CommunicationLayer 的集成

```typescript
// CommunicationLayer 发送事件时记录
emit('task-completed', event)
recordToAudit(event)  // 同时记录审计
```

---

## 数据持久化策略

### 审计日志

- **位置**：`.opencode/audit/{sessionId}.json`
- **格式**：JSON Lines（每行一条记录）
- **大小限制**：单个文件最大 100MB，超过后分片
- **保留期**：30 天（自动清理）

### 指标数据

- **存储**：内存（不持久化，仅用于报告生成）
- **范围**：当前会话
- **生命周期**：会话结束后清理

### 审计索引

- **位置**：`.opencode/audit/audit-index.json`
- **作用**：快速查询特定会话的审计记录
- **更新**：每次添加审计记录时更新

---

## 查询示例

```typescript
// 获取某个会话的所有审计记录
const history = getAuditHistory(rootDir, sessionId)

// 生成报告
const report = generateAuditReport(rootDir, sessionId)

// 查询指标
const metrics = calculateMetrics(sessionId)
console.log(`成功率: ${metrics.successRate * 100}%`)
console.log(`平均耗时: ${metrics.averageDuration}ms`)
```

---

## 相关文档

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - 总体架构
- [audit-system.ts](./audit-logger.ts) - 审计系统实现
