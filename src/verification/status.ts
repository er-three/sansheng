/**
 * 流水线状态管理模块
 * 跟踪并管理流水线执行状态
 */

import { PipelineState, StepConfig } from "../types.js"

/**
 * 初始化流水线状态
 */
export function initializePipelineState(): PipelineState {
  return {
    completed: [],
    current: null,
    failed: null,
    started_at: new Date().toISOString()
  }
}

/**
 * 更新当前步骤
 */
export function updateCurrentStep(
  state: PipelineState,
  stepId: string
): PipelineState {
  return {
    ...state,
    current: stepId
  }
}

/**
 * 标记步骤完成
 */
export function markStepCompleted(
  state: PipelineState,
  stepId: string
): PipelineState {
  return {
    ...state,
    completed: [...state.completed, stepId],
    current: null
  }
}

/**
 * 标记步骤失败
 */
export function markStepFailed(
  state: PipelineState,
  stepId: string
): PipelineState {
  return {
    ...state,
    failed: stepId,
    current: null
  }
}

/**
 * 获取流水线进度
 */
export function getPipelineProgress(
  state: PipelineState,
  totalSteps: number
): {
  completed: number
  total: number
  percentage: number
  status: "running" | "succeeded" | "failed"
} {
  const completed = state.completed.length
  const percentage = Math.round((completed / totalSteps) * 100)

  let status: "running" | "succeeded" | "failed" = "running"
  if (state.failed) {
    status = "failed"
  } else if (completed === totalSteps) {
    status = "succeeded"
  }

  return {
    completed,
    total: totalSteps,
    percentage,
    status
  }
}

/**
 * 生成流水线状态报告
 */
export function generatePipelineStatus(
  domain: any,
  state: PipelineState | undefined,
  variables: Record<string, string> = {}
): string {
  if (!domain || !domain.pipeline) {
    return ""
  }

  const pipeline = domain.pipeline as StepConfig[]
  const lines: string[] = []

  lines.push("═".repeat(60))
  lines.push(`[CHART] 流水线状态 (${domain.name || "未知域"})`)
  lines.push("═".repeat(60))

  for (let i = 0; i < pipeline.length; i++) {
    const step = pipeline[i]
    const isCompleted = state?.completed.includes(step.id)
    const isCurrent = state?.current === step.id
    const isFailed = state?.failed === step.id

    let icon = "⬜"
    let statusSuffix = ""

    if (isFailed) {
      icon = "[FAIL]"
      statusSuffix = " [失败]"
    } else if (isCompleted) {
      icon = "[OK]"
      statusSuffix = " [完成]"
    } else if (isCurrent) {
      icon = "⏳"
      statusSuffix = " [执行中]"
    } else if (i < (state?.completed.length || 0)) {
      icon = "[OK]"
      statusSuffix = " [完成]"
    }

    const uses = step.uses?.join(", ") || "无"
    const parallelExec = state?.parallel_execution
    const levelStatus = isParallel(parallelExec, step.id)
      ? `[${parallelExec?.tasks
          .map((t) => `${t.agent}=${t.status[0]}`)
          .join(",")}]`
      : ""

    lines.push(`${icon} ${i + 1}. ${step.name} (${step.id})${statusSuffix}`)
    if (uses) lines.push(`   用: ${uses} ${levelStatus}`)

    // 显示成功条件数量（如果有定义）
    if (step.success_criteria && step.success_criteria.length > 0) {
      lines.push(`   验证: ${step.success_criteria.length} 个成功条件`)
    }
  }

  lines.push("═".repeat(60))

  return lines.join("\n")
}

/**
 * 检查是否在并行执行
 */
function isParallel(parallelExec: any, stepId: string): boolean {
  return parallelExec && parallelExec.step_id === stepId
}

/**
 * 获取下一个待执行的步骤
 */
export function getNextStep(
  pipeline: StepConfig[],
  state: PipelineState
): StepConfig | null {
  for (const step of pipeline) {
    if (!state.completed.includes(step.id)) {
      return step
    }
  }
  return null
}

/**
 * 检查步骤依赖是否满足
 */
export function checkDependencies(
  step: StepConfig,
  state: PipelineState
): boolean {
  if (!step.depends_on || step.depends_on.length === 0) {
    return true
  }

  return step.depends_on.every((dep) => state.completed.includes(dep))
}
