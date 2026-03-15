# 代码流程执行问题分析

## 🔴 核心问题

**流程没有被正确执行的根本原因：工具（Tools）没有实际执行操作！**

---

## 问题发现

### 工具定义 vs 工具实现的矛盾

**位置：** `src/index.ts` 行 181-199 (claimTaskTool)

```typescript
❌ 问题代码：
claimTaskTool: tool({
  description: "Claim a task to start working on it...",
  args: {},
  async execute() {
    return `
[INFO] Claim Task Tool

用法：在你的消息中说明你要做的任务，系统会自动追踪。
...
`.trim()
  }
})
```

**问题分析：**
- ❌ `execute()` 只是**返回说明文字**
- ❌ **没有调用** `claimTask()` 函数
- ❌ **没有实际声明任务**
- ❌ 结果：任务队列被完全绕过

---

## 连锁反应

### 1. 任务声明失败

```
Agent 说：我声明 understand 任务
  ↓
@claimTaskTool 被调用
  ↓
返回说明文字："用法：在你的消息中说明..."
  ↓
❌ 实际上：任务没有被声明
❌ task.status 仍然是 "pending"
❌ task.claimedBy 仍然是 null
❌ 没有 task_id 被设置
```

### 2. Plugin Hook 验证失败

**位置：** `src/plugin.ts` 行 350-361

```typescript
const taskId = (input as any).task_id
if (!taskId) {
  throw new Error(
    `[PROTOCOL ERROR] Agent ${agentName} 执行了工具 ${skillName} 但没有声明任务 ID...`
  )
}
```

**问题：**
- Hook 检查 `task_id` 是否存在
- 但因为 `claimTaskTool` 没有实际声明任务
- 所以永远没有 `task_id`
- Hook 验证永远失败

### 3. 完整任务流被破坏

```
应该的流程：
  understand ✅ (声明 → 执行 → 完成)
    ↓ (完成后解锁下一步)
  plan ✅
    ↓
  menxia_review ✅
    ↓
  execute ✅

实际的流程：
  understand ❌ (声明失败)
    ↓
  无法继续 (没有声明，下一步被锁定)
    ↓
  整个系统瘫痪
```

---

## 问题根源：设计缺陷

### Issue 1: 工具没有权限修改任务队列

```typescript
// 现在的设计
claimTaskTool: tool({
  args: {},  // ❌ 没有参数
  async execute() {
    // ❌ 没有接收 task_id 参数
    // ❌ 无法调用 claimTask(sessionId, taskId, agentName)
    return "说明文字"
  }
})
```

**缺陷：**
- 工具定义了 `args: {}`（空参数）
- 无法从 Agent 的输入中获取 task_id
- 无法调用 `claimTask()` 函数

### Issue 2: 没有会话和Agent信息

```typescript
async execute() {
  // ❌ 无法获取 sessionId
  const sessionId = (globalThis as any).__sessionId__  // 不存在

  // ❌ 无法获取 agentName
  const agentName = ??? // 来自哪里？

  // 结果：无法调用 claimTask(sessionId, taskId, agentName)
}
```

### Issue 3: Hook 验证和工具实现不同步

```
plugin.ts 的 toolExecuteAfterHook：
  - 期望 input.task_id 存在
  - 检查任务是否被声明
  - 验证依赖关系

但 claimTaskTool 的 execute()：
  - 不接收任何参数
  - 不调用任务函数
  - 不设置 task_id

结果：❌ 完全不同步
```

---

## 对比：应该如何实现

### ✅ 正确的工具定义

```typescript
claimTaskTool: tool({
  description: "Claim a task to start working on it",

  // ✅ 定义参数
  args: {
    taskId: {
      type: "string",
      description: "The task ID to claim (e.g., 'understand', 'plan')"
    }
  },

  // ✅ 实际执行任务声明
  async execute(input: any) {
    const sessionId = (globalThis as any).__sessionId__ || "default"
    const agentName = (globalThis as any).__agentName__ || "unknown"
    const taskId = input?.taskId

    if (!taskId) {
      throw new Error("taskId is required")
    }

    try {
      // ✅ 实际调用任务函数
      const task = claimTask(sessionId, taskId, agentName)

      return `
[OK] Task "${task.name}" claimed successfully
Status: claimed
Agent: ${agentName}
Ready to execute.
      `.trim()
    } catch (error) {
      throw new Error(`Failed to claim task: ${error}`)
    }
  }
})
```

---

## 完整问题清单

| 序号 | 问题 | 位置 | 影响 |
|------|------|------|------|
| 1 | `claimTaskTool` 不调用 `claimTask()` | src/index.ts 181-199 | 任务无法被声明 |
| 2 | `completeTaskTool` 不调用 `completeTask()` | src/index.ts 201-218 | 任务无法完成 |
| 3 | 工具参数为空 `args: {}` | src/index.ts 184, 204 | 无法传递 taskId |
| 4 | 无法获取 sessionId | src/index.ts 226, 244 | 无法访问任务队列 |
| 5 | 无法获取 agentName | src/index.ts 226, 244 | 无法标记执行Agent |
| 6 | Hook 验证期望 `task_id` 存在 | src/plugin.ts 350-361 | 但工具从不设置它 |
| 7 | 任务队列函数存在但未使用 | src/session/task-queue.ts | 系统被绕过 |

---

## 流程修复方案

### Phase 1: 修复工具实现

**步骤 1:** 更新 `claimTaskTool`
```typescript
claimTaskTool: tool({
  description: "Claim a task to start working on it",
  args: {
    taskId: { type: "string", description: "Task ID to claim" }
  },
  async execute(input: any) {
    const sessionId = (globalThis as any).__sessionId__ || "default"
    const agentName = (globalThis as any).__agentName__ || "unknown"
    const task = claimTask(sessionId, input.taskId, agentName)
    return `[OK] Task "${task.name}" claimed by ${agentName}`
  }
})
```

**步骤 2:** 更新 `completeTaskTool`
```typescript
completeTaskTool: tool({
  description: "Mark a task as completed",
  args: {
    taskId: { type: "string", description: "Task ID to complete" }
  },
  async execute(input: any) {
    const sessionId = (globalThis as any).__sessionId__ || "default"
    const task = completeTask(sessionId, input.taskId)
    return `[OK] Task "${task.name}" completed`
  }
})
```

### Phase 2: 提供会话上下文

需要在全局或上下文中设置：
```typescript
globalThis.__sessionId__ = sessionId
globalThis.__agentName__ = agentName
```

### Phase 3: 同步 Hook 验证

确保 Hook 中的验证与工具实现一致：
```typescript
// 如果工具设置了 task_id，Hook 才会检查它
// 如果工具没设置，Hook 应该提示 Agent 先声明任务
```

---

## 验证清单

### 修复前测试
```
❌ @claimTaskTool
    返回：说明文字
    任务状态：仍然是 pending

❌ @completeTaskTool
    返回：说明文字
    任务状态：仍然是 pending
```

### 修复后测试
```
✅ @claimTaskTool understand
    返回：Task "理解需求" claimed by huangdi
    任务状态：变为 claimed
    claimedBy：huangdi

✅ @completeTaskTool understand
    返回：Task "理解需求" completed
    任务状态：变为 done
    下一步自动解锁
```

---

## 问题影响范围

### 直接影响
- ❌ 任务声明机制被破坏
- ❌ 任务队列系统无用
- ❌ 依赖关系无法强制

### 间接影响
- ❌ Agent 工作流程崩坏
- ❌ 无法追踪 Agent 进度
- ❌ Hook 验证全部失效
- ❌ 三省六部制流程无法执行

### 用户体验影响
- ❌ Agent 不按流程工作
- ❌ 用户无法看到任务进度
- ❌ 无法强制质量保证

---

## 总结

**问题不在流程设计，而在工具实现与流程脱离。**

| 层次 | 状态 |
|------|------|
| 流程设计 | ✅ 完整（understand → plan → review → execute → verify） |
| 任务队列 | ✅ 完整（有 claimTask, completeTask, getTaskQueue） |
| Hook 验证 | ✅ 完整（检查 task_id, 验证依赖） |
| **工具实现** | ❌ **缺失（只返回说明，不执行操作）** |

**修复工具实现就能恢复整个流程！**
