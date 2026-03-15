/**
 * 代码修改前置网关 - Phase 3
 *
 * 多层验证顺序：
 * 1. 工作流状态检查（调用 validateCodeModification）
 * 2. 风险评估（调用 assessModificationRisk）
 * 3. 自动判断是否需要 menxia 审核（调用 shouldRequireMenxiaReview）
 * 4. 如果需要 menxia 审核但未完成 → 拒绝，返回具体原因
 */

import { log } from "../utils.js"
import { getTaskQueue } from "../session/task-queue.js"
import {
  validateCodeModification,
  assessModificationRisk,
  shouldRequireMenxiaReview
} from "./programming-agent-enforcement.js"

/**
 * 网关验证结果
 */
export interface GatewayResult {
  allowed: boolean
  riskLevel: "low" | "medium" | "high"
  requiresMenxiaReview: boolean
  blockingReasons: string[]      // 所有未通过的检查
  requiredActions: string[]      // 需要采取的步骤
}

/**
 * 运行代码修改网关 - 前置拦截器
 *
 * 这是 Phase 3 的核心，在 tool.execute.after Hook 中调用
 * 替代原有的单层 validateCodeModification 检查
 */
export function runCodeModificationGateway(
  sessionId: string,
  agentName: string,
  operation: string,
  filesAffected: string[],
  linesChanged: number
): GatewayResult {
  const blockingReasons: string[] = []
  const requiredActions: string[] = []

  log("Gateway", `Starting code modification gateway for ${agentName}, operation: ${operation}`)

  // 第1层：工作流状态检查
  const workflowCheck = validateCodeModification(sessionId, agentName, operation)
  if (!workflowCheck.allowed) {
    blockingReasons.push(workflowCheck.reason || "Workflow validation failed")
    requiredActions.push(...workflowCheck.requiredSteps)

    return {
      allowed: false,
      riskLevel: "high",
      requiresMenxiaReview: false,
      blockingReasons,
      requiredActions
    }
  }

  // 第2层：风险评估
  const riskLevel = assessModificationRisk(filesAffected, operation)
  log("Gateway", `Risk assessment: ${riskLevel} (files: ${filesAffected.length}, lines: ${linesChanged})`)

  // 第3层：判断是否需要 menxia 审核
  const requiresMenxiaReview = shouldRequireMenxiaReview(
    filesAffected.length,
    linesChanged,
    riskLevel
  )

  // 第4层：如果需要审核，检查是否已完成
  const queue = getTaskQueue(sessionId)
  let menxiaReviewCompleted = false

  if (queue) {
    // 检查是否存在 menxia 审核任务且已完成
    menxiaReviewCompleted = queue.completedTasks.some(
      taskId => taskId.includes("menxia") || taskId.includes("review")
    )

    // 检查 menxia 审核依赖
    if (queue.currentTask) {
      const currentTask = queue.tasks.find(t => t.id === queue.currentTask)
      if (currentTask) {
        const hasMenxiaDependency = currentTask.dependencies.some(
          dep => dep.includes("menxia") || dep.includes("review")
        )

        if (hasMenxiaDependency && !menxiaReviewCompleted) {
          blockingReasons.push(
            `[GATEWAY] Menxia review is required for ${riskLevel} risk modification but not completed`
          )
          requiredActions.push("1. Complete menxia_review task first", "2. Wait for menxia approval", "3. Then retry code modification")
        }
      }
    }
  }

  // 如果有阻塞原因，拒绝执行
  if (blockingReasons.length > 0) {
    log(
      "Gateway",
      `Code modification blocked: ${blockingReasons.join("; ")}`,
      "warn"
    )

    return {
      allowed: false,
      riskLevel,
      requiresMenxiaReview,
      blockingReasons,
      requiredActions
    }
  }

  // 全部检查通过
  log(
    "Gateway",
    `Code modification gateway passed: ${agentName}, risk=${riskLevel}, menxia=${requiresMenxiaReview ? "required" : "not required"}`
  )

  return {
    allowed: true,
    riskLevel,
    requiresMenxiaReview,
    blockingReasons: [],
    requiredActions: []
  }
}
