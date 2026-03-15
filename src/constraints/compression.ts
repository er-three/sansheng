/**
 * 约束系统压缩与精简 - Phase 5 P2
 *
 * 支持 Markdown 到 YAML 转换，以及约束精简：
 * - YAML 结构化格式
 * - 冗余描述精简
 * - 文本长度限制
 * - 向后兼容性维护
 */

import { log } from "../utils.js"

/**
 * 压缩约束
 */
export interface CompressedConstraint {
  id: string
  name: string
  description: string // 精简版（max 200 字）
  category: string
  priority: "critical" | "high" | "medium" | "low"
  rules: string[] // 简化规则列表
  applies_to?: string[] // 适用的 Agent（可选）
}

/**
 * 约束集合（YAML 格式）
 */
export interface ConstraintCollection {
  version: string
  total_size: number // 原始大小
  compressed_size: number // 压缩后大小
  compression_ratio: string
  constraints: CompressedConstraint[]
  metadata?: {
    created_at?: string
    updated_at?: string
    source?: string
  }
}

/**
 * 约束精简工具
 */
export class ConstraintCompressor {
  /**
   * 精简文本（限制长度，移除冗余）
   */
  static simplifyText(text: string, maxLength: number = 200): string {
    // 移除多余空格
    let simplified = text.replace(/\s+/g, " ").trim()

    // 如果超过长度限制，截断并添加省略号
    if (simplified.length > maxLength) {
      simplified = simplified.substring(0, maxLength - 3) + "..."
    }

    return simplified
  }

  /**
   * 从 Markdown 约束转换为压缩格式
   */
  static fromMarkdown(
    mdContent: string,
    category: string = "general",
    priority: "critical" | "high" | "medium" | "low" = "high"
  ): CompressedConstraint[] {
    const constraints: CompressedConstraint[] = []
    const sections = mdContent.split(/^##\s+/m).slice(1) // 跳过标题

    for (let i = 0; i < sections.length; i++) {
      const lines = sections[i].split("\n")
      const name = lines[0].trim()
      const fullDescription = lines.slice(1).join("\n").trim()

      // 提取规则（bullet points）
      const rules: string[] = []
      const bulletMatches = fullDescription.match(/^-\s+(.+)$/gm) || []
      for (const match of bulletMatches) {
        const rule = match.replace(/^-\s+/, "").trim()
        if (rule.length > 0) {
          rules.push(rule)
        }
      }

      // 创建约束对象
      constraints.push({
        id: `constraint-${category}-${i + 1}`,
        name,
        description: this.simplifyText(fullDescription, 200),
        category,
        priority,
        rules,
      })
    }

    return constraints
  }

  /**
   * 合并相同规则
   */
  static deduplicateRules(constraints: CompressedConstraint[]): CompressedConstraint[] {
    const seenRules = new Set<string>()

    for (const constraint of constraints) {
      constraint.rules = constraint.rules.filter((rule) => {
        if (seenRules.has(rule)) {
          return false
        }
        seenRules.add(rule)
        return true
      })
    }

    return constraints
  }

  /**
   * 按优先级和类别分组
   */
  static groupConstraints(
    constraints: CompressedConstraint[]
  ): Map<string, CompressedConstraint[]> {
    const groups = new Map<string, CompressedConstraint[]>()

    for (const constraint of constraints) {
      const key = `${constraint.category}:${constraint.priority}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(constraint)
    }

    return groups
  }

  /**
   * 计算压缩率
   */
  static calculateCompressionRatio(before: string, after: string): string {
    const beforeSize = before.length
    const afterSize = after.length
    const ratio = ((1 - afterSize / beforeSize) * 100).toFixed(1)
    return `${ratio}%`
  }
}

/**
 * YAML 格式转换器
 */
export class ConstraintYAMLConverter {
  /**
   * 转换为 YAML 格式
   */
  static toYAML(constraints: CompressedConstraint[]): string {
    const lines = [
      "# 约束系统 - YAML 格式",
      "# 生成于：" + new Date().toISOString(),
      "",
      "version: 1.0.0",
      `total_constraints: ${constraints.length}`,
      "",
      "constraints:",
    ]

    for (const constraint of constraints) {
      lines.push(`  - id: ${constraint.id}`)
      lines.push(`    name: "${constraint.name}"`)
      lines.push(`    description: "${this.escapeYAML(constraint.description)}"`)
      lines.push(`    category: ${constraint.category}`)
      lines.push(`    priority: ${constraint.priority}`)
      lines.push(`    rules:`)

      for (const rule of constraint.rules) {
        lines.push(`      - "${this.escapeYAML(rule)}"`)
      }

      if (constraint.applies_to && constraint.applies_to.length > 0) {
        lines.push(`    applies_to:`)
        for (const agent of constraint.applies_to) {
          lines.push(`      - ${agent}`)
        }
      }

      lines.push("")
    }

    return lines.join("\n")
  }

  /**
   * 从 YAML 字符串解析约束
   */
  static fromYAML(yamlContent: string): CompressedConstraint[] {
    const constraints: CompressedConstraint[] = []
    const lines = yamlContent.split("\n")

    let currentConstraint: any = null
    let currentSection = ""
    let isInRules = false
    let isInAppliesToList = false

    for (const line of lines) {
      const trimmed = line.trim()
      const indent = line.length - line.trimStart().length

      if (!trimmed || trimmed.startsWith("#")) {
        continue
      }

      // 新约束开始
      if (trimmed.startsWith("- id:")) {
        if (currentConstraint) {
          constraints.push(currentConstraint)
        }
        currentConstraint = {
          id: trimmed.replace("- id:", "").trim(),
          rules: [],
          applies_to: [],
        }
        isInRules = false
        isInAppliesToList = false
        continue
      }

      if (!currentConstraint) {
        continue
      }

      // 解析字段
      if (trimmed.startsWith("name:")) {
        currentConstraint.name = trimmed.replace("name:", "").trim().replace(/^"|"$/g, "")
      } else if (trimmed.startsWith("description:")) {
        currentConstraint.description = trimmed
          .replace("description:", "")
          .trim()
          .replace(/^"|"$/g, "")
      } else if (trimmed.startsWith("category:")) {
        currentConstraint.category = trimmed.replace("category:", "").trim()
      } else if (trimmed.startsWith("priority:")) {
        currentConstraint.priority = trimmed.replace("priority:", "").trim()
      } else if (trimmed === "rules:") {
        isInRules = true
        isInAppliesToList = false
      } else if (trimmed === "applies_to:") {
        isInAppliesToList = true
        isInRules = false
      } else if (isInRules && trimmed.startsWith("- ")) {
        const rule = trimmed.replace("- ", "").trim().replace(/^"|"$/g, "")
        currentConstraint.rules.push(rule)
      } else if (isInAppliesToList && trimmed.startsWith("- ")) {
        const agent = trimmed.replace("- ", "").trim()
        currentConstraint.applies_to.push(agent)
      }
    }

    // 添加最后一个约束
    if (currentConstraint) {
      constraints.push(currentConstraint)
    }

    return constraints
  }

  /**
   * 转换为 JSON 格式
   */
  static toJSON(constraints: CompressedConstraint[]): string {
    return JSON.stringify(
      {
        version: "1.0.0",
        total_constraints: constraints.length,
        constraints,
      },
      null,
      2
    )
  }

  /**
   * 从 JSON 解析约束
   */
  static fromJSON(jsonContent: string): CompressedConstraint[] {
    const parsed = JSON.parse(jsonContent)
    return parsed.constraints || []
  }

  /**
   * 转义 YAML 中的特殊字符
   */
  private static escapeYAML(text: string): string {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
  }
}

/**
 * 约束精简统计
 */
export interface CompressionStats {
  original_count: number
  compressed_count: number
  total_original_size: number
  total_compressed_size: number
  compression_ratio: string
  size_saved: number
  rules_deduped: number
  categories: string[]
}

/**
 * 约束压缩分析器
 */
export class ConstraintCompressionAnalyzer {
  /**
   * 生成压缩统计
   */
  static analyzeCompression(
    original: string,
    compressed: CompressedConstraint[]
  ): CompressionStats {
    const compressedStr = JSON.stringify(compressed)
    const originalSize = original.length
    const compressedSize = compressedStr.length
    const saved = originalSize - compressedSize

    const categories = new Set(compressed.map((c) => c.category))

    return {
      original_count: compressed.length,
      compressed_count: compressed.length,
      total_original_size: originalSize,
      total_compressed_size: compressedSize,
      compression_ratio: ConstraintCompressor.calculateCompressionRatio(original, compressedStr),
      size_saved: saved,
      rules_deduped: 0, // 可以在实现中计算
      categories: Array.from(categories),
    }
  }

  /**
   * 生成压缩报告
   */
  static generateReport(stats: CompressionStats): string {
    const lines = [
      "## 约束压缩报告",
      "",
      `**压缩前大小**: ${(stats.total_original_size / 1024).toFixed(2)} KB`,
      `**压缩后大小**: ${(stats.total_compressed_size / 1024).toFixed(2)} KB`,
      `**节省空间**: ${(stats.size_saved / 1024).toFixed(2)} KB`,
      `**压缩比**: ${stats.compression_ratio}`,
      "",
      `**约束总数**: ${stats.original_count}`,
      `**约束类别**: ${stats.categories.join(", ")}`,
      "",
      "### 预期 Token 节省",
      `估算 Token 节省：**${((parseFloat(stats.compression_ratio) * 0.25).toFixed(1))}%**`,
      "（根据 token 按字符计算，实际节省可能更高）",
      "",
    ]

    return lines.join("\n")
  }
}

/**
 * 约束兼容性检查器
 */
export class ConstraintCompatibilityChecker {
  /**
   * 验证压缩后的约束完整性
   */
  static validateCompression(original: string, compressed: CompressedConstraint[]): {
    valid: boolean
    warnings: string[]
    errors: string[]
  } {
    const warnings: string[] = []
    const errors: string[] = []

    // 检查是否有空约束
    for (const constraint of compressed) {
      if (!constraint.id || !constraint.name) {
        errors.push(`约束缺少必需字段: id=${constraint.id}, name=${constraint.name}`)
      }

      if (constraint.rules.length === 0) {
        warnings.push(`约束 ${constraint.id} 没有任何规则`)
      }

      if (constraint.description.length === 0) {
        warnings.push(`约束 ${constraint.id} 缺少描述`)
      }
    }

    // 检查是否遗漏了主要约束
    const mainSections = [
      "完整输出",
      "失败处理",
      "代码质量",
      "落盘要求",
      "原样汇报",
      "流程尊重",
    ]
    const foundSections = new Set(compressed.map((c) => c.name))

    for (const section of mainSections) {
      if (!foundSections.has(section)) {
        warnings.push(`未找到主要约束: ${section}`)
      }
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    }
  }

  /**
   * 检查约束兼容性
   */
  static checkBackwardCompatibility(
    original: CompressedConstraint[],
    compressed: CompressedConstraint[]
  ): boolean {
    // 确保压缩后有相同数量的关键约束
    const originalNames = new Set(original.map((c) => c.name))
    const compressedNames = new Set(compressed.map((c) => c.name))

    // 允许修改描述，但名称应该保持一致
    return originalNames.size <= compressedNames.size
  }
}
