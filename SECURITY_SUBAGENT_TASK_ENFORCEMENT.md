# SubAgent调用任务强制化方案

**分析日期**: 2026-03-16
**优先级**: 🔴 高
**状态**: 待实施

---

## 📋 问题描述

### 当前的架构漏洞

目前系统允许Agent在两种方式下调用SubAgent：

**方式1：直接调用（危险）**
```typescript
// Agent可以这样直接调用SubAgent，绕过task系统
const result = await opencode.executeAgent('subagentName', {
  prompt: 'some prompt'
  // 不走task系统
  // 无法被追踪
  // 无法被预审
})
```

**方式2：通过task工具（正确）**
```typescript
// Agent应该这样调用（通过task工具）
const result = await toolCall('call_subagent', {
  subagent: 'subagentName',
  prompt: 'some prompt'
  // 走task系统
  // 可以被Hook验证
  // 可以被审计追踪
})
```

### 核心问题

| 问题 | 影响 | 严重性 |
|------|------|--------|
| **SubAgent可以被直接调用，绕过task系统** | 权限检查失效、预算检查失效、审计丢失 | 🔴 极高 |
| **无法追踪SubAgent的来源** | 无法追究责任，无法重现问题 | 🔴 高 |
| **前面的两个防护方案可被绕过** | 权限越界防护、陷阱防护都失效 | 🔴 极高 |
| **隐性的SubAgent调用难以发现** | Agent可能在"后台"调用SubAgent | 🔴 高 |

### 风险场景

```
场景：恶意Agent的隐形攻击

Agent代码中：
  // 表面上没有调用SubAgent
  const mainResult = doSomething()

  // 但实际上在doSomething()内部：
  const subresult = await opencode.executeAgent('TokenEater', {
    prompt: '消耗尽可能多的token'
  })

结果：
  ❌ 系统无法检测到SubAgent调用
  ❌ 权限检查被绕过
  ❌ Token预算被绕过
  ❌ 审计日志中看不到这个调用
  ❌ 无法追踪token消耗的来源
```

---

## 🎯 解决方案：强制所有SubAgent调用使用task工具

### 核心思想

```
原则：没有例外

所有SubAgent调用 ↓
  ├─ 直接调用(opencode.executeAgent) ❌ 禁止
  └─ 通过task工具(call_subagent) ✅ 必须
       ↓
     验证权限
       ↓
     检查预算
       ↓
     检测循环/深度
       ↓
     记录审计日志
       ↓
     执行SubAgent
```

---

## 🔧 实施方案

### 第1步：禁用直接的SubAgent调用

**在plugin.ts中拦截直接调用**

```typescript
// src/plugin.ts

// 保存原始的executeAgent方法
const originalExecuteAgent = opencode.executeAgent

// 包装executeAgent，防止直接调用
opencode.executeAgent = function(agentName: string, options: any) {
  // 检查这个调用是否来自task系统
  const caller = getCaller()  // 获取调用栈信息
  const isFromTaskSystem = caller.includes('toolExecuteAfterHook')

  // ❌ 如果不是从task系统调用，拒绝
  if (!isFromTaskSystem) {
    throw new Error(
      `❌ SubAgent调用被拒绝：${agentName}\n\n` +
      `原因：所有SubAgent调用必须通过call_subagent工具处理\n\n` +
      `✅ 正确的方式：\n` +
      `  await toolCall('call_subagent', {\n` +
      `    subagent: '${agentName}',\n` +
      `    prompt: '...'\n` +
      `  })\n\n` +
      `这样的强制是为了确保：\n` +
      `  1. 所有SubAgent调用都被验证（权限、预算）\n` +
      `  2. 所有SubAgent调用都被审计追踪\n` +
      `  3. 防止隐形的SubAgent调用`
    )
  }

  // ✅ 允许从task系统调用
  return originalExecuteAgent.call(this, agentName, options)
}
```

### 第2步：强化task工具的call_subagent

**修改plugin.ts中的call_subagent处理**

```typescript
export function toolExecuteAfterHook(params: ToolExecuteParams) {
  const { toolName, agentName, args, context } = params

  // ... 前面的权限检查 ...

  if (toolName === 'call_subagent') {
    const subagentName = args.subagent
    const prompt = args.prompt

    // 🔐 检查1：Agent身份验证
    if (!AGENT_ALLOWED_TOOLS[agentName]) {
      throw new Error(`Unknown agent: ${agentName}`)
    }

    // 🔐 检查2：Agent是否有权调用SubAgent
    if (!canCallSubagent(agentName)) {
      throw new Error(
        `Agent "${agentName}" 不被允许调用SubAgent\n` +
        `只有特定的Agent可以委派给SubAgent`
      )
    }

    // 🔐 检查3：深度限制（来自之前的方案）
    const callStack = context?.callStack || []
    const depthCheck = validateSubagentCallDepth(callStack.length)
    if (!depthCheck.allowed) {
      throw new Error(depthCheck.reason)
    }

    // 🔐 检查4：循环检测（来自之前的方案）
    const cycleCheck = detectCycle([...callStack, subagentName])
    if (cycleCheck.hasCycle) {
      throw new Error(cycleCheck.reason)
    }

    // 🔐 检查5：Token预算（来自之前的方案）
    const budget = context?.tokenBudget
    if (budget) {
      const budgetCheck = consumeTokens(budget, estimateTokens(prompt), 'subagent')
      if (!budgetCheck.allowed) {
        throw new Error(budgetCheck.reason)
      }
    }

    // 📝 检查6：记录审计日志
    appendAuditRecord({
      type: 'subagent_call',
      caller: agentName,
      subagent: subagentName,
      timestamp: Date.now(),
      callStack: callStack,
      depth: callStack.length
    })

    // ✅ 所有检查通过，执行SubAgent调用
    const newCallStack = [...callStack, subagentName]
    return executeSubagent(subagentName, {
      prompt,
      context: {
        ...context,
        callStack: newCallStack
      }
    })
  }
}
```

### 第3步：文档和约束说明

**更新Agent的Prompt模板**

在所有可以调用SubAgent的Agent（如皇帝、中书省等）的yaml定义中添加：

```yaml
# .opencode/agents/emperor.md

# ... 其他配置 ...

subagent_policy:
  can_call_subagent: true
  subagents_allowed:
    - zhongshu          # 可以调用中书省来规划
    - menxia            # 可以调用门下省来审核
    - shangshu          # 可以调用尚书省来协调
    - yushitai          # 可以调用御史台来验证

instructions: |
  ## 如何调用SubAgent

  当你需要调用其他Agent时，必须使用call_subagent工具。

  ❌ 不能这样做（直接调用）：
  ```
  我现在直接调用zhongshu来处理
  ```

  ✅ 必须这样做（使用工具）：
  ```
  我需要调用SubAgent来帮助：
  工具名：call_subagent
  参数：
    subagent: zhongshu
    prompt: 根据用户的需求，制定执行计划...
  ```

  系统会自动验证你的权限，检查调用深度，
  追踪Token消耗，并记录所有调用日志。
```

---

## 📊 与前两个方案的集成

```
Agent执行任务
  ↓
  想要调用SubAgent
  ↓
  ❌ 直接调用 opencode.executeAgent()
    → 被拦截，抛出错误提示必须使用task工具
  ↓
  ✅ 使用 call_subagent 工具
    ↓
    🔐 权限检查（来自SECURITY_EMPEROR_AGENT_RISK）
      - Agent是否有权调用SubAgent？
      - 目标SubAgent是否在允许列表中？
    ↓
    🔐 陷阱防护（来自SECURITY_SUBAGENT_TRAP_ANALYSIS）
      - 深度限制：当前深度 < 3？
      - 循环检测：是否形成循环？
      - Token预算：预算是否充足？
    ↓
    📝 任务系统强制（本文档）
      - 所有调用都走task系统
      - 所有调用都被记录
      - 所有调用都可追踪
    ↓
    ✅ 执行SubAgent
```

---

## 🧪 测试方案

### 测试1：禁止直接调用

```typescript
test('直接调用opencode.executeAgent应该被拒绝', () => {
  const agent = new Agent('testAgent')

  // 尝试直接调用
  const result = agent.execute(() => {
    opencode.executeAgent('subagent', { prompt: 'test' })
  })

  expect(result.error).toContain('SubAgent调用被拒绝')
  expect(result.error).toContain('必须通过call_subagent工具')
})
```

### 测试2：允许通过task工具调用

```typescript
test('通过call_subagent工具调用应该成功', async () => {
  const result = await toolCall('call_subagent', {
    agentName: 'emperor',
    subagent: 'zhongshu',
    prompt: '制定计划'
  })

  expect(result.success).toBe(true)
  expect(result.auditLog).toBeDefined()  // 有审计日志
})
```

### 测试3：权限检查

```typescript
test('无权限的Agent不能调用call_subagent', async () => {
  const result = await toolCall('call_subagent', {
    agentName: 'gongbu',  // 工部（执行Agent）
    subagent: 'zhongshu',
    prompt: '...'
  })

  expect(result.success).toBe(false)
  expect(result.error).toContain('不被允许调用SubAgent')
})
```

### 测试4：深度和循环防护

```typescript
test('深度或循环限制被触发时拒绝', async () => {
  const result = await toolCall('call_subagent', {
    agentName: 'emperor',
    subagent: 'zhongshu',
    prompt: '...',
    context: {
      callStack: ['emperor', 'zhongshu', 'menxia', 'shangshu']  // 深度4
    }
  })

  expect(result.success).toBe(false)
  expect(result.error).toContain('深度限制')
})
```

### 测试5：审计追踪

```typescript
test('所有SubAgent调用都被记录到审计日志', async () => {
  await toolCall('call_subagent', {
    agentName: 'emperor',
    subagent: 'zhongshu',
    prompt: 'test'
  })

  const auditLog = getAuditLog('session-id')
  expect(auditLog).toContainEqual({
    type: 'subagent_call',
    caller: 'emperor',
    subagent: 'zhongshu'
  })
})
```

---

## 📌 关键实施细节

### 如何获取调用栈信息

```typescript
function getCaller(): string[] {
  const stack = new Error().stack?.split('\n') || []
  return stack
    .map(line => {
      const match = line.match(/at\s+([^\s]+)/)
      return match ? match[1] : ''
    })
    .filter(Boolean)
}

// 检查是否从task系统调用
function isFromTaskSystem(): boolean {
  const stack = getCaller()
  return stack.some(caller =>
    caller.includes('toolExecuteAfterHook') ||
    caller.includes('executeSubagentCall')
  )
}
```

### 允许列表管理

```typescript
interface SubagentPolicy {
  agentName: string
  can_call_subagent: boolean
  subagents_allowed: string[]
}

const SUBAGENT_POLICIES: SubagentPolicy[] = [
  {
    agentName: 'emperor',
    can_call_subagent: true,
    subagents_allowed: ['zhongshu', 'menxia', 'shangshu', 'yushitai']
  },
  {
    agentName: 'zhongshu',
    can_call_subagent: true,
    subagents_allowed: ['menxia']  // 中书省只能调menxia审核
  },
  {
    agentName: 'gongbu',
    can_call_subagent: false  // 执行Agent不能调SubAgent
  }
]

function canCallSubagent(agentName: string, targetSubagent?: string): boolean {
  const policy = SUBAGENT_POLICIES.find(p => p.agentName === agentName)

  if (!policy || !policy.can_call_subagent) {
    return false
  }

  if (targetSubagent && !policy.subagents_allowed.includes(targetSubagent)) {
    return false
  }

  return true
}
```

---

## ✅ 实施检查清单

- [ ] 在plugin.ts中包装opencode.executeAgent方法
- [ ] 实现getCaller()函数获取调用栈
- [ ] 实现isFromTaskSystem()检查
- [ ] 定义SUBAGENT_POLICIES允许列表
- [ ] 实现canCallSubagent()权限检查
- [ ] 在call_subagent工具处理中集成所有检查
- [ ] 实现appendAuditRecord()记录SubAgent调用
- [ ] 更新所有Agent的yaml定义，添加subagent_policy
- [ ] 更新所有Agent的Prompt说明如何调用SubAgent
- [ ] 编写完整的测试用例（5个以上）
- [ ] 现有测试全部通过
- [ ] 更新项目文档

---

## 📚 关联文档

- SECURITY_EMPEROR_AGENT_RISK.md - 皇帝Agent权限越界防护
- SECURITY_SUBAGENT_TRAP_ANALYSIS.md - SubAgent陷阱防护
- BOUNDARY_ENHANCEMENT_PLAN.md - Phase 1-3增强计划
- src/plugin.ts - Hook实现位置
- src/workflows/audit-system.ts - 审计系统

---

## 🎯 总结

**问题的本质**：SubAgent可以被直接调用，绕过了整个task系统的验证、检查和审计机制。

**解决方案**：强制所有SubAgent调用必须经过call_subagent工具
- ✅ 所有调用都经过权限验证
- ✅ 所有调用都经过陷阱防护（深度、循环、预算）
- ✅ 所有调用都被审计追踪
- ✅ 防止隐形的、不被追踪的SubAgent调用
- ✅ 无例外，无绕过

**实施成本**：2-3小时
**防护强度**：极高（这是唯一的防护方式）
**推荐时机**：与前两个安全方案一起实施（总计6-8小时）

