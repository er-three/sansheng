# @deep-flux/liubu

🏛️ **三省六部制 OpenCode Plugin** - 分层多智能体协作框架

基于古代中国三省六部制度设计的现代多智能体系统，实现完整的工作流程自动化。

---

## 项目状态

### 当前版本：Phase 4（企业级功能开发中）

```
✅ Phase 1-3：核心系统（已完成和集成）
   - Chancellery 工作流编排
   - Workflow 持久化
   - Code Gateway 验证
   - Audit System 审计
   - Task Queue 依赖管理

🚧 Phase 4：高级功能（已实现，架构重构中）
   - Agent Heartbeat（心跳监测）
   - Agent Communication（任务通知）
   - Task Retry Manager（自动重试）
   - Workflow Rollback（工作流回滚）
   - Error Recovery（错误恢复）
   - Parallel Executor（并行执行）
   - Workflow Events（事件驱动）
   - Analytics（性能分析）
   - Template Manager（模板管理）
   - Dependency Validator（依赖验证）
   - Session Lifecycle（会话管理）

📋 代码质量统计
   - 总代码行数：4,982 行
   - 单元测试：391 个（100% 通过）
   - 生产可用性：28% → 目标 90%（架构重构进行中）
```

---

## 快速安装

```bash
npm install @deep-flux/liubu
```

在 `opencode.json` 中添加：

```json
{
  "plugin": ["@deep-flux/liubu"],
  "default_agent": "huangdi"
}
```

---

## 核心架构

### 分层结构

- **皇帝** - 战略决策者，设定目标、掌控全局
- **三省** - 规划→审核→执行三层流程
  - 中书省：制定执行计划
  - 门下省：审核与把关
  - 尚书省：执行调度
- **六部** - 具体实现
  - 吏部：代码扫描与采集
  - 户部：外部资源整合
  - 礼部：工作流协调
  - 兵部：系统测试执行
  - 刑部：代码审查
  - 工部：代码实现
  - 库部：资产管理

---

## 工作流程

### 标准流程（6 步）

```
【第 1 步 - 用户输入】
/start 任务描述
   ↓
【第 2 步 - 用户设置（手动）】
1️⃣ 设置变量（手动：set_variables）
   ↓
【第 3-7 步 - 自动执行】
2️⃣ 皇帝分析意图、自动选择工作域（自动）
3️⃣ 中书省制定计划（自动）
4️⃣ 门下省审核通过（自动）
5️⃣ 尚书省执行计划（自动）
6️⃣ 各部逐步完成（自动）
   ↓
【最终 - 用户验收】
皇帝最终验收（手动确认）
```

### 流程说明

| 步骤 | 类型 | 操作 | 说明 |
|------|------|------|------|
| 1 | 用户 | `/start` | 提交任务描述 |
| 2 | 用户 | `set_variables` | 设置任务变量（模块名、资产类型等） |
| 3-7 | 自动 | 内部执行 | 皇帝自动分析意图、选择工作域，三省六部协作完成任务 |
| 8 | 用户 | 审阅结果 | 查看输出并验收 |

### 可用命令

```bash
# 【第1步】启动任务
/start 需要执行的任务描述

# 【第2步】设置变量（如需要）
set_variables({
  module_name: "asset-manager",
  asset_type: "service"
})

# 【其他】查看状态
/status

# 【特殊】CR 变更流程
/cr-start asset_type=service asset_name=user-service cr_description="变更说明"
```

### 快速示例

```bash
# 例 1：提取资产
/start 从 src/ 目录提取所有资产
# 系统自动分析意图 → 选择 asset-management 域 → 执行

# 例 2：CR 流程
/cr-start asset_type=service asset_name=auth-service cr_description="添加 OAuth"
# 系统自动分析意图 → 选择 cr-processing 域 → 执行
```

---

## 工作域

### 1. asset-management
从代码中提取资产（Service、Provider、DataModel、UIComponent、Utility）

**Pipeline**：
1. 代码扫描 → code-index.yaml
2. 并行资产提取 → 5 份资产
3. UI 框架映射 → ui.mapping.yaml
4. 行为场景提取 → behavior.md
5. 框架污染检测
6. 一致性验证
7. OpenSpec 持久化

### 2. cr-processing
变更请求处理与版本管理

**Pipeline**：
1. CR 提议分析
2. 规格设计
3. 代码实现
4. 版本归档

### 3. reverse-engineering
代码反向工程

### 4. video
视频处理

---

## 工作原理

### 皇帝的职责
1. 接收用户意图
2. 自动分析意图、智能选择工作域
3. 下达任务给三省
4. 监控全局进度
5. 最终验收

### 三省的协作
- **中书省**：拆解任务为具体步骤
- **门下省**：质量审核把关
- **尚书省**：协调六部执行

### 六部的执行
- 按职能分工
- 并行执行（同步）
- 串行进展（逐步）
- 质量验证

---

## 配置示例

### 简单场景
```bash
/start 从 src/ 目录提取所有资产
# 系统自动识别为 asset-management 工作流
```

### 复杂场景
```bash
/cr-start asset_type=service asset_name=auth-service cr_description="添加 OAuth 2.0 支持，需要修改接口"
# 系统自动识别为 cr-processing 工作流
```

---

## 主要特性

- ✅ **自动化流程** - 完整的任务分配和执行
- ✅ **质量把关** - 多层审核机制
- ✅ **智能调度** - 步骤间串行、步骤内并行
- ✅ **版本管理** - 完整的变更历史
- ✅ **开箱即用** - 零配置自动发现

---

## 文件结构

```
.opencode/
├── agents/          # 11 个智能体
├── domains/         # 4 个工作域
│   ├── asset-management/
│   ├── cr-processing/
│   ├── reverse-engineering/
│   └── video/
└── plugins/         # 工具和函数
```

---

## 数据统计

| 指标 | 数值 |
|------|------|
| Agents | 11 个 |
| Domains | 4 个 |
| Skills | 15+ 个 |
| 代码行数 | 40,000+ 行 |
| 文件总数 | 76 个 |

---

## 快速参考

### 环境变量

配置 `opencode.json`：

```json
{
  "model": "anthropic/claude-opus-4-6",
  "small_model": "anthropic/claude-haiku-4-5",
  "default_agent": "huangdi",
  "plugin": ["@deep-flux/liubu"],
  "permission": {
    "skill": { "*": "allow" }
  }
}
```

### 常见命令

```bash
# 查看状态
/status

# 启动任务
/start [task-description]

# CR 流程
/cr-start asset_type=[type] asset_name=[name] cr_description=[desc]
```

---

## 架构重构计划（Phase 4 Refactor）

### 当前状态（feature/plugin-refactor-opencode 分支）

**发现的架构问题**：
- 代码补丁：20% 代码重复率
- 引用混乱：28 个 import，4 个不同目录
- 文件臃肿：plugin.ts 600 行，Hook 承载过多职责
- 模块耦合：70% 耦合度
- 全局状态分散：5+ 个地方维护 Session 状态

**审计报告**：参见 `/tmp/AUDIT_REPORT.md`

### 重构目标（refactor/architecture-redesign 分支）

```
新架构设计（WorkflowManager）
├─ WorkflowEngine（执行引擎）
│  ├─ Task Queue
│  ├─ Recipe Resolution
│  └─ Dependency Management
│
├─ ObservabilityLayer（可观测性）
│  ├─ Agent Heartbeat
│  ├─ Analytics
│  └─ Audit
│
├─ ResiliencyLayer（弹性层）
│  ├─ Retry Manager
│  ├─ Rollback Manager
│  └─ Error Recovery
│
└─ CommunicationLayer（通信层）
   ├─ Agent Communication
   ├─ Event System
   └─ Notification Manager

预期改进：
✓ 代码重复率：20% → 5%
✓ 模块耦合度：70% → 30%
✓ 生产可用性：28% → 90%
✓ 可维护性大幅提升
```

### 时间线

- Phase 4 当前分支：391 个测试，高质量代码实现
- refactor/architecture-redesign：3-4 天完整重构
- main：重构完成后合并

---

## 更多文档

- **AGENTS.md** - 11 个智能体详解
- **QUICK_START.md** - 5 分钟快速开始
- **NPM_PUBLISH_GUIDE.md** - npm 发布指南
- **GITHUB_SETUP.md** - GitHub 配置指南
- **AUDIT_REPORT.md** - 代码质量审计报告（Phase 4）

---

## 许可证

MIT

---

**准备好了吗？**

- 当前分支：`feature/plugin-refactor-opencode` - Phase 4 功能开发完成
- 重构分支：`refactor/architecture-redesign` - 架构重构进行中
- 主分支：`main` - 生产稳定版本

用 `/start` 命令开始第一个任务吧！ 🚀
