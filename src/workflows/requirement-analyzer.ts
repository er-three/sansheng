/**
 * 需求分析引擎
 *
 * 基于用户输入的需求描述，进行启发式分析：
 * - 识别任务类型
 * - 评估复杂度和范围
 * - 推荐合适的配方
 * - 预测成本和耗时
 */

import { getDomainRecipes } from "./domain-recipes.js"

export interface RequirementAnalysis {
  domain: "general" | "cr-processing"
  recipeName: string
  complexity: "simple" | "medium" | "complex" | "high_risk"
  riskLevel: "低" | "中" | "中-高" | "高"
  tokenCost: string
  duration: string
  reasoning: string[]
}

/**
 * 分析用户需求并推荐配方
 */
export function analyzeRequirement(userInput: string): RequirementAnalysis {
  const input = userInput.toLowerCase()

  // 1. 识别域和任务类型
  const domainAnalysis = identifyDomain(input)

  // 2. 评估复杂度和范围
  const complexityAnalysis = assessComplexity(input)

  // 3. 推荐配方
  const recommendation = recommendRecipe(
    domainAnalysis.domain,
    complexityAnalysis.complexity
  )

  // 4. 预测成本
  const costEstimate = estimateCost(recommendation)

  return {
    domain: domainAnalysis.domain,
    recipeName: recommendation.recipeName,
    complexity: complexityAnalysis.complexity,
    riskLevel: complexityAnalysis.riskLevel,
    tokenCost: costEstimate.tokens,
    duration: costEstimate.duration,
    reasoning: [
      ...domainAnalysis.reasoning,
      ...complexityAnalysis.reasoning
    ]
  }
}

/**
 * 识别域（domain）
 */
function identifyDomain(input: string): {
  domain: "general" | "cr-processing"
  reasoning: string[]
} {
  const reasoning: string[] = []

  // 变更请求相关
  if (
    input.includes("cr") ||
    input.includes("change request") ||
    input.includes("变更") ||
    input.includes("升级") ||
    input.includes("api 升级") ||
    input.includes("依赖更新")
  ) {
    reasoning.push("检测到变更请求关键词 → cr-processing 域")
    return { domain: "cr-processing", reasoning }
  }

  // 默认：通用编程
  reasoning.push("检测为通用编程任务 → general 域")
  return { domain: "general", reasoning }
}

/**
 * 评估复杂度和范围
 */
function assessComplexity(input: string): {
  complexity: "simple" | "medium" | "complex" | "high_risk"
  riskLevel: "低" | "中" | "中-高" | "高"
  reasoning: string[]
} {
  const reasoning: string[] = []
  let complexityScore = 0
  let riskScore = 0

  // 复杂度指标

  // 修复/小补丁 → simple
  if (input.includes("修复") && !input.includes("重构")) {
    complexityScore -= 2
    reasoning.push("任务性质：bug 修复")
  }

  // 简单/小 → simple
  if (
    input.includes("简单") ||
    input.includes("小") ||
    input.includes("quick") ||
    input.includes("快速")
  ) {
    complexityScore -= 2
    reasoning.push("用户标注复杂度较低")
  }

  // 多个模块/文件 → medium+
  if (
    input.includes("多个") ||
    input.includes("跨") ||
    input.includes("多文件") ||
    input.includes("多模块")
  ) {
    complexityScore += 2
    reasoning.push("涉及多个模块/文件 → 中等及以上复杂度")
  }

  // 重构/架构 → complex
  if (
    input.includes("重构") ||
    input.includes("架构") ||
    input.includes("系统") ||
    input.includes("全局") ||
    input.includes("完整")
  ) {
    complexityScore += 3
    reasoning.push("涉及系统级改造 → 复杂任务")
  }

  // 性能/安全审计 → complex
  if (
    input.includes("性能") ||
    input.includes("安全") ||
    input.includes("审计") ||
    input.includes("优化")
  ) {
    complexityScore += 2
    reasoning.push("需要性能/安全审计 → 复杂任务")
  }

  // 风险指标

  // 高风险行为
  if (
    input.includes("删除") ||
    input.includes("权限") ||
    input.includes("数据库") ||
    input.includes("支付") ||
    input.includes("认证") ||
    input.includes("金融") ||
    input.includes("医疗")
  ) {
    riskScore += 3
    reasoning.push("检测到高风险操作（删除/权限/数据库/支付/认证等）")
  }

  // 关键系统
  if (
    input.includes("关键") ||
    input.includes("核心") ||
    input.includes("线上")
  ) {
    riskScore += 2
    reasoning.push("涉及关键/核心/线上系统")
  }

  // 紧急
  if (
    input.includes("紧急") ||
    input.includes("线上") ||
    input.includes("hotfix")
  ) {
    riskScore += 1
    reasoning.push("紧急修复 → 需要快速迭代")
  }

  // 决定复杂度
  let complexity: "simple" | "medium" | "complex" | "high_risk"

  if (complexityScore <= -1) {
    complexity = "simple"
  } else if (complexityScore <= 1) {
    complexity = "medium"
  } else if (complexityScore <= 3) {
    complexity = "complex"
  } else {
    complexity = "high_risk"
  }

  // 决定风险等级
  let riskLevel: "低" | "中" | "中-高" | "高"

  if (riskScore <= 0) {
    riskLevel = "低"
  } else if (riskScore <= 1) {
    riskLevel = "中"
  } else if (riskScore <= 2) {
    riskLevel = "中-高"
  } else {
    riskLevel = "高"
  }

  reasoning.push(`复杂度评分: ${complexityScore} → ${complexity}`)
  reasoning.push(`风险评分: ${riskScore} → ${riskLevel}`)

  return { complexity, riskLevel, reasoning }
}

/**
 * 推荐配方
 */
function recommendRecipe(
  domain: "general" | "cr-processing",
  complexity: "simple" | "medium" | "complex" | "high_risk"
): { domain: string; recipeName: string } {
  const recipeMap: Record<string, Record<string, string>> = {
    // general 域
    general: {
      simple: "quick_fix",
      medium: "standard",
      complex: "comprehensive",
      high_risk: "comprehensive"
    },
    // cr-processing 域
    "cr-processing": {
      simple: "hotfix",
      medium: "standard",
      complex: "complete",
      high_risk: "complete"
    }
  }

  const recipeName = recipeMap[domain]?.[complexity] || "standard"
  return { domain, recipeName }
}

/**
 * 预测成本和耗时
 */
function estimateCost(recommendation: {
  domain: string
  recipeName: string
}): { tokens: string; duration: string } {
  const costMap: Record<string, { tokens: string; duration: string }> = {
    // general
    "general/quick_fix": { tokens: "~70K", duration: "5分钟" },
    "general/standard": { tokens: "~120K", duration: "10分钟" },
    "general/comprehensive": { tokens: "~180K", duration: "15分钟" },

    // cr-processing
    "cr-processing/hotfix": { tokens: "~90K", duration: "5分钟" },
    "cr-processing/standard": { tokens: "~140K", duration: "12分钟" },
    "cr-processing/complete": { tokens: "~200K", duration: "20分钟" }
  }

  const key = `${recommendation.domain}/${recommendation.recipeName}`
  return costMap[key] || { tokens: "~150K", duration: "15分钟" }
}

/**
 * 生成分析报告
 */
export function generateAnalysisReport(analysis: RequirementAnalysis): string {
  const lines: string[] = [
    "[分析结果]",
    "",
    `[推荐配方] ${analysis.domain}/${analysis.recipeName}`,
    `[复杂度] ${analysis.complexity}`,
    `[风险等级] ${analysis.riskLevel}`,
    `[成本预测] ${analysis.tokenCost} token, ${analysis.duration}`,
    ""
  ]

  if (analysis.reasoning.length > 0) {
    lines.push("[分析要点]")
    analysis.reasoning.forEach(reason => {
      lines.push(`• ${reason}`)
    })
  }

  return lines.join("\n")
}
