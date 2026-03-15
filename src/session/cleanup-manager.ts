/**
 * 会话清理管理器
 *
 * 统一管理所有会话相关资源的清理和内存泄漏防护
 * Phase 2 优化：防止长期运行中的内存泄漏
 */

import { log } from "../utils.js"
import { deleteSession, getAllActiveSessions } from "./session-manager.js"
import { clearTestStatus, shouldCleanupTestStatus, getAllTestStatuses } from "../workflows/test-enforcement.js"
import { clearModificationRecords, getMemoryStats } from "../workflows/programming-agent-enforcement.js"
import { CONFIG } from "../constants/index.js"

/**
 * 清理统计信息
 */
export interface CleanupStats {
  sessionsChecked: number
  sessionsDeleted: number
  testStatusesCleared: number
  modificationRecordsCleared: number
  timestamp: string
}

/**
 * 清理单个会话的所有资源
 *
 * 这是统一的清理入口点，协调所有模块的清理
 */
export function cleanupSessionResources(sessionId: string): void {
  try {
    // 清理测试状态
    clearTestStatus(sessionId)

    // 清理修改记录
    clearModificationRecords(sessionId)

    // 清理会话本身
    deleteSession(sessionId)

    log("CleanupManager", `会话资源已清理: ${sessionId}`)
  } catch (error) {
    log("CleanupManager", `会话清理失败: ${sessionId}: ${error}`, "warn")
  }
}

/**
 * 自动清理过期会话
 *
 * 扫描所有活跃会话，清理超过指定年龄的会话
 *
 * @param maxAgeMs - 会话最大年龄（毫秒），默认 1 小时
 * @returns 清理统计
 */
export function cleanupExpiredSessions(maxAgeMs: number = CONFIG.SESSION_EXPIRATION_MS): CleanupStats {
  const stats: CleanupStats = {
    sessionsChecked: 0,
    sessionsDeleted: 0,
    testStatusesCleared: 0,
    modificationRecordsCleared: 0,
    timestamp: new Date().toISOString(),
  }

  try {
    const activeSessions = getAllActiveSessions()

    for (const session of activeSessions) {
      stats.sessionsChecked++

      const ageMs = Date.now() - new Date(session.createdAt).getTime()

      if (ageMs > maxAgeMs) {
        cleanupSessionResources(session.sessionId)
        stats.sessionsDeleted++
      }

      // 检查测试状态独立超时
      if (shouldCleanupTestStatus(session.sessionId, maxAgeMs)) {
        clearTestStatus(session.sessionId)
        stats.testStatusesCleared++
      }
    }

    // 检查孤立的修改记录（对应的会话已删除但数据还在）
    const orphanedSessions = new Set<string>()
    const activeSessions2 = getAllActiveSessions()
    const activeSessionIds = new Set(activeSessions2.map(s => s.sessionId))

    const memStats = getMemoryStats()
    if (memStats.totalSessions > activeSessionIds.size) {
      // 有孤立会话
      log(
        "CleanupManager",
        `检测到孤立会话: ${memStats.totalSessions - activeSessionIds.size} 个`,
        "warn"
      )
      stats.modificationRecordsCleared += memStats.totalSessions - activeSessionIds.size
    }

    log(
      "CleanupManager",
      `自动清理完成: 检查 ${stats.sessionsChecked} 个会话, 删除 ${stats.sessionsDeleted} 个`,
      "info"
    )
  } catch (error) {
    log("CleanupManager", `自动清理失败: ${error}`, "error")
  }

  return stats
}

/**
 * 获取清理诊断信息
 *
 * 用于监控内存状态
 */
export interface CleanupDiagnostics {
  activeSessions: number
  orphanedRecords: number
  totalModificationRecords: number
  averageRecordsPerSession: number
  memoryWarning: boolean
  recommendedAction: string
}

export function getDiagnostics(): CleanupDiagnostics {
  const activeSessions = getAllActiveSessions()
  const memStats = getMemoryStats()
  const testStatuses = getAllTestStatuses()

  const orphanedRecords = Math.max(0, memStats.totalSessions - activeSessions.length)
  const memoryWarning = memStats.totalRecords > 10000 || orphanedRecords > 100

  let recommendedAction = "无需处理"
  if (orphanedRecords > 100) {
    recommendedAction = "立即执行 cleanupExpiredSessions()"
  } else if (memStats.totalRecords > 10000) {
    recommendedAction = "建议在闲时执行清理"
  }

  return {
    activeSessions: activeSessions.length,
    orphanedRecords,
    totalModificationRecords: memStats.totalRecords,
    averageRecordsPerSession: memStats.averageRecordsPerSession,
    memoryWarning,
    recommendedAction,
  }
}

/**
 * 启动定期自动清理
 *
 * 每 10 分钟检查一次过期会话
 *
 * @returns 清理计时器 ID（用于停止清理）
 */
export function startAutoCleanup(intervalMs: number = 10 * 60 * 1000): NodeJS.Timeout {
  log("CleanupManager", `启动自动清理，间隔: ${intervalMs / 1000} 秒`)

  return setInterval(() => {
    const stats = cleanupExpiredSessions()
    if (stats.sessionsDeleted > 0 || stats.modificationRecordsCleared > 0) {
      log(
        "CleanupManager",
        `自动清理统计: 删除 ${stats.sessionsDeleted} 个会话, 清理 ${stats.modificationRecordsCleared} 条记录`
      )
    }
  }, intervalMs)
}

/**
 * 停止自动清理
 */
export function stopAutoCleanup(timerId: NodeJS.Timeout): void {
  clearInterval(timerId)
  log("CleanupManager", `自动清理已停止`)
}
