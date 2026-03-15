/**
 * 执行协调器 - 按顺序调度任务执行
 *
 * 职责：
 *   1. 按拓扑排序执行任务
 *   2. 收集 Agent 执行结果
 *   3. 处理分支条件
 *   4. 错误时触发恢复策略
 */

import { log } from '../../utils.js'
import {
  WorkflowDefinition,
  WorkflowExecutionResult,
  TaskExecutionResult
} from '../../types.js'

/**
 * 执行工作流的主函数
 */
export async function executeWorkflow(
  definition: WorkflowDefinition,
  {
    onTaskStart,
    onTaskComplete,
    onTaskFail
  }: {
    onTaskStart?: (taskId: string) => void
    onTaskComplete?: (taskId: string, result: any) => void
    onTaskFail?: (taskId: string, error: Error) => void
  } = {}
): Promise<WorkflowExecutionResult> {
  const startTime = Date.now()

  log('ExecutionCoordinator', `Starting workflow execution: ${definition.domain}`, 'info')

  try {
    // 获取或创建 Recipe
    // const recipe = definition.recipe || await selectRecipe(definition)

    // TODO: 实现完整的执行逻辑
    // 当前返回成功的占位符实现

    const duration = Date.now() - startTime

    return {
      success: true,
      status: 'completed',
      output: {},
      errors: [],
      warnings: [],
      duration,
      taskResults: []
    }
  } catch (error) {
    const duration = Date.now() - startTime

    log('ExecutionCoordinator', `Workflow execution failed: ${String(error)}`, 'error')

    return {
      success: false,
      status: 'failed',
      output: {},
      errors: [String(error)],
      warnings: [],
      duration,
      taskResults: []
    }
  }
}

/**
 * 验证执行前的条件
 */
export function validateExecutionContext(
  definition: WorkflowDefinition
) {
  const errors: string[] = []
  const warnings: string[] = []

  // 验证必需字段
  if (!definition.sessionId) errors.push('sessionId is required')
  if (!definition.intent) errors.push('intent is required')

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * 模拟任务执行（占位符）
 */
export async function executeTask(
  taskId: string,
  agentName: string,
  input: Record<string, any>
): Promise<TaskExecutionResult> {
  const startTime = Date.now()

  log('ExecutionCoordinator', `Executing task ${taskId} with agent ${agentName}`)

  // TODO: 调用真实的 Agent 执行

  const endTime = Date.now()

  return {
    taskId,
    taskName: taskId,
    agent: agentName,
    status: 'completed',
    output: {},
    duration: endTime - startTime,
    retryCount: 0,
    startTime,
    endTime
  }
}

/**
 * 计算拓扑排序顺序
 */
export function computeTopologicalOrder(
  tasks: Array<{ id: string; dependencies: string[] }>
): string[] {
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const order: string[] = []

  function visit(taskId: string) {
    if (visited.has(taskId)) return
    if (visiting.has(taskId)) {
      throw new Error(`Circular dependency detected: ${taskId}`)
    }

    visiting.add(taskId)
    const task = tasks.find(t => t.id === taskId)

    if (task) {
      for (const dep of task.dependencies) {
        visit(dep)
      }
    }

    visiting.delete(taskId)
    visited.add(taskId)
    order.push(taskId)
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      visit(task.id)
    }
  }

  return order
}

/**
 * 检查任务依赖是否满足
 */
export function areDependenciesMet(
  taskId: string,
  completedTasks: Set<string>,
  allTasks: Map<string, { dependencies: string[] }>
): boolean {
  const task = allTasks.get(taskId)
  if (!task) return false

  return task.dependencies.every(dep => completedTasks.has(dep))
}
