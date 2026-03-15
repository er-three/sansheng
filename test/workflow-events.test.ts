import {
  on,
  off,
  emit,
  getEventHistory,
  clearEventHistory,
  clearAllListeners
} from "../src/workflows/workflow-events.js"

describe("WorkflowEvents", () => {
  let sessionId: string

  beforeEach(() => {
    sessionId = `test-${Date.now()}`
    clearAllListeners()
  })

  it("should emit events", () => {
    const event = emit(sessionId, "task-completed", { taskId: "task-1" })

    expect(event.type).toBe("task-completed")
    expect(event.sessionId).toBe(sessionId)
    expect(event.data.taskId).toBe("task-1")
  })

  it("should register and call listeners", (done) => {
    let called = false

    on("task-completed", (event) => {
      called = true
      expect(event.type).toBe("task-completed")
      done()
    })

    emit(sessionId, "task-completed", { taskId: "task-1" })
    expect(called).toBe(true)
  })

  it("should unregister listeners", () => {
    let callCount = 0

    const callback = () => {
      callCount++
    }

    on("task-started", callback)
    emit(sessionId, "task-started")
    expect(callCount).toBe(1)

    off("task-started", callback)
    emit(sessionId, "task-started")
    expect(callCount).toBe(1)
  })

  it("should maintain event history", () => {
    emit(sessionId, "workflow-started")
    emit(sessionId, "task-assigned", { taskId: "task-1" })
    emit(sessionId, "task-completed", { taskId: "task-1" })

    const history = getEventHistory(sessionId)
    expect(history.length).toBe(3)
    expect(history[0].type).toBe("workflow-started")
    expect(history[2].type).toBe("task-completed")
  })

  it("should clear event history", () => {
    emit(sessionId, "workflow-started")
    expect(getEventHistory(sessionId).length).toBe(1)

    clearEventHistory(sessionId)
    expect(getEventHistory(sessionId).length).toBe(0)
  })
})
