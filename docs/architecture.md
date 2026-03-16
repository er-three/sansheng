# @deep-flux/liubu 生产级架构指南

**Version**: 4.0 (Refactor Phase)
**Last Updated**: 2026-03-16
**Status**: 架构重构进行中

## 📋 总体架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OpenCode Plugin Interface                        │
│              (sessionUpdatedHook, toolExecuteAfterHook)             │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│                     WorkflowManager (核心协调器)                     │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  执行层 (ExecutionEngine)                                    │   │
│  │  ├─ task-queue: 任务队列管理                                │   │
│  │  ├─ recipe-resolver: Recipe 解析和调度                      │   │
│  │  ├─ dependency-manager: 依赖关系管理                        │   │
│  │  └─ execution-coordinator: 执行协调                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  可观测性层 (ObservabilityLayer)                            │   │
│  │  ├─ agent-heartbeat: Agent 心跳监控                         │   │
│  │  ├─ workflow-analytics: 工作流分析                          │   │
│  │  ├─ audit-system: 审计日志持久化                            │   │
│  │  └─ performance-metrics: 性能指标收集                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  弹性层 (ResiliencyLayer)                                   │   │
│  │  ├─ task-retry-manager: 自动重试策略                        │   │
│  │  ├─ error-recovery: 错误恢复机制                            │   │
│  │  ├─ workflow-rollback: 工作流回滚                           │   │
│  │  └─ state-checkpoint: 状态检查点                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  通信层 (CommunicationLayer)                                │   │
│  │  ├─ agent-communication: Agent 任务通知                      │   │
│  │  ├─ workflow-events: 事件驱动系统                           │   │
│  │  ├─ notification-manager: 通知管理                          │   │
│  │  └─ message-queue: 消息队列                                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  会话管理 (SessionManagement)                               │   │
│  │  ├─ session-lifecycle: 会话生命周期                         │   │
│  │  ├─ session-state: 会话状态管理                             │   │
│  │  └─ session-persistence: 会话持久化                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│                   Agent & Domain Subsystems                         │
│  ├─ agents: 11 个智能体实现                                        │
│  ├─ domains: 4 个工作域 (asset-mgmt, cr-process, reverse-eng, video)
│  └─ recipes: Recipe 仓库和模板                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 目录结构

### 一级目录规划

```
liubu/
├── src/
│   ├── core/                       # ⭐ WorkflowManager 核心系统
│   ├── layers/                     # ⭐ 四个功能层实现
│   ├── session/                    # ⭐ 会话管理
│   ├── agents/                     # 11 个智能体实现
│   ├── domains/                    # 4 个工作域定义
│   ├── recipes/                    # Recipe 库和模板
│   ├── infrastructure/             # 通用基础设施
│   ├── plugin.ts                   # OpenCode Plugin 入口
│   ├── index.ts                    # 导出接口
│   └── types.ts                    # 全局类型定义
│
├── test/                           # 单元测试和集成测试
│
├── .opencode/                      # OpenCode 配置和约束
│
├── docs/                           # 架构和 API 文档
│
└── README.md / ARCHITECTURE.md     # 文档入口
```

---

## 📂 详细目录说明

### 1. `src/core/` - WorkflowManager 核心系统

**用途**：统一的工作流管理器，协调所有子系统。

```
core/
├── workflow-manager.ts             # WorkflowManager 主类（≈ 300-400行）
│   ├─ 初始化：initializeManager()
│   ├─ 提交任务：submitWorkflow()
│   ├─ 获取状态：getWorkflowStatus()
│   └─ 清理资源：dispose()
│
├── workflow-registry.ts            # 工作流注册表（≈ 150行）
│   ├─ 注册 workflow handlers
│   ├─ 查询 workflow 元数据
│   └─ 管理工作流版本
│
├── execution-context.ts            # 执行上下文（≈ 120行）
│   ├─ 当前执行环境数据
│   ├─ 变量作用域管理
│   └─ 上下文继承链
│
└── core-types.ts                   # 核心类型定义（≈ 200行）
    ├─ WorkflowManager 接口
    ├─ WorkflowRegistry 接口
    └─ ExecutionContext 接口
```

**关键职责**：
- 初始化所有四个功能层
- 将请求路由到相应层
- 管理工作流生命周期
- 提供统一的状态查询 API

---

### 2. `src/layers/` - 四个功能层实现

#### 2.1 `layers/execution/` - 执行引擎层

**用途**：任务队列、Recipe 解析、依赖管理、执行协调。

```
execution/
├── task-queue.ts                   # 任务队列（优化版）
│   ├─ 功能：排队、调度、依赖排序
│   ├─ 改进：避免重复实现 chancellery 功能
│   └─ 协作：与 recipe-resolver 配合
│
├── recipe-resolver.ts              # Recipe 解析器（新，≈ 250行）
│   ├─ 解析 recipe 结构
│   ├─ 生成任务子图
│   ├─ 处理 parallel/sequential 标记
│   └─ 插值变量替换
│
├── dependency-manager.ts           # 依赖关系管理（优化版）
│   ├─ 功能：循环检测、拓扑排序、DAG 验证
│   ├─ 改进：consolidate 现有的 validator + queue 逻辑
│   └─ 新增：依赖强制执行（Block）
│
├── execution-coordinator.ts        # 执行协调（新，≈ 180行）
│   ├─ 按顺序调度任务
│   ├─ 收集 Agent 返回值
│   ├─ 处理分支条件 (if/else)
│   └─ 错误时触发恢复策略
│
└── execution-types.ts              # 执行层类型（≈ 150行）
    ├─ TaskQueue 接口
    ├─ Recipe 接口（简化版）
    ├─ DependencyManager 接口
    └─ ExecutionCoordinator 接口
```

**注释示例**：
```typescript
/**
 * 执行引擎层 - 负责任务调度和工作流执行
 *
 * 职责：
 *   1. 管理任务队列和优先级
 *   2. 解析工作流 Recipe 并生成任务图
 *   3. 检测和避免循环依赖
 *   4. 协调 Agent 执行任务
 *   5. 处理错误恢复（委托给 ResiliencyLayer）
 *
 * 集成点：
 *   - 与 ObservabilityLayer 通信：记录任务开始/完成
 *   - 与 ResiliencyLayer 集成：遇到失败时调用恢复策略
 *   - 与 CommunicationLayer 集成：向 Agent 分配任务
 */
```

#### 2.2 `layers/observability/` - 可观测性层

**用途**：监控、分析、审计。

```
observability/
├── heartbeat-monitor.ts            # Agent 心跳监控（优化版）
│   ├─ 记录心跳活动
│   ├─ 检测超时
│   └─ 生成健康报告
│
├── analytics-collector.ts          # 分析数据收集（优化版）
│   ├─ 任务执行时间统计
│   ├─ Agent 吞吐量分析
│   └─ 工作流成功率计算
│
├── audit-logger.ts                 # 审计日志（优化版，文件持久化）
│   ├─ 记录所有 Agent 操作
│   ├─ 持久化到 .opencode/audit/
│   └─ 生成审计报告
│
├── metrics-aggregator.ts           # 指标聚合（新，≈ 120行）
│   ├─ 聚合时间序列指标
│   ├─ 计算百分位数
│   └─ 生成预警信号
│
└── observability-types.ts          # 类型定义（≈ 100行）
    ├─ Heartbeat 接口
    ├─ Analytics 接口
    ├─ AuditRecord 接口
    └─ Metrics 接口
```

#### 2.3 `layers/resiliency/` - 弹性层

**用途**：重试、错误恢复、回滚、检查点。

```
resiliency/
├── retry-manager.ts                # 重试管理（优化版）
│   ├─ 指数退避策略
│   ├─ 重试计数和限制
│   └─ 自动重试触发
│
├── recovery-handler.ts             # 错误恢复（优化版）
│   ├─ 映射错误→恢复策略
│   ├─ 执行恢复操作
│   └─ 记录恢复历史
│
├── rollback-manager.ts             # 回滚管理（优化版）
│   ├─ 创建检查点
│   ├─ 恢复到前一状态
│   └─ 管理回滚历史
│
├── circuit-breaker.ts              # 熔断器（新，≈ 140行）
│   ├─ 跟踪失败率
│   ├─ 自动断路
│   └─ 自动恢复逻辑
│
└── resiliency-types.ts             # 类型定义（≈ 120行）
    ├─ RetryPolicy 接口
    ├─ RecoveryStrategy 接口
    ├─ Rollback 接口
    └─ CircuitBreaker 接口
```

#### 2.4 `layers/communication/` - 通信层

**用途**：Agent 通知、事件驱动、消息队列。

```
communication/
├── agent-notifier.ts               # Agent 任务通知（优化版）
│   ├─ 向 Agent 发送任务
│   ├─ 跟踪通知状态
│   └─ 处理未送达消息
│
├── event-emitter.ts                # 事件发射器（优化版）
│   ├─ 发布/订阅事件
│   ├─ 事件历史记录
│   └─ 事件过滤和路由
│
├── message-queue.ts                # 消息队列（新，≈ 150行）
│   ├─ FIFO 队列管理
│   ├─ 优先级处理
│   ├─ 消息去重
│   └─ 批量处理
│
├── notification-manager.ts         # 通知管理（新，≈ 120行）
│   ├─ 多通道通知（日志、事件、消息队列）
│   ├─ 重试机制
│   └─ 通知队列管理
│
└── communication-types.ts          # 类型定义（≈ 100行）
    ├─ EventEmitter 接口
    ├─ Message 接口
    └─ NotificationManager 接口
```

---

### 3. `src/session/` - 会话管理

**用途**：会话生命周期、状态管理、持久化。

```
session/
├── session-manager.ts              # 会话管理器（核心，≈ 200行）
│   ├─ 创建/销毁会话
│   ├─ 获取会话元数据
│   ├─ 暂停/恢复会话
│   └─ 检查过期
│
├── session-state.ts                # 会话状态存储（≈ 150行）
│   ├─ 当前执行状态
│   ├─ 变量池（局部）
│   ├─ 任务执行历史
│   └─ 错误日志
│
├── session-persistence.ts          # 会话持久化（≈ 180行）
│   ├─ 保存到磁盘
│   ├─ 恢复会话状态
│   ├─ 版本控制
│   └─ 清理过期会话
│
└── session-types.ts                # 类型定义（≈ 100行）
    ├─ SessionMetadata 接口
    ├─ SessionState 接口
    └─ SessionSnapshot 接口
```

---

### 4. `src/agents/` - Agent 实现

**用途**：11 个智能体的具体实现。

```
agents/
├── huangdi.ts                      # 皇帝（战略决策者，≈ 250行）
├── zhongshu.ts                     # 中书省（规划，≈ 200行）
├── menxia.ts                       # 门下省（审核，≈ 180行）
├── shangshu.ts                     # 尚书省（执行，≈ 200行）
├── libu.ts                         # 吏部（代码扫描，≈ 150行）
├── hubu.ts                         # 户部（资源集成，≈ 150行）
├── libu.ts                         # 礼部（流程协调，≈ 150行）
├── bingbu.ts                       # 兵部（测试执行，≈ 150行）
├── xingbu.ts                       # 刑部（代码审查，≈ 150行）
├── gongbu.ts                       # 工部（代码实现，≈ 200行）
├── kubu.ts                         # 库部（资产管理，≈ 150行）
├── agent-base.ts                   # Agent 基类（≈ 120行）
└── agent-types.ts                  # 类型定义（≈ 100行）
```

**注释规范**：
```typescript
/**
 * 皇帝智能体 - 战略决策者
 *
 * 职责：
 *   1. 分析用户意图，提取关键信息
 *   2. 自动识别工作域（asset-management, cr-processing 等）
 *   3. 验证任务有效性
 *   4. 下达工作指令给三省
 *   5. 监控全局进度
 *   6. 最终验收
 *
 * 工作流：
 *   用户输入 → 意图分析 → 域识别 → 三省下达 → 进度监控 → 验收
 *
 * 集成：
 *   输入源：OpenCode sessionUpdatedHook
 *   输出：WorkflowManager.submitWorkflow()
 */
```

---

### 5. `src/domains/` - 工作域定义

**用途**：4 个特定领域的工作流定义。

```
domains/
├── asset-management/               # 资产提取域
│   ├─ recipes.ts                   # Pipeline 定义
│   ├─ validators.ts                # 域特定验证
│   ├─ transformers.ts              # 数据转换器
│   └─ domain-types.ts              # 域类型定义
│
├── cr-processing/                  # 变更请求处理域
│   ├─ recipes.ts
│   ├─ validators.ts
│   └─ domain-types.ts
│
├── reverse-engineering/            # 反向工程域
│   ├─ recipes.ts
│   └─ domain-types.ts
│
├── video/                          # 视频处理域
│   ├─ recipes.ts
│   └─ domain-types.ts
│
└── domain-registry.ts              # 域注册表（≈ 100行）
    ├─ 注册域
    ├─ 查询域元数据
    └─ 选择合适域
```

---

### 6. `src/recipes/` - Recipe 库和模板

**用途**：工作流模板和 Recipe 定义。

```
recipes/
├── recipe-templates.ts             # Recipe 模板库（≈ 300行）
│   ├─ asset-extraction-template
│   ├─ cr-processing-template
│   ├─ code-review-template
│   └─ custom-workflow-template
│
├── recipe-parser.ts                # Recipe 解析器（≈ 200行）
│   ├─ 解析 YAML/JSON Recipe
│   ├─ 验证 Recipe 结构
│   └─ 生成任务图
│
├── template-manager.ts             # 模板管理（优化版）
│   ├─ 创建/更新模板
│   ├─ 版本控制
│   ├─ 搜索模板
│   └─ 模板共享
│
└── recipe-types.ts                 # 类型定义（≈ 150行）
    ├─ WorkflowRecipe 接口
    ├─ RecipeStep 接口
    └─ RecipeTemplate 接口
```

---

### 7. `src/infrastructure/` - 通用基础设施

**用途**：工具函数、缓存、配置、验证等。

```
infrastructure/
├── cache/
│   ├─ memory-cache.ts              # 内存缓存（≈ 120行）
│   ├─ file-cache.ts                # 文件缓存（≈ 100行）
│   └─ cache-manager.ts             # 缓存管理器（≈ 150行）
│
├── config/
│   ├─ config-manager.ts            # 配置管理（≈ 120行）
│   ├─ environment.ts               # 环境变量（≈ 80行）
│   └─ config-types.ts              # 类型定义（≈ 100行）
│
├── validation/
│   ├─ input-validator.ts           # 输入验证（≈ 120行）
│   ├─ schema-validator.ts          # Schema 验证（≈ 100行）
│   └─ validator-types.ts           # 类型定义（≈ 80行）
│
├── logging/
│   ├─ logger.ts                    # 日志系统（≈ 150行）
│   ├─ log-formatter.ts             # 日志格式化（≈ 100行）
│   └─ log-levels.ts                # 日志级别定义（≈ 50行）
│
├── utils.ts                        # 通用工具函数（≈ 200行）
│   ├─ 文件 I/O
│   ├─ 路径处理
│   ├─ JSON 解析
│   └─ 字符串操作
│
└── infrastructure-types.ts         # 通用类型（≈ 100行）
    ├─ CacheConfig 接口
    ├─ LogEntry 接口
    └─ ValidationResult 接口
```

---

### 8. `src/types.ts` - 全局类型定义

**用途**：所有模块共享的全局类型。

```typescript
/**
 * 全局类型定义模块
 *
 * 包含：
 *   1. Agent 相关类型
 *   2. Workflow 相关类型
 *   3. Task 相关类型
 *   4. Event 相关类型
 *   5. 通用接口和枚举
 *
 * 设计原则：
 *   - 避免循环引用（使用 type-only imports）
 *   - 保持接口简洁和易用
 *   - 记录复杂类型的用途
 */
```

---

### 9. `src/plugin.ts` - OpenCode Plugin 入口

**用途**：与 OpenCode 系统的集成点。

```typescript
/**
 * OpenCode Plugin 主入口
 *
 * 职责：
 *   1. 初始化 WorkflowManager
 *   2. 注册 Hook 处理器
 *   3. 暴露插件 API
 *   4. 管理插件生命周期
 *
 * 关键 Hook：
 *   - sessionUpdatedHook: 会话更新时触发（用于分析意图）
 *   - toolExecuteAfterHook: 工具执行后触发（用于代码修改验证）
 *
 * 集成架构：
 *   OpenCode → plugin.ts → WorkflowManager → 四层系统
 */

import { WorkflowManager } from './core/workflow-manager.js'

let manager: WorkflowManager

export function sessionUpdatedHook(sessionId: string, context: any) {
  // 处理会话更新，触发工作流
}

export function toolExecuteAfterHook(result: any) {
  // 验证代码修改，记录审计
}

export default {
  manager,
  sessionUpdatedHook,
  toolExecuteAfterHook
}
```

---

### 10. `test/` - 测试目录

**用途**：单元测试和集成测试。

```
test/
├── unit/                           # 单元测试（按模块组织）
│   ├─ core/
│   │  ├─ workflow-manager.test.ts
│   │  └─ execution-context.test.ts
│   ├─ layers/
│   │  ├─ execution/
│   │  ├─ observability/
│   │  ├─ resiliency/
│   │  └─ communication/
│   ├─ session/
│   ├─ agents/
│   └─ infrastructure/
│
├── integration/                    # 集成测试
│   ├─ workflow-integration.test.ts
│   ├─ agent-integration.test.ts
│   └─ end-to-end.test.ts
│
├── fixtures/                       # 测试数据
│   ├─ sample-recipes.ts
│   ├─ mock-agents.ts
│   └─ test-data.ts
│
└── helpers/                        # 测试辅助函数
    ├─ test-utils.ts
    └─ assertions.ts
```

---

## 🎯 文件拆分原则

### 1. **模块单一职责原则**

每个文件应该只负责一个清晰的职责。例如：

```typescript
// ❌ 反面例子：职责混杂
task-queue.ts  // 既处理队列，又做依赖检测，还做持久化

// ✅ 正面例子：单一职责
task-queue.ts                    // 仅处理队列操作
dependency-manager.ts            // 仅处理依赖关系
task-persistence.ts              // 仅处理持久化（通过 SessionManager）
```

### 2. **避免循环依赖**

使用层级结构确保单向依赖：

```
plugin.ts
  ↓
core/workflow-manager.ts
  ↓
layers/{execution,observability,resiliency,communication}/
  ↓
infrastructure/
```

### 3. **接口隔离**

为每个模块定义清晰的公共接口，内部细节对外隐藏：

```typescript
// task-queue.ts - 仅暴露这些函数
export function enqueueTask(task: Task): void
export function dequeueTask(): Task | null
export function getTasks(): Task[]

// ❌ 不暴露内部结构
// export const taskStore: Map<string, Task>
```

### 4. **避免代码重复**

共享逻辑应该放在 `infrastructure/` 中：

```typescript
// ❌ 多处重复的日志代码
// 在 agent-heartbeat.ts 中
function log(msg) { console.log(`[heartbeat] ${msg}`) }

// ✅ 共享日志系统
import { logger } from '../infrastructure/logging/logger.js'
logger.info('heartbeat', msg)
```

---

## 📝 注释规范

### 1. **模块级注释**

每个 `.ts` 文件顶部：

```typescript
/**
 * 模块名称
 *
 * 用途：简要说明此模块的作用
 *
 * 职责：
 *   1. 清晰列举此模块的主要职责
 *   2. 避免模糊的描述
 *   3. 帮助新开发者快速理解
 *
 * 关键接口：
 *   - FunctionName(param): 说明此函数的作用
 *   - ClassConstructor(config): 说明此类的作用
 *
 * 集成点：
 *   - 这个模块如何与其他模块交互
 *   - 依赖于哪些模块
 *   - 被哪些模块使用
 *
 * 示例：
 *   ```typescript
 *   const queue = new TaskQueue()
 *   queue.enqueue(task)
 *   ```
 *
 * @see [相关文档链接]
 */
```

### 2. **函数/方法注释**

```typescript
/**
 * 简要说明
 *
 * 详细描述此函数的作用、参数、返回值。
 * 如果逻辑复杂，解释为什么这样设计。
 *
 * @param sessionId - 会话 ID
 * @param task - 要执行的任务
 * @returns 执行结果，包含成功标志和错误消息
 *
 * @throws {Error} 当任务无效时抛出
 *
 * @example
 * const result = executeTask('session-1', task)
 * if (result.success) { ... }
 */
export function executeTask(
  sessionId: string,
  task: Task
): ExecutionResult {
  // ...
}
```

### 3. **复杂逻辑注释**

```typescript
// 为什么这样做（而不仅仅是"做什么"）
// 检测循环依赖，防止任务图成为死循环
const visited = new Set<string>()
const visiting = new Set<string>()

// 使用 DFS 算法进行循环检测
// 时间复杂度：O(V + E)，其中 V=任务数，E=依赖数
function hasCycle(taskId: string): boolean {
  // ...
}
```

### 4. **API 文档**

```typescript
/**
 * @api public
 *
 * 工作流管理器的主接口
 *
 * 使用此类来管理整个工作流系统的生命周期。
 *
 * @example
 * const manager = new WorkflowManager(config)
 * await manager.initialize()
 * manager.submitWorkflow(workflow)
 * await manager.dispose()
 */
export class WorkflowManager {
  // ...
}
```

---

## 🔄 集成指南

### 集成 OpenCode Hook

```typescript
// src/plugin.ts

import { WorkflowManager } from './core/workflow-manager.js'

const manager = new WorkflowManager()

/**
 * OpenCode sessionUpdatedHook
 *
 * 当会话更新时触发（通常是用户提交了新意图）
 * 触发工作流分析和执行
 */
export function sessionUpdatedHook(sessionId: string, context: any) {
  // 1. 解析意图
  const intent = parseUserIntent(context)

  // 2. 识别工作域
  const domain = identifyDomain(intent)

  // 3. 提交工作流给 WorkflowManager
  manager.submitWorkflow({
    sessionId,
    intent,
    domain
  })
}

/**
 * OpenCode toolExecuteAfterHook
 *
 * 当工具（如代码编辑）执行后触发
 * 验证修改并记录审计
 */
export function toolExecuteAfterHook(result: any) {
  // 1. 验证代码修改
  const validation = validateCodeModification(result)

  // 2. 记录审计日志
  manager.auditLog(validation)

  // 3. 触发恢复策略（如果失败）
  if (!validation.allowed) {
    manager.triggerRecoveryStrategy()
  }
}
```

---

## 🚀 添加新功能的步骤

### 场景 1：添加新的 Agent

```
1. 在 agents/{agent-name}.ts 中实现 Agent
   ├─ 继承 AgentBase
   ├─ 实现 execute() 方法
   └─ 暴露 Agent 实例

2. 在 agents/agent-types.ts 中定义类型

3. 在 test/unit/agents/{agent-name}.test.ts 中编写测试

4. 在 agent-task-mapper.ts 中注册 Agent 和其任务映射

5. 更新 README.md 的 AGENTS 部分
```

### 场景 2：添加新的工作域

```
1. 在 domains/{domain-name}/ 创建目录
   ├─ recipes.ts        - 工作流定义
   ├─ validators.ts     - 验证规则
   ├─ transformers.ts   - 数据转换
   └─ domain-types.ts   - 类型定义

2. 在 domain-registry.ts 中注册工作域

3. 在 test/unit/domains/{domain-name}.test.ts 中编写测试

4. 更新 README.md 的工作域部分
```

### 场景 3：添加新的系统功能（如新的监控指标）

```
1. 在相应的层目录创建新文件（如 layers/observability/new-metric.ts）

2. 在该层的 types 文件中定义接口

3. 在 WorkflowManager 中集成新功能

4. 编写单元测试和集成测试

5. 更新 ARCHITECTURE.md
```

---

## ✅ 质量清单

在提交新代码前，确保：

- [ ] 单一职责原则：此文件只做一件事
- [ ] 无循环依赖：检查导入依赖关系
- [ ] 清晰注释：每个模块和关键函数都有注释
- [ ] 类型安全：使用 TypeScript 完整类型标注
- [ ] 测试覆盖：关键逻辑有单元测试（目标 80%+）
- [ ] API 文档：公开接口有 JSDoc 注释
- [ ] 错误处理：有适当的错误处理和日志
- [ ] 命名一致：函数名、变量名遵循命名规范
- [ ] 性能考虑：避免不必要的循环和计算
- [ ] 向后兼容：不破坏现有 API

---

## 📊 目录大小目标

```
预期分布（重构后）：

src/core/                ≈ 1,000 行（5 个文件）
src/layers/             ≈ 2,500 行（20 个文件）
  - execution/          ≈ 700 行（5 个文件）
  - observability/      ≈ 700 行（5 个文件）
  - resiliency/         ≈ 700 行（5 个文件）
  - communication/      ≈ 400 行（5 个文件）
src/session/            ≈ 600 行（4 个文件）
src/agents/             ≈ 2,000 行（13 个文件）
src/domains/            ≈ 1,000 行（16 个文件）
src/recipes/            ≈ 700 行（5 个文件）
src/infrastructure/     ≈ 1,000 行（15 个文件）

总计：                  ≈ 8,800 行

改进指标：
- 代码重复率：20% → 5%
- 模块耦合度：70% → 30%
- 测试覆盖率：391 → 500+ 测试
- 生产可用性：28% → 90%
```

---

## 📚 相关文档

- [README.md](./README.md) - 项目总览
- [AGENTS.md](./AGENTS.md) - 11 个 Agent 详解（待更新）
- [API.md](./docs/API.md) - 详细 API 文档（待创建）
- [INTEGRATION.md](./docs/INTEGRATION.md) - OpenCode 集成指南（待创建）

---

**Last Updated**: 2026-03-16
**Status**: 架构设计阶段，准备实施
