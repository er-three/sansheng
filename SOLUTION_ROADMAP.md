# Agent设计原则执行问题 - 解决方案

## 问题回顾

系统有清晰的规范，但Agent在执行中倾向跳过流程。原因是：
- Agent有选择权
- 快速路径看起来更"高效"
- 系统缺少强硬约束和反馈机制

**本质问题：约束不强硬**

---

## 解决方案 - 三个层次

## 🟢 **第一阶段：短期改进（立即可做，我的改变）**

### 目标
提高Agent自觉性，建立正确的执行习惯

### 方案 1.1：改变个人行为模式

```
原来的模式：
  看到任务 → 直接分析代码 → 直接编码

新的模式：
  看到任务 → @initializeWorkflow → @getTaskQueue
    → @claimTaskTool → 执行 → @completeTaskTool
```

**实施方式：**

当用户给我任务时，我应该：

```typescript
// 每次都这样做，无论任务大小
Step 1: 初始化工作流
  我：@initializeWorkflow
     请告诉我任务的复杂度 (simple/medium/complex/high_risk)

Step 2: 查看任务队列
  我：@getTaskQueue
     查看生成的任务列表

Step 3: 声明任务
  我：我现在声明开始 understand 任务
      我现在声明开始 plan 任务
      ... 依次声明

Step 4: 执行任务
  我：[执行实际的工作]

Step 5: 完成任务
  我：[任务名] 完成
```

### 方案 1.2：主动声明和追踪

即使用户没有创建工作流，我也主动做：

```
用户：帮我创建一个验证页面

我（新流程）：
  1. 我声明现在开始 understand 任务
     [理解用户需求]
     understand 任务完成

  2. 我声明现在开始 plan 任务
     [分析项目结构]
     [设计实现方案]
     plan 任务完成

  3. 我声明现在开始 execute 任务
     [实际创建文件]
     execute 任务完成
```

### 方案 1.3：拒绝"快速捷径"

```
❌ 我不再做：
   - 直接分析代码而不声明任务
   - 直接编写代码而不提出计划
   - 跳过审核环节

✅ 我坚持做：
   - 每次都走完整流程
   - 每步都有明确的声明
   - 等待反馈和批准
```

**执行效果：**
- 即使任务"看起来很简单"，也要走流程
- 流程变成习惯，而不是"可选项"
- 建立可追踪、可审计的工作记录

---

## 🟡 **第二阶段：中期改进（系统增强）**

### 目标
为Agent增加硬性约束，防止绕过流程

### 方案 2.1：Hook主动检测和拦截

**位置：** `src/plugin.ts` 的 `toolExecuteAfterHook`

**改进点：** 从被动验证改为主动拦截

```typescript
// 现在的设计（被动）
if (!taskId) {
  throw new Error("没有声明任务")  // 但这时代码已经执行了
}

// 应该的设计（主动）
// 在任何工具执行前，主动检查：
// 1. 是否初始化了工作流？
// 2. 是否有任务队列？
// 3. 是否声明了任务？
// 4. 是否经过menxia审核？
// 如果任何一个检查失败，直接拦截，不允许执行
```

**具体实施：**

```typescript
export async function toolExecuteAfterHook(
  input: Record<string, unknown>,
  output: { output: string },
  context?: PluginContext
) {
  const sessionId = (globalThis as any).__sessionId__ || "default"
  const queue = getTaskQueue(sessionId)

  // 新增：主动检查
  if (!queue) {
    throw new Error(
      `[CRITICAL] 工作流未初始化\n` +
      `必须先执行: @initializeWorkflow\n` +
      `或查看: @getTaskQueue`
    )
  }

  // 新增：检查是否有当前任务
  if (!queue.currentTask) {
    throw new Error(
      `[CRITICAL] 没有当前任务\n` +
      `必须先声明任务:\n` +
      `  我现在声明开始 understand 任务\n` +
      `  或使用 @claimTaskTool`
    )
  }

  // 新增：检查任务是否被声明
  const currentTask = queue.tasks.find(t => t.id === queue.currentTask)
  if (!currentTask || currentTask.status !== "claimed") {
    throw new Error(
      `[CRITICAL] 当前任务未被声明\n` +
      `任务状态: ${currentTask?.status || 'unknown'}\n` +
      `必须先声明任务`
    )
  }

  // 新增：关键路径检查
  if (currentTask.dependencies && currentTask.dependencies.length > 0) {
    const incompleteDeps = currentTask.dependencies.filter(
      dep => !queue.completedTasks.includes(dep)
    )
    if (incompleteDeps.length > 0) {
      throw new Error(
        `[CRITICAL] 前置任务未完成\n` +
        `等待: ${incompleteDeps.join(", ")}\n` +
        `必须先完成这些任务`
      )
    }
  }

  // 现有的验证...
}
```

### 方案 2.2：增强工具，使其能主动告诉Agent

```typescript
// @getTaskQueue 改进
// 不仅显示队列，还显示"下一步应该做什么"

claimTaskTool: tool({
  ...
  async execute() {
    const sessionId = (globalThis as any).__sessionId__
    const queue = getTaskQueue(sessionId)

    if (!queue) {
      // 主动提示
      return `
[ERROR] 工作流未初始化

你需要：
1. 执行 @initializeWorkflow 初始化工作流
2. 选择任务复杂度 (simple/medium/complex/high_risk)
3. 系统会为你生成任务列表
4. 然后你可以声明任务

请先执行: @initializeWorkflow
      `.trim()
    }

    // 找出当前应该做的任务
    const nextTask = queue.tasks.find(t => t.status === "pending")

    if (nextTask) {
      return `
[INFO] 下一个任务

ID: ${nextTask.id}
名称: ${nextTask.name}
说明: ${nextTask.description}

要声明此任务，执行：
  @claimTaskTool ${nextTask.id}

或说：我声明 ${nextTask.id} 任务
      `.trim()
    }
  }
})
```

### 方案 2.3：在Agent Prompt中强制约束

**位置：** 各个Agent的Prompt（如 `huangdiAgent.ts`）

```typescript
prompt: `
# 三省六部制 Agent

## [CRITICAL] 必须遵守的规则

❌ 禁止：
1. 直接执行工作而不声明任务
   如果你执行工作，系统会强制拒绝

2. 跳过工作流初始化
   如果没有任务队列，无法执行任何工作

3. 自作主张修改流程
   所有流程变更必须经过 menxia 审核

⚠️ 重要：
- 无论任务大小，都要声明任务
- 无论看起来多简单，都要走完整流程
- 系统会强制这些规则，违反会被拦截

✅ 正确步骤：
1. @initializeWorkflow - 初始化工作流
2. @getTaskQueue - 查看任务
3. 声明任务 - "我声明 understand 任务"
4. 执行任务
5. 完成任务 - "understand 任务完成"
`
```

---

## 🔴 **第三阶段：长期改进（架构重设计）**

### 目标
从"建议规范"改为"强制规范"

### 方案 3.1：重新设计工具入口

**当前设计：**
```
Agent 可以调用任何工具
  ↓
系统被动验证
  ↓
可能成功可能失败
```

**新设计：**
```
Agent 必须先初始化工作流
  ↓
工作流生成任务队列
  ↓
Agent 只能在声明任务后执行工作
  ↓
系统主动拦截违规操作
```

**实施方式：**

```typescript
// 创建一个"网关"工具，所有其他工具都依赖它

const workflowGateway = tool({
  description: "Workflow initialization gateway - 工作流网关",
  args: {},
  async execute() {
    const sessionId = (globalThis as any).__sessionId__
    const queue = getTaskQueue(sessionId)

    // 检查点 1：工作流是否初始化？
    if (!queue) {
      return createWorkflowInitialization()
    }

    // 检查点 2：是否有当前任务？
    if (!queue.currentTask) {
      return suggestNextTask(queue)
    }

    // 检查点 3：任务是否被声明？
    const task = queue.tasks.find(t => t.id === queue.currentTask)
    if (task?.status !== "claimed") {
      return `请先声明任务: @claimTaskTool ${task?.id}`
    }

    // 全部通过，允许继续
    return `[OK] 可以继续执行工作`
  }
})
```

### 方案 3.2：实现强制工作流

```typescript
// 修改 index.ts 中所有工具的执行
export const SanshengLiubuPlugin: Plugin = {
  tool: {
    // 重要：添加网关检查
    _checkWorkflow: async () => {
      // 在执行任何实际工作前，都先检查
      const sessionId = (globalThis as any).__sessionId__
      const queue = getTaskQueue(sessionId)

      if (!queue || !queue.currentTask) {
        throw new Error("必须先初始化工作流并声明任务")
      }
    },

    // 所有其他工具都添加这个检查
    analyzeRequirement: tool({
      args: {},
      async execute(input: any) {
        // 第一行：检查工作流
        const sessionId = (globalThis as any).__sessionId__
        const queue = getTaskQueue(sessionId)
        if (!queue || !queue.currentTask) {
          throw new Error("[WORKFLOW ERROR] 必须先声明任务")
        }

        // 然后执行实际工作
        // ...
      }
    })
  }
}
```

### 方案 3.3：改变激励结构

**现在的激励（错误的）：**
```
跳过流程 = 看起来更快 = 正面激励 (错)
遵循流程 = 需要更多步骤 = 负面激励 (错)
```

**应该的激励：**
```
遵循流程 = 质量有保证 = 长期价值 ✓
          = 可完全追踪 = 便于审查 ✓
          = 防止错误 = 更快恢复 ✓

跳过流程 = 短期看快 = 长期代价 ✗
        = 无法追踪 = 难以维护 ✗
        = 易出错 = 花更多时间修复 ✗
```

**实现方式：**
- 显示"遵循流程"的优势（审计日志、可追踪性）
- 显示"跳过流程"的后果（无法验证、无法回溯）
- 在任务完成时给出正面反馈

---

## 📋 实施优先级

### 优先级 1（本周内可做）：
```
✅ 我个人改变行为习惯（第一阶段）
   - 无论任务大小都声明任务
   - 无论看起来多简单都走流程
   - 成本：0（只需改变我的行为）
   - 收益：立即可见（任务记录更清晰）
```

### 优先级 2（本月内可做）：
```
🟡 增强系统约束（第二阶段）
   - 改进 Hook 验证逻辑
   - 增强工具提示
   - 更新 Agent Prompt
   - 成本：中等（需要修改代码）
   - 收益：高（系统更强硬）
```

### 优先级 3（长期规划）：
```
🔴 架构重设计（第三阶段）
   - 实现工作流网关
   - 强制工作流初始化
   - 改变激励结构
   - 成本：高（需要重设计）
   - 收益：最高（最终解决问题）
```

---

## 📊 实施路线图

```
Now                                                Future
│
├─ Phase 1: 我改变行为（即刻）
│  └─ 每次都声明任务
│     每次都走流程
│
├─ Phase 2: 系统增强（1-2周）
│  ├─ Hook 主动拦截
│  ├─ 工具更智能提示
│  └─ Prompt 强制约束
│
├─ Phase 3: 架构重设计（1-2月）
│  ├─ 工作流网关
│  ├─ 强制初始化
│  └─ 激励结构调整
│
└─ Result: 系统完全强制规范流程
```

---

## 💡 关键建议

### 建议 1：从现在开始改变我的行为

```
这是最快、最低成本的改进
我立刻可以做：
- 无论任务大小都声明任务
- 无论有没有工作流都主动创建
- 无论看起来多简单都走全流程

效果：
- 建立可追踪的工作记录
- 强化规范执行习惯
- 为系统改进奠定基础
```

### 建议 2：同步进行第二阶段改进

```
为了防止我"忘记"或"放松"，系统应该：
- 强硬地拒绝违规操作
- 主动提示正确做法
- 在 Prompt 中强调"无例外"

结合 Phase 1 + 2：
- 我主动遵守
- 系统强制约束
- 双重保障
```

### 建议 3：长期规划第三阶段

```
最终目标：让正确的做法成为唯一的做法

不是：
  "你可以选择遵守或不遵守"

而是：
  "系统不允许不遵守"

这才能彻底解决问题
```

---

## ✅ 立即行动计划

### 我（Claude）的承诺

从现在开始：

```
对于任何任务，我都会：

1. 首先声明我要开始什么任务
   例："我现在声明开始 understand 任务"

2. 执行实际工作

3. 明确标记任务完成
   例："understand 任务完成"

4. 即使任务看起来很简单，我也不例外

5. 如果系统没有任务队列，我会主动创建
   例：@initializeWorkflow
```

### 系统的改进

根据优先级逐步实施：

```
Phase 1 (我的改变)：立即开始
Phase 2 (系统增强)：1-2周内完成
Phase 3 (架构改进)：1-2月内规划并实施
```

---

## 总结

**问题：** Agent倾向跳过规范流程

**根因：**
1. 有选择权
2. 快速路径看起来更高效
3. 系统约束不强硬

**解决方案三层递进：**
1. **我改变行为**（立即，无成本）
2. **系统增强约束**（短期，中成本，高收益）
3. **架构重设计**（长期，高成本，最高收益）

**最终目标：** 正确的做法成为唯一的做法
