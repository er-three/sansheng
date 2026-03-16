# 更新日志

所有重要的项目变更都会被记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 和 [语义版本](https://semver.org/lang/zh-CN/)。

---

## [3.1.1] - 2026-03-17

### 🔒 权限矩阵强制执行 (Security Hardening)

**背景**：
之前的权限配置虽然定义了 `edit: deny` 和 `bash: deny`，但缺少 `write: deny` 限制。这导致任何agent都可以通过 write 工具绕过权限检查，直接修改代码文件。大型模型（如minimax）可能利用这一漏洞直接执行所有工作，绕过三省六部的分层调度机制。

### 🔐 权限强化清单

#### 三省权限矩阵
- **huangdi (皇帝)**：`edit: deny, write: deny, bash: deny` ✅
  - 只能决策和调度，不能执行代码
- **zhongshu (中书省)**：`edit: deny, write: deny, bash: deny` ✅
  - 只能规划，必须通过 call_subagent 调用其他agent
- **menxia (门下省)**：`edit: deny, write: deny, bash: deny` ✅
  - 只能审核，必须通过 call_subagent 调用验证
- **shangshu (尚书省)**：`edit: deny, write: deny, bash: deny, read: allow` ✅
  - 执行协调者，只能通过 task() 调用六部，不能直接修改代码

#### 六部权限矩阵
- **吏部 (yibu)**：`edit: deny, write: deny, bash: deny, read: allow, glob: allow` ✅
- **户部 (hubu)**：`edit: deny, write: deny, bash: deny, read: allow, glob: allow` ✅
- **礼部 (libu)**：`edit: deny, write: deny, bash: deny, read: allow, glob: allow` ✅
- **兵部 (bingbu)**：`edit: deny, write: deny, bash: allow` ✅
- **刑部 (xingbu)**：`edit: deny, write: deny, bash: deny, read: allow, glob: allow` ✅
- **工部 (gongbu)**：`edit: allow, write: allow, bash: deny, read: allow` ✅
  - 唯一有文件修改权限的部门

### ✅ 验证结果

- ✅ 权限矩阵：9个agent完整覆盖，无遗漏
- ✅ subagent调用方式：正确使用 task(agent="...") 而非 @agent 直接调用
- ✅ 执行链路：huangdi → zhongshu/menxia/shangshu → 六部（gongbu修改）
- ✅ 防护机制：非工部agent无法绕过write权限限制

### 📝 相关文件

- `.opencode/agents/huangdi.md`
- `.opencode/agents/zhongshu.md`
- `.opencode/agents/menxia.md`
- `.opencode/agents/shangshu.md`
- `.opencode/agents/{yibu,hubu,libu,bingbu,xingbu,gongbu,yushitai}.md`

---

## [3.1.0] - 2026-03-17

### 🎉 治理系统完整实现 (Phase 5)

这是一个重大功能发布，包含完整的三省六部多智能体协作框架的实现。

### ✨ 新增功能

#### 治理系统核心
- **`src/governance/types.ts`** (330 行)
  - 9个Agent角色完整定义
  - 15+个核心数据结构（Plan、Step、Task、ExecutionState等）
  - 完整的枚举定义（TaskStatus、TaskType、Decision、ErrorCode）
  - 各部门输出格式和通信协议

- **`src/governance/execution-engine.ts`** (517 行)
  - WorkflowEngine：完整的工作流执行引擎
  - DependencyResolver：依赖分析和关键路径计算
  - 支持并行执行和自动重试机制

- **`src/governance/orchestrator.ts`** (280+ 行)
  - GovernanceOrchestrator：5阶段工作流协调
  - MinistryDispatcher：任务分发和提示生成
  - WorkflowStateManager：执行状态管理

#### 完整测试套件
- **36个通过的测试**（100%通过率）
- 4个测试文件：types、execution-engine、orchestrator、e2e
- 单元测试、集成测试、端到端测试覆盖

#### 完整文档
- **getting-started.md** - 5分钟快速上手指南
- **governance-implementation.md** - 完整API参考和实现细节
- **testing.md** - 测试指南和最佳实践
- **troubleshooting.md** - 故障排除和常见问题解答
- **examples.ts** - 6个完整工作流示例

### 📊 统计

- **代码量**：3,500+行
- **测试**：36个（全部通过）
- **文档**：6个新文档
- **Git提交**：4个主要提交
- **编译**：✅ TypeScript无错误

### 🎯 核心特性

- ✅ 5阶段工作流（规划→审核→执行→验证→批准）
- ✅ 并行执行支持
- ✅ 循环依赖检测
- ✅ 关键路径分析
- ✅ 自动重试和人工干预
- ✅ 完整的执行追踪

### 📚 文档改进

- 新增推荐阅读顺序
- 新增快速开始指南
- 新增完整API参考
- 新增故障排除指南
- 新增测试指南

### ⚡ 性能

- 支持多个步骤并行执行
- 关键路径分析优化执行时间
- 智能重试机制减少总耗时

### 🔄 向后兼容

- ✅ 完全兼容之前的Agent框架
- ✅ 保留所有现有功能
- ✅ 只添加新功能，不改变现有API

---

## [3.0.1] - 2026-03-16

### 📦 优化和清理

删除了资产整理、逆向工程和Agent流程优化相关功能，专注于核心编程能力。

### 🗑️ 删除

- **资产整理功能** (asset-management domain)
- **逆向工程功能** (reverse-engineering domain)
- **Agent优化模块** (src/agent/optimization.ts)
- **相关测试文件** (agent-optimization.test.ts, token-consumption-validation.test.ts)

### 📝 修改

- 更新README，简化工作域说明
- 更新domain-recipes.ts，只保留general和cr-processing配方
- 更新requirement-analyzer.ts，移除旧域检测
- 更新所有测试文件，统一使用核心工作域

### 📊 统计

- 删除1732行代码
- 删除2个空目录
- 删除2个测试文件
- 专注于2个核心工作域：general和cr-processing

### ✨ 核心功能保留

- ✅ 11个智能体框架
- ✅ 4层代码修改网关
- ✅ 持久化审计系统
- ✅ 测试强制执行
- ✅ OpenCode日志集成
- ✅ 通用编程（general域）
- ✅ 变更请求处理（cr-processing域）

---

## [3.0.0] - 2026-03-16

### 🎉 生产就绪

企业级多智能体协作框架正式发布，包含完整的4层验证、持久化审计和测试强制。

### ✨ 新增

#### Phase 3 - 系统硬化
- **代码修改网关** (`src/workflows/code-modification-gateway.ts`)
  - 4层多级验证系统
  - 工作流状态检查
  - 风险评估（文件数、行数、类型）
  - menxia审核需求判断
  - 最终执行决策

- **持久化审计系统** (`src/workflows/audit-system.ts`)
  - JSON文件存储在 `.opencode/audit/{sessionId}.json`
  - 完整的操作追踪和记录
  - 审计报告生成功能
  - 包含id、时间戳、agent、操作、文件、风险等级、审核状态

- **测试强制执行** (`src/workflows/test-enforcement.ts`)
  - 测试结果声明追踪
  - 失败后自动阻塞后续修改
  - 会话级内存管理
  - 测试阻塞原因提示

#### 日志系统改进
- **OpenCode Logger模块** (`src/opencode-logger.ts`)
  - 专用日志客户端管理
  - 优先发送到OpenCode控制台
  - 自动降级到console输出
  - 诊断工具支持（ready/degraded/unavailable）

- **日志系统测试** (`test/opencode-logger.test.ts`)
  - 23个单元测试
  - 客户端初始化、日志发送、失败降级完整覆盖
  - 集成场景验证

### 🔧 改进

- 修复OpenCode日志输出路由问题 - 日志现在正确输出到OpenCode客户端而非终端
- 优化权限定义格式 - 从62行压缩到30行，保持功能不变
- 改进code reuse和性能审计 - 移除重复代码、优化内存管理

### 🏗️ 架构

完整的11个智能体分层架构：

**战略层**
- 皇帝 - 接收意图、分配任务、最终验收

**执行层（三省）**
- 中书省 - 制定计划
- 门下省 - 审核验证
- 尚书省 - 执行协调

**工作层（六部）**
- 吏部 - 档案采集
- 户部 - 资源整合
- 礼部 - 工作流协调
- 兵部 - 测试执行
- 刑部 - 代码审查
- 工部 - 代码实现

权限矩阵确保清晰的职责分工和安全控制。

### 📚 文档

- 创建docs文件夹，保留7个核心架构文档
- 删除93个不必要的临时分析文档
- 简化README.md专注于生产级内容
- 完整的快速开始指南

### 📦 工具支持

**代码修改工具（自动验证）**
- Edit - 修改文件
- Write - 创建/覆盖文件
- NotebookEdit - 修改Jupyter Notebook

**任务管理**
- @claim_task - 声明开始任务
- @complete_task - 标记任务完成
- @declare_test_result - 声明测试结果
- @get_task_queue - 查看任务队列
- @task_status - 查看任务状态

**Skill调用**
- task() 函数支持灵活的agent和skill组合

**日志系统**
- log() - 标准日志输出
- diagnoseLoggerStatus() - 诊断工具

### ✅ 测试

- 499+ 单元测试通过
- 完整的功能测试覆盖
- 集成场景验证
- 性能基准测试

### 🎯 核心特点

- **11个智能体** - 分层架构，职责清晰
- **4层验证网关** - 代码修改前自动检查
- **持久化审计** - 所有操作完整追踪
- **多层审核** - 皇帝→三省→六部的严格把关
- **Task依赖** - 任务队列管理，自动检查前置条件
- **测试强制** - 失败自动阻塞，防止缺陷扩散
- **Agent心跳** - 实时监控任务状态，超时预警

---

## [1.0.0-beta.1] - 2026-03-01

### 初始发布

基础多智能体框架实现，包含：

- 11个智能体的分层架构
- 权限矩阵和subagent调用控制
- 任务依赖队列管理
- 代码修改前置检查
- Session管理
- Recipe工作流系统

---

## 详细历史

### Phase 1+2: 编程Agent强制化系统
- 实施皇帝权限防护
- 实施SubAgent陷阱防护
- 实施SubAgent任务强制化
- 建立三层验证系统

### Phase 3: 系统硬化
- 代码修改网关实现
- 持久化审计系统
- 测试强制执行
- 日志系统集成

### Phase 4: 企业级功能
- 12个新模块集成
- 性能优化
- 完整的测试框架

### Phase 5: 优化和完善
- 代码质量审计
- 性能优化（P0/P1/P2）
- 内存管理改进
- 边界优化增强

---

## 安装

```bash
npm install @deep-flux/liubu
```

## 快速开始

```bash
# 配置opencode.json
{
  "plugin": ["@deep-flux/liubu"],
  "default_agent": "huangdi"
}

# 启动任务
/start 你的任务描述
```

## 文档

- [快速开始](./docs/quick-start.md)
- [系统架构](./docs/architecture.md)
- [智能体详解](./docs/agents.md)
- [Phase 3总结](./docs/phase-3.md)
- [日志系统](./docs/opencode-logger.md)
- [设计原则](./docs/plugin-principles.md)

## 许可证

MIT

---

**版本**: 3.0.0
**发布日期**: 2026-03-16
**状态**: ✅ 生产就绪

