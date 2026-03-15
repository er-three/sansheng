import {
  createSession,
  getSessionMetadata,
  pauseSession,
  resumeSession,
  completeSession,
  failSession,
  checkSessionExpiration,
  getAllActiveSessions,
  deleteSession,
  generateSessionReport,
  clearSessions
} from "../src/workflows/session-lifecycle.js"

describe("SessionLifecycle", () => {
  let sessionId: string

  beforeEach(() => {
    sessionId = `session-${Date.now()}`
    clearSessions()
  })

  it("should create session", () => {
    const metadata = createSession(sessionId)

    expect(metadata.sessionId).toBe(sessionId)
    expect(metadata.status).toBe("active")
    expect(metadata.pauseCount).toBe(0)
  })

  it("should get session metadata", () => {
    createSession(sessionId)

    const metadata = getSessionMetadata(sessionId)
    expect(metadata).not.toBeNull()
    expect(metadata!.sessionId).toBe(sessionId)
  })

  it("should pause session", () => {
    createSession(sessionId)

    const result = pauseSession(sessionId)
    expect(result).toBe(true)

    const metadata = getSessionMetadata(sessionId)
    expect(metadata!.status).toBe("paused")
    expect(metadata!.pauseCount).toBe(1)
  })

  it("should resume session", () => {
    createSession(sessionId)
    pauseSession(sessionId)

    const result = resumeSession(sessionId)
    expect(result).toBe(true)

    const metadata = getSessionMetadata(sessionId)
    expect(metadata!.status).toBe("active")
  })

  it("should complete session", () => {
    createSession(sessionId)

    const result = completeSession(sessionId)
    expect(result).toBe(true)

    const metadata = getSessionMetadata(sessionId)
    expect(metadata!.status).toBe("completed")
    expect(metadata!.completedAt).toBeDefined()
  })

  it("should fail session", () => {
    createSession(sessionId)

    const result = failSession(sessionId)
    expect(result).toBe(true)

    const metadata = getSessionMetadata(sessionId)
    expect(metadata!.status).toBe("failed")
  })

  it("should check session expiration", () => {
    createSession(sessionId)

    const status = checkSessionExpiration(sessionId)
    expect(status).toBe("active")
  })

  it("should get all active sessions", () => {
    createSession("session-1")
    createSession("session-2")
    pauseSession("session-2")

    const activeSessions = getAllActiveSessions()
    expect(activeSessions.length).toBe(1)
    expect(activeSessions[0].sessionId).toBe("session-1")
  })

  it("should delete session", () => {
    createSession(sessionId)
    expect(getSessionMetadata(sessionId)).not.toBeNull()

    deleteSession(sessionId)
    expect(getSessionMetadata(sessionId)).toBeNull()
  })

  it("should generate session report", () => {
    createSession(sessionId)

    const report = generateSessionReport(sessionId)
    expect(report).toContain("Session Lifecycle Report")
    expect(report).toContain(sessionId)
  })

  it("should clear all sessions", () => {
    createSession("session-1")
    createSession("session-2")

    clearSessions()

    expect(getAllActiveSessions().length).toBe(0)
  })
})
