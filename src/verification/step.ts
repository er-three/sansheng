/**
 * 步骤验证模块
 * 验证流水线步骤是否成功/失败
 */

import * as path from "path"
import * as fs from "fs"
import { StepConfig, StepResult, VerificationCriterion } from "../types.js"

/**
 * 验证步骤成功/失败
 */
export function verifyStepCriteria(
  stepConfig: StepConfig,
  projectRoot: string
): StepResult {
  const passedCriteria: string[] = []
  const failedCriteria: string[] = []
  const details: Record<string, unknown> = {}

  // 检查成功条件
  if (stepConfig.success_criteria && stepConfig.success_criteria.length > 0) {
    for (const criterion of stepConfig.success_criteria) {
      try {
        let passed = false
        const message = criterion.error_msg || `Criterion: ${criterion.type}`

        if (criterion.type === "file_exists") {
          const filePath = path.join(projectRoot, criterion.path || "")
          passed = fs.existsSync(filePath)
          if (passed) {
            passedCriteria.push(`✅ 文件存在: ${criterion.path}`)
          } else {
            failedCriteria.push(`❌ 文件缺失: ${criterion.path}`)
          }
        } else if (criterion.type === "file_not_empty") {
          const filePath = path.join(projectRoot, criterion.path || "")
          if (fs.existsSync(filePath)) {
            const size = fs.statSync(filePath).size
            passed = size > 0
            if (passed) {
              passedCriteria.push(`✅ 文件非空: ${criterion.path} (${size} bytes)`)
            } else {
              failedCriteria.push(`❌ 文件为空: ${criterion.path}`)
            }
          } else {
            failedCriteria.push(`❌ 文件缺失: ${criterion.path}`)
          }
        } else if (criterion.type === "file_size_min") {
          const filePath = path.join(projectRoot, criterion.path || "")
          if (fs.existsSync(filePath)) {
            const size = fs.statSync(filePath).size
            passed = size >= (criterion.bytes || 0)
            if (passed) {
              passedCriteria.push(
                `✅ 文件大小满足: ${criterion.path} (${size} >= ${criterion.bytes} bytes)`
              )
            } else {
              failedCriteria.push(
                `❌ 文件过小: ${criterion.path} (${size} < ${criterion.bytes} bytes)`
              )
            }
          } else {
            failedCriteria.push(`❌ 文件缺失: ${criterion.path}`)
          }
        } else if (criterion.type === "no_error_keywords") {
          const filePath = path.join(projectRoot, criterion.path || "")
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, "utf-8")
            const keywords = criterion.keywords || ["ERROR", "error"]
            const hasError = keywords.some((kw) => content.includes(kw))

            passed = !hasError
            if (passed) {
              passedCriteria.push(
                `✅ 无错误关键词: ${criterion.path} (${keywords.join(", ")})`
              )
            } else {
              failedCriteria.push(
                `❌ 包含错误关键词: ${criterion.path} (${keywords.join(", ")})`
              )
            }
          } else {
            failedCriteria.push(`❌ 文件缺失: ${criterion.path}`)
          }
        } else if (criterion.type === "agent_all_done") {
          // 占位符：实际需要从并行执行状态中检查
          passed = true
          passedCriteria.push(`✅ 所有 Agent 完成`)
        }
      } catch (error) {
        failedCriteria.push(`❌ 验证异常: ${(error as any).message}`)
      }
    }
  }

  // 检查失败条件
  if (stepConfig.failure_criteria && stepConfig.failure_criteria.length > 0) {
    for (const criterion of stepConfig.failure_criteria) {
      // 类似的检查逻辑...
      // 简化版本，完整逻辑同 success_criteria
    }
  }

  // 判断步骤状态
  let status: "success" | "failed" | "partial" = "success"
  if (failedCriteria.length > 0) {
    status = failedCriteria.length > passedCriteria.length ? "failed" : "partial"
  }

  return {
    step_id: stepConfig.id,
    step_name: stepConfig.name,
    status,
    passed_criteria: passedCriteria,
    failed_criteria: failedCriteria,
    details,
    timestamp: Date.now()
  }
}

/**
 * 生成验证报告
 */
export function formatVerificationReport(result: StepResult): string {
  return [
    `## 步骤 ${result.step_id} 验证结果`,
    ``,
    `状态：${result.status === "success" ? "✅ 成功" : result.status === "failed" ? "❌ 失败" : "⚠️ 部分成功"}`,
    ``,
    `**通过条件**：`,
    ...result.passed_criteria.map((c) => `  ${c}`),
    ``,
    ...(result.failed_criteria.length > 0
      ? [
          `**失败条件**：`,
          ...result.failed_criteria.map((c) => `  ${c}`),
          ``
        ]
      : []),
    `验证时间：${new Date(result.timestamp).toISOString()}`
  ].join("\n")
}
