/**
 * 流程配方系统 - 定义不同任务类型的固定工作流
 *
 * 功能：
 * - 为不同复杂度的任务定义标准流程
 * - 防止关键路径被跳过
 * - 定义可以并行执行的步骤
 * - 指导 Agent 正确的工作方向
 */

import { WorkflowRecipe, WorkflowTask } from "../types.js"
import { log } from "../utils.js"

/**
 * 简单任务配方：快速路径
 * 适用场景：单文件修改、小补丁、简单 bug 修复
 */
const SIMPLE_RECIPE: WorkflowRecipe = {
  id: "recipe-simple",
  name: "简单任务",
  description: "适用于单文件修改、小补丁、简单 bug 修复",
  steps: [
    "understand",           // Emperor 理解需求
    "menxia_quick_check",   // menxia 快速风险检查
    "execute",              // shangshu 执行
    "verify"                // Emperor 验证
  ],
  canParallel: [],
  criticalPath: [
    "understand",
    "menxia_quick_check",
    "execute"
  ],
  taskType: "simple"
}

/**
 * 中等任务配方：标准路径
 * 适用场景：跨文件修改、功能实现、架构调整
 */
const MEDIUM_RECIPE: WorkflowRecipe = {
  id: "recipe-medium",
  name: "中等任务",
  description: "适用于跨文件修改、功能实现、架构调整",
  steps: [
    "understand",           // Emperor 理解需求
    "plan",                 // zhongshu 制定计划
    "menxia_review",        // menxia 审核计划
    "execute",              // shangshu 执行
    "verify"                // Emperor 验证
  ],
  canParallel: [],
  criticalPath: [
    "understand",
    "plan",
    "menxia_review",
    "execute"
  ],
  taskType: "medium"
}

/**
 * 复杂任务配方：完整路径，支持并行
 * 适用场景：大规模重构、多模块协调、系统升级
 */
const COMPLEX_RECIPE: WorkflowRecipe = {
  id: "recipe-complex",
  name: "复杂任务",
  description: "适用于大规模重构、多模块协调、系统升级",
  steps: [
    "understand",           // Emperor 理解需求
    "plan",                 // zhongshu 制定计划
    "menxia_review",        // menxia 审核计划
    "libu_structure",       // libu 设计代码结构
    "hubu_deps",            // hubu 处理依赖
    "bingbu_perf",          // bingbu 性能规划
    "libu_rites_check",     // libu-rites 标准检查
    "menxia_final_review",  // menxia 最终审核
    "execute",              // shangshu 执行
    "verify"                // Emperor 验证
  ],
  canParallel: [
    ["libu_structure", "hubu_deps", "bingbu_perf", "libu_rites_check"]  // 六部可并行
  ],
  criticalPath: [
    "understand",
    "plan",
    "menxia_review",
    "menxia_final_review",
    "execute"
  ],
  taskType: "complex"
}

/**
 * 高风险任务配方：双审核路径
 * 适用场景：删除代码、权限变更、数据库变更、依赖更新
 */
const HIGH_RISK_RECIPE: WorkflowRecipe = {
  id: "recipe-high-risk",
  name: "高风险任务",
  description: "适用于删除代码、权限变更、数据库变更、依赖更新",
  steps: [
    "understand",           // Emperor 理解需求
    "plan",                 // zhongshu 制定计划
    "menxia_risk_check",    // menxia 风险评估
    "oracle_consultation",  // oracle 特殊咨询（新增）
    "menxia_final_approval",// menxia 最终批准
    "execute",              // shangshu 执行
    "verify"                // Emperor 验证
  ],
  canParallel: [],
  criticalPath: [
    "understand",
    "plan",
    "menxia_risk_check",
    "oracle_consultation",
    "menxia_final_approval",
    "execute"
  ],
  taskType: "high_risk"
}

/**
 * 所有配方映射
 */
const RECIPES_MAP = new Map<string, WorkflowRecipe>([
  ["simple", SIMPLE_RECIPE],
  ["medium", MEDIUM_RECIPE],
  ["complex", COMPLEX_RECIPE],
  ["high_risk", HIGH_RISK_RECIPE]
])

/**
 * 根据任务类型获取配方
 */
export function getRecipe(
  taskType: "simple" | "medium" | "complex" | "high_risk"
): WorkflowRecipe {
  const recipe = RECIPES_MAP.get(taskType)
  if (!recipe) {
    throw new Error(`[RECIPE ERROR] 未知的任务类型：${taskType}`)
  }
  return recipe
}

/**
 * 验证任务队列是否遵循配方
 */
export function validateRecipeCompliance(
  recipe: WorkflowRecipe,
  tasks: WorkflowTask[],
  completedTasks: string[]
): { compliant: boolean; violations: string[] } {
  const violations: string[] = []

  // 检查 1: 关键路径是否被遵守
  for (const step of recipe.criticalPath) {
    const task = tasks.find(t => t.id === step)
    if (!task) {
      violations.push(`[MISSING STEP] 缺少关键步骤：${step}`)
    } else if (task.status === "failed") {
      violations.push(`[FAILED STEP] 关键步骤失败：${step}`)
    }
  }

  // 检查 2: 已完成的任务是否都在配方内
  for (const completedId of completedTasks) {
    if (!recipe.steps.includes(completedId)) {
      violations.push(`[UNEXPECTED TASK] 未在配方内的任务被完成：${completedId}`)
    }
  }

  return {
    compliant: violations.length === 0,
    violations
  }
}

/**
 * 获取下一个应该执行的任务
 */
export function getNextSteps(
  recipe: WorkflowRecipe,
  tasks: WorkflowTask[],
  completedTasks: string[]
): {
  nextSteps: string[]
  canExecuteInParallel: boolean
  blockedTasks: string[]
} {
  const remainingSteps = recipe.steps.filter(step => !completedTasks.includes(step))

  if (remainingSteps.length === 0) {
    return {
      nextSteps: [],
      canExecuteInParallel: false,
      blockedTasks: []
    }
  }

  // 找出可以执行的下一步（依赖都完成了）
  const nextSteps: string[] = []
  const blockedTasks: string[] = []

  for (const step of remainingSteps) {
    const task = tasks.find(t => t.id === step)
    if (!task) continue

    if (task.dependencies.every(dep => completedTasks.includes(dep))) {
      nextSteps.push(step)
    } else {
      blockedTasks.push(step)
    }
  }

  // 检查是否可以并行
  let canExecuteInParallel = false
  if (recipe.canParallel) {
    for (const parallelGroup of recipe.canParallel) {
      if (parallelGroup.every(step => nextSteps.includes(step))) {
        canExecuteInParallel = true
        break
      }
    }
  }

  return {
    nextSteps,
    canExecuteInParallel,
    blockedTasks
  }
}

/**
 * 生成配方执行进度
 */
export function generateRecipeProgress(
  recipe: WorkflowRecipe,
  tasks: WorkflowTask[],
  completedTasks: string[]
): string {
  const lines: string[] = []

  lines.push(`[WORKFLOW] ${recipe.name}`)
  lines.push(`[DESCRIPTION] ${recipe.description}`)
  lines.push("")
  lines.push("[PROGRESS]")

  // 显示关键路径进度
  lines.push("关键路径:")
  for (let i = 0; i < recipe.criticalPath.length; i++) {
    const step = recipe.criticalPath[i]
    const task = tasks.find(t => t.id === step)
    const isDone = completedTasks.includes(step)
    const icon = isDone ? "[OK]" : "⏳"
    const number = i + 1
    lines.push(`  ${number}. ${icon} ${step}`)
  }

  // 显示可以并行的任务
  if (recipe.canParallel && recipe.canParallel.length > 0) {
    lines.push("")
    lines.push("可以并行执行的任务:")
    for (const group of recipe.canParallel) {
      lines.push(`  ${group.join(" + ")}`)
    }
  }

  return lines.join("\n")
}

/**
 * 输出所有可用的配方
 */
export function listAllRecipes(): string {
  const lines: string[] = ["Available Workflow Recipes:"]
  lines.push("")

  for (const [key, recipe] of RECIPES_MAP) {
    lines.push(`[${recipe.taskType}] ${recipe.name}`)
    lines.push(`  Description: ${recipe.description}`)
    lines.push(`  Steps: ${recipe.steps.length}`)
    lines.push("")
  }

  return lines.join("\n")
}
