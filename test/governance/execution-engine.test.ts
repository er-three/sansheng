/**
 * 执行引擎的单元测试
 */

import { WorkflowEngine, DependencyResolver } from "../../src/governance/execution-engine.js"
import { Plan, AgentRole, GovernanceConfig } from "../../src/governance/types.js"

describe("ExecutionEngine", () => {
  let config: GovernanceConfig
  let engine: WorkflowEngine

  beforeEach(() => {
    config = {
      maxRetries: 2,
      stepTimeoutSeconds: 300,
      globalTimeoutSeconds: 3600,
      parallelStepLimit: 5,
      enableLogging: true,
      logLevel: "info",
    }
    engine = new WorkflowEngine(config)
  })

  describe("WorkflowEngine", () => {
    it("should initialize with correct config", () => {
      const state = engine.getExecutionState()
      expect(state.status).toBe("running")
      expect(state.completedSteps.size).toBe(0)
      expect(state.failedSteps.size).toBe(0)
    })

    it("should find ready steps with no dependencies", () => {
      const plan: Plan = {
        id: "plan-1",
        domain: "general",
        createdBy: AgentRole.ZHONGSHU,
        steps: [
          {
            id: "step-1",
            name: "Step 1",
            uses: [AgentRole.YIBU],
            dependencies: [],
            input: {},
            acceptanceCriteria: { test: "ok" },
          },
          {
            id: "step-2",
            name: "Step 2",
            uses: [AgentRole.GONGBU],
            dependencies: ["step-1"],
            input: {},
            acceptanceCriteria: { test: "ok" },
          },
        ],
        dependencyGraph: {
          "step-1": [],
          "step-2": ["step-1"],
        },
        criticalPath: ["step-1", "step-2"],
        estimatedDurationMinutes: 10,
      }

      const readySteps = (engine as any).findReadySteps(plan)
      expect(readySteps).toHaveLength(1)
      expect(readySteps[0].id).toBe("step-1")
    })

    it("should create tasks for steps", () => {
      const step = {
        id: "step-1",
        name: "Test Step",
        uses: [AgentRole.YIBU],
        dependencies: [],
        input: { test: "data" },
        acceptanceCriteria: { criterion1: "value1" },
      }

      const task = (engine as any).createTask(step, AgentRole.YIBU)
      expect(task.stepId).toBe("step-1")
      expect(task.ministry).toBe(AgentRole.YIBU)
      expect(task.prompt).toContain("Test Step")
    })
  })

  describe("DependencyResolver", () => {
    it("should detect cyclic dependencies", () => {
      const plan: Plan = {
        id: "plan-1",
        domain: "general",
        createdBy: AgentRole.ZHONGSHU,
        steps: [
          {
            id: "step-1",
            name: "Step 1",
            uses: [AgentRole.YIBU],
            dependencies: ["step-2"],
            input: {},
            acceptanceCriteria: { test: "ok" },
          },
          {
            id: "step-2",
            name: "Step 2",
            uses: [AgentRole.GONGBU],
            dependencies: ["step-1"],
            input: {},
            acceptanceCriteria: { test: "ok" },
          },
        ],
        dependencyGraph: {
          "step-1": ["step-2"],
          "step-2": ["step-1"],
        },
        criticalPath: [],
        estimatedDurationMinutes: 10,
      }

      const hasCycle = DependencyResolver.hasCyclicDependency(plan)
      expect(hasCycle).toBe(true)
    })

    it("should not detect cycles in valid plans", () => {
      const plan: Plan = {
        id: "plan-1",
        domain: "general",
        createdBy: AgentRole.ZHONGSHU,
        steps: [
          {
            id: "step-1",
            name: "Step 1",
            uses: [AgentRole.YIBU],
            dependencies: [],
            input: {},
            acceptanceCriteria: { test: "ok" },
          },
          {
            id: "step-2",
            name: "Step 2",
            uses: [AgentRole.GONGBU],
            dependencies: ["step-1"],
            input: {},
            acceptanceCriteria: { test: "ok" },
          },
        ],
        dependencyGraph: {
          "step-1": [],
          "step-2": ["step-1"],
        },
        criticalPath: ["step-1", "step-2"],
        estimatedDurationMinutes: 10,
      }

      const hasCycle = DependencyResolver.hasCyclicDependency(plan)
      expect(hasCycle).toBe(false)
    })

    it("should calculate critical path correctly", () => {
      const plan: Plan = {
        id: "plan-1",
        domain: "general",
        createdBy: AgentRole.ZHONGSHU,
        steps: [
          {
            id: "step-1",
            name: "Step 1",
            uses: [AgentRole.YIBU],
            dependencies: [],
            input: {},
            acceptanceCriteria: { test: "ok" },
          },
          {
            id: "step-2",
            name: "Step 2",
            uses: [AgentRole.GONGBU],
            dependencies: ["step-1"],
            input: {},
            acceptanceCriteria: { test: "ok" },
          },
          {
            id: "step-3",
            name: "Step 3",
            uses: [AgentRole.BINGBU],
            dependencies: ["step-2"],
            input: {},
            acceptanceCriteria: { test: "ok" },
          },
        ],
        dependencyGraph: {
          "step-1": [],
          "step-2": ["step-1"],
          "step-3": ["step-2"],
        },
        criticalPath: ["step-1", "step-2", "step-3"],
        estimatedDurationMinutes: 30,
      }

      const criticalPath = DependencyResolver.getCriticalPath(plan)
      expect(criticalPath).toEqual(["step-1", "step-2", "step-3"])
    })

    it("should get all dependencies including transitive", () => {
      const plan: Plan = {
        id: "plan-1",
        domain: "general",
        createdBy: AgentRole.ZHONGSHU,
        steps: [
          {
            id: "step-1",
            name: "Step 1",
            uses: [AgentRole.YIBU],
            dependencies: [],
            input: {},
            acceptanceCriteria: { test: "ok" },
          },
          {
            id: "step-2",
            name: "Step 2",
            uses: [AgentRole.GONGBU],
            dependencies: ["step-1"],
            input: {},
            acceptanceCriteria: { test: "ok" },
          },
          {
            id: "step-3",
            name: "Step 3",
            uses: [AgentRole.BINGBU],
            dependencies: ["step-2"],
            input: {},
            acceptanceCriteria: { test: "ok" },
          },
        ],
        dependencyGraph: {
          "step-1": [],
          "step-2": ["step-1"],
          "step-3": ["step-2"],
        },
        criticalPath: ["step-1", "step-2", "step-3"],
        estimatedDurationMinutes: 30,
      }

      const deps = DependencyResolver.getAllDependencies("step-3", plan)
      expect(deps).toEqual(new Set(["step-2", "step-1"]))
    })
  })
})
