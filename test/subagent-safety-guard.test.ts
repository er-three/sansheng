/**
 * SubAgent 安全防护系统测试
 * 测试深度限制和循环检测功能
 */

import {
  validateSubagentCallDepth,
  detectCycle,
  createSubagentContext,
  pushSubagentContext,
  validateSubagentCall,
  formatCallStack,
  MAX_SUBAGENT_DEPTH,
  diagnoseDepthIssue,
} from "../src/workflows/subagent-safety-guard.js"

describe("SubAgent Safety Guard - 安全防护系统", () => {
  // ─────────────────────── 深度限制测试 ───────────────────────

  describe("深度限制 (Depth Limit)", () => {
    test("深度0-2应该通过验证", () => {
      const result0 = validateSubagentCallDepth(0)
      const result1 = validateSubagentCallDepth(1)
      const result2 = validateSubagentCallDepth(2)

      expect(result0.allowed).toBe(true)
      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
    })

    test("深度3应该被拒绝（达到默认限制）", () => {
      const result = validateSubagentCallDepth(3)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain("深度已达上限")
      expect(result.reason).toContain("3")
    })

    test("深度4应该被拒绝", () => {
      const result = validateSubagentCallDepth(4)
      expect(result.allowed).toBe(false)
    })

    test("自定义深度限制应该生效", () => {
      const customMax = 5
      const result4 = validateSubagentCallDepth(4, customMax)
      const result5 = validateSubagentCallDepth(5, customMax)

      expect(result4.allowed).toBe(true)
      expect(result5.allowed).toBe(false)
    })
  })

  // ─────────────────────── 循环检测测试 ───────────────────────

  describe("循环检测 (Cycle Detection)", () => {
    test("无重复Agent的链应该通过", () => {
      const callStack = ["Agent", "SubAgent1", "SubAgent2"]
      const result = detectCycle(callStack)

      expect(result.hasCycle).toBe(false)
      expect(result.cycle).toBeUndefined()
    })

    test("检测直接循环：A->B->A", () => {
      const callStack = ["Agent", "SubAgent1", "Agent"]
      const result = detectCycle(callStack)

      expect(result.hasCycle).toBe(true)
      expect(result.cycle).toContain("Agent")
      expect(result.reason).toContain("循环")
    })

    test("检测间接循环：A->B->C->A", () => {
      const callStack = ["Agent", "SubAgent1", "SubAgent2", "Agent"]
      const result = detectCycle(callStack)

      expect(result.hasCycle).toBe(true)
      expect(result.cycle?.length).toBe(4)
    })

    test("检测多层循环：A->B->C->B->A", () => {
      const callStack = ["Agent", "SubAgent1", "SubAgent2", "SubAgent1", "Agent"]
      const result = detectCycle(callStack)

      expect(result.hasCycle).toBe(true)
      // 应该找到最先重复的
      expect(result.cycle).toBeDefined()
    })

    test("空调用栈应该返回无循环", () => {
      const result = detectCycle([])
      expect(result.hasCycle).toBe(false)
    })

    test("单个Agent调用应该无循环", () => {
      const callStack = ["MainAgent"]
      const result = detectCycle(callStack)

      expect(result.hasCycle).toBe(false)
    })
  })

  // ─────────────────────── 上下文管理测试 ───────────────────────

  describe("SubAgent 调用上下文 (Call Context)", () => {
    test("创建初始上下文应该正确初始化", () => {
      const context = createSubagentContext()

      expect(context.callStack).toEqual([])
      expect(context.depth).toBe(0)
      expect(context.maxDepth).toBe(MAX_SUBAGENT_DEPTH)
      expect(context.startTime).toBeDefined()
    })

    test("自定义最大深度应该生效", () => {
      const customMax = 5
      const context = createSubagentContext(customMax)

      expect(context.maxDepth).toBe(customMax)
    })

    test("压入上下文应该更新调用栈和深度", () => {
      const context = createSubagentContext()
      const newContext = pushSubagentContext(context, "SubAgent1")

      expect(newContext.callStack).toEqual(["SubAgent1"])
      expect(newContext.depth).toBe(1)
      expect(newContext.maxDepth).toBe(context.maxDepth)
    })

    test("多次压入上下文应该形成链", () => {
      let context = createSubagentContext()
      context = pushSubagentContext(context, "Sub1")
      context = pushSubagentContext(context, "Sub2")
      context = pushSubagentContext(context, "Sub3")

      expect(context.callStack).toEqual(["Sub1", "Sub2", "Sub3"])
      expect(context.depth).toBe(3)
    })

    test("原始上下文不应该被修改（不可变性）", () => {
      const original = createSubagentContext()
      const modified = pushSubagentContext(original, "Sub1")

      expect(original.callStack).toEqual([])
      expect(original.depth).toBe(0)
      expect(modified.callStack).toEqual(["Sub1"])
      expect(modified.depth).toBe(1)
    })
  })

  // ─────────────────────── 组合验证测试 ───────────────────────

  describe("组合验证 (Combined Validation)", () => {
    test("正常的SubAgent调用应该通过", () => {
      const context = createSubagentContext()
      const result = validateSubagentCall("SubAgent1", context)

      expect(result.allowed).toBe(true)
    })

    test("深度过深的调用应该被拒绝", () => {
      let context = createSubagentContext()
      context = pushSubagentContext(context, "Sub1")
      context = pushSubagentContext(context, "Sub2")
      context = pushSubagentContext(context, "Sub3") // 深度已到3，不能再加

      const result = validateSubagentCall("Sub4", context)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain("深度已达上限")
    })

    test("循环调用应该被拒绝", () => {
      let context = createSubagentContext()
      context = pushSubagentContext(context, "Sub1")
      context = pushSubagentContext(context, "Sub2")

      const result = validateSubagentCall("Sub1", context) // 试图调回Sub1

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain("循环")
    })

    test("同时触发深度和循环限制时深度优先检查", () => {
      let context = createSubagentContext(2) // 设置最大深度为2
      context = pushSubagentContext(context, "Sub1")
      context = pushSubagentContext(context, "Sub1") // 已经循环且达到深度限制

      const result = validateSubagentCall("Sub1", context)

      // 应该被某个检查拒绝
      expect(result.allowed).toBe(false)
    })
  })

  // ─────────────────────── 工具函数测试 ───────────────────────

  describe("工具函数 (Utility Functions)", () => {
    test("格式化调用栈应该生成可读字符串", () => {
      const callStack = ["Agent", "Sub1", "Sub2"]
      const formatted = formatCallStack(callStack)

      expect(formatted).toBe("Agent → Sub1 → Sub2")
    })

    test("空调用栈的格式化应该返回默认文本", () => {
      const formatted = formatCallStack([])

      expect(formatted).toBe("(无调用)")
    })

    test("诊断函数应该提供有用的信息", () => {
      let context = createSubagentContext()
      context = pushSubagentContext(context, "Sub1")

      const diagnosis = diagnoseDepthIssue(context)

      expect(diagnosis).toContain("Sub1")
      expect(diagnosis).toBeDefined()
    })
  })

  // ─────────────────────── 边界情况测试 ───────────────────────

  describe("边界情况 (Edge Cases)", () => {
    test("Agent名称中包含特殊字符应该正确处理", () => {
      const callStack = ["Agent-1", "Sub_Agent@2", "Sub#Agent3"]
      const result = detectCycle(callStack)

      expect(result.hasCycle).toBe(false)
    })

    test("非常长的调用栈应该正确检测循环", () => {
      const agents = Array.from({ length: 100 }, (_, i) => `Sub${i}`)
      const callStack = [...agents, "Sub50"] // 在第50个位置形成循环

      const result = detectCycle(callStack)

      expect(result.hasCycle).toBe(true)
    })

    test("大小写敏感的Agent名称检测", () => {
      const callStack = ["Agent", "SubAgent", "agent"] // agent != Agent

      const result = detectCycle(callStack)

      // 因为 Agent 和 agent 被视为不同的名称
      expect(result.hasCycle).toBe(false)
    })

    test("重复的SubAgent不同深度的调用", () => {
      let context = createSubagentContext(10) // 足够深
      context = pushSubagentContext(context, "Sub1")
      context = pushSubagentContext(context, "Sub2")
      context = pushSubagentContext(context, "Sub1") // 重复，但不同深度

      const result = validateSubagentCall("Sub3", context)

      // 应该因为循环被拒绝
      expect(result.allowed).toBe(false)
    })
  })
})
