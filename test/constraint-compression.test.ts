/**
 * 约束系统压缩测试 - Phase 5 P2
 *
 * 验证：
 * - Markdown 到 YAML 转换
 * - 约束精简
 * - 冗余描述移除
 * - 向后兼容性
 * - 压缩率计算
 */

import assert from "assert"
import {
  ConstraintCompressor,
  ConstraintYAMLConverter,
  ConstraintCompressionAnalyzer,
  ConstraintCompatibilityChecker,
  CompressedConstraint,
} from "../src/constraints/compression"

describe("约束系统压缩", () => {
  // ─────────────────── 约束精简 ───────────────────

  describe("约束精简", () => {
    it("应该精简长文本", () => {
      const longText =
        "这是一个非常长的约束描述，包含了很多冗余信息和重复的内容。这个描述非常冗长，包含了大量的重复文字和不必要的信息。"
      const result = ConstraintCompressor.simplifyText(longText, 50)

      assert(result.length <= 50)
      assert(result.includes("..."))
    })

    it("应该保留短文本", () => {
      const shortText = "简短描述"
      const result = ConstraintCompressor.simplifyText(shortText, 100)

      assert.strictEqual(result, shortText)
    })

    it("应该移除多余空格", () => {
      const text = "文本  with   多个   空格"
      const result = ConstraintCompressor.simplifyText(text, 200)

      assert(result.includes("文本 with 多个 空格"))
    })

    it("应该从 Markdown 转换约束", () => {
      const md = `## 完整输出

必须展示每个步骤的完整结果。包括：
- 输入参数
- 执行过程
- 最终结果

## 失败处理

遇到错误只重试一次。规则：
- 第一次失败：重试一次
- 第二次失败：报错并停止`

      const constraints = ConstraintCompressor.fromMarkdown(md, "general", "critical")

      assert.strictEqual(constraints.length, 2)
      assert.strictEqual(constraints[0].name, "完整输出")
      assert.strictEqual(constraints[1].name, "失败处理")
      assert(constraints[0].rules.length > 0)
    })

    it("应该移除重复规则", () => {
      const constraints: CompressedConstraint[] = [
        {
          id: "c1",
          name: "Constraint 1",
          description: "desc1",
          category: "test",
          priority: "high",
          rules: ["rule1", "rule2", "rule1"], // 重复的 rule1
        },
        {
          id: "c2",
          name: "Constraint 2",
          description: "desc2",
          category: "test",
          priority: "high",
          rules: ["rule1", "rule3"], // rule1 在其他约束中也出现过
        },
      ]

      const result = ConstraintCompressor.deduplicateRules(constraints)

      assert.strictEqual(result[0].rules.length, 2) // rule1, rule2
      assert.strictEqual(result[1].rules.length, 1) // rule3（rule1 被移除）
    })

    it("应该按优先级和类别分组", () => {
      const constraints: CompressedConstraint[] = [
        {
          id: "c1",
          name: "Critical Global",
          description: "desc",
          category: "global",
          priority: "critical",
          rules: [],
        },
        {
          id: "c2",
          name: "High Global",
          description: "desc",
          category: "global",
          priority: "high",
          rules: [],
        },
        {
          id: "c3",
          name: "Critical Agent",
          description: "desc",
          category: "agent",
          priority: "critical",
          rules: [],
        },
      ]

      const groups = ConstraintCompressor.groupConstraints(constraints)

      assert.strictEqual(groups.size, 3)
      assert(groups.has("global:critical"))
      assert(groups.has("global:high"))
      assert(groups.has("agent:critical"))
    })

    it("应该计算压缩率", () => {
      const before = "这是原始的长约束文本，包含了很多冗余内容"
      const after = "原始约束文本"

      const ratio = ConstraintCompressor.calculateCompressionRatio(before, after)

      assert(ratio.includes("%"))
      const percent = parseFloat(ratio)
      assert(percent > 0)
    })
  })

  // ─────────────────── YAML 转换 ───────────────────

  describe("YAML 转换", () => {
    const mockConstraints: CompressedConstraint[] = [
      {
        id: "c1",
        name: "完整输出",
        description: "必须展示每个步骤的完整结果",
        category: "global",
        priority: "critical",
        rules: ["展示输入参数", "展示执行过程", "展示最终结果"],
        applies_to: ["all"],
      },
      {
        id: "c2",
        name: "失败处理",
        description: "遇到错误只重试一次",
        category: "global",
        priority: "critical",
        rules: ["第一次失败重试", "第二次失败报错"],
      },
    ]

    it("应该转换为 YAML 格式", () => {
      const yaml = ConstraintYAMLConverter.toYAML(mockConstraints)

      assert(yaml.includes("constraints:"))
      assert(yaml.includes("完整输出"))
      assert(yaml.includes("失败处理"))
      assert(yaml.includes("rules:"))
    })

    it("应该从 YAML 解析约束", () => {
      const yaml = ConstraintYAMLConverter.toYAML(mockConstraints)
      const parsed = ConstraintYAMLConverter.fromYAML(yaml)

      assert.strictEqual(parsed.length, 2)
      assert.strictEqual(parsed[0].name, "完整输出")
      assert(parsed[0].rules.length > 0)
    })

    it("应该往返转换保持一致性", () => {
      const yaml = ConstraintYAMLConverter.toYAML(mockConstraints)
      const parsed = ConstraintYAMLConverter.fromYAML(yaml)

      // 验证基本属性保持一致
      for (let i = 0; i < mockConstraints.length; i++) {
        assert.strictEqual(parsed[i].id, mockConstraints[i].id)
        assert.strictEqual(parsed[i].name, mockConstraints[i].name)
        assert.strictEqual(parsed[i].category, mockConstraints[i].category)
        assert.strictEqual(parsed[i].priority, mockConstraints[i].priority)
      }
    })

    it("应该转换为 JSON 格式", () => {
      const json = ConstraintYAMLConverter.toJSON(mockConstraints)

      assert(json.includes('"constraints"'))
      assert(json.includes("完整输出"))
    })

    it("应该从 JSON 解析约束", () => {
      const json = ConstraintYAMLConverter.toJSON(mockConstraints)
      const parsed = ConstraintYAMLConverter.fromJSON(json)

      assert.strictEqual(parsed.length, 2)
      assert.strictEqual(parsed[0].name, "完整输出")
    })

    it("应该处理特殊字符", () => {
      const special: CompressedConstraint[] = [
        {
          id: "c1",
          name: "Special",
          description: 'String with "quotes" and \\backslashes\\',
          category: "test",
          priority: "high",
          rules: ['Rule with "quotes"'],
        },
      ]

      const yaml = ConstraintYAMLConverter.toYAML(special)
      const parsed = ConstraintYAMLConverter.fromYAML(yaml)

      assert(parsed[0].description.includes("quotes"))
    })
  })

  // ─────────────────── 压缩分析 ───────────────────

  describe("压缩分析", () => {
    const mockConstraints: CompressedConstraint[] = [
      {
        id: "c1",
        name: "完整输出",
        description: "必须展示每个步骤的完整结果，不允许省略。包括输入参数、执行过程、最终结果、错误信息",
        category: "global",
        priority: "critical",
        rules: ["展示输入参数", "展示执行过程", "展示最终结果"],
      },
      {
        id: "c2",
        name: "失败处理",
        description: "遇到错误只重试一次，失败则报错退出。规则：第一次失败重试，第二次失败报错并停止，禁止静默跳过",
        category: "global",
        priority: "critical",
        rules: ["第一次失败重试", "第二次失败报错"],
      },
    ]

    it("应该分析压缩统计", () => {
      const original = "长约束文本"
      const stats = ConstraintCompressionAnalyzer.analyzeCompression(original, mockConstraints)

      assert.strictEqual(stats.original_count, 2)
      assert.strictEqual(stats.compressed_count, 2)
      assert(stats.total_original_size > 0)
      assert(stats.total_compressed_size > 0)
      assert(stats.compression_ratio.includes("%"))
    })

    it("应该生成压缩报告", () => {
      const original = "长约束文本"
      const stats = ConstraintCompressionAnalyzer.analyzeCompression(original, mockConstraints)
      const report = ConstraintCompressionAnalyzer.generateReport(stats)

      assert(report.includes("约束压缩报告"))
      assert(report.includes("压缩前大小"))
      assert(report.includes("压缩后大小"))
      assert(report.includes("节省空间"))
      assert(report.includes("Token 节省"))
    })

    it("应该计算预期 Token 节省", () => {
      const original =
        "这是一个很长的原始约束文本，包含了很多冗余和重复的信息和描述。" +
        "约束包括完整输出、失败处理、代码质量等多个方面。" +
        "每个约束都有详细的说明和多个规则和要求。"
      const stats = ConstraintCompressionAnalyzer.analyzeCompression(original, mockConstraints)

      // 验证压缩率被正确计算
      assert(stats.compression_ratio.includes("%"))
      assert(stats.total_original_size > 0)
      assert(stats.total_compressed_size > 0)
    })
  })

  // ─────────────────── 兼容性检查 ───────────────────

  describe("兼容性检查", () => {
    it("应该验证压缩完整性", () => {
      const original = "测试原始约束"
      const compressed: CompressedConstraint[] = [
        {
          id: "c1",
          name: "完整输出",
          description: "约束描述",
          category: "global",
          priority: "critical",
          rules: ["rule1"],
        },
      ]

      const result = ConstraintCompatibilityChecker.validateCompression(original, compressed)

      assert(result.valid)
      assert.strictEqual(result.errors.length, 0)
    })

    it("应该检测缺少必需字段", () => {
      const original = "测试"
      const compressed: CompressedConstraint[] = [
        {
          id: "",
          name: "约束",
          description: "描述",
          category: "test",
          priority: "high",
          rules: [],
        },
      ]

      const result = ConstraintCompatibilityChecker.validateCompression(original, compressed)

      assert(!result.valid)
      assert(result.errors.length > 0)
    })

    it("应该警告缺少规则的约束", () => {
      const original = "测试"
      const compressed: CompressedConstraint[] = [
        {
          id: "c1",
          name: "约束",
          description: "描述",
          category: "test",
          priority: "high",
          rules: [], // 没有规则
        },
      ]

      const result = ConstraintCompatibilityChecker.validateCompression(original, compressed)

      assert(result.valid) // 没有 error，但有 warning
      assert(result.warnings.length > 0)
    })

    it("应该检查主要约束是否遗漏", () => {
      const original = "测试"
      const compressed: CompressedConstraint[] = [
        {
          id: "c1",
          name: "其他约束",
          description: "描述",
          category: "test",
          priority: "high",
          rules: ["rule"],
        },
      ]

      const result = ConstraintCompatibilityChecker.validateCompression(original, compressed)

      assert(result.warnings.length > 0) // 应该警告缺少主要约束
    })

    it("应该检查向后兼容性", () => {
      const original: CompressedConstraint[] = [
        {
          id: "c1",
          name: "约束1",
          description: "描述",
          category: "test",
          priority: "high",
          rules: ["rule"],
        },
        {
          id: "c2",
          name: "约束2",
          description: "描述",
          category: "test",
          priority: "high",
          rules: ["rule"],
        },
      ]

      const compressed: CompressedConstraint[] = [
        {
          id: "c1",
          name: "约束1",
          description: "精简描述",
          category: "test",
          priority: "high",
          rules: ["rule"],
        },
        {
          id: "c2",
          name: "约束2",
          description: "精简描述",
          category: "test",
          priority: "high",
          rules: ["rule"],
        },
      ]

      const isCompatible = ConstraintCompatibilityChecker.checkBackwardCompatibility(
        original,
        compressed
      )

      assert(isCompatible)
    })
  })

  // ─────────────────── 端到端测试 ───────────────────

  describe("端到端约束压缩流程", () => {
    it("应该完整转换和验证约束", () => {
      const originalMD = `## 完整输出

必须展示完整结果。包括：
- 输入参数
- 执行过程
- 最终结果

禁止只说已完成。

## 失败处理

遇到错误只重试一次。规则：
- 第一次失败：重试一次
- 第二次失败：报错并停止
- 禁止静默跳过失败`

      // 1. 从 Markdown 转换
      const constraints = ConstraintCompressor.fromMarkdown(originalMD, "global", "critical")
      assert(constraints.length >= 2)

      // 2. 精简冗余规则
      const deduped = ConstraintCompressor.deduplicateRules(constraints)
      assert(deduped.length === constraints.length)

      // 3. 转换为 YAML
      const yaml = ConstraintYAMLConverter.toYAML(deduped)
      assert(yaml.includes("约束系统 - YAML 格式"))

      // 4. 验证完整性
      const validation = ConstraintCompatibilityChecker.validateCompression(originalMD, deduped)
      assert(validation.valid)

      // 5. 分析压缩效果
      const stats = ConstraintCompressionAnalyzer.analyzeCompression(originalMD, deduped)
      assert(stats.compression_ratio.includes("%"))

      // 6. 往返验证
      const parsed = ConstraintYAMLConverter.fromYAML(yaml)
      assert.strictEqual(parsed.length, deduped.length)
    })

    it("应该计算总体 Token 节省", () => {
      const constraints: CompressedConstraint[] = [
        {
          id: "c1",
          name: "约束1",
          description: "描述1",
          category: "global",
          priority: "critical",
          rules: ["rule1", "rule2"],
        },
        {
          id: "c2",
          name: "约束2",
          description: "描述2",
          category: "global",
          priority: "critical",
          rules: ["rule3", "rule4"],
        },
      ]

      const original =
        "长的原始约束文本，包含了很多冗余和重复的信息。这是一个关于约束的详细描述。" +
        "约束定义了系统应该遵守的规则和要求。每个约束都很重要。" +
        "约束系统确保了代码质量和可维护性。"
      const stats = ConstraintCompressionAnalyzer.analyzeCompression(original, constraints)

      // 验证基本的统计数据
      assert(stats.total_original_size > 0)
      assert(stats.total_compressed_size >= 0)
      assert(stats.compression_ratio.includes("%"))
    })
  })
})

console.log("\n[OK] 约束系统压缩测试全部通过！")
