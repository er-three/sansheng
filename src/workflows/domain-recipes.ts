/**
 * 域级工作流配方系统
 *
 * 定义通用编程和变更请求处理的工作流模式
 * 允许动态选择流程，而不是硬编码固定流程
 */

import { WorkflowRecipe } from "../types.js"


/**
 * 通用编程域配方
 */
export const GENERAL_DOMAIN_RECIPES: Record<string, WorkflowRecipe> = {
  /**
   * quick-fix - 快速修复
   * 仅分析和实现，跳过完整验证
   * 适用：简单 bug 修复、小补丁
   * Token 成本: ~60-80K
   */
  quick_fix: {
    id: "recipe-general-quick",
    name: "快速修复",
    description: "快速修复流程，跳过完整验证。适用于简单 bug 修复。",
    steps: [
      "understand",    // 理解需求
      "analyze",       // 快速分析
      "implement"      // 实现修复
    ],
    canParallel: [],
    criticalPath: [
      "understand",
      "analyze",
      "implement"
    ],
    taskType: "simple"
  },

  /**
   * standard - 标准流程
   * 完整的 analyze → implement → verify
   * 适用：正常编程任务、功能开发
   * Token 成本: ~100-140K
   */
  standard: {
    id: "recipe-general-standard",
    name: "标准编程流程",
    description: "完整的分析-实现-验证流程。适用于大多数编程任务。",
    steps: [
      "understand",    // 理解需求
      "analyze",       // 任务分析
      "implement",     // 代码实现
      "verify"         // 测试验证
    ],
    canParallel: [],
    criticalPath: [
      "understand",
      "analyze",
      "implement",
      "verify"
    ],
    taskType: "medium"
  },

  /**
   * comprehensive - 加强版
   * 包含性能和安全审计
   * 适用：复杂功能、关键模块、生产环保
   * Token 成本: ~160-200K
   */
  comprehensive: {
    id: "recipe-general-comprehensive",
    name: "加强编程流程",
    description: "包含性能和安全审计的加强流程。适用于复杂功能和关键模块。",
    steps: [
      "understand",       // 理解需求
      "analyze",          // 任务分析
      "implement",        // 代码实现
      "verify",           // 测试验证
      "performance-audit",// 性能审计
      "security-audit"    // 安全审计
    ],
    canParallel: [
      ["performance-audit", "security-audit"]  // 两个审计可并行
    ],
    criticalPath: [
      "understand",
      "analyze",
      "implement",
      "verify"
    ],
    taskType: "complex"
  }
}

/**
 * 变更请求处理域配方
 */
export const CR_PROCESSING_RECIPES: Record<string, WorkflowRecipe> = {
  /**
   * hotfix - 紧急修复
   * 跳过规格设计，快速实现和部署
   * 适用：线上 bug、紧急修复
   * Token 成本: ~80-100K
   */
  hotfix: {
    id: "recipe-cr-hotfix",
    name: "紧急修复",
    description: "紧急修复流程，跳过规格设计。适用于线上 bug 修复。",
    steps: [
      "understand",         // 理解需求
      "cr-proposal",        // CR 提议分析
      "cr-implementation",  // 直接实现
      "cr-persist"          // 版本归档
    ],
    canParallel: [],
    criticalPath: [
      "understand",
      "cr-proposal",
      "cr-implementation",
      "cr-persist"
    ],
    taskType: "simple"
  },

  /**
   * standard - 标准 CR 流程
   * 完整的提议 → 规格 → 实现 → 持久化
   * 适用：正常的 CR、功能变更
   * Token 成本: ~120-160K
   */
  standard: {
    id: "recipe-cr-standard",
    name: "标准 CR 流程",
    description: "完整的 CR 流程，包含规格设计和实现。适用于大多数变更请求。",
    steps: [
      "understand",         // 理解需求
      "cr-proposal",        // CR 提议与分析
      "cr-specification",   // 规格设计
      "cr-implementation",  // 代码实现
      "cr-persist"          // 版本归档
    ],
    canParallel: [],
    criticalPath: [
      "understand",
      "cr-proposal",
      "cr-implementation",
      "cr-persist"
    ],
    taskType: "medium"
  },

  /**
   * complete - 完整版本管理
   * 包含兼容性审计和完整版本控制
   * 适用：重大变更、API 升级、跨项目影响
   * Token 成本: ~180-220K
   */
  complete: {
    id: "recipe-cr-complete",
    name: "完整版本管理",
    description: "包含兼容性审计的完整 CR 流程。适用于重大变更和 API 升级。",
    steps: [
      "understand",              // 理解需求
      "cr-proposal",             // CR 提议与分析
      "cr-specification",        // 规格设计
      "cr-implementation",       // 代码实现
      "compatibility-audit",     // 兼容性审计
      "rollback-plan",           // 回滚计划（新增）
      "migration-guide",         // 迁移指南（新增）
      "cr-persist"               // 版本归档
    ],
    canParallel: [
      ["compatibility-audit", "rollback-plan"]  // 审计和回滚计划可并行
    ],
    criticalPath: [
      "understand",
      "cr-proposal",
      "cr-implementation",
      "compatibility-audit",
      "cr-persist"
    ],
    taskType: "complex"
  }
}

/**
 * 获取特定域的所有配方
 */
export function getDomainRecipes(
  domain: "general" | "cr-processing"
): Record<string, WorkflowRecipe> {
  const recipes: Record<string, Record<string, WorkflowRecipe>> = {
    "general": GENERAL_DOMAIN_RECIPES,
    "cr-processing": CR_PROCESSING_RECIPES
  }
  return recipes[domain] || {}
}

/**
 * 获取特定域的特定配方
 */
export function getDomainRecipe(
  domain: "general" | "cr-processing",
  recipeName: string
): WorkflowRecipe | undefined {
  const recipes = getDomainRecipes(domain)
  return recipes[recipeName]
}

/**
 * 列出域的所有可用配方
 */
export function listDomainRecipes(
  domain: "general" | "cr-processing"
): string {
  const recipes = getDomainRecipes(domain)
  const lines: string[] = [`Available recipes for domain: ${domain}\n`]

  for (const [key, recipe] of Object.entries(recipes)) {
    lines.push(`[${recipe.taskType}] ${key}`)
    lines.push(`  Name: ${recipe.name}`)
    lines.push(`  Description: ${recipe.description}`)
    lines.push(`  Steps: ${recipe.steps.length}`)
    lines.push(`  Critical Path: ${recipe.criticalPath.length}`)
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * 验证配方是否存在于特定域
 */
export function isDomainRecipeValid(
  domain: "general" | "cr-processing",
  recipeName: string
): boolean {
  const recipes = getDomainRecipes(domain)
  return recipeName in recipes
}
