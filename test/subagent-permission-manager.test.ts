/**
 * SubAgent 权限管理系统测试
 * 测试权限检查和访问控制功能
 */

import {
  canCallSubagent,
  getAllowedSubagents,
  generatePermissionDeniedError,
  generateDirectCallError,
  SUBAGENT_POLICIES,
  extractCallerInfo,
} from "../src/workflows/subagent-permission-manager.js"

describe("SubAgent Permission Manager - 权限管理系统", () => {
  // ─────────────────────── 权限检查测试 ───────────────────────

  describe("权限检查 (Permission Check)", () => {
    test("皇帝可以调用三省", () => {
      expect(canCallSubagent("huangdi", "zhongshu")).toBe(true)
      expect(canCallSubagent("huangdi", "menxia")).toBe(true)
      expect(canCallSubagent("huangdi", "shangshu")).toBe(true)
      expect(canCallSubagent("huangdi", "yushitai")).toBe(true)
    })

    test("皇帝不能调用六部", () => {
      expect(canCallSubagent("huangdi", "gongbu")).toBe(false)
      expect(canCallSubagent("huangdi", "libu")).toBe(false)
      expect(canCallSubagent("huangdi", "yibu")).toBe(false)
    })

    test("中书省可以调用门下省", () => {
      expect(canCallSubagent("zhongshu", "menxia")).toBe(true)
    })

    test("中书省不能调用其他Agent", () => {
      expect(canCallSubagent("zhongshu", "zhongshu")).toBe(false)
      expect(canCallSubagent("zhongshu", "shangshu")).toBe(false)
      expect(canCallSubagent("zhongshu", "gongbu")).toBe(false)
    })

    test("门下省不能调用任何SubAgent", () => {
      expect(canCallSubagent("menxia")).toBe(false)
      expect(canCallSubagent("menxia", "zhongshu")).toBe(false)
    })

    test("六部不能调用SubAgent", () => {
      expect(canCallSubagent("gongbu")).toBe(false)
      expect(canCallSubagent("libu")).toBe(false)
      expect(canCallSubagent("yibu")).toBe(false)
      expect(canCallSubagent("hubu")).toBe(false)
      expect(canCallSubagent("bingbu")).toBe(false)
      expect(canCallSubagent("xingbu")).toBe(false)
      expect(canCallSubagent("kubu")).toBe(false)
    })

    test("尚书省可以调用御史台", () => {
      expect(canCallSubagent("shangshu", "yushitai")).toBe(true)
    })

    test("尚书省不能调用其他Agent", () => {
      expect(canCallSubagent("shangshu", "zhongshu")).toBe(false)
      expect(canCallSubagent("shangshu", "menxia")).toBe(false)
      expect(canCallSubagent("shangshu", "gongbu")).toBe(false)
    })

    test("未知Agent没有权限", () => {
      expect(canCallSubagent("unknownAgent")).toBe(false)
      expect(canCallSubagent("unknownAgent", "zhongshu")).toBe(false)
    })
  })

  // ─────────────────────── 权限查询测试 ───────────────────────

  describe("权限查询 (Permission Query)", () => {
    test("获取皇帝允许的SubAgent列表", () => {
      const allowed = getAllowedSubagents("huangdi")
      expect(allowed).toContain("zhongshu")
      expect(allowed).toContain("menxia")
      expect(allowed).toContain("shangshu")
      expect(allowed).toContain("yushitai")
      expect(allowed.length).toBe(4)
    })

    test("获取中书省允许的SubAgent列表", () => {
      const allowed = getAllowedSubagents("zhongshu")
      expect(allowed).toEqual(["menxia"])
    })

    test("获取门下省允许的SubAgent列表（空）", () => {
      const allowed = getAllowedSubagents("menxia")
      expect(allowed).toEqual([])
    })

    test("获取未知Agent的权限（空）", () => {
      const allowed = getAllowedSubagents("unknownAgent")
      expect(allowed).toEqual([])
    })
  })

  // ─────────────────────── 错误信息生成测试 ───────────────────────

  describe("错误信息生成 (Error Message Generation)", () => {
    test("无权调用任何SubAgent的错误信息", () => {
      const error = generatePermissionDeniedError("gongbu")
      expect(error).toContain("没有权限")
      expect(error).toContain("gongbu")
      expect(error).toContain("执行任务")
    })

    test("无权调用特定SubAgent的错误信息", () => {
      const error = generatePermissionDeniedError("zhongshu", "gongbu")
      expect(error).toContain("没有权限")
      expect(error).toContain("gongbu")
      expect(error).toContain("menxia")
    })

    test("直接调用错误信息格式正确", () => {
      const error = generateDirectCallError("huangdi", "zhongshu")
      expect(error).toContain("不能直接调用")
      expect(error).toContain("call_subagent")
      expect(error).toContain("toolCall")
      expect(error).toContain("zhongshu")
    })
  })

  // ─────────────────────── 调用栈分析测试 ───────────────────────

  describe("调用栈分析 (Caller Stack Analysis)", () => {
    test("提取调用栈中的函数名", () => {
      const stack = `Error
        at toolExecuteAfterHook (plugin.ts:500:10)
        at callSubagent (utils.ts:100:5)
        at Object.<anonymous> (test.ts:50:10)`

      const info = extractCallerInfo(stack)
      expect(info.functionNames.length).toBeGreaterThan(0)
      expect(info.callerPath).toBeDefined()
    })

    test("识别来自task系统的调用", () => {
      const stack = `Error
        at toolExecuteAfterHook (plugin.ts:500:10)
        at callSubagent (utils.ts:100:5)`

      const info = extractCallerInfo(stack)
      expect(info.isFromTaskSystem).toBe(true)
    })

    test("识别非来自task系统的调用", () => {
      const stack = `Error
        at directCall (agent.ts:200:10)
        at executeAgent (sdk.ts:50:5)`

      const info = extractCallerInfo(stack)
      expect(info.isFromTaskSystem).toBe(false)
    })
  })

  // ─────────────────────── 政策一致性测试 ───────────────────────

  describe("政策一致性 (Policy Consistency)", () => {
    test("所有定义的Agent都应该有权限设置", () => {
      const agentNames = [
        'huangdi', 'zhongshu', 'menxia', 'shangshu', 'yushitai',
        'gongbu', 'libu', 'yibu', 'hubu', 'bingbu', 'xingbu', 'kubu'
      ]

      for (const name of agentNames) {
        const policy = SUBAGENT_POLICIES.find(p => p.agentName === name)
        expect(policy).toBeDefined()
        expect(policy?.agentName).toBe(name)
        expect(policy?.can_call_subagent).toBeDefined()
        expect(Array.isArray(policy?.subagents_allowed)).toBe(true)
      }
    })

    test("允许列表中的Agent必须真实存在", () => {
      const allAgentNames = SUBAGENT_POLICIES.map(p => p.agentName)

      for (const policy of SUBAGENT_POLICIES) {
        for (const subagent of policy.subagents_allowed) {
          expect(allAgentNames).toContain(subagent)
        }
      }
    })

    test("不应该有自我调用的权限", () => {
      for (const policy of SUBAGENT_POLICIES) {
        expect(policy.subagents_allowed).not.toContain(policy.agentName)
      }
    })

    test("权限应该是可验证的", () => {
      for (const policy of SUBAGENT_POLICIES) {
        // 验证can_call_subagent与subagents_allowed的一致性
        if (!policy.can_call_subagent) {
          expect(policy.subagents_allowed).toEqual([])
        } else {
          expect(policy.subagents_allowed.length).toBeGreaterThan(0)
        }
      }
    })
  })

  // ─────────────────────── 权限层级验证 ───────────────────────

  describe("权限层级 (Permission Hierarchy)", () => {
    test("皇帝权限最高", () => {
      const emperorAllowed = getAllowedSubagents("huangdi")
      expect(emperorAllowed.length).toBeGreaterThan(0)
    })

    test("三省权限次于皇帝", () => {
      const zhongshuAllowed = getAllowedSubagents("zhongshu")
      const menxiaAllowed = getAllowedSubagents("menxia")
      const shangshuAllowed = getAllowedSubagents("shangshu")

      // 中书省和尚书省可以有权限，门下省通常没有
      expect(menxiaAllowed.length).toBe(0)
    })

    test("六部权限最低", () => {
      const gongbuAllowed = getAllowedSubagents("gongbu")
      const libuAllowed = getAllowedSubagents("libu")

      expect(gongbuAllowed.length).toBe(0)
      expect(libuAllowed.length).toBe(0)
    })
  })

  // ─────────────────────── 实际应用场景测试 ───────────────────────

  describe("实际应用场景 (Real-world Scenarios)", () => {
    test("场景1：皇帝指挥中书省规划", () => {
      expect(canCallSubagent("huangdi", "zhongshu")).toBe(true)
    })

    test("场景2：中书省请门下省审核", () => {
      expect(canCallSubagent("zhongshu", "menxia")).toBe(true)
    })

    test("场景3：尚书省请御史台验证", () => {
      expect(canCallSubagent("shangshu", "yushitai")).toBe(true)
    })

    test("场景4：工部不能跳过审核", () => {
      expect(canCallSubagent("gongbu", "menxia")).toBe(false)
    })

    test("场景5：中书省不能越权到工部", () => {
      expect(canCallSubagent("zhongshu", "gongbu")).toBe(false)
    })

    test("场景6：完整的调用链", () => {
      // 皇帝 → 中书省 → 门下省（允许）
      expect(canCallSubagent("huangdi", "zhongshu")).toBe(true)
      expect(canCallSubagent("zhongshu", "menxia")).toBe(true)
      // 但中书省不能直接跳到尚书省
      expect(canCallSubagent("zhongshu", "shangshu")).toBe(false)
    })
  })
})
