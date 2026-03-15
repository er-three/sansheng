/**
 * Session 生命周期管理 - Phase 4
 */

import { log } from "../utils.js"

export type SessionStatus = "active" | "paused" | "completed" | "expired" | "failed"

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

const sessions = new Map<string, SessionMetadata>()
const sessionExpirationMs = 3600000 // 1 hour default

export function createSession(sessionId: string): SessionMetadata {
  const metadata: SessionMetadata = {
    sessionId,
    createdAt: Date.now(),
    status: "active",
    totalDuration: 0,
    pauseCount: 0
  }

  sessions.set(sessionId, metadata)
  log("SessionLifecycle", `Session created: ${sessionId}`)

  return metadata
}

export function getSessionMetadata(sessionId: string): SessionMetadata | null {
  return sessions.get(sessionId) || null
}

export function pauseSession(sessionId: string): boolean {
  const session = sessions.get(sessionId)
  if (!session || session.status !== "active") return false

  session.status = "paused"
  session.pausedAt = Date.now()
  session.pauseCount++

  log("SessionLifecycle", `Session paused: ${sessionId}`)
  return true
}

export function resumeSession(sessionId: string): boolean {
  const session = sessions.get(sessionId)
  if (!session || session.status !== "paused") return false

  session.status = "active"
  session.startedAt = Date.now()

  log("SessionLifecycle", `Session resumed: ${sessionId}`)
  return true
}

export function completeSession(sessionId: string): boolean {
  const session = sessions.get(sessionId)
  if (!session) return false

  session.status = "completed"
  session.completedAt = Date.now()

  if (session.startedAt) {
    session.totalDuration = session.completedAt - session.startedAt
  }

  log("SessionLifecycle", `Session completed: ${sessionId}`)
  return true
}

export function failSession(sessionId: string): boolean {
  const session = sessions.get(sessionId)
  if (!session) return false

  session.status = "failed"
  session.completedAt = Date.now()

  log("SessionLifecycle", `Session failed: ${sessionId}`)
  return true
}

export function checkSessionExpiration(sessionId: string): SessionStatus {
  const session = sessions.get(sessionId)
  if (!session) return "expired"

  const now = Date.now()
  const age = now - session.createdAt

  if (age > sessionExpirationMs && session.status === "active") {
    session.status = "expired"
    log("SessionLifecycle", `Session expired: ${sessionId}`)
  }

  return session.status
}

export function getAllActiveSessions(): SessionMetadata[] {
  return Array.from(sessions.values()).filter(s => s.status === "active")
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId)
}

export function generateSessionReport(sessionId: string): string {
  const session = getSessionMetadata(sessionId)
  if (!session) return "Session not found"

  const lines = [
    "═══════════════════════════════════════════",
    "Session Lifecycle Report",
    "═══════════════════════════════════════════",
    "",
    `📋 Session: ${sessionId}`,
    `  Status: ${session.status}`,
    `  Created: ${new Date(session.createdAt).toISOString()}`,
    `  Total Duration: ${session.totalDuration}ms`,
    `  Pauses: ${session.pauseCount}`,
    ""
  ]

  if (session.completedAt) {
    lines.push(`  Completed: ${new Date(session.completedAt).toISOString()}`)
  }

  return lines.join("\n")
}

export function clearSessions(): void {
  sessions.clear()
}
