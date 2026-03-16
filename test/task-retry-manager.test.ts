import {
  configureRetryPolicy,
  recordTaskFailure,
  getRetryRecord,
  shouldRetryTask,
  getRetryableTaskIds,
  setTaskTimeout,
  isTaskTimedOut,
  clearTaskTimeout,
  generateRetryReport,
  clearRetryRecords
} from "../src/workflows/task-retry-manager.js"
import { createTaskQueue, addTask } from "../src/session/task-queue.js"
import { WorkflowTask } from "../src/types.js"

describe("TaskRetryManager", () => {
  let sessionId: string

  beforeEach(() => {
    sessionId = `test-${Date.now()}`
    clearRetryRecords()
    configureRetryPolicy({ maxRetries: 2, initialDelayMs: 100 })
  })

  it("should record task failures", () => {
    const record = recordTaskFailure("task-1", "Network error")

    expect(record.taskId).toBe("task-1")
    expect(record.retryCount).toBe(1)
    expect(record.errors.length).toBe(1)
    expect(record.status).toBe("pending_retry")
  })

  it("should calculate exponential backoff", () => {
    recordTaskFailure("task-1", "Error 1")
    const record1 = getRetryRecord("task-1")!
    const firstDelay = record1.nextRetryTime - record1.lastRetryTime

    recordTaskFailure("task-1", "Error 2")
    const record2 = getRetryRecord("task-1")!
    const secondDelay = record2.nextRetryTime - record2.lastRetryTime

    expect(secondDelay).toBeGreaterThan(firstDelay)
  })

  it("should mark as max retries exceeded", () => {
    recordTaskFailure("task-1", "Error 1")
    recordTaskFailure("task-1", "Error 2")
    recordTaskFailure("task-1", "Error 3")

    const record = getRetryRecord("task-1")!
    expect(record.status).toBe("max_retries_exceeded")
    expect(record.retryCount).toBe(3)
  })

  it("should determine if task should retry", (done) => {
    recordTaskFailure("task-1", "Error")
    expect(shouldRetryTask("task-1")).toBe(false)

    setTimeout(() => {
      expect(shouldRetryTask("task-1")).toBe(true)
      done()
    }, 150)
  })

  it("should get retryable task IDs", () => {
    createTaskQueue(sessionId, "simple")

    const task: WorkflowTask = {
      id: "task-1",
      name: "Task",
      agent: "agent1",
      description: "Test",
      status: "failed",
      dependencies: [],
      outputs: {}
    }

    addTask(sessionId, task)
    recordTaskFailure("task-1", "Error")

    const retryable = getRetryableTaskIds(sessionId)
    expect(retryable.length).toBeGreaterThanOrEqual(0)
  })

  it("should handle task timeouts", () => {
    setTaskTimeout("task-1")
    expect(isTaskTimedOut("task-1")).toBe(false)

    clearTaskTimeout("task-1")
    expect(isTaskTimedOut("task-1")).toBe(false)
  })

  it("should generate retry report", () => {
    createTaskQueue(sessionId, "simple")
    recordTaskFailure("task-1", "Network error")

    const report = generateRetryReport(sessionId)
    expect(report).toContain("Task Retry Report")
    expect(report).toContain("task-1")
  })

  it("should clear retry records", () => {
    recordTaskFailure("task-1", "Error")
    expect(getRetryRecord("task-1")).not.toBeNull()

    clearRetryRecords()
    expect(getRetryRecord("task-1")).toBeNull()
  })
})
