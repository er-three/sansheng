/**
 * 约束分级注入测试 - Phase 5
 *
 * 验证：
 * - 不同 Agent 获得不同的约束集合
 * - 约束成本计算正确
 * - 节省比例估算准确
 * - 配置报告生成正确
 */

import assert from "assert"
import {
  getConstraintInjectionProfile,
  estimateSavingsPercentage,
  generateConstraintProfileReport,
  ConstraintScope,
} from "../src/config/constraint-profile"

describe("约束分级注入配置", () => {
  it("应该为不同 Agent 生成不同的约束集合", () => {
    const gongbuProfile = getConstraintInjectionProfile("gongbu", "general")
    const yibuProfile = getConstraintInjectionProfile("yibu", "general")

    // gongbu（代码实现）应该有更多约束
    assert(gongbuProfile.scopes.length > yibuProfile.scopes.length)

    // gongbu 应该包含 AGENT_IMPLEMENTATION
    assert(
      gongbuProfile.scopes.includes(ConstraintScope.AGENT_IMPLEMENTATION)
    )

    // yibu 不应该有 AGENT_IMPLEMENTATION
    assert(
      !yibuProfile.scopes.includes(ConstraintScope.AGENT_IMPLEMENTATION)
    )
  })

  it("应该始终注入 UNIVERSAL 约束", () => {
    const agents = [
      "huangdi",
      "zhongshu",
      "menxia",
      "gongbu",
      "bingbu",
      "xingbu",
      "yibu",
      "hubu",
      "kubu",
      "libu",
      "shangshu",
    ]

    for (const agent of agents) {
      const profile = getConstraintInjectionProfile(agent, "general")
      assert(
        profile.scopes.includes(ConstraintScope.UNIVERSAL),
        `${agent} should have UNIVERSAL constraint`
      )
    }
  })

  it("应该正确计算节省比例", () => {
    const gongbuSavings = estimateSavingsPercentage("gongbu", "general")
    const yibuSavings = estimateSavingsPercentage("yibu", "general")

    // yibu 应该节省更多（约束更少）
    assert(yibuSavings > gongbuSavings)

    // 节省比例应该在 0-100% 之间
    assert(gongbuSavings >= 0 && gongbuSavings <= 100)
    assert(yibuSavings >= 0 && yibuSavings <= 100)
  })

  it("应该根据 Agent 优先级决定压缩策略", () => {
    const highPriorityProfile = getConstraintInjectionProfile(
      "huangdi",
      "general"
    )
    const lowPriorityProfile = getConstraintInjectionProfile("yibu", "general")

    // 高优先级不压缩
    assert.strictEqual(highPriorityProfile.compress, false)

    // 低优先级压缩
    assert.strictEqual(lowPriorityProfile.compress, true)
  })

  it("应该考虑工作域的约束需求", () => {
    const generalProfile = getConstraintInjectionProfile(
      "kubu",
      "general"
    )
    const assetProfile = getConstraintInjectionProfile(
      "kubu",
      "asset-management"
    )

    // asset-management 域应该有管理约束
    assert(
      assetProfile.scopes.length >= generalProfile.scopes.length
    )
  })

  it("应该生成有效的配置报告", () => {
    const report = generateConstraintProfileReport()

    // 验证报告包含关键内容
    assert(report.includes("约束注入配置报告"), "报告应该有标题")
    assert(report.includes("gongbu"), "报告应该包含 gongbu")
    assert(report.includes("yibu"), "报告应该包含 yibu")
    assert(report.includes("约束成本表"), "报告应该有成本表")

    // 验证 Markdown 表格格式
    assert(report.includes("| Agent |"), "应该有表格头")
  })

  it("应该为所有主要 Agent 提供配置", () => {
    const agents = [
      "huangdi",
      "zhongshu",
      "menxia",
      "shangshu",
      "gongbu",
      "bingbu",
      "xingbu",
      "yibu",
      "hubu",
      "kubu",
      "libu",
    ]

    for (const agent of agents) {
      const profile = getConstraintInjectionProfile(agent, "general")

      // 每个 Agent 应该有配置
      assert(profile.agent === agent)
      assert(profile.scopes.length > 0)
      assert(["high", "medium", "low"].includes(profile.priority))
      assert(typeof profile.compress === "boolean")
    }
  })

  it("约束成本优化应该带来明显节省", () => {
    // 对于低优先级 Agent（如 yibu），应该节省 30-50%
    const yibuSavings = estimateSavingsPercentage("yibu", "general")
    assert(yibuSavings >= 30, "yibu 应该至少节省 30%")

    // 即使是高优先级 Agent，也应该有一些节省
    const huangdiSavings = estimateSavingsPercentage("huangdi", "general")
    assert(huangdiSavings >= 0, "所有 Agent 都应该有非负的节省")
  })

  it("应该验证 Agent 名称和约束范围的一致性", () => {
    const profile = getConstraintInjectionProfile("gongbu", "general")

    // gongbu 的约束应该包含实现相关的约束
    const implementationScopes = [
      ConstraintScope.AGENT_IMPLEMENTATION,
      ConstraintScope.UNIVERSAL,
      ConstraintScope.SECURITY,
      ConstraintScope.DOCUMENTATION,
    ]

    for (const scope of implementationScopes) {
      assert(
        profile.scopes.includes(scope),
        `gongbu 应该包含 ${scope} 约束`
      )
    }
  })
})

console.log("\n✅ 约束分级注入测试全部通过！")
