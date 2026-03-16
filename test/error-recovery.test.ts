import {
  registerErrorHandler,
  getErrorHandler,
  getRecoveryStrategy,
  setDefaultStrategy,
  generateRecoveryReport,
  clearPolicies
} from "../src/workflows/error-recovery.js"

describe("ErrorRecovery", () => {
  let sessionId: string

  beforeEach(() => {
    sessionId = `test-${Date.now()}`
  })

  afterEach(() => {
    clearPolicies(sessionId)
  })

  it("should register error handler", () => {
    registerErrorHandler(
      sessionId,
      /Network error/,
      "retry",
      3,
      "Network failures"
    )

    const handler = getErrorHandler(sessionId, "Network error occurred")
    expect(handler).not.toBeNull()
    expect(handler!.strategy).toBe("retry")
  })

  it("should get recovery strategy", () => {
    registerErrorHandler(sessionId, /timeout/i, "alert", 2)

    const strategy = getRecoveryStrategy(sessionId, "Request timeout")
    expect(strategy).toBe("alert")
  })

  it("should use default strategy when no handler matches", () => {
    setDefaultStrategy(sessionId, "skip")

    const strategy = getRecoveryStrategy(sessionId, "Unknown error")
    expect(strategy).toBe("skip")
  })

  it("should generate recovery report", () => {
    registerErrorHandler(sessionId, /Network/, "retry", 3, "Network issues")
    registerErrorHandler(sessionId, /Timeout/, "alert", 2, "Timeout errors")

    const report = generateRecoveryReport(sessionId)
    expect(report).toContain("Error Recovery Policy")
    expect(report).toContain("Network issues")
    expect(report).toContain("Timeout errors")
  })
})
