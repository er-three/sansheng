/**
 * 依赖关系验证器 - Phase 4
 */

import { log } from "../utils.js"
import { WorkflowRecipe } from "../types.js"
import { getTaskQueue } from "../session/task-queue.js"

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateDependencies(sessionId: string): ValidationResult {
  const queue = getTaskQueue(sessionId)
  if (!queue) {
    return {
      valid: false,
      errors: ["Task queue not found"],
      warnings: []
    }
  }

  const errors: string[] = []
  const warnings: string[] = []

  // 检查循环依赖
  const visited = new Set<string>()
  const visiting = new Set<string>()

  function hasCycle(taskId: string): boolean {
    if (visited.has(taskId)) return false
    if (visiting.has(taskId)) return true

    visiting.add(taskId)
    const task = queue!.tasks.find(t => t.id === taskId)

    if (task) {
      for (const dep of task.dependencies) {
        if (hasCycle(dep)) return true
      }
    }

    visiting.delete(taskId)
    visited.add(taskId)
    return false
  }

  queue!.tasks.forEach(task => {
    if (hasCycle(task.id)) {
      errors.push(`Circular dependency detected involving task ${task.id}`)
    }
  })

  // 检查悬空任务（无法到达）
  const reachable = new Set<string>()

  function markReachable(taskId: string) {
    if (reachable.has(taskId)) return
    reachable.add(taskId)

    const task = queue!.tasks.find(t => t.id === taskId)
    if (task) {
      task.dependencies.forEach(dep => markReachable(dep))
    }
  }

  queue!.tasks.filter(t => t.dependencies.length === 0).forEach(t => markReachable(t.id))

  queue!.tasks.forEach(task => {
    if (!reachable.has(task.id)) {
      warnings.push(`Task ${task.id} may be unreachable`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

export function validateRecipeDependencies(recipe: WorkflowRecipe): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 检查steps不为空
  if (!recipe.steps || recipe.steps.length === 0) {
    errors.push("Recipe has no steps")
  }

  // 检查步骤中是否有重复
  if (recipe.steps && new Set(recipe.steps).size !== recipe.steps.length) {
    errors.push("Recipe has duplicate steps")
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

export function getTopologicalOrder(sessionId: string): string[] {
  const queue = getTaskQueue(sessionId)
  if (!queue) return []

  const order: string[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  function visit(taskId: string) {
    if (visited.has(taskId)) return
    if (visiting.has(taskId)) return // Skip cycles

    visiting.add(taskId)
    const task = queue!.tasks.find(t => t.id === taskId)

    if (task) {
      task.dependencies.forEach(dep => visit(dep))
    }

    visiting.delete(taskId)
    visited.add(taskId)
    order.push(taskId)
  }

  queue!.tasks.forEach(task => visit(task.id))
  return order
}

export function generateValidationReport(sessionId: string): string {
  const result = validateDependencies(sessionId)

  const lines = [
    "═══════════════════════════════════════════",
    "Dependency Validation Report",
    "═══════════════════════════════════════════",
    "",
    `Status: ${result.valid ? "✓ Valid" : "✗ Invalid"}`,
    ""
  ]

  if (result.errors.length > 0) {
    lines.push("❌ Errors")
    result.errors.forEach(e => lines.push(`  - ${e}`))
    lines.push("")
  }

  if (result.warnings.length > 0) {
    lines.push("⚠️ Warnings")
    result.warnings.forEach(w => lines.push(`  - ${w}`))
  }

  return lines.join("\n")
}
