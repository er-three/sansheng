import {
  createParallelGroup,
  getParallelGroups,
  getReadyTasks,
  startParallelGroup,
  completeParallelGroup,
  clearParallelGroups
} from "../src/workflows/parallel-executor.js"
import { createTaskQueue, addTask } from "../src/session/task-queue.js"
import { WorkflowTask } from "../src/types.js"

describe("ParallelExecutor", () => {
  let sessionId: string

  beforeEach(() => {
    sessionId = `test-${Date.now()}`
    createTaskQueue(sessionId, "complex")
  })

  afterEach(() => {
    clearParallelGroups(sessionId)
  })

  it("should create parallel group", () => {
    const group = createParallelGroup(sessionId, ["task-1", "task-2"])

    expect(group.taskIds.length).toBe(2)
    expect(group.status).toBe("pending")
  })

  it("should get parallel groups", () => {
    createParallelGroup(sessionId, ["task-1", "task-2"])
    createParallelGroup(sessionId, ["task-3", "task-4"])

    const groups = getParallelGroups(sessionId)
    expect(groups.length).toBe(2)
  })

  it("should get ready tasks", () => {
    const task1: WorkflowTask = {
      id: "task-1",
      name: "Task 1",
      agent: "agent1",
      description: "Test",
      status: "pending",
      dependencies: [],
      outputs: {}
    }

    const task2: WorkflowTask = {
      id: "task-2",
      name: "Task 2",
      agent: "agent1",
      description: "Test",
      status: "pending",
      dependencies: ["task-1"],
      outputs: {}
    }

    addTask(sessionId, task1)
    addTask(sessionId, task2)

    const ready = getReadyTasks(sessionId)
    expect(ready.length).toBe(1)
    expect(ready[0].id).toBe("task-1")
  })

  it("should start and complete parallel group", () => {
    const group = createParallelGroup(sessionId, ["task-1", "task-2"])

    startParallelGroup(sessionId, group.groupId)
    const groups = getParallelGroups(sessionId)
    expect(groups[0].status).toBe("in_progress")

    completeParallelGroup(sessionId, group.groupId)
    expect(groups[0].status).toBe("completed")
  })
})
