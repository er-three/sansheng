import {
  createCheckpoint,
  listCheckpoints,
  getCheckpoint,
  rollbackToCheckpoint,
  deleteCheckpoint,
  clearCheckpoints
} from "../src/workflows/workflow-rollback.js"
import { createTaskQueue, addTask } from "../src/session/task-queue.js"
import { WorkflowTask } from "../src/types.js"

describe("WorkflowRollback", () => {
  let sessionId: string

  beforeEach(() => {
    sessionId = `test-${Date.now()}`
    createTaskQueue(sessionId, "simple")
  })

  afterEach(() => {
    clearCheckpoints(sessionId)
  })

  it("should create checkpoint", () => {
    const cp = createCheckpoint(sessionId, "Initial state")

    expect(cp).not.toBeNull()
    expect(cp!.description).toBe("Initial state")
    expect(cp!.completedTaskIds.length).toBe(0)
  })

  it("should list checkpoints", () => {
    createCheckpoint(sessionId, "CP1")
    createCheckpoint(sessionId, "CP2")

    const list = listCheckpoints(sessionId)
    expect(list.length).toBe(2)
  })

  it("should get checkpoint by id", () => {
    const cp = createCheckpoint(sessionId, "Test CP")
    const retrieved = getCheckpoint(sessionId, cp!.id)

    expect(retrieved).not.toBeNull()
    expect(retrieved!.description).toBe("Test CP")
  })

  it("should delete checkpoint", () => {
    const cp = createCheckpoint(sessionId, "Test CP")
    const result = deleteCheckpoint(sessionId, cp!.id)

    expect(result).toBe(true)
    expect(getCheckpoint(sessionId, cp!.id)).toBeNull()
  })

  it("should clear all checkpoints", () => {
    createCheckpoint(sessionId, "CP1")
    createCheckpoint(sessionId, "CP2")

    clearCheckpoints(sessionId)
    expect(listCheckpoints(sessionId).length).toBe(0)
  })
})
