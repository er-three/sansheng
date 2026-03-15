/**
 * 域级工作流配方系统
 *
 * 为特定域（asset-management, reverse-engineering）定义多个工作流模式
 * 允许动态选择流程，而不是硬编码固定流程
 */

import { WorkflowRecipe } from "../types.js"

/**
 * 资产提取域配方
 */
export const ASSET_MANAGEMENT_RECIPES: Record<string, WorkflowRecipe> = {
  /**
   * quick - 快速提取模式
   * 仅提取核心资产，跳过详细分析和验证
   * 适用：简单项目、快速原型、初步评估
   * Token 成本: ~50-60K
   */
  quick: {
    id: "recipe-asset-quick",
    name: "资产快速提取",
    description: "快速提取核心资产，跳过详细分析。适用于简单项目和快速评估。",
    steps: [
      "understand",      // 理解需求
      "scan",            // 代码扫描
      "extract",         // 资产提取
      "persist"          // 持久化
    ],
    canParallel: [],
    criticalPath: [
      "understand",
      "scan",
      "extract",
      "persist"
    ],
    taskType: "simple"
  },

  /**
   * standard - 标准提取模式
   * 完整资产提取流程，包含验证和一致性检查
   * 适用：中等项目、生产环境
   * Token 成本: ~100-150K
   */
  standard: {
    id: "recipe-asset-standard",
    name: "资产标准提取",
    description: "完整资产提取，包含映射、行为提取和一致性验证。适用于中等项目。",
    steps: [
      "understand",      // 理解需求
      "scan",            // 代码扫描
      "extract",         // 资产提取
      "mapping",         // UI框架映射
      "behavior",        // 行为场景提取
      "detect",          // 框架污染检测
      "verify",          // 一致性验证
      "persist"          // 持久化
    ],
    canParallel: [
      ["mapping", "behavior"]  // 映射和行为可并行
    ],
    criticalPath: [
      "understand",
      "scan",
      "extract",
      "verify",
      "persist"
    ],
    taskType: "medium"
  },

  /**
   * complete - 完整提取模式
   * 包含所有验证、审计和强化检查
   * 适用：复杂项目、迁移、审计
   * Token 成本: ~150-200K
   */
  complete: {
    id: "recipe-asset-complete",
    name: "资产完整提取",
    description: "完整提取+强化检查+审计。适用于复杂项目和迁移场景。",
    steps: [
      "understand",      // 理解需求
      "scan",            // 代码扫描
      "extract",         // 资产提取
      "mapping",         // UI框架映射
      "behavior",        // 行为场景提取
      "detect",          // 框架污染检测
      "verify",          // 一致性验证
      "quality-audit",   // 质量审计（新增）
      "performance",     // 性能分析（新增）
      "persist"          // 持久化
    ],
    canParallel: [
      ["mapping", "behavior"],
      ["quality-audit", "performance"]
    ],
    criticalPath: [
      "understand",
      "scan",
      "extract",
      "verify",
      "quality-audit",
      "persist"
    ],
    taskType: "complex"
  }
}

/**
 * 逆向工程域配方
 */
export const REVERSE_ENGINEERING_RECIPES: Record<string, WorkflowRecipe> = {
  /**
   * frontend-only - 前端专用模式
   * 仅处理前端逻辑，跳过复杂 TDD 循环
   * 适用：静态页面、展示组件、简单交互
   * Token 成本: ~80-100K
   */
  frontend_only: {
    id: "recipe-re-frontend",
    name: "前端专用迁移",
    description: "前端组件开发专用，跳过复杂单元测试。适用于静态页面和展示组件。",
    steps: [
      "understand",      // 理解需求
      "infrastructure",  // 基础设施搭建
      "ui-generation",   // UI生成
      "tdd-green",       // 逻辑注入（简化版）
      "refactor",        // 代码优化
      "audit"            // 审计
    ],
    canParallel: [],
    criticalPath: [
      "understand",
      "infrastructure",
      "ui-generation",
      "tdd-green",
      "audit"
    ],
    taskType: "simple"
  },

  /**
   * standard - 标准迁移模式
   * 完整 TDD 流程，适合中等复杂度项目
   * 适用：标准的 Ionic 应用迁移
   * Token 成本: ~120-150K
   */
  standard: {
    id: "recipe-re-standard",
    name: "标准完整迁移",
    description: "标准 TDD 全流程迁移。适用于大多数 Ionic 应用。",
    steps: [
      "understand",      // 理解需求
      "infrastructure",  // 基础设施搭建
      "tdd-red",         // 测试防护网
      "ui-generation",   // UI生成
      "tdd-green",       // 逻辑注入
      "refactor",        // 代码优化
      "audit"            // 全局审计
    ],
    canParallel: [],
    criticalPath: [
      "understand",
      "infrastructure",
      "tdd-red",
      "tdd-green",
      "audit"
    ],
    taskType: "medium"
  },

  /**
   * migration - 迁移快速通道
   * 跳过 tdd-red，适合有遗留测试覆盖的项目
   * 适用：已有测试、快速迁移
   * Token 成本: ~100-120K
   */
  migration: {
    id: "recipe-re-migration",
    name: "快速迁移通道",
    description: "跳过 TDD Red 的快速迁移。适合已有测试覆盖的项目。",
    steps: [
      "understand",      // 理解需求
      "infrastructure",  // 基础设施搭建
      "ui-generation",   // UI生成
      "tdd-green",       // 逻辑注入
      "refactor",        // 代码优化
      "audit"            // 审计
    ],
    canParallel: [],
    criticalPath: [
      "understand",
      "infrastructure",
      "ui-generation",
      "tdd-green",
      "audit"
    ],
    taskType: "medium"
  },

  /**
   * full-stack - 完整系统模式
   * 包含集成测试和性能优化
   * 适用：复杂系统、长期维护项目
   * Token 成本: ~180-220K
   */
  full_stack: {
    id: "recipe-re-fullstack",
    name: "完整系统迁移",
    description: "包含集成测试和性能优化的完整迁移。适用于复杂系统。",
    steps: [
      "understand",          // 理解需求
      "infrastructure",      // 基础设施搭建
      "tdd-red",             // 测试防护网
      "ui-generation",       // UI生成
      "tdd-green",           // 逻辑注入
      "refactor",            // 代码优化
      "integration-test",    // 集成测试（新增）
      "performance-tune",    // 性能调优（新增）
      "security-audit",      // 安全审计（新增）
      "audit"                // 全局审计
    ],
    canParallel: [
      ["tdd-red", "infrastructure"]
    ],
    criticalPath: [
      "understand",
      "infrastructure",
      "tdd-red",
      "tdd-green",
      "integration-test",
      "security-audit",
      "audit"
    ],
    taskType: "complex"
  },

  /**
   * high-risk - 高风险迁移
   * 包含双审核和完整验证
   * 适用：关键系统、金融应用、医疗系统
   * Token 成本: ~200-250K
   */
  high_risk: {
    id: "recipe-re-high-risk",
    name: "高风险系统迁移",
    description: "包含双审核和完整验证的高风险迁移。适用于关键系统。",
    steps: [
      "understand",          // 理解需求
      "infrastructure",      // 基础设施搭建
      "tdd-red",             // 测试防护网
      "ui-generation",       // UI生成
      "tdd-green",           // 逻辑注入
      "refactor",            // 代码优化
      "integration-test",    // 集成测试
      "security-audit",      // 安全审计
      "compliance-check",    // 合规性检查（新增）
      "oracle-review",       // 专家复审（新增）
      "final-audit",         // 最终审计
      "audit"                // 全局审计
    ],
    canParallel: [
      ["tdd-red", "infrastructure"],
      ["security-audit", "compliance-check"]
    ],
    criticalPath: [
      "understand",
      "infrastructure",
      "tdd-red",
      "tdd-green",
      "integration-test",
      "security-audit",
      "compliance-check",
      "oracle-review",
      "audit"
    ],
    taskType: "high_risk"
  }
}

/**
 * 获取特定域的所有配方
 */
export function getDomainRecipes(domain: "asset-management" | "reverse-engineering"): Record<string, WorkflowRecipe> {
  const recipes: Record<string, Record<string, WorkflowRecipe>> = {
    "asset-management": ASSET_MANAGEMENT_RECIPES,
    "reverse-engineering": REVERSE_ENGINEERING_RECIPES
  }
  return recipes[domain] || {}
}

/**
 * 获取特定域的特定配方
 */
export function getDomainRecipe(
  domain: "asset-management" | "reverse-engineering",
  recipeName: string
): WorkflowRecipe | undefined {
  const recipes = getDomainRecipes(domain)
  return recipes[recipeName]
}

/**
 * 列出域的所有可用配方
 */
export function listDomainRecipes(domain: "asset-management" | "reverse-engineering"): string {
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
  domain: "asset-management" | "reverse-engineering",
  recipeName: string
): boolean {
  const recipes = getDomainRecipes(domain)
  return recipeName in recipes
}
