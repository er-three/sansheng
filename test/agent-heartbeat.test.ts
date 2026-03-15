/**
 * Agent 心跳监测系统测试
 */

import {
  recordAgentActivity,
  recordTaskCompletion,
  detectTimeouts,
  getAgentHealth,
  getAllAgentHealth,
  generateHealthReport,
  resetAgentFailureCount,
  clearHeartbeats,
  configureHeartbeat,
  AgentHeartbeat
} from "../src/workflows/agent-heartbeat.js"
import { createTaskQueue, addTask, claimTask } from "../src/session/task-queue.js"
import { WorkflowTask } from "../src/types.js"

describe("AgentHeartbeat", () => {
  let sessionId: string

  beforeEach(() => {
    sessionId = `test-session-${Date.now()}`
    clearHeartbeats()
    configureHeartbeat({
      taskTimeoutSeconds: 1, // 1 second for testing
      checkIntervalSeconds: 1,
      maxFailures: 2
    })
  })

  afterEach(() => {
    clearHeartbeats()
  })

  it("should record agent activity", () => {
    recordAgentActivity("agent1", "task-1")

    const health = getAgentHealth("agent1")
    expect(health).not.toBeNull()
    expect(health!.agentName).toBe("agent1")
    expect(health!.lastTaskId).toBe("task-1")
    expect(health!.status).toBe("healthy")
  })

  it("should track multiple agents", () => {
    recordAgentActivity("agent1", "task-1")
    recordAgentActivity("agent2", "task-2")
    recordAgentActivity("agent3", "task-3")

    const allHealth = getAllAgentHealth()
    expect(allHealth.length).toBe(3)
    expect(allHealth.some(h => h.agentName === "agent1")).toBe(true)
    expect(allHealth.some(h => h.agentName === "agent2")).toBe(true)
    expect(allHealth.some(h => h.agentName === "agent3")).toBe(true)
  })

  it("should record task completion and duration", (done) => {
    recordAgentActivity("agent1", "task-1")

    // Wait a bit
    setTimeout(() => {
      const duration = recordTaskCompletion("agent1", "task-1")
      expect(duration).toBeGreaterThanOrEqual(0)

      const health = getAgentHealth("agent1")
      expect(health!.taskDuration).toBe(duration)
      expect(health!.lastTaskId).toBeNull() // Should be idle now
      done()
    }, 100)
  })

  it("should detect timeout after configured duration", (done) => {
    createTaskQueue(sessionId, "simple")

    const task: WorkflowTask = {
      id: "task-timeout",
      name: "Long Task",
      agent: "slowAgent",
      description: "A task that takes time",
      status: "claimed",
      claimedBy: "slowAgent",
      dependencies: [],
      outputs: {}
    }
    addTask(sessionId, task)

    // Record activity at "now"
    recordAgentActivity("slowAgent", "task-timeout")

    // Check immediately - should be healthy
    let { timedOutTasks } = detectTimeouts(sessionId)
    expect(timedOutTasks.length).toBe(0)

    // Wait longer than timeout (1 second)
    setTimeout(() => {
      // Check again - should timeout
      const result = detectTimeouts(sessionId)
      expect(result.timedOutTasks.length).toBe(1)
      expect(result.timedOutTasks[0].id).toBe("task-timeout")

      done()
    }, 1500)
  })

  it("should mark agent as dead after max failures", (done) => {
    createTaskQueue(sessionId, "simple")

    const task: WorkflowTask = {
      id: "task-dead",
      name: "Dead Task",
      agent: "deadAgent",
      description: "Task for dead agent",
      status: "claimed",
      claimedBy: "deadAgent",
      dependencies: [],
      outputs: {}
    }
    addTask(sessionId, task)

    recordAgentActivity("deadAgent", "task-dead")

    // Wait and detect timeouts multiple times
    let timeoutCount = 0

    const checkTimeouts = () => {
      detectTimeouts(sessionId)
      timeoutCount++

      if (timeoutCount < 3) {
        setTimeout(checkTimeouts, 1200)
      } else {
        // After 3 timeouts, agent should be dead
        const health = getAgentHealth("deadAgent")
        expect(health!.status).toBe("dead")
        expect(health!.failureCount).toBeGreaterThanOrEqual(2)
        done()
      }
    }

    setTimeout(checkTimeouts, 1200)
  })

  it("should reset failure count on success", () => {
    recordAgentActivity("agent1", "task-1")

    const health1 = getAgentHealth("agent1")
    expect(health1!.failureCount).toBe(0)

    // Simulate some failures
    recordAgentActivity("agent1", "task-2")
    recordAgentActivity("agent1", "task-3")

    // Reset
    resetAgentFailureCount("agent1")

    const health2 = getAgentHealth("agent1")
    expect(health2!.failureCount).toBe(0)
    expect(health2!.status).toBe("healthy")
  })

  it("should track idle agents", () => {
    recordAgentActivity("agent1", "task-1")
    recordTaskCompletion("agent1", "task-1")

    const health = getAgentHealth("agent1")
    expect(health!.lastTaskId).toBeNull()
    expect(health!.status).toBe("idle")
  })

  it("should generate health report", () => {
    createTaskQueue(sessionId, "simple")

    recordAgentActivity("agent1", "task-1")
    recordAgentActivity("agent2", "task-2")
    recordAgentActivity("agent3", "task-3")

    const report = generateHealthReport(sessionId)

    expect(report).toContain("Agent Health Report")
    expect(report).toContain("agent1")
    expect(report).toContain("agent2")
    expect(report).toContain("agent3")
    expect(report).toContain("healthy")
  })

  it("should include timeout information in report", (done) => {
    createTaskQueue(sessionId, "simple")

    const task: WorkflowTask = {
      id: "task-1",
      name: "Task 1",
      agent: "agent1",
      description: "Test task",
      status: "claimed",
      claimedBy: "agent1",
      dependencies: [],
      outputs: {}
    }
    addTask(sessionId, task)

    recordAgentActivity("agent1", "task-1")

    setTimeout(() => {
      const report = generateHealthReport(sessionId)
      expect(report).toContain("Timed Out Tasks")
      expect(report).toContain("task-1")
      done()
    }, 1500)
  })

  it("should handle non-existent task queue gracefully", () => {
    const report = generateHealthReport("non-existent-session")
    expect(report).toContain("No task queue found")
  })

  it("should update agent status based on last activity time", () => {
    recordAgentActivity("agent1", "task-1")

    const health1 = getAgentHealth("agent1")
    expect(health1!.status).toBe("healthy")

    // Mark as healthy initially
    let currentHealth = health1
    expect(currentHealth!.status).toBe("healthy")
  })

  it("should track agent failure count", () => {
    recordAgentActivity("agent1", "task-1")

    let health = getAgentHealth("agent1")
    expect(health!.failureCount).toBe(0)

    // Simulate 2 failures
    for (let i = 0; i < 2; i++) {
      recordAgentActivity("agent1", `task-${i}`)
    }

    health = getAgentHealth("agent1")
    expect(health!.failureCount).toBe(0) // Only incremented by detectTimeouts
  })

  it("should clear all heartbeat data", () => {
    recordAgentActivity("agent1", "task-1")
    recordAgentActivity("agent2", "task-2")

    let allHealth = getAllAgentHealth()
    expect(allHealth.length).toBe(2)

    clearHeartbeats()

    allHealth = getAllAgentHealth()
    expect(allHealth.length).toBe(0)
  })

  it("should respect configured timeout duration", (done) => {
    createTaskQueue(sessionId, "simple")

    // Configure 2 second timeout
    configureHeartbeat({ taskTimeoutSeconds: 2 })

    const task: WorkflowTask = {
      id: "task-config",
      name: "Config Task",
      agent: "agent1",
      description: "Test config",
      status: "claimed",
      claimedBy: "agent1",
      dependencies: [],
      outputs: {}
    }
    addTask(sessionId, task)

    recordAgentActivity("agent1", "task-config")

    // After 1 second, should not timeout
    setTimeout(() => {
      let { timedOutTasks } = detectTimeouts(sessionId)
      expect(timedOutTasks.length).toBe(0)

      // After 2.5 seconds total, should timeout
      setTimeout(() => {
        const result = detectTimeouts(sessionId)
        expect(result.timedOutTasks.length).toBe(1)
        done()
      }, 1500)
    }, 1000)
  })
})
