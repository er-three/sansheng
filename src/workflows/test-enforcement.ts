/**
 * 测试执行追踪 - Phase 3
 *
 * 插件无法自动运行测试，因此这是"测试声明追踪"：
 * - Agent 在完成代码修改后必须声明测试结果
 * - verify 任务完成时必须记录测试通过状态
 * - 如果 Agent 尝试开始新的修改但上次测试声明为失败，阻止执行
 *
 * 本次修改中使用内存存储（跟随会话）
 */

import { log } from "../utils.js"

/**
 * 测试声明记录
 */
export interface TestEnforcementRecord {
  sessionId: string
  taskId: string
  declaredAt: Date
  testStatus: "passed" | "failed" | "not_run"
  testDescription: string
  blocksNextModification: boolean
}

// 内存存储（按 sessionId）
const testStatusMap = new Map<string, TestEnforcementRecord>()

/**
 * 声明测试结果
 *
 * 在 verify 任务完成时调用，Agent 声明测试是否通过
 */
export function declareTestResult(
  sessionId: string,
  taskId: string,
  passed: boolean,
  description: string
): TestEnforcementRecord {
  const status = passed ? "passed" : "failed"

  const record: TestEnforcementRecord = {
    sessionId,
    taskId,
    declaredAt: new Date(),
    testStatus: status,
    testDescription: description,
    blocksNextModification: !passed
  }

  testStatusMap.set(sessionId, record)

  log(
    "TestEnforcement",
    `Test result declared for ${taskId}: ${status} - "${description}"`
  )

  return record
}

/**
 * 获取最后的测试状态
 */
export function getLastTestStatus(sessionId: string): TestEnforcementRecord | null {
  return testStatusMap.get(sessionId) || null
}

/**
 * 检查是否阻塞下一次修改
 *
 * 如果上次测试失败，阻止执行新的代码修改
 */
export function isNextModificationBlocked(sessionId: string): boolean {
  const lastStatus = testStatusMap.get(sessionId)
  if (!lastStatus) {
    // 没有测试记录，不阻塞
    return false
  }

  const isBlocked = lastStatus.blocksNextModification
  if (isBlocked) {
    log(
      "TestEnforcement",
      `Next modification blocked for ${sessionId}: previous test failed`,
      "warn"
    )
  }

  return isBlocked
}

/**
 * 清空测试状态
 *
 * 当成功进行新的修改后，清空阻塞状态
 */
export function clearTestStatus(sessionId: string): void {
  testStatusMap.delete(sessionId)
  log("TestEnforcement", `Cleared test status for session ${sessionId}`)
}

/**
 * 获取测试阻塞原因
 *
 * 用于生成错误信息
 */
export function getTestBlockingReason(sessionId: string): string | null {
  const lastStatus = testStatusMap.get(sessionId)
  if (!lastStatus || !lastStatus.blocksNextModification) {
    return null
  }

  return (
    `Previous test for task "${lastStatus.taskId}" failed: "${lastStatus.testDescription}". ` +
    `Fix the failing tests before making new modifications.`
  )
}
