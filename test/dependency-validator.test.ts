import {
  validateDependencies,
  validateRecipeDependencies,
  getTopologicalOrder,
  generateValidationReport
} from "../src/workflows/dependency-validator.js"
import { createTaskQueue, addTask } from "../src/session/task-queue.js"
import { WorkflowTask } from "../src/types.js"
import { WorkflowRecipe } from "../src/types.js"

describe("DependencyValidator", () => {
  let sessionId: string

  beforeEach(() => {
    sessionId = `test-${Date.now()}`
    createTaskQueue(sessionId, "simple")
  })

  it("should validate dependencies", () => {
    const task: WorkflowTask = {
      id: "task-1",
      name: "Task",
      agent: "agent1",
      description: "Test",
      status: "pending",
      dependencies: [],
      outputs: {}
    }
    addTask(sessionId, task)

    const result = validateDependencies(sessionId)
    expect(result.valid).toBe(true)
    expect(result.errors.length).toBe(0)
  })

  it("should validate recipe dependencies", () => {
    const recipe: WorkflowRecipe = {
      name: "Test",
      description: "Test recipe",
      type: "simple",
      steps: ["step1", "step2"]
    }

    const result = validateRecipeDependencies(recipe)
    expect(result.valid).toBe(true)
  })

  it("should detect empty recipe", () => {
    const recipe: WorkflowRecipe = {
      name: "Empty",
      description: "Empty recipe",
      type: "simple",
      steps: []
    }

    const result = validateRecipeDependencies(recipe)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it("should get topological order", () => {
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

    const order = getTopologicalOrder(sessionId)
    expect(order.length).toBe(2)
    expect(order.indexOf("task-1")).toBeLessThan(order.indexOf("task-2"))
  })

  it("should generate validation report", () => {
    const report = generateValidationReport(sessionId)
    expect(report).toContain("Dependency Validation Report")
  })
})
