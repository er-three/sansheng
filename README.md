# @deep-flux/liubu

🏛️ **三省六部制 OpenCode Plugin** - 分层多智能体协作框架

基于古代中国三省六部制度设计的现代多智能体系统，实现完整的工作流程自动化。

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

### 标准流程（7 步）

```
【第 1 步 - 用户输入】
/start 任务描述
   ↓
【第 2-4 步 - 用户选择（手动）】
1️⃣ 皇帝确认意图（自动理解）
2️⃣ 设置变量（手动：set_variables）
3️⃣ 选择工作域（手动：/switch-domain）
   ↓
【第 5-7 步 - 自动执行】
4️⃣ 中书省制定计划（自动）
5️⃣ 门下省审核通过（自动）
6️⃣ 尚书省执行计划（自动）
7️⃣ 各部逐步完成（自动）
   ↓
【最终 - 用户验收】
皇帝最终验收（手动确认）
```

### 流程说明

| 步骤 | 类型 | 操作 | 说明 |
|------|------|------|------|
| 1 | 用户 | `/start` | 提交任务描述 |
| 2 | 用户 | `set_variables` | 设置任务变量（模块名、资产类型等） |
| 3 | 用户 | `/switch-domain` | **选择工作域**（asset-management/cr-processing 等） |
| 4-7 | 自动 | 内部执行 | 三省六部自动协作完成任务 |
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

# 【第3步】选择工作域（必需）
/switch-domain asset-management

# 【其他】查看状态
/status

# 【特殊】CR 变更流程
/cr-start asset_type=service asset_name=user-service cr_description="变更说明"
```

### 快速示例

```bash
# 例 1：提取资产
/switch-domain asset-management    # 👈 手动选择域
/start 从 src/ 目录提取所有资产    # 👈 手动启动
# 之后系统自动执行，无需人工干预

# 例 2：CR 流程
/switch-domain cr-processing       # 👈 手动选择域
/cr-start asset_type=service asset_name=auth-service cr_description="添加 OAuth"
# 之后系统自动执行变更流程
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
2. 选择工作域
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
/switch-domain asset-management
/start 从 src/ 目录提取所有资产
```

### 复杂场景
```bash
/switch-domain cr-processing
/cr-start asset_type=service asset_name=auth-service cr_description="添加 OAuth 2.0 支持，需要修改接口"
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

# 切换域
/switch-domain [domain-name]

# 启动任务
/start [task-description]

# CR 流程
/cr-start asset_type=[type] asset_name=[name] cr_description=[desc]
```

---

## 更多文档

- **AGENTS.md** - 11 个智能体详解
- **QUICK_START.md** - 5 分钟快速开始
- **NPM_PUBLISH_GUIDE.md** - npm 发布指南
- **GITHUB_SETUP.md** - GitHub 配置指南

---

## 许可证

MIT

---

**准备好了吗？** 用 `/start` 命令开始第一个任务吧！ 🚀
