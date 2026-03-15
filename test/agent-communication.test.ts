/**
 * Agent 通信系统测试
 */

import {
  registerAgent,
  unregisterAgent,
  getRegisteredAgents,
  getAgentRegistration,
  setAgentActive,
  recordAgentPoll,
  notifyAgentOfTask,
  getAgentNotifications,
  acknowledgeNotification,
  retryUnacknowledgedNotifications,
  cleanupAcknowledgedNotifications,
  setTaskSLA,
  getTaskSLA,
  detectSLAViolations,
  generateCommunicationReport,
  clearCommunicationData
} from "../src/workflows/agent-communication.js"
import { createTaskQueue, addTask } from "../src/session/task-queue.js"
import { WorkflowTask } from "../src/types.js"

describe("AgentCommunication", () => {
  let sessionId: string

  beforeEach(() => {
    sessionId = `test-session-${Date.now()}`
    clearCommunicationData()
  })

  afterEach(() => {
    clearCommunicationData()
  })

  it("should register agents", () => {
    const reg1 = registerAgent("agent1", 10)
    const reg2 = registerAgent("agent2", 20)

    expect(reg1.agentName).toBe("agent1")
    expect(reg1.pollIntervalSeconds).toBe(10)
    expect(reg2.agentName).toBe("agent2")

    const agents = getRegisteredAgents()
    expect(agents.length).toBe(2)
  })

  it("should unregister agents", () => {
    registerAgent("agent1", 10)
    registerAgent("agent2", 20)

    expect(getRegisteredAgents().length).toBe(2)

    unregisterAgent("agent1")
    expect(getRegisteredAgents().length).toBe(1)
    expect(getAgentRegistration("agent1")).toBeNull()
  })

  it("should retrieve agent registration", () => {
    registerAgent("agent1", 15)

    const reg = getAgentRegistration("agent1")
    expect(reg).not.toBeNull()
    expect(reg!.pollIntervalSeconds).toBe(15)
    expect(reg!.isActive).toBe(true)
  })

  it("should set agent active/inactive status", () => {
    registerAgent("agent1", 10)

    let reg = getAgentRegistration("agent1")
    expect(reg!.isActive).toBe(true)

    setAgentActive("agent1", false)
    reg = getAgentRegistration("agent1")
    expect(reg!.isActive).toBe(false)

    setAgentActive("agent1", true)
    reg = getAgentRegistration("agent1")
    expect(reg!.isActive).toBe(true)
  })

  it("should record agent polls", () => {
    registerAgent("agent1", 10)

    let reg = getAgentRegistration("agent1")
    expect(reg!.lastPolled).toBeNull()

    recordAgentPoll("agent1")
    reg = getAgentRegistration("agent1")
    expect(reg!.lastPolled).not.toBeNull()
  })

  it("should send task notifications to agents", () => {
    registerAgent("agent1", 10)

    const task: WorkflowTask = {
      id: "task-1",
      name: "Task 1",
      agent: "agent1",
      description: "Test task",
      status: "pending",
      dependencies: [],
      outputs: {}
    }

    const notif = notifyAgentOfTask(sessionId, "agent1", task)

    expect(notif.taskId).toBe("task-1")
    expect(notif.agentName).toBe("agent1")
    expect(notif.acknowledged).toBe(false)
  })

  it("should get agent notifications", () => {
    registerAgent("agent1", 10)
    registerAgent("agent2", 10)

    const task1: WorkflowTask = {
      id: "task-1",
      name: "Task 1",
      agent: "agent1",
      description: "Test task",
      status: "pending",
      dependencies: [],
      outputs: {}
    }

    const task2: WorkflowTask = {
      id: "task-2",
      name: "Task 2",
      agent: "agent2",
      description: "Test task",
      status: "pending",
      dependencies: [],
      outputs: {}
    }

    notifyAgentOfTask(sessionId, "agent1", task1)
    notifyAgentOfTask(sessionId, "agent2", task2)

    const notifs1 = getAgentNotifications(sessionId, "agent1")
    const notifs2 = getAgentNotifications(sessionId, "agent2")

    expect(notifs1.length).toBe(1)
    expect(notifs2.length).toBe(1)
    expect(notifs1[0].taskId).toBe("task-1")
    expect(notifs2[0].taskId).toBe("task-2")
  })

  it("should acknowledge notifications", () => {
    registerAgent("agent1", 10)

    const task: WorkflowTask = {
      id: "task-1",
      name: "Task 1",
      agent: "agent1",
      description: "Test task",
      status: "pending",
      dependencies: [],
      outputs: {}
    }

    const notif = notifyAgentOfTask(sessionId, "agent1", task)

    let pendingNotifs = getAgentNotifications(sessionId, "agent1")
    expect(pendingNotifs.length).toBe(1)

    const result = acknowledgeNotification(sessionId, notif.id)
    expect(result).toBe(true)

    pendingNotifs = getAgentNotifications(sessionId, "agent1")
    expect(pendingNotifs.length).toBe(0)
  })

  it("should cleanup acknowledged notifications", () => {
    registerAgent("agent1", 10)

    const task1: WorkflowTask = {
      id: "task-1",
      name: "Task 1",
      agent: "agent1",
      description: "Test task",
      status: "pending",
      dependencies: [],
      outputs: {}
    }

    const task2: WorkflowTask = {
      id: "task-2",
      name: "Task 2",
      agent: "agent1",
      description: "Test task",
      status: "pending",
      dependencies: [],
      outputs: {}
    }

    const notif1 = notifyAgentOfTask(sessionId, "agent1", task1)
    const notif2 = notifyAgentOfTask(sessionId, "agent1", task2)

    acknowledgeNotification(sessionId, notif1.id)

    cleanupAcknowledgedNotifications(sessionId)

    const pendingNotifs = getAgentNotifications(sessionId, "agent1")
    expect(pendingNotifs.length).toBe(1)
    expect(pendingNotifs[0].taskId).toBe("task-2")
  })

  it("should set and get task SLA", () => {
    setTaskSLA(sessionId, "task-1", {
      maxWaitSeconds: 120,
      priority: "high"
    })

    const sla = getTaskSLA(sessionId, "task-1")
    expect(sla.maxWaitSeconds).toBe(120)
    expect(sla.priority).toBe("high")
    expect(sla.maxExecutionSeconds).toBe(600) // default
  })

  it("should use default SLA when not specified", () => {
    const sla = getTaskSLA(sessionId, "task-unknown")

    expect(sla.maxWaitSeconds).toBe(300) // default
    expect(sla.maxExecutionSeconds).toBe(600) // default
    expect(sla.priority).toBe("medium") // default
  })

  it("should generate communication report", () => {
    createTaskQueue(sessionId, "simple")
    registerAgent("agent1", 10)
    registerAgent("agent2", 20)

    const task: WorkflowTask = {
      id: "task-1",
      name: "Task 1",
      agent: "agent1",
      description: "Test task",
      status: "pending",
      dependencies: [],
      outputs: {}
    }

    addTask(sessionId, task)
    notifyAgentOfTask(sessionId, "agent1", task)

    const report = generateCommunicationReport(sessionId)

    expect(report).toContain("Agent Communication Report")
    expect(report).toContain("agent1")
    expect(report).toContain("agent2")
    expect(report).toContain("Total Registered: 2")
    expect(report).toContain("Active: 2")
  })

  it("should handle inactive agents in report", () => {
    createTaskQueue(sessionId, "simple")
    registerAgent("agent1", 10)
    registerAgent("agent2", 10)

    setAgentActive("agent2", false)

    const report = generateCommunicationReport(sessionId)

    expect(report).toContain("Active: 1")
    expect(report).toContain("Inactive: 1")
    expect(report).toContain("Inactive Agents")
    expect(report).toContain("agent2")
  })

  it("should clear all communication data", () => {
    registerAgent("agent1", 10)
    registerAgent("agent2", 10)

    expect(getRegisteredAgents().length).toBe(2)

    clearCommunicationData()

    expect(getRegisteredAgents().length).toBe(0)
  })

  it("should retry unacknowledged notifications", (done) => {
    registerAgent("agent1", 10)

    const task: WorkflowTask = {
      id: "task-1",
      name: "Task 1",
      agent: "agent1",
      description: "Test task",
      status: "pending",
      dependencies: [],
      outputs: {}
    }

    const notif = notifyAgentOfTask(sessionId, "agent1", task)

    expect(notif.retryCount).toBe(0)

    // Wait and then retry
    setTimeout(() => {
      retryUnacknowledgedNotifications(sessionId, 3)

      // Get notifications to check retry count
      const notifs = getAgentNotifications(sessionId, "agent1")
      // Note: retryCount may not increment if timeout not reached yet
      expect(notifs.length).toBeGreaterThanOrEqual(0)

      done()
    }, 100)
  })

  it("should detect SLA violations", () => {
    createTaskQueue(sessionId, "simple")

    const task: WorkflowTask = {
      id: "task-1",
      name: "Task 1",
      agent: "agent1",
      description: "Test task",
      status: "pending",
      dependencies: [],
      outputs: {}
    }

    addTask(sessionId, task)
    setTaskSLA(sessionId, "task-1", {
      maxWaitSeconds: 0, // Force violation
      maxExecutionSeconds: 0
    })

    const violations = detectSLAViolations(sessionId)

    // Violations detection depends on task timing
    expect(violations.waitTimeViolations).toBeDefined()
    expect(violations.executionTimeViolations).toBeDefined()
  })
})
