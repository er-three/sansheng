# 项目结构快速参考

**生成于**: 2026-03-16 | **架构版本**: 4.0 (重构阶段)

## 📋 文件树

```
src/
├── core/
│   ├── workflow-manager.ts          # ⭐ 核心协调器（300-400 行）
│   ├── workflow-registry.ts         # 工作流注册表（150 行）
│   ├── execution-context.ts         # 执行上下文（120 行）
│   ├── core-types.ts               # 核心类型（200 行）
│   ├── index.ts                    # 导出接口
│   └── README.md                   # 详细说明
│
├── layers/                         # ⭐ 四个功能层
│   ├── README.md                   # 层级总览
│   │
│   ├── execution/                  # 执行引擎层
│   │   ├── recipe-resolver.ts      # Recipe 解析（250 行）【新增】
│   │   ├── task-queue.ts           # 任务队列（200 行）【优化】
│   │   ├── dependency-manager.ts   # 依赖管理（150 行）【优化】
│   │   ├── execution-coordinator.ts # 执行协调（180 行）【新增】
│   │   ├── execution-types.ts      # 类型定义（150 行）
│   │   ├── index.ts
│   │   └── README.md               # 执行层详解
│   │
│   ├── observability/              # 可观测性层
│   │   ├── heartbeat-monitor.ts    # Agent 心跳（150 行）【优化】
│   │   ├── analytics-collector.ts  # 分析收集（120 行）【优化】
│   │   ├── audit-logger.ts         # 审计日志（180 行）【优化】
│   │   ├── metrics-aggregator.ts   # 指标聚合（120 行）【新增】
│   │   ├── observability-types.ts  # 类型定义（100 行）
│   │   ├── index.ts
│   │   └── README.md               # 可观测性详解
│   │
│   ├── resiliency/                 # 弹性层
│   │   ├── retry-manager.ts        # 重试管理（120 行）【优化】
│   │   ├── recovery-handler.ts     # 错误恢复（140 行）【优化】
│   │   ├── rollback-manager.ts     # 回滚管理（100 行）【优化】
│   │   ├── circuit-breaker.ts      # 熔断器（140 行）【新增】
│   │   ├── resiliency-types.ts     # 类型定义（120 行）
│   │   ├── index.ts
│   │   └── README.md               # 弹性层详解
│   │
│   ├── communication/              # 通信层
│   │   ├── agent-notifier.ts       # Agent 通知（140 行）【优化】
│   │   ├── event-emitter.ts        # 事件系统（130 行）【优化】
│   │   ├── message-queue.ts        # 消息队列（150 行）【新增】
│   │   ├── notification-manager.ts # 通知管理（120 行）【新增】
│   │   ├── communication-types.ts  # 类型定义（100 行）
│   │   ├── index.ts
│   │   └── README.md               # 通信层详解
│   │
│   └── README.md                   # 层级架构说明
│
├── session/                        # ⭐ 会话管理
│   ├── session-manager.ts          # 会话管理器（200 行）【核心】
│   ├── session-state.ts            # 状态存储（150 行）【新增】
│   ├── session-persistence.ts      # 持久化（180 行）【新增】
│   ├── session-types.ts            # 类型定义（100 行）
│   ├── index.ts
│   └── README.md                   # 会话管理详解
│
├── infrastructure/                 # 通用基础设施
│   ├── cache/
│   │   ├── memory-cache.ts         # 内存缓存（120 行）
│   │   ├── file-cache.ts           # 文件缓存（100 行）
│   │   └── cache-manager.ts        # 缓存管理（150 行）
│   │
│   ├── config/
│   │   ├── config-manager.ts       # 配置管理（120 行）
│   │   ├── environment.ts          # 环境变量（80 行）
│   │   └── config-types.ts         # 类型定义（100 行）
│   │
│   ├── validation/
│   │   ├── input-validator.ts      # 输入验证（120 行）
│   │   ├── schema-validator.ts     # Schema 验证（100 行）
│   │   └── validator-types.ts      # 类型定义（80 行）
│   │
│   ├── logging/
│   │   ├── logger.ts               # 日志系统（150 行）
│   │   ├── log-formatter.ts        # 日志格式化（100 行）
│   │   └── log-levels.ts           # 日志级别（50 行）
│   │
│   ├── utils.ts                    # 通用工具（200 行）
│   ├── infrastructure-types.ts     # 通用类型（100 行）
│   ├── index.ts
│   └── README.md                   # 基础设施详解
│
├── agents/                         # 11 个智能体
│   ├── huangdi.ts                  # 皇帝（250 行）
│   ├── zhongshu.ts                 # 中书省（200 行）
│   ├── menxia.ts                   # 门下省（180 行）
│   ├── shangshu.ts                 # 尚书省（200 行）
│   ├── libu.ts                     # 吏部（150 行）
│   ├── hubu.ts                     # 户部（150 行）
│   ├── libu.ts                     # 礼部（150 行）
│   ├── bingbu.ts                   # 兵部（150 行）
│   ├── xingbu.ts                   # 刑部（150 行）
│   ├── gongbu.ts                   # 工部（200 行）
│   ├── kubu.ts                     # 库部（150 行）
│   ├── agent-base.ts               # Agent 基类（120 行）
│   ├── agent-types.ts              # 类型定义（100 行）
│   ├── index.ts
│   └── README.md                   # Agent 详解
│
├── domains/                        # 4 个工作域
│   ├── asset-management/
│   │   ├── recipes.ts              # Pipeline 定义
│   │   ├── validators.ts           # 验证规则
│   │   ├── transformers.ts         # 数据转换
│   │   ├── domain-types.ts         # 类型定义
│   │   └── README.md
│   │
│   ├── cr-processing/
│   │   ├── recipes.ts
│   │   ├── validators.ts
│   │   ├── domain-types.ts
│   │   └── README.md
│   │
│   ├── reverse-engineering/
│   │   ├── recipes.ts
│   │   ├── domain-types.ts
│   │   └── README.md
│   │
│   ├── video/
│   │   ├── recipes.ts
│   │   ├── domain-types.ts
│   │   └── README.md
│   │
│   ├── domain-registry.ts          # 域注册表（100 行）
│   ├── domain-types.ts             # 通用类型（150 行）
│   ├── index.ts
│   └── README.md                   # 工作域详解
│
├── recipes/                        # Recipe 库和模板
│   ├── recipe-templates.ts         # 模板库（300 行）
│   ├── recipe-parser.ts            # Parser（200 行）
│   ├── template-manager.ts         # 模板管理（150 行）
│   ├── recipe-types.ts             # 类型定义（150 行）
│   ├── index.ts
│   └── README.md                   # Recipe 详解
│
├── plugin.ts                       # ⭐ OpenCode Plugin 入口（≈ 400 行）
├── index.ts                        # 导出主接口
├── types.ts                        # 全局类型定义
└── utils.ts                        # 共享工具

test/
├── unit/
│   ├── core/
│   │   ├── workflow-manager.test.ts
│   │   └── ...
│   ├── layers/
│   │   ├── execution/
│   │   ├── observability/
│   │   ├── resiliency/
│   │   └── communication/
│   ├── session/
│   ├── agents/
│   └── infrastructure/
│
├── integration/
│   ├── workflow-integration.test.ts
│   ├── agent-integration.test.ts
│   └── end-to-end.test.ts
│
├── fixtures/
│   ├── sample-recipes.ts
│   ├── mock-agents.ts
│   └── test-data.ts
│
└── helpers/
    ├── test-utils.ts
    └── assertions.ts

docs/
├── API.md                          # 详细 API 文档（待创建）
├── INTEGRATION.md                  # OpenCode 集成指南（待创建）
├── TROUBLESHOOTING.md              # 故障排除（待创建）
└── EXAMPLES.md                     # 使用示例（待创建）

.opencode/
├── audit/                          # 审计日志目录
├── sessions/                       # 会话快照目录
├── cache/                          # 缓存文件目录
└── logs/                           # 日志文件目录

ARCHITECTURE.md                     # ⭐ 详细架构指南
STRUCTURE.md                        # ⭐ 本文件（快速参考）
README.md                           # 项目主文档
```

---

## 🎯 快速导航

### 添加新功能的位置

| 功能类型 | 位置 | 文件模板 |
|---------|------|--------|
| 新 Agent | `src/agents/{name}.ts` | 继承 `AgentBase` |
| 新工作域 | `src/domains/{name}/` | 含 `recipes.ts`, `validators.ts` |
| 新 Recipe | `src/recipes/recipe-templates.ts` | 添加到 `RECIPE_TEMPLATES` |
| 新工具函数 | `src/infrastructure/utils.ts` | 添加并导出 |
| 新日志类型 | `src/infrastructure/logging/log-levels.ts` | 定义级别 |
| 新验证规则 | `src/infrastructure/validation/` | 创建新 validator |
| 新监控指标 | `src/layers/observability/metrics-aggregator.ts` | 添加计算逻辑 |
| 新恢复策略 | `src/layers/resiliency/recovery-handler.ts` | 添加策略映射 |

---

## 📊 统计信息

### 代码行数预测（重构后）

| 模块 | 行数 | 文件数 | 说明 |
|-----|------|-------|------|
| core/ | 1,000 | 5 | WorkflowManager 核心 |
| layers/ | 2,500 | 20 | 四个功能层 |
| session/ | 600 | 4 | 会话管理 |
| agents/ | 2,000 | 13 | 11 个智能体 + 基类 |
| domains/ | 1,000 | 16 | 4 个工作域 |
| recipes/ | 700 | 5 | Recipe 库 |
| infrastructure/ | 1,000 | 15 | 工具和配置 |
| plugin.ts | 400 | 1 | OpenCode 集成 |
| types.ts | 200 | 1 | 全局类型 |
| **总计** | **~9,000** | **~80** | **生产级代码库** |

### 测试覆盖（预期）

| 模块 | 测试数 | 覆盖率 |
|-----|-------|-------|
| core/ | 30+ | 90%+ |
| layers/ | 100+ | 85%+ |
| session/ | 40+ | 90%+ |
| agents/ | 50+ | 80%+ |
| infrastructure/ | 80+ | 85%+ |
| **总计** | **300+** | **85%** |

---

## 🔑 关键文件清单

### 必读文档

- ✅ **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 详细架构设计（100+ 页）
- ✅ **[STRUCTURE.md](./STRUCTURE.md)** - 本文件（快速参考）
- ✅ **[README.md](./README.md)** - 项目总览

### 核心实现

- 🔴 **src/core/workflow-manager.ts** - WorkflowManager 主类
- 🔴 **src/plugin.ts** - OpenCode 插件入口

### 功能层

- 🟠 **src/layers/execution/** - 执行引擎
- 🟠 **src/layers/observability/** - 可观测性
- 🟠 **src/layers/resiliency/** - 弹性层
- 🟠 **src/layers/communication/** - 通信层

### 支撑系统

- 🟡 **src/session/** - 会话管理
- 🟡 **src/infrastructure/** - 基础设施

### Agent 和工作域

- 🔵 **src/agents/** - 11 个智能体
- 🔵 **src/domains/** - 4 个工作域
- 🔵 **src/recipes/** - Recipe 库

---

## 🚀 常见任务

### 集成一个新 Agent

```
1. 在 src/agents/{name}.ts 中实现 Agent
   └─ 继承 AgentBase
   └─ 实现 execute() 方法

2. 在 src/agents/agent-types.ts 中定义类型

3. 在 src/agents/agent-mapper.ts 中注册

4. 编写 test/unit/agents/{name}.test.ts

5. 更新 AGENTS.md 文档
```

### 添加新的工作域

```
1. 创建 src/domains/{name}/ 目录
   ├─ recipes.ts (Pipeline 定义)
   ├─ validators.ts (验证规则)
   ├─ transformers.ts (数据转换)
   ├─ domain-types.ts (类型定义)
   └─ README.md (说明)

2. 在 src/domains/domain-registry.ts 中注册

3. 编写集成测试

4. 更新文档
```

### 添加新的监控指标

```
1. 在 src/layers/observability/metrics-aggregator.ts 中添加计算

2. 在 src/layers/observability/observability-types.ts 中定义类型

3. 在 src/layers/observability/analytics-collector.ts 中收集数据

4. 编写 test/unit/layers/observability/{metric}.test.ts
```

### 添加新的恢复策略

```
1. 在 src/layers/resiliency/recovery-handler.ts 中添加策略

2. 在 src/layers/resiliency/resiliency-types.ts 中定义类型

3. 在 src/layers/execution/execution-coordinator.ts 中集成

4. 编写测试
```

---

## 💾 数据持久化位置

```
.opencode/
├── audit/
│   ├── {sessionId}.json        # 审计记录
│   └── audit-index.json        # 索引
│
├── sessions/
│   ├── {sessionId}.json        # 会话快照
│   └── session-index.json      # 索引
│
├── cache/
│   ├── {hash}.cache            # 缓存文件
│   └── cache-index.json        # 索引
│
└── logs/
    └── {date}.log              # 日志文件
```

---

## 📝 注释规范速查

### 模块头部注释

```typescript
/**
 * 模块名称
 *
 * 用途：简要说明此模块的作用
 *
 * 职责：
 *   1. 清晰列举主要职责
 *   2. 避免模糊描述
 */
```

### 函数注释

```typescript
/**
 * 函数功能说明
 *
 * @param param1 - 参数说明
 * @returns 返回值说明
 * @throws {Error} 异常说明
 */
```

### 复杂逻辑注释

```typescript
// 为什么这样做（原因），而不是"做什么"
// 具体的算法或设计理由
```

---

## ✅ 代码提交清单

- [ ] 单一职责原则
- [ ] 无循环依赖
- [ ] 充分的注释和文档
- [ ] 完整的类型标注
- [ ] 单元测试（80%+ 覆盖率）
- [ ] API 文档
- [ ] 错误处理
- [ ] 命名规范

---

## 📚 相关文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 详细架构设计
- [README.md](./README.md) - 项目总览
- [docs/API.md](./docs/API.md) - API 详解（待创建）
- [docs/INTEGRATION.md](./docs/INTEGRATION.md) - 集成指南（待创建）

---

**Last Updated**: 2026-03-16 | **Status**: 架构设计完成，准备实施
