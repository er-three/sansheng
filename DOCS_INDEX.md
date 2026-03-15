# 📚 文档导航索引

**版本**: 4.0 (重构阶段) | **最后更新**: 2026-03-16

---

## 🎯 快速开始

### 新成员必读

1. **[GETTING_STARTED.md](./GETTING_STARTED.md)** ⭐⭐⭐
   - 📍 **适合**: 新加入项目的开发者
   - ⏱️ **阅读时间**: 15 分钟
   - 📝 **内容**: 快速理解项目、架构分层、常见场景、编码规范

2. **[STRUCTURE.md](./STRUCTURE.md)** ⭐⭐
   - 📍 **适合**: 需要找到特定代码的开发者
   - ⏱️ **阅读时间**: 10 分钟
   - 📝 **内容**: 完整文件树、快速导航、统计信息、常见任务

3. **[README.md](./README.md)** ⭐⭐
   - 📍 **适合**: 想要了解项目整体的人
   - ⏱️ **阅读时间**: 5 分钟
   - 📝 **内容**: 项目概述、特性、快速安装、工作流程

---

## 🏗️ 架构和设计

### 核心文档

| 文档 | 长度 | 内容 |
|------|------|------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | 长 | 完整的架构设计、设计决策、集成指南 |
| **[STRUCTURE.md](./STRUCTURE.md)** | 中 | 文件树结构、快速导航、常见任务 |

### 模块级文档

#### Core - 核心系统

- **[src/core/README.md](./src/core/README.md)**
  - WorkflowManager 介绍
  - 四个功能层的协调方式
  - 使用示例

#### Layers - 四个功能层

- **[src/layers/README.md](./src/layers/README.md)** - 层级总览
  - 四个子层的职责分工
  - 层间通信方式
  - 性能考虑

**执行层** - [src/layers/execution/README.md](./src/layers/execution/README.md)
- Recipe 解析和任务调度
- 依赖关系管理
- 执行协调

**可观测性层** - [src/layers/observability/README.md](./src/layers/observability/README.md)
- Agent 心跳监控
- 分析数据收集
- 审计日志持久化

**弹性层** - [src/layers/resiliency/README.md](./src/layers/resiliency/README.md)
- 重试管理（指数退避）
- 错误恢复策略
- 工作流回滚
- 熔断器模式

**通信层** - [src/layers/communication/README.md](./src/layers/communication/README.md)
- Agent 任务通知
- 事件驱动系统
- 消息队列管理

#### Session - 会话管理

- **[src/session/README.md](./src/session/README.md)**
  - 会话生命周期
  - 状态管理
  - 持久化策略

#### Infrastructure - 基础设施

- **[src/infrastructure/README.md](./src/infrastructure/README.md)**
  - 缓存系统（内存和文件）
  - 配置管理
  - 输入验证
  - 日志系统
  - 通用工具函数

---

## 👥 Agent 和工作域

### Agent 文档

- **[AGENTS.md](./AGENTS.md)** ⭐⭐
  - 11 个智能体详解
  - 职责和权限
  - Agent 间的协作

- **[src/agents/README.md](./src/agents/README.md)**
  - Agent 基类
  - 如何实现新 Agent
  - Agent 生命周期

### 工作域文档

- **[src/domains/README.md](./src/domains/README.md)**
  - 4 个工作域介绍
  - Pipeline 定义
  - Recipe 结构

**工作域**:
- [asset-management](./src/domains/asset-management/README.md) - 资产提取
- [cr-processing](./src/domains/cr-processing/README.md) - 变更请求
- [reverse-engineering](./src/domains/reverse-engineering/README.md) - 反向工程
- [video](./src/domains/video/README.md) - 视频处理

### Recipe 文档

- **[src/recipes/README.md](./src/recipes/README.md)**
  - Recipe 模板库
  - Recipe 语法
  - 自定义 Recipe

---

## 💻 API 文档

### 已完成

- ✅ 各模块的函数签名（在各 `.ts` 文件中的 JSDoc）
- ✅ 模块级 README（提供高层概述）

### 待创建

- 🔲 [docs/API.md](./docs/API.md) - 完整 API 参考（待创建）
- 🔲 [docs/INTEGRATION.md](./docs/INTEGRATION.md) - OpenCode 集成指南（待创建）
- 🔲 [docs/EXAMPLES.md](./docs/EXAMPLES.md) - 使用示例（待创建）

---

## 🧪 测试文档

### 测试覆盖

- **单元测试**: `test/unit/` - 各模块的单元测试
- **集成测试**: `test/integration/` - 模块间集成测试
- **测试数据**: `test/fixtures/` - 样本数据
- **测试辅助**: `test/helpers/` - 工具函数

### 测试命令

```bash
# 运行所有测试
npm test

# 运行特定模块测试
npm test -- test/unit/layers/execution

# 生成覆盖率报告
npm run test:coverage
```

---

## 🔍 按开发任务查找文档

### "我想添加一个新 Agent"

1. 阅读: [GETTING_STARTED.md](./GETTING_STARTED.md) - 场景 1
2. 阅读: [AGENTS.md](./AGENTS.md) - Agent 详解
3. 参考: [src/agents/README.md](./src/agents/README.md)
4. 查看: [src/agents/](./src/agents/) 中的现有 Agent 代码

### "我想添加新的监控指标"

1. 阅读: [src/layers/observability/README.md](./src/layers/observability/README.md)
2. 参考: [GETTING_STARTED.md](./GETTING_STARTED.md) - 场景 2
3. 查看: `src/layers/observability/metrics-aggregator.ts`

### "我想实现新的恢复策略"

1. 阅读: [src/layers/resiliency/README.md](./src/layers/resiliency/README.md)
2. 参考: [GETTING_STARTED.md](./GETTING_STARTED.md) - 场景 3
3. 查看: `src/layers/resiliency/recovery-handler.ts`

### "我想添加新的工作流事件"

1. 阅读: [src/layers/communication/README.md](./src/layers/communication/README.md)
2. 参考: [GETTING_STARTED.md](./GETTING_STARTED.md) - 场景 4
3. 查看: `src/layers/communication/event-emitter.ts`

### "我想理解整个执行流程"

1. 阅读: [ARCHITECTURE.md](./ARCHITECTURE.md) - 工作原理部分
2. 阅读: [src/layers/execution/README.md](./src/layers/execution/README.md)
3. 查看: `src/core/workflow-manager.ts` 中的 `submitWorkflow()`

### "我想调试一个问题"

1. 查阅: [GETTING_STARTED.md](./GETTING_STARTED.md) - 调试技巧
2. 查看: `.opencode/logs/` 中的日志
3. 查看: `.opencode/audit/{sessionId}.json` 中的审计记录

---

## 📊 文档统计

| 类别 | 数量 | 说明 |
|-----|------|------|
| **总体文档** | 4 | README, ARCHITECTURE, STRUCTURE, GETTING_STARTED |
| **核心文档** | 1 | ARCHITECTURE.md (100+ 页) |
| **模块文档** | 15+ | 各 src/ 目录下的 README.md |
| **API 文档** | 已嵌入 | 各 .ts 文件中的 JSDoc |
| **示例代码** | 各文档中 | TypeScript 代码示例 |

---

## 🎓 学习路径

### 初级（了解整体）

```
GETTING_STARTED.md (15 分钟)
    ↓
STRUCTURE.md (10 分钟)
    ↓
对应模块的 README (20 分钟)
```

### 中级（深入理解）

```
ARCHITECTURE.md (30 分钟)
    ↓
核心文档: src/core/README.md (10 分钟)
    ↓
四层文档: src/layers/{layer}/README.md (40 分钟)
    ↓
对应模块的源代码 (60+ 分钟)
```

### 高级（贡献代码）

```
完整阅读 ARCHITECTURE.md
    ↓
深入研究四层实现
    ↓
阅读现有测试代码
    ↓
实现新功能 + 编写测试
    ↓
提交 PR
```

---

## 📍 常见文档位置

### 系统设计

```
ARCHITECTURE.md ← 详细设计
STRUCTURE.md ← 文件导航
GETTING_STARTED.md ← 快速开始
```

### 核心实现

```
src/core/ ← WorkflowManager
src/layers/ ← 四个功能层
src/session/ ← 会话管理
src/infrastructure/ ← 基础设施
```

### Agent 和工作域

```
src/agents/ ← 11 个智能体
src/domains/ ← 4 个工作域
src/recipes/ ← Recipe 库
AGENTS.md ← 详细文档
```

### 数据持久化

```
.opencode/audit/ ← 审计日志
.opencode/sessions/ ← 会话快照
.opencode/cache/ ← 缓存文件
.opencode/logs/ ← 运行日志
```

---

## 🔗 文档关系图

```
README.md (项目总览)
    ↓
GETTING_STARTED.md (快速入门)
    ├─→ ARCHITECTURE.md (详细设计)
    │   ├─→ src/core/README.md
    │   └─→ src/layers/*/README.md
    │
    ├─→ STRUCTURE.md (文件导航)
    │   └─→ 各模块源代码
    │
    └─→ AGENTS.md (智能体)
        └─→ src/agents/README.md
```

---

## 📋 检查清单

### 添加新文档时

- [ ] 在 `DOCS_INDEX.md` 中添加链接
- [ ] 提供简要描述和阅读时间
- [ ] 标注目标受众
- [ ] 包含指向相关文档的链接
- [ ] 使用清晰的 Markdown 格式
- [ ] 提供代码示例（如适用）

### 更新文档时

- [ ] 保持版本号最新
- [ ] 更新 "最后更新" 日期
- [ ] 检查所有链接有效性
- [ ] 运行示例代码验证正确性
- [ ] 更新相关文档的交叉引用

---

## 🚀 下一步

### 对于新成员

1. 阅读 [GETTING_STARTED.md](./GETTING_STARTED.md)
2. 浏览 [STRUCTURE.md](./STRUCTURE.md)
3. 选择你的第一个任务
4. 找到对应的模块文档
5. 开始编码！

### 对于维护者

1. 保持文档与代码同步
2. 定期审查文档准确性
3. 更新示例代码
4. 记录新增功能

---

## 📞 文档反馈

- **文档有误** → 提交 Issue
- **文档不清晰** → 提交 PR
- **需要新文档** → 提交 Discussion
- **建议改进** → 提交反馈

---

**最后更新**: 2026-03-16 | **维护者**: [项目团队]

📚 Happy Learning!
