# @deep-flux/liubu 3.1.1

企业级多智能体协作框架，基于三省六部制设计。

**最新版本**: 3.1.1 (2026-03-17) - [OK] 权限矩阵强制执行 + task()调用方式修正

---

## 核心特点

- **11个智能体** - 皇帝战略决策、三省规划审核执行、六部具体实现
- **4层验证网关** - 代码修改前自动检查：工作流状态→风险评估→审核验证→执行判定
- **持久化审计** - 所有操作完整追踪到文件（`.opencode/audit/{sessionId}.json`）
- **多层审核** - 皇帝→中书省→门下省→尚书省→六部的严格把关流程
- **Task依赖** - 任务队列管理，自动检查前置条件完成
- **测试强制** - 失败自动阻塞，防止缺陷继续扩散
- **Agent心跳** - 实时监控任务状态，超时自动预警

---

## 优势

| 优势 | 说明 |
|------|------|
| **自动化** | 零配置自动发现，开箱即用 |
| **安全性** | 4层前置拦截，多层审核把关，完整审计追踪 |
| **可靠性** | Task依赖检查，测试强制，自动重试 |
| **可观测** | Agent心跳、完整日志、诊断工具 |
| **易维护** | 清晰的层级结构，职责分工明确 |
| **可扩展** | Recipe系统编排，Skill灵活组合 |

---

## 快速使用

### 安装

```bash
npm install @deep-flux/liubu
```

### 配置

在 `opencode.json` 中添加：

```json
{
  "plugin": ["@deep-flux/liubu"],
  "default_agent": "huangdi"
}
```

### 启动任务

```bash
# 方式1：通用编程任务
/start 实现用户登录功能

# 方式2：变更请求处理
/start 升级API到v2版本，添加OAuth认证

# 方式3：查看状态
/status
```

### 工作流程

```
用户输入(/start)
  [down]
皇帝分析意图 → 选择工作域 → 分配任务给三省
  [down]
中书省制定计划
  [down]
门下省审核检查
  [down]
尚书省执行协调 → 调用六部完成
  [down]
结果验收
```

---

## 工作域支持

框架支持两个核心工作域：

### [1] General - 通用编程
用于标准的编程任务、bug修复和功能开发
- **quick_fix** - 快速修复 (5分钟, ~70K token)
- **standard** - 标准流程 (10分钟, ~120K token)
- **comprehensive** - 强化审计 (15分钟, ~180K token)

### [2] CR Processing - 变更请求处理
用于系统升级、API变更和版本更新
- **hotfix** - 紧急修复 (5分钟, ~90K token)
- **standard** - 标准CR流程 (12分钟, ~140K token)
- **complete** - 完整版本管理 (20分钟, ~200K token)

---

## 工具支持和调用

### 代码修改工具 (自动验证)

这些工具的调用会自动触发4层网关验证：

```typescript
// Edit - 修改文件
Edit(file_path, old_string, new_string)

// Write - 创建/覆盖文件
Write(file_path, content)

// NotebookEdit - 修改Jupyter Notebook
NotebookEdit(notebook_path, cell_number, new_source)
```

**验证流程**：
1. 工作流初始化检查
2. 风险评估（涉及文件数、行数、文件类型）
3. 审核需求判断
4. 最终执行判定

---

### 任务管理工具

```typescript
// 声明开始任务
@claim_task task_id

// 标记任务完成
@complete_task task_id

// 声明测试结果（失败时阻塞后续修改）
@declare_test_result task_id passed|failed "description"

// 查看任务队列
@get_task_queue

// 查看任务状态
@task_status task_id
```

---

### Skill调用

```typescript
// 通过 skill 调用执行具体功能
task(agent="agent_name", skill="skill_name", prompt="参数")

// 例子
task(agent="gongbu", skill="code_implement", prompt="实现登录功能")
task(agent="bingbu", skill="run_tests", prompt="运行单元测试")
task(agent="xingbu", skill="code_review", prompt="审查修改的代码")
```

---

### 日志调用

```typescript
// 标准日志输出（自动发送到OpenCode控制台）
log("ComponentName", "message", level)

// 诊断日志系统
diagnoseLoggerStatus()  // 返回：ready | degraded | unavailable
```

---

## 系统架构

### 智能体层级

```
【战略层】
皇帝 - 接收意图、分配任务、最终验收

【执行层 - 三省】
├─ 中书省 - 制定计划
├─ 门下省 - 审核验证
└─ 尚书省 - 执行协调

【工作层 - 六部】
├─ 吏部 - 档案采集
├─ 户部 - 资源整合
├─ 礼部 - 工作流协调
├─ 兵部 - 测试执行
├─ 刑部 - 代码审查
└─ 工部 - 代码实现
```

### 权限矩阵

| Agent | 可调用SubAgent | 权限 |
|-------|--------|------|
| 皇帝 | 中书省、门下省、尚书省 | 战略决策 |
| 中书省 | 门下省 | 规划制定 |
| 门下省 | 无 | 审核验证 |
| 尚书省 | task()调用六部 | 执行协调 |
| 六部 | 无 | 具体实现 |

---

## 扩展方案

### 1. 添加新的Skill

在 `.opencode/domains/{domain}/skills/` 下创建：

```yaml
# skill-name.md
---
description: 技能描述
mode: subagent
model: anthropic/claude-haiku-4-5
temperature: 0.0
---

你是{Agent}，职责是{具体职责}

## 输入参数

- param1: 说明

## 输出格式

```json
{
  "status": "success|failed",
  "result": "具体结果"
}
```
```

### 2. 添加新的Recipe

在 `.opencode/recipes/` 下创建YAML文件：

```yaml
name: 工作流名称
type: simple|complex
complexity: simple|medium|complex
steps:
  - id: step-1
    name: 第一步
    description: 执行说明
    uses: [agent1, agent2]
    skill: skill_name
    required_inputs:
      - input1
      - input2
  - id: step-2
    name: 第二步
    depends_on: [step-1]
    uses: [agent3]
    skill: another_skill
```

### 3. 添加新的Agent

在 `.opencode/agents/` 下创建：

```yaml
---
description: Agent职责描述
mode: subagent
model: anthropic/claude-haiku-4-5
temperature: 0.0
permission:
  task:
    agent_name: allow
  skill:
    "*": allow
allowed_tools:
  - task
  - skill
---

你是{新Agent}，职责是：
- 职责1
- 职责2

## 工作流程

1. 接收任务
2. 执行逻辑
3. 返回结果
```

### 4. 自定义约束

在 `.opencode/constraints/` 下创建：

```markdown
## 约束名称

- 约束内容1
- 约束内容2
```

自动加载，无需配置。

---

## 性能指标

| 操作 | 延迟 | 说明 |
|------|------|------|
| 代码修改网关 | <1ms | 4层验证 |
| 审计记录追加 | <10ms | 文件I/O |
| 测试状态检查 | <1ms | 内存查询 |
| 日志输出 | <5ms | OpenCode API |

---

## 常见问题

**Q: 代码修改被拒绝？**
A: 检查：工作流初始化 → 任务声明 → 依赖完成 → 审核状态

**Q: 如何追踪修改历史？**
A: 查看 `.opencode/audit/{sessionId}.json`

**Q: 如何添加新的验证规则？**
A: 修改 `src/workflows/code-modification-gateway.ts`

**Q: 如何自定义Agent职责？**
A: 在 `.opencode/agents/{agent_name}.md` 中更新 `permission` 和 `allowed_tools`

**Q: 测试失败后如何继续？**
A: 修复失败原因，调用 `@declare_test_result task_id passed`

---

## 文档

所有核心文档位于 `docs/` 文件夹：

- **docs/index.md** - 📚 文档导航索引
- **docs/quick-start.md** - 🚀 5分钟快速开始
- **docs/agents.md** - 🤖 11个智能体详解
- **docs/architecture.md** - [ARCHITECTURE] 系统架构设计
- **docs/phase-3.md** - ⚙️ Phase 3核心功能（网关、审计、测试强制）
- **docs/opencode-logger.md** - [note] 日志系统说明
- **docs/plugin-principles.md** - 🔧 系统设计原则

---

## 许可证

MIT

---

**当前版本**: 3.0.1 | **发布日期**: 2026-03-16 | **状态**: [OK] 生产就绪

### 版本3.0.1更新
- 删除资产整理功能
- 删除逆向代码功能
- 删除Agent流程优化模块
- 专注于核心：通用编程和变更请求处理
- 代码清理：删除1732行不必要代码

用 `/start` 开始第一个任务！
