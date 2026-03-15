/**
 * 工作流引用系统 - Phase 5 优化
 *
 * 支持在 Session 中存储完整的工作流内容（计划、变量、上下文），
 * Agent 之间仅传递 ID 引用而非完整内容
 *
 * 目标：减少重复传输，节省 40-60% token
 */

import { log } from "../utils.js"

/**
 * 生成简单的 UUID
 */
function simpleUUID(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
}

/**
 * 工作流引用 ID 集合
 */
export interface WorkflowReference {
  planId: string
  variablesId: string
  contextId: string
}

/**
 * 工作流计划
 */
export interface WorkflowPlan {
  id: string
  domain: string
  taskDescription: string
  steps: WorkflowStep[]
  rationale: string
  estimatedTime: number
  createdAt: number
  version: number
}

/**
 * 工作流步骤
 */
export interface WorkflowStep {
  stepId: string
  name: string
  description: string
  agent: string
  dependencies: string[]
  estimatedTime: number
  successCriteria: string[]
}

/**
 * 工作流变量集合
 */
export interface WorkflowVariables {
  id: string
  sessionId: string
  variables: Record<string, string | number | boolean>
  lastUpdated: number
  version: number
}

/**
 * 工作流执行上下文
 */
export interface WorkflowContext {
  id: string
  domain: string
  taskId: string
  status: "planning" | "reviewing" | "executing" | "completed" | "failed"
  completedSteps: string[]
  currentStep: string
  errors: string[]
  startTime: number
  lastUpdate: number
  metadata: Record<string, any>
}

/**
 * Session 中的工作流存储
 */
export interface WorkflowStorage {
  plans: Map<string, WorkflowPlan>
  variables: Map<string, WorkflowVariables>
  contexts: Map<string, WorkflowContext>
  references: Map<string, WorkflowReference>  // sessionId -> WorkflowReference
}

/**
 * 创建工作流存储
 */
export function createWorkflowStorage(): WorkflowStorage {
  return {
    plans: new Map(),
    variables: new Map(),
    contexts: new Map(),
    references: new Map(),
  }
}

/**
 * 生成唯一的工作流引用
 */
export function generateWorkflowReference(): WorkflowReference {
  return {
    planId: generateId("plan"),
    variablesId: generateId("vars"),
    contextId: generateId("ctx"),
  }
}

/**
 * 生成带前缀的 ID
 */
function generateId(prefix: string): string {
  return `${prefix}:${simpleUUID().substring(0, 8)}`
}

/**
 * 在存储中保存工作流计划
 */
export function savePlan(
  storage: WorkflowStorage,
  plan: Omit<WorkflowPlan, "id" | "createdAt" | "version">
): WorkflowPlan {
  const fullPlan: WorkflowPlan = {
    ...plan,
    id: generateId("plan"),
    createdAt: Date.now(),
    version: 1,
  }

  storage.plans.set(fullPlan.id, fullPlan)
  log("Workflow", `Saved plan: ${fullPlan.id}`)

  return fullPlan
}

/**
 * 从存储中获取工作流计划
 */
export function getPlan(
  storage: WorkflowStorage,
  planId: string
): WorkflowPlan | undefined {
  const plan = storage.plans.get(planId)
  if (plan) {
    log("Workflow", `Retrieved plan: ${planId}`)
  } else {
    log("Workflow", `Plan not found: ${planId}`, "warn")
  }
  return plan
}

/**
 * 在存储中保存工作流变量
 */
export function saveVariables(
  storage: WorkflowStorage,
  sessionId: string,
  variables: Record<string, string | number | boolean>
): WorkflowVariables {
  const workflowVars: WorkflowVariables = {
    id: generateId("vars"),
    sessionId,
    variables,
    lastUpdated: Date.now(),
    version: 1,
  }

  storage.variables.set(workflowVars.id, workflowVars)
  log("Workflow", `Saved variables: ${workflowVars.id} (${Object.keys(variables).length} vars)`)

  return workflowVars
}

/**
 * 从存储中获取工作流变量
 */
export function getVariables(
  storage: WorkflowStorage,
  variablesId: string
): WorkflowVariables | undefined {
  const vars = storage.variables.get(variablesId)
  if (vars) {
    log("Workflow", `Retrieved variables: ${variablesId}`)
  } else {
    log("Workflow", `Variables not found: ${variablesId}`, "warn")
  }
  return vars
}

/**
 * 在存储中保存工作流上下文
 */
export function saveContext(
  storage: WorkflowStorage,
  context: Omit<WorkflowContext, "id" | "startTime" | "lastUpdate">
): WorkflowContext {
  const fullContext: WorkflowContext = {
    ...context,
    id: generateId("ctx"),
    startTime: Date.now(),
    lastUpdate: Date.now(),
  }

  storage.contexts.set(fullContext.id, fullContext)
  log("Workflow", `Saved context: ${fullContext.id}`)

  return fullContext
}

/**
 * 从存储中获取工作流上下文
 */
export function getContext(
  storage: WorkflowStorage,
  contextId: string
): WorkflowContext | undefined {
  const ctx = storage.contexts.get(contextId)
  if (ctx) {
    log("Workflow", `Retrieved context: ${contextId}`)
  } else {
    log("Workflow", `Context not found: ${contextId}`, "warn")
  }
  return ctx
}

/**
 * 更新工作流上下文
 */
export function updateContext(
  storage: WorkflowStorage,
  contextId: string,
  updates: Partial<WorkflowContext>
): WorkflowContext | undefined {
  const ctx = storage.contexts.get(contextId)
  if (!ctx) {
    log("Workflow", `Context not found for update: ${contextId}`, "warn")
    return undefined
  }

  const updated: WorkflowContext = {
    ...ctx,
    ...updates,
    lastUpdate: Date.now(),
  }

  storage.contexts.set(contextId, updated)
  log("Workflow", `Updated context: ${contextId}`)

  return updated
}

/**
 * 存储 Session 的工作流引用
 */
export function saveWorkflowReference(
  storage: WorkflowStorage,
  sessionId: string,
  reference: WorkflowReference
): void {
  storage.references.set(sessionId, reference)
  log("Workflow", `Saved reference for session: ${sessionId}`)
}

/**
 * 获取 Session 的工作流引用
 */
export function getWorkflowReference(
  storage: WorkflowStorage,
  sessionId: string
): WorkflowReference | undefined {
  return storage.references.get(sessionId)
}

/**
 * 清理过期的工作流数据
 */
export function cleanupExpiredWorkflows(
  storage: WorkflowStorage,
  maxAgeMs: number = 3600000
): number {
  const now = Date.now()
  let cleaned = 0

  // 清理过期的计划
  for (const [planId, plan] of storage.plans.entries()) {
    if (now - plan.createdAt > maxAgeMs) {
      storage.plans.delete(planId)
      cleaned++
    }
  }

  // 清理过期的上下文
  for (const [contextId, ctx] of storage.contexts.entries()) {
    if (now - ctx.lastUpdate > maxAgeMs) {
      storage.contexts.delete(contextId)
      cleaned++
    }
  }

  if (cleaned > 0) {
    log("Workflow", `Cleaned up ${cleaned} expired workflow items`)
  }

  return cleaned
}

/**
 * 生成工作流状态报告
 */
export function generateWorkflowReport(storage: WorkflowStorage): string {
  const lines = [
    "## 工作流存储状态",
    "",
    `活跃计划: ${storage.plans.size}`,
    `活跃变量集: ${storage.variables.size}`,
    `活跃上下文: ${storage.contexts.size}`,
    `Session 引用: ${storage.references.size}`,
    "",
  ]

  // 计算存储使用情况
  let totalSize = 0
  for (const plan of storage.plans.values()) {
    totalSize += JSON.stringify(plan).length
  }
  for (const vars of storage.variables.values()) {
    totalSize += JSON.stringify(vars).length
  }
  for (const ctx of storage.contexts.values()) {
    totalSize += JSON.stringify(ctx).length
  }

  lines.push(`估计总大小: ${(totalSize / 1024).toFixed(2)} KB`)
  lines.push("")
  lines.push("### 存储使用详情")
  lines.push("")

  if (storage.plans.size > 0) {
    lines.push("**计划**:")
    for (const [id, plan] of Array.from(storage.plans.entries()).slice(0, 5)) {
      lines.push(`  - ${id}: ${plan.taskDescription}`)
    }
    if (storage.plans.size > 5) {
      lines.push(`  ... 还有 ${storage.plans.size - 5} 个计划`)
    }
    lines.push("")
  }

  if (storage.contexts.size > 0) {
    lines.push("**执行上下文**:")
    for (const [id, ctx] of Array.from(storage.contexts.entries()).slice(0, 5)) {
      lines.push(
        `  - ${id}: ${ctx.status} (完成: ${ctx.completedSteps.length} 步)`
      )
    }
    if (storage.contexts.size > 5) {
      lines.push(`  ... 还有 ${storage.contexts.size - 5} 个上下文`)
    }
  }

  return lines.join("\n")
}
