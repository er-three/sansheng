/**
 * 会话管理器 - 管理工作流会话的生命周期
 *
 * 职责：
 *   1. 创建和销毁会话
 *   2. 管理会话状态
 *   3. 管理会话变量
 *   4. 会话持久化和恢复
 */

import { log } from '../utils.js'

export type SessionStatus = 'active' | 'paused' | 'completed' | 'expired' | 'failed'

export interface SessionMetadata {
  sessionId: string
  createdAt: number
  startedAt?: number
  pausedAt?: number
  completedAt?: number
  status: SessionStatus
  totalDuration: number
  pauseCount: number
}

// 内存存储（实际应用中应使用持久化存储）
const sessions = new Map<string, SessionMetadata>()
const sessionVariables = new Map<string, Map<string, any>>()
const sessionExpirationMs = 3600000 // 1 小时

/**
 * 创建新会话
 */
export function createSession(sessionId: string): SessionMetadata {
  const metadata: SessionMetadata = {
    sessionId,
    createdAt: Date.now(),
    status: 'active',
    totalDuration: 0,
    pauseCount: 0
  }

  sessions.set(sessionId, metadata)
  sessionVariables.set(sessionId, new Map())

  log('SessionManager', `Session created: ${sessionId}`, 'debug')

  return metadata
}

/**
 * 获取会话元数据
 */
export function getSessionMetadata(sessionId: string): SessionMetadata | null {
  return sessions.get(sessionId) || null
}

/**
 * 暂停会话
 */
export function pauseSession(sessionId: string): boolean {
  const session = sessions.get(sessionId)
  if (!session || session.status !== 'active') return false

  session.status = 'paused'
  session.pausedAt = Date.now()
  session.pauseCount++

  log('SessionManager', `Session paused: ${sessionId}`, 'info')
  return true
}

/**
 * 恢复会话
 */
export function resumeSession(sessionId: string): boolean {
  const session = sessions.get(sessionId)
  if (!session || session.status !== 'paused') return false

  session.status = 'active'
  session.startedAt = Date.now()

  log('SessionManager', `Session resumed: ${sessionId}`, 'info')
  return true
}

/**
 * 完成会话
 */
export function completeSession(sessionId: string): boolean {
  const session = sessions.get(sessionId)
  if (!session) return false

  session.status = 'completed'
  session.completedAt = Date.now()

  if (session.startedAt) {
    session.totalDuration = session.completedAt - session.startedAt
  }

  log('SessionManager', `Session completed: ${session.totalDuration}ms`, 'info')
  return true
}

/**
 * 标记会话失败
 */
export function failSession(sessionId: string): boolean {
  const session = sessions.get(sessionId)
  if (!session) return false

  session.status = 'failed'
  session.completedAt = Date.now()

  log('SessionManager', `Session failed: ${sessionId}`, 'warn')
  return true
}

/**
 * 检查会话是否过期
 */
export function checkSessionExpiration(sessionId: string): SessionStatus {
  const session = sessions.get(sessionId)
  if (!session) return 'expired'

  const now = Date.now()
  const age = now - session.createdAt

  if (age > sessionExpirationMs && session.status === 'active') {
    session.status = 'expired'
    log('SessionManager', `Session expired: ${sessionId}`, 'warn')
  }

  return session.status
}

/**
 * 获取所有活跃会话
 */
export function getAllActiveSessions(): SessionMetadata[] {
  return Array.from(sessions.values()).filter(s => s.status === 'active')
}

/**
 * 删除会话
 */
export function deleteSession(sessionId: string): boolean {
  sessionVariables.delete(sessionId)
  return sessions.delete(sessionId)
}

/**
 * 设置会话变量
 */
export function setSessionVariable(
  sessionId: string,
  key: string,
  value: any
): void {
  if (!sessionVariables.has(sessionId)) {
    sessionVariables.set(sessionId, new Map())
  }

  sessionVariables.get(sessionId)!.set(key, value)

  log('SessionManager', `Session variable set: ${key}`, 'debug')
}

/**
 * 获取会话变量
 */
export function getSessionVariable(sessionId: string, key: string): any {
  return sessionVariables.get(sessionId)?.get(key) || null
}

/**
 * 获取所有会话变量
 */
export function getSessionVariables(sessionId: string): Record<string, any> {
  const vars = sessionVariables.get(sessionId)
  if (!vars) return {}

  const result: Record<string, any> = {}
  for (const [key, value] of vars.entries()) {
    result[key] = value
  }

  return result
}

/**
 * 生成会话报告
 */
export function generateSessionReport(sessionId: string): string {
  const session = getSessionMetadata(sessionId)
  if (!session) return 'Session not found'

  const lines = [
    '═══════════════════════════════════════════',
    'Session Lifecycle Report',
    '═══════════════════════════════════════════',
    '',
    `📋 Session: ${sessionId}`,
    `  Status: ${session.status}`,
    `  Created: ${new Date(session.createdAt).toISOString()}`,
    `  Total Duration: ${session.totalDuration}ms`,
    `  Pauses: ${session.pauseCount}`,
    ''
  ]

  if (session.completedAt) {
    lines.push(`  Completed: ${new Date(session.completedAt).toISOString()}`)
  }

  return lines.join('\n')
}

/**
 * 清理所有会话（用于测试）
 */
export function clearSessions(): void {
  sessions.clear()
  sessionVariables.clear()
}
