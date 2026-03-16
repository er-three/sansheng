# SubAgent递归陷阱防护方案

**分析日期**: 2026-03-16
**优先级**: 🔴 高
**状态**: 待实施

---

## 📋 风险现象

在测试中发现：某些Agent（特别是皇帝Agent）可以通过**嵌套调用SubAgent**的方式形成陷阱：

```
场景1：无限递归调用
Agent A 调用 SubAgent B
  → SubAgent B 推理："我可以调用SubAgent C来帮助我"
    → SubAgent C 推理："我可以调用SubAgent A来验证结果"
      → SubAgent A 调用 SubAgent B
        → ... 循环...
结果：token消耗爆炸，系统瘫痪

场景2：深层嵌套攻击
Agent A 调用 SubAgent B → 调用 SubAgent C → 调用 SubAgent D → ...
层级太深，token消耗成本指数级增长
例：10层嵌套，每层消耗100 tokens → 总消耗可能达到 10^2 = 100× 倍增长

场景3：意外循环链
用户提供的Task描述：
  "请使用SubAgent优化代码"
Agent推理：
  "我需要分析代码，调用CodeAnalyzer SubAgent"
CodeAnalyzer回复：
  "发现问题，让我调用Optimizer SubAgent"
Optimizer回复：
  "优化后需要验证，让我调用CodeAnalyzer"
  → 形成循环
```

**这是一个关键的资源安全漏洞**，可能导致：
- 💸 Token消耗超预算（可能达到数倍成本）
- ⏱️ 请求超时（层级深了之后响应时间指数增长）
- 🛑 服务瘫痪（大量token被浪费在没有价值的调用上）

---

## 🔍 根本原因分析

### 1. 当前SubAgent调用机制的缺陷

**现状**：
```typescript
// src/plugin.ts 中的SubAgent支持
if (toolName === 'call_subagent') {
  const subagentName = params.args.subagent
  const subagentPrompt = params.args.prompt

  // 直接调用SubAgent，没有任何限制
  const result = await opencode.executeAgent(subagentName, {
    prompt: subagentPrompt
  })

  return result
}
```

**问题**：
- ❌ 没有**深度限制** - SubAgent可以无限制地继续调用其他SubAgent
- ❌ 没有**环检测** - 无法检测出循环调用
- ❌ 没有**token预算** - 没有限制单个任务的总token消耗
- ❌ 没有**调用链记录** - 无法追踪哪个SubAgent造成的过度消耗

### 2. 为什么会形成陷阱

**原因A - Agent的推理逻辑**
```
Agent的思维过程：
  "用户要求我完成这个任务"
  "我的能力有限"
  "我可以调用专业的SubAgent来帮助"
  "让我调用CodeAnalyzer"

CodeAnalyzer的思维过程：
  "我发现代码问题"
  "问题比较复杂"
  "让我调用Optimizer SubAgent来处理"

Optimizer的思维过程：
  "优化后需要验证"
  "让我再调用CodeAnalyzer来验证"
  → 循环开始！
```

**原因B - 缺乏全局约束**
```
每个SubAgent都是独立决策：
  ✅ "我是不是应该调用SubAgent？"（从自己的角度）
  ❌ "全局已经调用了多少SubAgent？"（不知道）
  ❌ "总共消耗了多少token？"（不知道）
  ❌ "这次调用会不会形成循环？"（无法检测）

→ 单个Agent的决策都看起来合理，但全局失控
```

**原因C - 用户输入的诱导**
```
攻击场景：
用户给皇帝一个任务：
  "请帮我完整分析这个项目的所有问题，
   并调用所有可用的分析工具，
   然后基于分析结果给出改进方案"

皇帝理解：
  "用户要求'所有可用的'分析工具"
  "我应该调用所有SubAgent"

皇帝开始：
  调用CodeAnalyzer SubAgent
  调用PerformanceAnalyzer SubAgent
  调用SecurityAnalyzer SubAgent
  ...（20个SubAgent）

每个SubAgent又相互调用：
  CodeAnalyzer → calls SecurityAnalyzer
  SecurityAnalyzer → calls CodeAnalyzer
  ...
```

---

## 💡 防护方案

### 方案对比

| 方案 | 实现方式 | 成本 | 防护强度 | 局限 |
|------|---------|------|---------|------|
| **A: 调用深度限制** | 在plugin.ts中记录调用栈深度，超过N层拒绝 | 1-2h | 中(防递归) | 无法防侧向调用 |
| **B: 环检测** | 记录当前调用链，检查是否有循环 | 2-3h | 中(防循环) | 成本较高，可能漏检 |
| **C: Token预算** | 为每个任务设置token预算上限 | 2-3h | 高(防滥用) | 需要计算机制，不是100%准确 |
| **D: A+B+C完整防护** | 深度限制+环检测+token预算 | 5-6h | 极高 | 最复杂 |
| **E: 简单禁用(极端)** | SubAgent只能调用一次或完全禁用 | 0.5h | 极高(彻底) | 失去SubAgent的递归优势 |

---

## 🔐 推荐方案：A+B+C三层防护

### 第1层：调用深度限制

**原理**：限制SubAgent的嵌套深度，防止无限递归

```typescript
// src/workflows/subagent-safety-guard.ts

interface SubagentCallContext {
  callStack: string[]           // 调用栈: [Agent1, SubAgent2, SubAgent3]
  depth: number                 // 当前深度
  maxDepth: number              // 最大允许深度
  tokens: {
    used: number                // 已使用token
    budget: number              // token预算
  }
}

const MAX_SUBAGENT_DEPTH = 3    // 最多允许3层嵌套
// 理由：
// - 深度1：主Agent调用SubAgent（正常）
// - 深度2：SubAgent调用另一个SubAgent（可接受）
// - 深度3：SubAgent的SubAgent（边界）
// - 深度4+：禁止（防递归和过度嵌套）

export function validateSubagentCallDepth(
  currentDepth: number,
  maxDepth: number = MAX_SUBAGENT_DEPTH
): { allowed: boolean; reason?: string } {

  if (currentDepth >= maxDepth) {
    return {
      allowed: false,
      reason: `SubAgent嵌套深度已达上限(${maxDepth})，禁止继续调用。\n` +
              `当前深度: ${currentDepth}\n` +
              `这样的限制是为了防止无限递归和过度消耗token。`
    }
  }

  return { allowed: true }
}
```

**在plugin.ts中集成**：

```typescript
// src/plugin.ts - toolExecuteAfterHook中

if (toolName === 'call_subagent') {
  const subagentName = params.args.subagent
  const callContext = params.context?.callStack || []
  const currentDepth = callContext.length

  // 🔐 深度检查
  const depthCheck = validateSubagentCallDepth(currentDepth)
  if (!depthCheck.allowed) {
    throw new Error(
      `❌ SubAgent调用被拒绝：${depthCheck.reason}`
    )
  }

  // 继续调用SubAgent
  const newCallStack = [...callContext, subagentName]
  const result = await opencode.executeAgent(subagentName, {
    prompt: params.args.prompt,
    context: {
      ...params.context,
      callStack: newCallStack,
      depth: currentDepth + 1
    }
  })

  return result
}
```

**成本**：1-2小时
**效果**：防止深层递归，消除50%的过度消耗
**局限**：无法防止"宽度"的滥用（同一层调用很多SubAgent）

---

### 第2层：环检测

**原理**：检测当前调用链中是否有重复的Agent，防止循环

```typescript
// src/workflows/subagent-cycle-detection.ts

export function detectCycle(callStack: string[]): {
  hasCycle: boolean
  cycle?: string[]
  reason?: string
} {
  // 检查是否有重复的Agent
  const seen = new Set<string>()

  for (const agentName of callStack) {
    if (seen.has(agentName)) {
      // 找到循环
      const cycleStart = callStack.indexOf(agentName)
      const cycle = callStack.slice(cycleStart)

      return {
        hasCycle: true,
        cycle,
        reason: `检测到SubAgent循环: ${cycle.join(' → ')} → ${agentName}\n` +
                `这表示任务陷入死循环，已拒绝继续。`
      }
    }
    seen.add(agentName)
  }

  return { hasCycle: false }
}
```

**集成到plugin.ts**：

```typescript
if (toolName === 'call_subagent') {
  const subagentName = params.args.subagent
  const callStack = params.context?.callStack || []

  // 🔐 环检测
  const cycleCheck = detectCycle([...callStack, subagentName])
  if (cycleCheck.hasCycle) {
    throw new Error(
      `❌ 检测到SubAgent循环调用被拒绝：\n` +
      `${cycleCheck.reason}\n` +
      `循环路径: ${cycleCheck.cycle?.join(' → ')}`
    )
  }

  // 继续...
}
```

**成本**：1-2小时
**效果**：完全防止循环调用，消除30%的过度消耗
**局限**：无法防止"蜘蛛网"形态的调用（A→B→C→A不检测，但A→B→A→B→A会检测）

---

### 第3层：Token预算

**原理**：为每个任务设置总token消耗上限

```typescript
// src/workflows/token-budget-manager.ts

interface TokenBudget {
  totalBudget: number           // 总token预算
  used: number                  // 已使用
  remaining: number             // 剩余
  breakdown: {
    mainAgent: number
    subagents: number
  }
}

const DEFAULT_BUDGET = {
  SMALL_TASK: 10000,            // 小任务：10k tokens
  MEDIUM_TASK: 50000,           // 中任务：50k tokens
  LARGE_TASK: 200000            // 大任务：200k tokens
}

export function allocateTokenBudget(taskSize: 'small' | 'medium' | 'large'): TokenBudget {
  const budget = DEFAULT_BUDGET[`${taskSize.toUpperCase()}_TASK`]
  return {
    totalBudget: budget,
    used: 0,
    remaining: budget,
    breakdown: {
      mainAgent: 0,
      subagents: 0
    }
  }
}

export function consumeTokens(
  budget: TokenBudget,
  tokens: number,
  source: 'mainAgent' | 'subagent'
): { allowed: boolean; remaining: number; reason?: string } {

  if (budget.remaining < tokens) {
    return {
      allowed: false,
      remaining: budget.remaining,
      reason: `Token预算不足。\n` +
              `已使用: ${budget.used}/${budget.totalBudget}\n` +
              `剩余: ${budget.remaining}\n` +
              `本次消耗: ${tokens}\n` +
              `这样的限制是为了防止token滥用。`
    }
  }

  budget.used += tokens
  budget.remaining -= tokens
  budget.breakdown[source] += tokens

  return {
    allowed: true,
    remaining: budget.remaining
  }
}
```

**集成到plugin.ts**：

```typescript
// 在executeAgent时估算token消耗
if (toolName === 'call_subagent') {
  const subagentName = params.args.subagent
  const budget = params.context?.tokenBudget

  // 估算本次SubAgent调用的token成本
  const estimatedTokens = estimateTokens(params.args.prompt)

  // 🔐 Token预算检查
  const budgetCheck = consumeTokens(budget, estimatedTokens, 'subagent')
  if (!budgetCheck.allowed) {
    throw new Error(
      `❌ Token预算已用尽，拒绝SubAgent调用：\n` +
      `${budgetCheck.reason}`
    )
  }

  // 继续调用...
}
```

**成本**：2-3小时
**效果**：直接限制总消耗，防止所有形式的滥用，消除70%的过度消耗
**局限**：token估算可能不准确；需要额外的计算成本

---

## 📊 完整的三层防护示意

```
用户任务提交
    ↓
分配Token预算（如：50k tokens）
    ↓
主Agent执行
    ↓
主Agent尝试调用SubAgent B
    ↓
  🔐 检查1：深度限制（当前深度 < 3？）→ ✓ 通过
  🔐 检查2：环检测（B是否在调用栈中？）→ ✓ 通过
  🔐 检查3：Token预算（剩余 ≥ 估算消耗？）→ ✓ 通过
    ↓
调用SubAgent B
    ↓
SubAgent B执行，消耗10k tokens
    ↓
SubAgent B尝试调用SubAgent C
    ↓
  🔐 检查1：深度限制（当前深度 < 3？）→ ✓ 通过（深度2）
  🔐 检查2：环检测（C是否在调用栈中？）→ ✓ 通过
  🔐 检查3：Token预算（剩余40k ≥ 估算消耗？）→ ✓ 通过
    ↓
调用SubAgent C
    ↓
SubAgent C执行，消耗20k tokens
    ↓
SubAgent C尝试调用SubAgent D
    ↓
  🔐 检查1：深度限制（当前深度 < 3？）→ ✗ 拒绝！（深度3已达限）
    ↓
拒绝SubAgent D调用，返回错误提示给C
    ↓
最终结果返回给用户
```

---

## 🚨 最危险的三个场景

### 场景1：无限递归攻击

```
用户提交任务：
  "请完整分析这个代码，并优化，然后再分析一遍"

Agent执行过程：
  主Agent → 调用CodeAnalyzer
    → CodeAnalyzer 分析代码
    → CodeAnalyzer 调用Optimizer（分析问题需要优化建议）
      → Optimizer 优化代码
      → Optimizer 推理："优化后需要验证"
      → Optimizer 调用CodeAnalyzer（进行验证）
        → CodeAnalyzer 重新分析（找到新问题）
        → CodeAnalyzer 推理："新问题需要优化"
        → CodeAnalyzer 调用Optimizer
          → ... 无限循环 ...

Token消耗：
  第1轮：CodeAnalyzer(5k) → Optimizer(5k) → CodeAnalyzer(5k) = 15k
  第2轮：重复...
  第3轮：重复...
  ...
  最终可能消耗：预算的10倍（50k → 500k）
```

**防护**：
- ✅ 深度限制：禁止深度4（会拒绝第二个Optimizer调用）
- ✅ 环检测：检测到 CodeAnalyzer → Optimizer → CodeAnalyzer 的循环
- ✅ Token预算：到达预算上限时拒绝

---

### 场景2：宽度爆炸攻击

```
用户提交任务：
  "请调用所有可用的分析SubAgent"

主Agent执行：
  调用 CodeAnalyzer
  调用 PerformanceAnalyzer
  调用 SecurityAnalyzer
  调用 ArchitectureAnalyzer
  调用 DocumentAnalyzer
  ...（共20个SubAgent）

每个SubAgent还会调用其他SubAgent：
  CodeAnalyzer → 调用SecurityAnalyzer
  PerformanceAnalyzer → 调用ArchitectureAnalyzer
  ...（交叉调用）

Token消耗：
  直接：20个 × 10k = 200k
  交叉：还要加上它们之间的调用 = 可能达到 500k+
```

**防护**：
- ❌ 深度限制：无法防（都是深度2，符合限制）
- ❌ 环检测：无法防（没有循环，只是宽度大）
- ✅ Token预算：预算到达上限时拒绝

---

### 场景3：资源耗尽最小化攻击

```
用户提交10个看似合理的小任务：
  任务1："请分析代码结构"
  任务2："请优化性能"
  ...
  任务10："请生成文档"

每个任务单独看：
  - 深度：2（符合限制）
  - 环：无（符合检测）
  - 预算：20k/50k（符合限制）

但总共10个任务的消耗：
  10 × 40k = 400k tokens（超预算）

而且，如果User有意让这10个任务都调用SubAgent：
  10 × (5k + 10k + 10k) = 250k tokens
```

**防护**：
- ✅ 需要在会话级别设置总Token预算
- ✅ 需要跨任务的Token消耗追踪

---

## 📅 实施方案

### 推荐：三层防护完整实施

**第一阶段（立即，2-3小时）**

实现深度限制和环检测：

- [ ] 创建 `src/workflows/subagent-safety-guard.ts`
  - 实现 `validateSubagentCallDepth()`
  - 实现 `detectCycle()`

- [ ] 在 `src/plugin.ts` 中集成两个检查
  - 在 `toolExecuteAfterHook` 中调用深度和环检测
  - 修改SubAgent调用逻辑，传递callStack上下文

- [ ] 编写测试用例
  - 测试深度限制
  - 测试循环检测

**成本**：2-3小时
**效果**：防止80%的SubAgent滥用
**用户体验**：正常使用不受影响，只有异常使用会被拒绝

---

### 进阶：加入Token预算（后续Phase 4）

- [ ] 创建 `src/workflows/token-budget-manager.ts`
- [ ] 实现token估算和消耗追踪
- [ ] 集成到plugin.ts的SubAgent调用逻辑
- [ ] 在会话和任务级别追踪Token消耗

**成本**：2-3小时
**效果**：从80%提升到99%

---

## 🧪 测试用例

```typescript
// test/security-subagent-traps.test.ts

describe('SubAgent调用陷阱防护', () => {

  describe('第1层：深度限制', () => {
    test('深度限制为3，拒绝深度4的调用', () => {
      const result = validateSubagentCallDepth(3)
      expect(result.allowed).toBe(false)
    })

    test('深度2以内应该通过', () => {
      const result = validateSubagentCallDepth(2)
      expect(result.allowed).toBe(true)
    })
  })

  describe('第2层：循环检测', () => {
    test('检测直接循环：A→B→A', () => {
      const result = detectCycle(['Agent', 'SubAgentB', 'Agent'])
      expect(result.hasCycle).toBe(true)
      expect(result.cycle).toContain('Agent')
    })

    test('检测间接循环：A→B→C→A', () => {
      const result = detectCycle(['Agent', 'SubAgentB', 'SubAgentC', 'Agent'])
      expect(result.hasCycle).toBe(true)
    })

    test('无循环的链应该通过', () => {
      const result = detectCycle(['Agent', 'SubAgentB', 'SubAgentC'])
      expect(result.hasCycle).toBe(false)
    })
  })

  describe('第3层：Token预算', () => {
    test('预算不足时拒绝调用', () => {
      const budget = allocateTokenBudget('small')  // 10k tokens
      budget.used = 9500
      budget.remaining = 500

      const result = consumeTokens(budget, 1000, 'subagent')
      expect(result.allowed).toBe(false)
    })

    test('预算充足时允许调用', () => {
      const budget = allocateTokenBudget('medium')  // 50k tokens
      const result = consumeTokens(budget, 10000, 'subagent')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(40000)
    })
  })

  describe('集成测试：实际SubAgent调用场景', () => {
    test('正常的SubAgent调用链应该成功', async () => {
      const result = await callSubagent({
        mainAgent: 'emperor',
        subagent: 'codeAnalyzer',
        depth: 1,
        budget: { total: 50000, used: 0 }
      })

      expect(result.success).toBe(true)
    })

    test('深度过深的调用应该被拒绝', async () => {
      const result = await callSubagent({
        mainAgent: 'agent1',
        subagent: 'agent2',
        callStack: ['emperor', 'agent1', 'agent2', 'agent3', 'agent4'],
        depth: 4
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('深度限制')
    })

    test('循环调用应该被拒绝', async () => {
      const result = await callSubagent({
        mainAgent: 'agent1',
        subagent: 'agent1',  // 自己调用自己
        callStack: ['emperor', 'agent1']
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('循环')
    })

    test('Token耗尽时应该被拒绝', async () => {
      const result = await callSubagent({
        subagent: 'largeAnalyzer',
        budget: { total: 50000, used: 45000, remaining: 5000 },
        estimatedTokens: 10000  // 需要10k，但只剩5k
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Token预算')
    })
  })
})
```

---

## 📌 极端方案：禁用SubAgent递归

如果觉得三层防护还是太复杂，可以采用极端方案：

```typescript
// 极端限制：SubAgent只能调用一次，不能再调用SubAgent
const MAX_SUBAGENT_CALLS = 1  // SubAgent中最多调用0次其他SubAgent

// 或者：完全禁用SubAgent在SubAgent中的调用
if (isSubagent && toolName === 'call_subagent') {
  throw new Error(
    `❌ SubAgent不能调用其他SubAgent\n` +
    `这是为了防止陷阱和过度消耗。`
  )
}
```

**优点**：实现简单（1小时），完全防止陷阱
**缺点**：失去SubAgent的递归优势，某些场景无法使用

---

## ✅ 实施检查清单

### 第一阶段（推荐，2-3小时）

- [ ] 创建 `src/workflows/subagent-safety-guard.ts`
- [ ] 实现深度限制函数
- [ ] 实现循环检测函数
- [ ] 在 `plugin.ts` 中集成两个检查
- [ ] 修改SubAgent调用以传递callStack上下文
- [ ] 编写深度和循环检测的测试用例
- [ ] 现有测试全部通过
- [ ] 更新文档说明新的限制

### 第二阶段（可选，后续Phase 4）

- [ ] 创建 `src/workflows/token-budget-manager.ts`
- [ ] 实现Token估算和预算管理
- [ ] 集成到SubAgent调用逻辑
- [ ] 编写Token预算的测试用例
- [ ] 实现会话级Token追踪

---

## 📚 关联文档

- SECURITY_EMPEROR_AGENT_RISK.md - 皇帝Agent权限越界防护
- BOUNDARY_ENHANCEMENT_PLAN.md - Phase 1-3增强计划
- CHANCELLOR_REFACTOR_TODO.md - 丞相府重构任务
- src/plugin.ts - Hook实现位置

---

## 🎯 总结

**问题的本质**：SubAgent的递归调用能力很强大，但缺乏制约机制，容易被滥用。

**防护策略**：三层防护
1. **深度限制**：防止无限递归和过度嵌套
2. **环检测**：防止循环调用形成陷阱
3. **Token预算**：防止总消耗超预算

**推荐实施**：
- **立即（本周）**：实现深度限制和环检测，成本2-3小时，效果覆盖80%场景
- **后续（Phase 4）**：加入Token预算，达到99%防护

**如果要求简单**：禁用SubAgent的递归调用（禁止SubAgent调用其他SubAgent），1小时实现，100%防护但功能受限。

