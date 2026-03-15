# 快速入门指南

**适合人群**: 新加入项目的开发者
**预计阅读时间**: 15 分钟
**最后更新**: 2026-03-16

---

## 📖 三步快速理解项目

### 1️⃣ 理解整体架构（5 分钟）

阅读: **[ARCHITECTURE.md](./ARCHITECTURE.md)** 的"总体架构概览"部分

**关键概念**：
- 三省六部制（11 个智能体）
- 四层架构（执行、可观测、弹性、通信）
- WorkflowManager（核心协调器）
- 四个工作域（资产提取、CR 处理、反向工程、视频）

### 2️⃣ 浏览项目结构（5 分钟）

阅读: **[STRUCTURE.md](./STRUCTURE.md)** 的"文件树"部分

**关键目录**：
```
src/
├── core/              # WorkflowManager 核心
├── layers/            # 四个功能层
├── session/           # 会话管理
├── agents/            # 11 个智能体
├── domains/           # 4 个工作域
├── recipes/           # Recipe 库
└── infrastructure/    # 通用工具
```

### 3️⃣ 确定你的工作方向（5 分钟）

根据你的任务，找到对应的位置：

| 我想... | 去这里 | 文档 |
|--------|--------|------|
| 添加新 Agent | `src/agents/` | [AGENTS.md](./AGENTS.md) |
| 添加新工作域 | `src/domains/` | [STRUCTURE.md](./STRUCTURE.md) |
| 修改执行逻辑 | `src/layers/execution/` | [execution/README.md](./src/layers/execution/README.md) |
| 添加监控指标 | `src/layers/observability/` | [observability/README.md](./src/layers/observability/README.md) |
| 实现容错机制 | `src/layers/resiliency/` | [resiliency/README.md](./src/layers/resiliency/README.md) |
| 处理通信问题 | `src/layers/communication/` | [communication/README.md](./src/layers/communication/README.md) |
| 添加工具函数 | `src/infrastructure/` | [infrastructure/README.md](./src/infrastructure/README.md) |

---

## 🏗️ 架构分层速览

### Core 层 - 核心系统

**文件**: `src/core/workflow-manager.ts`

**职责**：初始化、协调四个功能层

**代码示例**：
```typescript
const manager = new WorkflowManager(config)
await manager.initialize()

const result = await manager.submitWorkflow({
  sessionId: 'session-1',
  intent: 'extract assets',
  domain: 'asset-management'
})
```

### Layers 层 - 四个功能子系统

#### 执行层 (Execution)
- **位置**: `src/layers/execution/`
- **职责**: 任务调度、Recipe 解析、依赖管理
- **关键文件**: `recipe-resolver.ts`, `task-queue.ts`, `execution-coordinator.ts`

#### 可观测性层 (Observability)
- **位置**: `src/layers/observability/`
- **职责**: 监控、分析、审计
- **关键文件**: `heartbeat-monitor.ts`, `audit-logger.ts`, `analytics-collector.ts`
- **存储**: `.opencode/audit/` 目录

#### 弹性层 (Resiliency)
- **位置**: `src/layers/resiliency/`
- **职责**: 容错、恢复、回滚
- **关键文件**: `retry-manager.ts`, `recovery-handler.ts`, `circuit-breaker.ts`

#### 通信层 (Communication)
- **位置**: `src/layers/communication/`
- **职责**: Agent 通知、事件驱动、消息队列
- **关键文件**: `agent-notifier.ts`, `event-emitter.ts`, `message-queue.ts`

### Session 层 - 会话管理

**文件**: `src/session/`

**职责**：管理每个工作流执行的会话生命周期

**代码示例**：
```typescript
import { createSession, setSessionVariable } from './session/index.js'

const sessionId = 'session-' + Date.now()
createSession(sessionId)
setSessionVariable(sessionId, 'module_name', 'auth-service')
```

### Agent 和 Domain

**Agent 位置**: `src/agents/` (11 个)
- 皇帝、三省、六部

**Domain 位置**: `src/domains/` (4 个)
- asset-management（资产提取）
- cr-processing（变更请求）
- reverse-engineering（反向工程）
- video（视频处理）

---

## 💡 常见开发场景

### 场景 1: 添加一个新 Agent

```bash
# 1. 创建文件
touch src/agents/new-agent.ts

# 2. 实现代码
# 继承 AgentBase，实现 execute() 方法

# 3. 注册 Agent
# 在 src/agents/agent-mapper.ts 中添加映射

# 4. 编写测试
touch test/unit/agents/new-agent.test.ts

# 5. 测试
npm test
```

**代码框架**：
```typescript
import { AgentBase } from './agent-base.js'

export class NewAgent extends AgentBase {
  async execute(task: Task): Promise<TaskResult> {
    // 实现具体逻辑
    return { success: true, output: {} }
  }
}

export const newAgent = new NewAgent('new-agent')
```

### 场景 2: 添加一个新的监控指标

```typescript
// 1. 在 metrics-aggregator.ts 中添加计算
export function calculateNewMetric(sessionId: string): number {
  // 计算逻辑
  return value
}

// 2. 在 analytics-collector.ts 中收集数据
export function recordNewMetric(value: number): void {
  // 存储数据
}

// 3. 在 generateAnalyticsReport() 中包含此指标
```

### 场景 3: 添加一个新的恢复策略

```typescript
// 1. 在 recovery-handler.ts 中添加策略
registerErrorHandler(
  sessionId,
  /Some error pattern/i,
  'new-strategy',  // 新策略名
  3,
  'Description'
)

// 2. 在 executeRecoveryStrategy() 中实现
switch (strategy) {
  case 'new-strategy':
    return await executeNewStrategy(context)
}

// 3. 在 resiliency-types.ts 中更新类型
export type RecoveryStrategy = '...' | 'new-strategy'
```

### 场景 4: 添加一个新的工作流事件

```typescript
// 1. 在 communication-types.ts 中定义事件
export type WorkflowEventType = '...' | 'new-event-type'

// 2. 在适当位置发射事件
import { emit } from './layers/communication/index.js'

emit('new-event-type', {
  id: generateId(),
  type: 'new-event-type',
  sessionId,
  timestamp: Date.now(),
  data: { /* 事件数据 */ }
})

// 3. 在需要的地方订阅
import { on } from './layers/communication/index.js'

on('new-event-type', (event) => {
  // 处理事件
})
```

---

## 🧪 测试指南

### 运行所有测试

```bash
npm test
```

### 运行特定模块的测试

```bash
# 执行层测试
npm test -- test/unit/layers/execution

# Agent 测试
npm test -- test/unit/agents

# 会话管理测试
npm test -- test/unit/session
```

### 编写新的单元测试

**文件位置**: `test/unit/{module}/{name}.test.ts`

**测试框架**: Jest

**示例**：
```typescript
import { someFunction } from '../../../src/layers/execution/index.js'

describe('SomeModule', () => {
  it('should do something', () => {
    const result = someFunction(input)
    expect(result).toBe(expected)
  })

  it('should handle error cases', () => {
    expect(() => someFunction(invalidInput)).toThrow()
  })
})
```

**覆盖率目标**: 80%+ （使用 `npm run test:coverage`）

---

## 📝 编码规范

### 命名约定

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件 | kebab-case | `execution-coordinator.ts` |
| 类 | PascalCase | `class WorkflowManager` |
| 函数 | camelCase | `executeWorkflow()` |
| 常量 | UPPER_SNAKE_CASE | `const MAX_RETRIES = 3` |
| 接口 | PascalCase | `interface Task` |
| 类型 | PascalCase | `type SessionStatus = ...` |

### 模块注释

```typescript
/**
 * 模块名称
 *
 * 用途：简要说明此模块的作用
 *
 * 职责：
 *   1. 列举主要职责
 *   2. 清晰明确
 *
 * 关键接口：
 *   - functionName(param): 说明
 *
 * 集成点：
 *   - 与哪些模块交互
 */
```

### 函数注释

```typescript
/**
 * 函数功能说明
 *
 * 详细描述此函数做什么以及为什么这样设计。
 *
 * @param sessionId - 会话 ID
 * @param task - 要执行的任务
 * @returns 执行结果
 * @throws {Error} 当输入无效时抛出
 *
 * @example
 * const result = executeTask('session-1', task)
 * if (result.success) { ... }
 */
export async function executeTask(
  sessionId: string,
  task: Task
): Promise<ExecutionResult> {
  // 实现
}
```

---

## 🔗 项目依赖关系

```
plugin.ts (OpenCode 入口)
    ↓
WorkflowManager (core/)
    ↓
    ├→ ExecutionLayer (layers/execution/)
    ├→ ObservabilityLayer (layers/observability/)
    ├→ ResiliencyLayer (layers/resiliency/)
    ├→ CommunicationLayer (layers/communication/)
    │
    ├→ SessionManager (session/)
    │
    ├→ Agents (agents/)
    │
    └→ Infrastructure (infrastructure/)
```

**重要规则**：
- 避免循环依赖
- 只能向下依赖（plugin → core → layers）
- 同层模块可以相互依赖，但要通过 index.ts 暴露公共接口

---

## 🐛 调试技巧

### 查看详细日志

```typescript
import { logger } from './infrastructure/logging/logger.js'

// 设置日志级别
logger.setLogLevel('DEBUG')  // 或 'TRACE'

// 记录调试信息
logger.debug('MyModule', 'Debug message', { data })
```

### 查看会话状态

```typescript
import { getSessionMetadata } from './session/index.js'

const metadata = getSessionMetadata(sessionId)
console.log(metadata)
```

### 查看审计日志

```typescript
import { getAuditHistory } from './layers/observability/index.js'

const history = getAuditHistory(rootDir, sessionId)
console.log(history)
```

### 观察事件流

```typescript
import { getEventHistory } from './layers/communication/index.js'

const events = getEventHistory(sessionId)
events.forEach(e => console.log(`Event: ${e.type}`, e.data))
```

---

## 📚 推荐阅读顺序

1. **本文件** (5 分钟) - 快速入门
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** (30 分钟) - 详细架构
3. **[STRUCTURE.md](./STRUCTURE.md)** (10 分钟) - 文件导航
4. **相应模块的 README** (20 分钟) - 深入理解

例如，如果你要处理 Agent：
```
GETTING_STARTED.md
    ↓
src/agents/README.md
    ↓
AGENTS.md
    ↓
具体代码
```

---

## ❓ 常见问题 (FAQ)

### Q: 我应该从哪个文件开始修改？

**A**: 取决于你的任务：
- 添加功能 → 对应的模块目录
- 修复 Bug → 查看错误日志，定位到具体模块
- 性能优化 → 查看分析报告，关注 `layers/observability/`

### Q: 如何调试一个失败的工作流？

**A**:
1. 查看 `.opencode/logs/{date}.log`
2. 查看 `.opencode/audit/{sessionId}.json` 的审计记录
3. 使用 `logger.debug()` 添加调试日志
4. 运行单元测试隔离问题

### Q: 新增代码应该放在哪里？

**A**: 遵循以下规则：
- 单一职责：一个文件做一件事
- 分层原则：遵循四层架构
- 代码重用：通用代码放在 `infrastructure/`
- 模块隔离：通过 `index.ts` 暴露公共接口

### Q: 如何测试我的修改？

**A**:
```bash
# 运行相关测试
npm test -- test/unit/{module}

# 运行所有测试
npm test

# 生成覆盖率报告
npm run test:coverage
```

---

## 🚀 下一步

1. **选择你的任务**：查看 GitHub Issues 或 Jira
2. **找到对应模块**：使用上面的导航表
3. **阅读模块文档**：每个目录都有 README
4. **编写代码**：遵循编码规范
5. **编写测试**：80%+ 覆盖率
6. **提交 PR**：包含测试和文档

---

## 📞 获得帮助

- **架构问题** → 查看 [ARCHITECTURE.md](./ARCHITECTURE.md)
- **目录导航** → 查看 [STRUCTURE.md](./STRUCTURE.md)
- **模块细节** → 查看对应目录的 README
- **API 文档** → 查看 [docs/API.md](./docs/API.md)（待创建）

---

**Welcome to the project!** 🎉

期待你的贡献！如有任何问题，欢迎提出 Issue 或 Discussion。

**Last Updated**: 2026-03-16
