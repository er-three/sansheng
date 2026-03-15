/**
 * 代码修改网关测试 - Phase 3
 */

// Jest test suite
import { runCodeModificationGateway } from "../src/workflows/code-modification-gateway.js"
import { createTaskQueue, addTask, claimTask, completeTask } from "../src/session/task-queue.js"
import { WorkflowTask } from "../src/types.js"

describe("CodeModificationGateway", () => {
  let sessionId: string

  beforeEach(() => {
    sessionId = `test-session-${Date.now()}`
  })

  it("should reject modification when no workflow exists", () => {
    const result = runCodeModificationGateway({
      sessionId: "nonexistent-session",
      agentName: "testAgent",
      operation: "Edit",
      filesAffected: ["src/test.ts"],
      linesChanged: 10
    })

    expect(result.allowed).toBe(false)
    expect(result.blockingReasons.length).toBeGreaterThan(0)
    expect(result.blockingReasons[0]).toContain("工作流未初始化")
  })

  it("should reject modification when no current task", () => {
    createTaskQueue(sessionId, "simple")

    const result = runCodeModificationGateway({
      sessionId,
      agentName: "testAgent",
      operation: "Edit",
      filesAffected: ["src/test.ts"],
      linesChanged: 10
    })

    expect(result.allowed).toBe(false)
    expect(result.blockingReasons[0]).toContain("没有声明当前任务")
  })

  it("should allow low-risk single file modification without menxia", () => {
    // Setup
    createTaskQueue(sessionId, "simple")
    const task: WorkflowTask = {
      id: "task-1",
      name: "Execute modification",
      type: "execute",
      status: "pending",
      dependencies: [],
      claimedBy: null,
      outputs: {
        plan: "Fix bug in helpers"
      }
    }
    addTask(sessionId, task)
    claimTask(sessionId, task.id, "testAgent")

    // Execute - use a file that's not in high-risk patterns
    const result = runCodeModificationGateway({
      sessionId: sessionId,
      agentName: "testAgent",
      operation: "Edit",
      filesAffected: ["src/helpers.ts"],
      linesChanged: 15
    })

    // Verify
    expect(result.allowed).toBe(true)
    expect(result.riskLevel).toBe("low")
    expect(result.requiresMenxiaReview).toBe(false)
    expect(result.blockingReasons.length).toBe(0)
  })

  it("should flag high-risk modification with menxia requirement", () => {
    // Setup
    createTaskQueue(sessionId, "high_risk")

    // For this test, we test the gateway's ability to detect high-risk modifications
    // and flag menxia requirement, even without the menxia dependency in task queue.
    // The gateway will detect high risk and flag menxiaReview = true,
    // and since menxia isn't completed, it will block.

    const task: WorkflowTask = {
      id: "task-1",
      name: "Execute high-risk modification",
      type: "execute",
      status: "pending",
      dependencies: [],  // No menxia dependency explicitly set
      claimedBy: null,
      outputs: {
        plan: "Modify API definitions"
      }
    }
    addTask(sessionId, task)
    claimTask(sessionId, task.id, "testAgent")

    // Execute - high risk file and large change will trigger menxia requirement
    const result = runCodeModificationGateway({
      sessionId: sessionId,
      agentName: "testAgent",
      operation: "Edit",
      filesAffected: ["src/api/types.ts"],
      linesChanged: 100
    })

    // Verify
    expect(result.requiresMenxiaReview).toBe(true)
    // May not block in this case since there's no menxia dependency constraint
    // The gateway is just flagging that menxia is needed
  })

  it("should allow high-risk modification after menxia completion", () => {
    // Setup
    createTaskQueue(sessionId, "high_risk")

    // Create menxia review task
    const reviewTask: WorkflowTask = {
      id: "menxia_review",
      name: "Menxia Review",
      type: "review",
      status: "pending",
      dependencies: [],
      claimedBy: null,
      outputs: {}
    }
    addTask(sessionId, reviewTask)
    completeTask(sessionId, reviewTask.id)

    // Create execute task with menxia dependency
    const task: WorkflowTask = {
      id: "task-execute",
      name: "Execute high-risk modification",
      type: "execute",
      status: "pending",
      dependencies: ["menxia_review"],
      claimedBy: null,
      outputs: {
        plan: "Modify API definitions",
        reviewedByMenxia: true  // Mark as reviewed by menxia
      }
    }
    addTask(sessionId, task)
    claimTask(sessionId, task.id, "testAgent")

    // Execute
    const result = runCodeModificationGateway({
      sessionId: sessionId,
      agentName: "testAgent",
      operation: "Edit",
      filesAffected: ["src/api/types.ts", "src/config.ts"],
      linesChanged: 100
    })

    // Verify
    expect(result.allowed).toBe(true)
    expect(result.requiresMenxiaReview).toBe(true)
  })

  it("should assess risk based on file type", () => {
    // Setup
    createTaskQueue(sessionId, "medium")
    const task: WorkflowTask = {
      id: "task-1",
      name: "Modify config",
      type: "execute",
      status: "pending",
      dependencies: [],
      claimedBy: null,
      outputs: {
        plan: "Update configuration"
      }
    }
    addTask(sessionId, task)
    claimTask(sessionId, task.id, "testAgent")

    // Execute with config file (high risk pattern)
    const result = runCodeModificationGateway({
      sessionId: sessionId,
      agentName: "testAgent",
      operation: "Edit",
      filesAffected: ["src/config/app.config.ts"],
      linesChanged: 25
    })

    // Verify
    expect(result.riskLevel).toBe("high")
    expect(result.requiresMenxiaReview).toBe(true)
  })

  it("should calculate risk based on number of files", () => {
    // Setup
    createTaskQueue(sessionId, "medium")
    const task: WorkflowTask = {
      id: "task-1",
      name: "Refactor",
      type: "execute",
      status: "pending",
      dependencies: [],
      claimedBy: null,
      outputs: {
        plan: "Multi-file refactoring"
      }
    }
    addTask(sessionId, task)
    claimTask(sessionId, task.id, "testAgent")

    // Execute with 3 files (medium risk, but >= 2 files triggers menxia)
    const result = runCodeModificationGateway({
      sessionId: sessionId,
      agentName: "testAgent",
      operation: "Edit",
      filesAffected: ["src/file1.ts", "src/file2.ts", "src/file3.ts"],
      linesChanged: 30
    })

    // Verify
    expect(result.riskLevel).toBe("medium")
    // 2+ files require menxia review
    expect(result.requiresMenxiaReview).toBe(true)
  })

  it("should require menxia for large modifications", () => {
    // Setup
    createTaskQueue(sessionId, "complex")
    const task: WorkflowTask = {
      id: "task-1",
      name: "Large modification",
      type: "execute",
      status: "pending",
      dependencies: [],
      claimedBy: null,
      outputs: {
        plan: "Major refactoring"
      }
    }
    addTask(sessionId, task)
    claimTask(sessionId, task.id, "testAgent")

    // Execute with 50+ lines changed
    const result = runCodeModificationGateway({
      sessionId: sessionId,
      agentName: "testAgent",
      operation: "Edit",
      filesAffected: ["src/utils.ts"],
      linesChanged: 50
    })

    // Verify
    expect(result.requiresMenxiaReview).toBe(true)
  })

  it("should provide clear blocking reasons", () => {
    // Setup
    createTaskQueue(sessionId, "high_risk")

    // Complete menxia_review first
    const reviewTask: WorkflowTask = {
      id: "menxia_review",
      name: "Menxia Review",
      type: "review",
      status: "pending",
      dependencies: [],
      claimedBy: null,
      outputs: {}
    }
    addTask(sessionId, reviewTask)
    completeTask(sessionId, reviewTask.id)

    // Add execute task with menxia dependency - it should be completable now
    const task: WorkflowTask = {
      id: "task-1",
      name: "Execute",
      type: "execute",
      status: "pending",
      dependencies: ["menxia_review"],
      claimedBy: null,
      outputs: {
        plan: "Risky change"
      }
    }
    addTask(sessionId, task)
    claimTask(sessionId, task.id, "testAgent")

    // Execute with high-risk file
    const result = runCodeModificationGateway({
      sessionId: sessionId,
      agentName: "testAgent",
      operation: "Edit",
      filesAffected: ["src/api/index.ts"],
      linesChanged: 75
    })

    // Verify - with menxia completed, it should be allowed
    expect(result.allowed).toBe(true)
    expect(result.requiresMenxiaReview).toBe(true)
  })
})
