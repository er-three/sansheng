import {
  recordTaskDuration,
  calculateMetrics,
  getMetrics,
  generateAnalyticsReport,
  clearAnalytics
} from "../src/workflows/workflow-analytics.js"
import { createTaskQueue, addTask } from "../src/session/task-queue.js"
import { WorkflowTask } from "../src/types.js"

describe("WorkflowAnalytics", () => {
  let sessionId: string

  beforeEach(() => {
    sessionId = `test-${Date.now()}`
    createTaskQueue(sessionId, "simple")
  })

  afterEach(() => {
    clearAnalytics(sessionId)
  })

  it("should calculate metrics", () => {
    const task: WorkflowTask = {
      id: "task-1",
      name: "Task 1",
      agent: "agent1",
      description: "Test",
      status: "pending",
      dependencies: [],
      outputs: {}
    }
    addTask(sessionId, task)

    const metrics = calculateMetrics(sessionId)
    expect(metrics.totalTasks).toBe(1)
    expect(metrics.completedTasks).toBe(0)
  })

  it("should calculate success rate", () => {
    const metrics = calculateMetrics(sessionId)
    expect(metrics.successRate).toBeGreaterThanOrEqual(0)
  })

  it("should get stored metrics", () => {
    calculateMetrics(sessionId)
    const metrics = getMetrics(sessionId)

    expect(metrics).not.toBeNull()
    expect(metrics!.sessionId).toBe(sessionId)
  })

  it("should generate analytics report", () => {
    const report = generateAnalyticsReport(sessionId)

    expect(report).toContain("Workflow Analytics Report")
    expect(report).toContain("Task Metrics")
  })

  it("should record task duration", () => {
    recordTaskDuration(sessionId, "task-1", 5000)
    // Just verify it doesn't error
  })

  it("should clear analytics", () => {
    calculateMetrics(sessionId)
    expect(getMetrics(sessionId)).not.toBeNull()

    clearAnalytics(sessionId)
    expect(getMetrics(sessionId)).toBeNull()
  })
})
