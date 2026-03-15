/**
 * 编程Agent强制约束系统
 *
 * 为编程任务（代码修改）提供强硬的约束机制
 * - Phase 1+2: 立刻执行强制约束
 * - Phase 3: 完整的追踪和验证
 */

import { log } from "../utils.js"
import { getTaskQueue } from "../session/task-queue.js"
import { isNextModificationBlocked, getTestBlockingReason } from "./test-enforcement.js"

/**
 * 代码修改检查结果
 */
export interface CodeModificationCheck {
  allowed: boolean
  reason?: string
  requiredSteps: string[]
}

/**
 * 代码修改记录
 */
export interface CodeModificationRecord {
  taskId: string
  agentName: string
  timestamp: Date
  filesAffected: string[]
  linesChanged: number
  plan: string
  riskLevel: "low" | "medium" | "high"
  reviewedByMenxia: boolean
  testsPassed: boolean
  auditTrail: string[]
}

// 修改记录存储（按 sessionId）
const modificationRecords = new Map<string, CodeModificationRecord[]>()

/**
 * 检查是否允许代码修改
 *
 * 编程Agent必须满足所有条件，否则拒绝修改
 */
export function validateCodeModification(
  sessionId: string,
  agentName: string,
  operation: string
): CodeModificationCheck {
  const queue = getTaskQueue(sessionId)

  // 检查 1: 工作流是否初始化？
  if (!queue) {
    return {
      allowed: false,
      reason: "[PROGRAMMING AGENT] 工作流未初始化",
      requiredSteps: [
        "1. 执行 @initializeWorkflow 初始化工作流",
        "2. 选择任务复杂度",
        "3. 查看任务队列 @getTaskQueue",
        "4. 声明第一个任务"
      ]
    }
  }

  // 检查 2: 是否声明了任务？
  if (!queue.currentTask) {
    return {
      allowed: false,
      reason: "[PROGRAMMING AGENT] 没有声明当前任务",
      requiredSteps: [
        "1. 查看待办任务 @getTaskQueue",
        "2. 声明任务: 我现在声明开始 understand 任务",
        "3. 然后执行工作"
      ]
    }
  }

  // 检查 3: 当前任务是否被正确声明？
  const currentTask = queue.tasks.find(t => t.id === queue.currentTask)
  if (!currentTask) {
    return {
      allowed: false,
      reason: "[PROGRAMMING AGENT] 当前任务不存在",
      requiredSteps: [
        "1. 查看任务队列 @getTaskQueue",
        "2. 使用有效的任务ID"
      ]
    }
  }

  if (currentTask.status !== "claimed") {
    return {
      allowed: false,
      reason: `[PROGRAMMING AGENT] 任务未被声明，状态为: ${currentTask.status}`,
      requiredSteps: [
        `1. 声明任务: 我现在声明开始 ${currentTask.id} 任务`,
        "2. 然后执行工作"
      ]
    }
  }

  if (currentTask.claimedBy !== agentName) {
    return {
      allowed: false,
      reason: `[PROGRAMMING AGENT] 任务被 ${currentTask.claimedBy} 声明，当前Agent是 ${agentName}`,
      requiredSteps: [
        "1. 不能跳过或接管其他Agent的任务",
        "2. 等待该任务完成或失败",
        "3. 然后声明下一个任务"
      ]
    }
  }

  // 检查 4: 前置任务是否都完成了？
  const incompleteDeps = currentTask.dependencies.filter(
    dep => !queue.completedTasks.includes(dep)
  )
  if (incompleteDeps.length > 0) {
    const depNames = incompleteDeps
      .map(dep => queue.tasks.find(t => t.id === dep)?.name)
      .filter(Boolean)
      .join(", ")

    return {
      allowed: false,
      reason: `[PROGRAMMING AGENT] 前置任务未完成: ${depNames}`,
      requiredSteps: [
        `1. 必须先完成: ${depNames}`,
        "2. 然后才能执行当前任务"
      ]
    }
  }

  // 检查 5: 对于执行阶段的特殊检查
  if (currentTask.id.includes("execute")) {
    // 代码修改必须有计划
    if (!currentTask.outputs?.plan) {
      return {
        allowed: false,
        reason: "[PROGRAMMING AGENT] 执行阶段必须有修改计划",
        requiredSteps: [
          "1. 必须先完成 plan 任务（提供修改方案）",
          "2. plan 任务中必须包含：",
          "   - 修改哪些文件",
          "   - 为什么这样修改",
          "   - 可能的风险",
          "3. 然后执行 execute 任务"
        ]
      }
    }

    // 检查 menxia 审核
    if (!currentTask.outputs?.reviewedByMenxia) {
      // 对于大改动，menxia 审核是必须的
      if (currentTask.dependencies.some(dep => dep.includes("menxia"))) {
        return {
          allowed: false,
          reason: "[PROGRAMMING AGENT] 必须经过 menxia 审核",
          requiredSteps: [
            "1. menxia_review 任务必须完成",
            "2. menxia 必须批准修改计划",
            "3. 然后才能执行代码修改"
          ]
        }
      }
    }
  }

  // 检查 6: 测试状态检查（Phase 3）
  if (isNextModificationBlocked(sessionId)) {
    const blockingReason = getTestBlockingReason(sessionId)
    return {
      allowed: false,
      reason: blockingReason || "[PROGRAMMING AGENT] 上一次修改的测试失败，无法执行新的修改",
      requiredSteps: [
        "1. 修复失败的测试",
        "2. 重新运行测试直到全部通过",
        "3. 声明测试结果 @declareTestResult",
        "4. 然后继续执行代码修改"
      ]
    }
  }

  // 全部检查通过
  log(
    "ProgrammingAgent",
    `代码修改验证通过: ${agentName} 可以执行 ${operation}`
  )

  return {
    allowed: true,
    requiredSteps: []
  }
}

/**
 * 记录代码修改
 */
export function recordCodeModification(
  sessionId: string,
  record: CodeModificationRecord
): void {
  if (!modificationRecords.has(sessionId)) {
    modificationRecords.set(sessionId, [])
  }

  const records = modificationRecords.get(sessionId)!
  records.push(record)

  log(
    "ProgrammingAgent",
    `记录代码修改: ${record.taskId} by ${record.agentName}, ` +
    `文件数: ${record.filesAffected.length}, ` +
    `风险: ${record.riskLevel}`
  )
}

/**
 * 获取修改记录
 */
export function getModificationRecords(
  sessionId: string
): CodeModificationRecord[] {
  return modificationRecords.get(sessionId) || []
}

/**
 * 检查是否需要 menxia 审核
 */
export function shouldRequireMenxiaReview(
  filesAffected: number,
  linesChanged: number,
  riskLevel: string
): boolean {
  // 规则：
  // 1. 跨文件修改（>= 2个文件）
  // 2. 大规模修改（>= 50行）
  // 3. 高风险修改

  if (filesAffected >= 2) return true
  if (linesChanged >= 50) return true
  if (riskLevel === "high") return true

  return false
}

/**
 * 生成修改风险评估
 */
export function assessModificationRisk(
  filesAffected: string[],
  description: string
): "low" | "medium" | "high" {
  // 简单的风险评估规则

  // 高风险：涉及配置、核心模块、API 定义
  const highRiskPatterns = [
    "config", "api", "types", "interface",
    "core", "main", "index", "utils"
  ]

  const hasHighRiskFile = filesAffected.some(file =>
    highRiskPatterns.some(pattern =>
      file.toLowerCase().includes(pattern)
    )
  )

  if (hasHighRiskFile) return "high"
  if (filesAffected.length >= 3) return "medium"

  return "low"
}

/**
 * 清空修改记录
 */
export function clearModificationRecords(sessionId: string): void {
  modificationRecords.delete(sessionId)
  log("ProgrammingAgent", `清空修改记录: ${sessionId}`)
}

/**
 * 获取内存使用统计
 *
 * 用于监控和调试
 */
export function getMemoryStats(): {
  totalSessions: number
  totalRecords: number
  averageRecordsPerSession: number
} {
  let totalRecords = 0
  for (const records of modificationRecords.values()) {
    totalRecords += records.length
  }

  const totalSessions = modificationRecords.size
  const averageRecordsPerSession = totalSessions > 0 ? totalRecords / totalSessions : 0

  return {
    totalSessions,
    totalRecords,
    averageRecordsPerSession,
  }
}
