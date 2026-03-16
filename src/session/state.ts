/**
 * Session 状态管理模块
 * 处理跨请求的 Session 级状态（解决 Token 重复消耗问题）
 *
 * Phase 3 改进：支持官方 SDK 的 session.metadata
 * - 第一层：内存缓存（快速访问）
 * - 第二层：官方 SDK（持久化和跨进程）
 */

import { SessionState, ConstraintDefinition } from "../types.js"
import { log } from "../utils.js"

// 全局 Session 状态存储（内存缓存）
const sessionStates = new Map<string, SessionState>()

const SESSION_CLEANUP_TIMEOUT = 3600000 // 1 小时

/**
 * 获取或创建 Session 状态
 */
export function getOrCreateSessionState(
  sessionId: string,
  agentName: string,
  domain: string
): SessionState {
  // 尝试获取现有状态
  let state = sessionStates.get(sessionId)

  if (!state) {
    // 创建新状态
    state = {
      sessionId,
      constraintsInjected: false,
      constraints: [],
      timestamp: Date.now(),
      domain,
      agent: agentName
    }
    sessionStates.set(sessionId, state)
    log("Session", `Created new session state: ${sessionId}`)
  }

  return state
}

/**
 * 更新 Session 约束
 */
export function updateSessionConstraints(
  sessionId: string,
  constraints: ConstraintDefinition[]
): void {
  let state = sessionStates.get(sessionId)

  if (!state) {
    // 创建新状态（不应该发生）
    state = {
      sessionId,
      constraintsInjected: false,
      constraints: [],
      timestamp: Date.now(),
      domain: "unknown",
      agent: "unknown"
    }
    sessionStates.set(sessionId, state)
  }

  state.constraints = constraints
  state.timestamp = Date.now()
}

/**
 * 标记约束已注入
 */
export function markConstraintsInjected(sessionId: string): void {
  const state = sessionStates.get(sessionId)
  if (state) {
    state.constraintsInjected = true
    log("Session", `Marked constraints as injected for session: ${sessionId}`)
  }
}

/**
 * 检查约束是否已注入
 */
export function isConstraintsInjected(sessionId: string): boolean {
  const state = sessionStates.get(sessionId)
  return state?.constraintsInjected || false
}

/**
 * 获取 Session 约束
 */
export function getSessionConstraints(sessionId: string): ConstraintDefinition[] {
  const state = sessionStates.get(sessionId)
  return state?.constraints || []
}

/**
 * 清除 Session 状态
 */
export function clearSessionState(sessionId: string): void {
  if (sessionStates.delete(sessionId)) {
    log("Session", `Cleared session state: ${sessionId}`)
  }
}

/**
 * 清理过期的 Session 状态
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now()
  let cleaned = 0

  for (const [sessionId, state] of sessionStates.entries()) {
    if (now - state.timestamp >= SESSION_CLEANUP_TIMEOUT) {
      sessionStates.delete(sessionId)
      cleaned++
    }
  }

  if (cleaned > 0) {
    log("Session", `Cleaned up ${cleaned} expired sessions`)
  }

  return cleaned
}

/**
 * 获取 Session 管理统计信息
 */
export function getSessionStats(): {
  totalSessions: number
  sessions: Array<{
    sessionId: string
    domain: string
    agent: string
    constraintsInjected: boolean
    age: number
  }>
} {
  const now = Date.now()
  const sessions = Array.from(sessionStates.values()).map((state) => ({
    sessionId: state.sessionId,
    domain: state.domain,
    agent: state.agent,
    constraintsInjected: state.constraintsInjected,
    age: now - state.timestamp
  }))

  return {
    totalSessions: sessionStates.size,
    sessions
  }
}

/**
 * 生成 Session 状态报告
 */
export function generateSessionReport(): string {
  const stats = getSessionStats()

  if (stats.totalSessions === 0) {
    return "## Session 状态\n\n当前无活跃 Session\n"
  }

  return [
    `## Session 状态管理`,
    ``,
    `活跃 Session 数：${stats.totalSessions}`,
    ``,
    ...stats.sessions.map(
      (s) => `- **${s.sessionId}** (${s.domain}:${s.agent})
   已注入约束: ${s.constraintsInjected ? "[OK]" : "[FAIL]"}
   年龄: ${Math.round(s.age / 1000)}s`
    ),
    ``
  ].join("\n")
}

/**
 * 初始化 Session 清理计时器
 */
export function initializeSessionCleanupTimer(): NodeJS.Timer {
  return setInterval(() => {
    cleanupExpiredSessions()
  }, SESSION_CLEANUP_TIMEOUT / 2) // 每半小时检查一次
}

// ─────────────────── Phase 3：官方 SDK 集成 ───────────────────

/**
 * 将 Session 状态持久化到官方 SDK
 * Phase 3 新增：支持跨进程和持久化
 *
 * @param sessionId - Session ID
 * @param context - OpenCode 官方 context 对象
 */
export async function persistSessionStateToSDK(
  sessionId: string,
  context: any
): Promise<void> {
  try {
    // 检查是否有官方 SDK 支持
    if (!context?.client?.session) {
      log("Session", "Official SDK not available, skipping persistence", "warn")
      return
    }

    const state = sessionStates.get(sessionId)
    if (!state) {
      return
    }

    // 构建 metadata 对象
    const metadata = {
      sansheng_liubu: {
        constraints_injected: state.constraintsInjected,
        constraint_names: state.constraints.map((c) => c.name),
        domain: state.domain,
        agent: state.agent,
        local_timestamp: state.timestamp,
        persisted_at: Date.now()
      }
    }

    // 调用官方 SDK 更新 Session
    await context.client.session.update(sessionId, { metadata })

    log(
      "Session",
      `Persisted session state to SDK: ${sessionId} (${state.constraints.length} constraints)`
    )
  } catch (error) {
    log("Session", `Error persisting to SDK: ${error}`, "warn")
  }
}

/**
 * 从官方 SDK 恢复 Session 状态
 * Phase 3 新增：支持跨 Session 恢复
 *
 * @param sessionId - Session ID
 * @param context - OpenCode 官方 context 对象
 */
export async function restoreSessionStateFromSDK(
  sessionId: string,
  context: any
): Promise<void> {
  try {
    // 检查是否有官方 SDK 支持
    if (!context?.client?.session) {
      return
    }

    // 获取 Session 信息
    const session = await context.client.session.get(sessionId)
    if (!session?.metadata?.sansheng_liubu) {
      return
    }

    const sdkState = session.metadata.sansheng_liubu
    const state = sessionStates.get(sessionId)

    if (state) {
      // 更新现有状态
      state.constraintsInjected = sdkState.constraints_injected
      state.domain = sdkState.domain
      state.agent = sdkState.agent

      log(
        "Session",
        `Restored session state from SDK: ${sessionId} (injected: ${sdkState.constraints_injected})`
      )
    }
  } catch (error) {
    log("Session", `Error restoring from SDK: ${error}`, "warn")
  }
}
