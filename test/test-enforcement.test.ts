/**
 * 测试强制执行系统测试 - Phase 3
 */

// Jest test suite
import {
  declareTestResult,
  getLastTestStatus,
  isNextModificationBlocked,
  clearTestStatus,
  getTestBlockingReason
} from "../src/workflows/test-enforcement.js"

describe("TestEnforcement", () => {
  let sessionId: string

  beforeEach(() => {
    sessionId = `test-session-${Date.now()}`
  })

  afterEach(() => {
    // Clean up after each test
    clearTestStatus(sessionId)
  })

  it("should declare a passing test", () => {
    const record = declareTestResult(
      sessionId,
      "task-1",
      true,
      "All unit tests passed"
    )

    expect(record).toBeDefined()
    expect(record.testStatus).toBe("passed")
    expect(record.blocksNextModification).toBe(false)
    expect(record.testDescription).toBe("All unit tests passed")
  })

  it("should declare a failing test", () => {
    const record = declareTestResult(
      sessionId,
      "task-1",
      false,
      "API endpoint test failed"
    )

    expect(record).toBeDefined()
    expect(record.testStatus).toBe("failed")
    expect(record.blocksNextModification).toBe(true)
    expect(record.testDescription).toBe("API endpoint test failed")
  })

  it("should get last test status", () => {
    declareTestResult(sessionId, "task-1", true, "Test 1 passed")
    declareTestResult(sessionId, "task-2", false, "Test 2 failed")

    const lastStatus = getLastTestStatus(sessionId)
    expect(lastStatus).toBeDefined()
    expect(lastStatus?.testStatus).toBe("failed")
    expect(lastStatus?.taskId).toBe("task-2")
  })

  it("should return null when no test status exists", () => {
    const lastStatus = getLastTestStatus("nonexistent-session")
    expect(lastStatus).toBeNull()
  })

  it("should block next modification after failed test", () => {
    declareTestResult(sessionId, "task-1", false, "Tests failed")

    const isBlocked = isNextModificationBlocked(sessionId)
    expect(isBlocked).toBe(true)
  })

  it("should not block next modification after passed test", () => {
    declareTestResult(sessionId, "task-1", true, "All tests passed")

    const isBlocked = isNextModificationBlocked(sessionId)
    expect(isBlocked).toBe(false)
  })

  it("should not block when no test status exists", () => {
    const isBlocked = isNextModificationBlocked("nonexistent-session")
    expect(isBlocked).toBe(false)
  })

  it("should provide blocking reason for failed tests", () => {
    declareTestResult(
      sessionId,
      "task-1",
      false,
      "Integration tests timeout"
    )

    const reason = getTestBlockingReason(sessionId)
    expect(reason).toBeDefined()
    expect(reason).toContain("Integration tests timeout")
    expect(reason).toContain("Fix the failing tests")
  })

  it("should return null reason when tests passed", () => {
    declareTestResult(sessionId, "task-1", true, "All pass")

    const reason = getTestBlockingReason(sessionId)
    expect(reason).toBeNull()
  })

  it("should return null reason when no test status", () => {
    const reason = getTestBlockingReason("nonexistent-session")
    expect(reason).toBeNull()
  })

  it("should clear test status", () => {
    declareTestResult(sessionId, "task-1", false, "Test failed")
    expect(isNextModificationBlocked(sessionId)).toBe(true)

    clearTestStatus(sessionId)

    expect(isNextModificationBlocked(sessionId)).toBe(false)
    expect(getLastTestStatus(sessionId)).toBeNull()
  })

  it("should handle multiple sessions independently", () => {
    const session1 = "session-1"
    const session2 = "session-2"

    declareTestResult(session1, "task-1", false, "Session 1 test failed")
    declareTestResult(session2, "task-1", true, "Session 2 test passed")

    expect(isNextModificationBlocked(session1)).toBe(true)
    expect(isNextModificationBlocked(session2)).toBe(false)

    clearTestStatus(session1)
    expect(isNextModificationBlocked(session1)).toBe(false)
    expect(isNextModificationBlocked(session2)).toBe(false)
  })

  it("should overwrite previous test status", () => {
    declareTestResult(sessionId, "task-1", false, "First test failed")
    expect(isNextModificationBlocked(sessionId)).toBe(true)

    declareTestResult(sessionId, "task-2", true, "Second test passed")
    expect(isNextModificationBlocked(sessionId)).toBe(false)

    const lastStatus = getLastTestStatus(sessionId)
    expect(lastStatus?.taskId).toBe("task-2")
    expect(lastStatus?.testStatus).toBe("passed")
  })

  it("should include task info in blocking reason", () => {
    declareTestResult(
      sessionId,
      "verify-task-123",
      false,
      "Custom test failure message"
    )

    const reason = getTestBlockingReason(sessionId)
    expect(reason).toContain("verify-task-123")
    expect(reason).toContain("Custom test failure message")
  })
})
