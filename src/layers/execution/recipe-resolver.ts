/**
 * Recipe 解析器 - 执行引擎的第一步
 *
 * 职责：
 *   1. 解析工作流 Recipe 并生成任务图
 *   2. 处理变量插值
 *   3. 验证 Recipe 结构
 *   4. 处理条件和并行标记
 */

import { log } from '../../utils.js'
import {
  WorkflowRecipeDefinition,
  RecipeStepDefinition,
  ValidationResult
} from '../../types.js'
import { Task } from './execution-types.js'

/**
 * 解析 Recipe，生成任务列表
 *
 * @param recipe - 工作流 Recipe 定义
 * @param variables - 执行时变量（用于插值）
 * @returns 任务列表（未排序）
 */
export function resolveRecipe(
  recipe: WorkflowRecipeDefinition,
  variables: Record<string, any> = {}
): Task[] {
  log('RecipeResolver', `Resolving recipe: ${recipe.name}`, 'info')

  const tasks: Task[] = []

  for (const step of recipe.steps) {
    // 处理条件（简单实现）
    if (step.condition && !evaluateCondition(step.condition, variables)) {
      log('RecipeResolver', `Step ${step.id} skipped due to condition`)
      continue
    }

    const task: Task = {
      id: step.id,
      name: step.name,
      agent: step.agent,
      dependencies: step.dependencies || [],
      parallel: step.parallel || false,
      retryable: step.retryable !== false,
      timeout: 30000,
      input: interpolateVariables(step.input || {}, variables)
    }

    tasks.push(task)
  }

  log('RecipeResolver', `Recipe resolved: ${tasks.length} tasks`, 'info')
  return tasks
}

/**
 * 验证 Recipe 结构是否有效
 *
 * @param recipe - 要验证的 Recipe
 * @returns 验证结果
 */
export function validateRecipe(recipe: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 检查必需字段
  if (!recipe.name) errors.push('Recipe name is required')
  if (!recipe.steps || !Array.isArray(recipe.steps)) errors.push('Recipe steps must be an array')
  if (recipe.steps?.length === 0) errors.push('Recipe must have at least one step')

  // 检查步骤
  const stepIds = new Set<string>()
  recipe.steps?.forEach((step: any, index: number) => {
    if (!step.id) errors.push(`Step ${index}: id is required`)
    if (!step.name) errors.push(`Step ${index}: name is required`)
    if (!step.agent) errors.push(`Step ${index}: agent is required`)

    if (step.id) {
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step id: ${step.id}`)
      }
      stepIds.add(step.id)
    }

    // 检查依赖是否存在
    if (step.dependencies) {
      for (const dep of step.dependencies) {
        if (!stepIds.has(dep)) {
          errors.push(`Step ${step.id}: dependency ${dep} not found`)
        }
      }
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * 评估条件表达式（简单实现）
 *
 * 支持格式：
 *   - "${variable_name}" 检查变量是否存在且为 truthy
 *   - "${variable_name} == 'value'" 简单相等比较
 */
function evaluateCondition(condition: string, variables: Record<string, any>): boolean {
  try {
    // 简单的条件评估
    let eval_condition = condition

    // 替换变量
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\$\\{${key}\\}`, 'g')
      const stringValue = typeof value === 'string' ? `'${value}'` : String(value)
      eval_condition = eval_condition.replace(pattern, stringValue)
    }

    // 执行评估（注意：实际应用中应使用更安全的评估方式）
    // eslint-disable-next-line no-eval
    return Boolean(eval(eval_condition))
  } catch (error) {
    log('RecipeResolver', `Error evaluating condition: ${String(error)}`, 'error')
    return false
  }
}

/**
 * 变量插值 - 将 ${var} 替换为实际值
 *
 * @param input - 包含 ${var} 的对象
 * @param variables - 变量映射
 * @returns 插值后的对象
 */
function interpolateVariables(
  input: Record<string, any>,
  variables: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      result[key] = interpolateString(value, variables)
    } else if (typeof value === 'object' && value !== null) {
      result[key] = interpolateVariables(value, variables)
    } else {
      result[key] = value
    }
  }

  return result
}

/**
 * 字符串变量插值
 *
 * @param str - 包含 ${var} 的字符串
 * @param variables - 变量映射
 * @returns 插值后的字符串
 */
function interpolateString(str: string, variables: Record<string, any>): string {
  let result = str

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\$\\{${key}\\}`, 'g')
    result = result.replace(pattern, String(value))
  }

  return result
}

/**
 * 获取 Recipe 中的所有步骤 ID
 */
export function getRecipeStepIds(recipe: WorkflowRecipeDefinition): string[] {
  return recipe.steps.map(step => step.id)
}

/**
 * 检查步骤是否可以并行执行
 */
export function canExecuteParallel(recipe: WorkflowRecipeDefinition): boolean {
  return recipe.parallel === true
}

/**
 * 获取 Recipe 的执行超时时间
 */
export function getRecipeTimeout(recipe: WorkflowRecipeDefinition): number {
  return recipe.timeout || 300000 // 默认 5 分钟
}
