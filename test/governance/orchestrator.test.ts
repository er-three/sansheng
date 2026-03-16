/**
 * 协调器和整体工作流的集成测试
 */

import {
  GovernanceOrchestrator,
  MinistryDispatcher,
  WorkflowStateManager,
} from "../../src/governance/orchestrator.js"
import { Plan, AgentRole, GovernanceConfig, Decision } from "../../src/governance/types.js"

describe("Orchestrator - Integration Tests", () => {
  let config: GovernanceConfig
  let orchestrator: GovernanceOrchestrator

  beforeEach(() => {
    config = {
      maxRetries: 2,
      stepTimeoutSeconds: 300,
      globalTimeoutSeconds: 3600,
      parallelStepLimit: 5,
      enableLogging: false,
      logLevel: "info",
    }
    orchestrator = new GovernanceOrchestrator(config)
  })

  describe("GovernanceOrchestrator", () => {
    it("should validate plan completeness", () => {
      const incompletePlan: Plan = {
        id: "plan-1",
        domain: "general",
        createdBy: AgentRole.ZHONGSHU,
        steps: [
          {
            id: "step-1",
            name: "Test Step",
            uses: [], // Missing uses field
            dependencies: [],
            input: {},
            acceptanceCriteria: {}, // Missing criteria
          },
        ],
        dependencyGraph: { "step-1": [] },
        criticalPath: [],
        estimatedDurationMinutes: 10,
      }

      const result = (orchestrator as any).validatePlan(incompletePlan)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it("should validate plan with valid structure", () => {
      const validPlan: Plan = {
        id: "plan-1",
        domain: "general",
        createdBy: AgentRole.ZHONGSHU,
        steps: [
          {
            id: "step-1",
            name: "Code Scan",
            uses: [AgentRole.YIBU],
            dependencies: [],
            input: { targetFile: "src/index.ts" },
            acceptanceCriteria: { "issues-found": "at least one" },
          },
        ],
        dependencyGraph: { "step-1": [] },
        criticalPath: ["step-1"],
        estimatedDurationMinutes: 10,
      }

      const result = (orchestrator as any).validatePlan(validPlan)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("should detect cyclic dependencies in review phase", async () => {
      const cyclicPlan: Plan = {
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

      const approval = await orchestrator.phase2Review(cyclicPlan)
      expect(approval.decision).toBe(Decision.ESCALATE)
      expect(approval.reason).toContain("circular")
    })

    it("should approve valid plans in review phase", async () => {
      const validPlan: Plan = {
        id: "plan-1",
        domain: "general",
        createdBy: AgentRole.ZHONGSHU,
        steps: [
          {
            id: "step-1",
            name: "Code Scan",
            uses: [AgentRole.YIBU],
            dependencies: [],
            input: {},
            acceptanceCriteria: { "issues-found": "ok" },
          },
        ],
        dependencyGraph: { "step-1": [] },
        criticalPath: ["step-1"],
        estimatedDurationMinutes: 10,
      }

      const approval = await orchestrator.phase2Review(validPlan)
      expect(approval.decision).toBe(Decision.PASS)
      expect(approval.reason).toContain("approved")
    })

    it("should get critical path", () => {
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
        estimatedDurationMinutes: 20,
      }

      const criticalPath = orchestrator.getCriticalPath(plan)
      expect(criticalPath).toEqual(["step-1", "step-2"])
    })

    it("should detect cyclic dependencies", () => {
      const cyclicPlan: Plan = {
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

      const hasCycle = orchestrator.hasCyclicDependency(cyclicPlan)
      expect(hasCycle).toBe(true)
    })

    it("should get all dependencies of a step", () => {
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

      const deps = orchestrator.getAllDependencies("step-3", plan)
      expect(deps).toEqual(new Set(["step-2", "step-1"]))
    })
  })

  describe("MinistryDispatcher", () => {
    it("should map uses field to ministry names", () => {
      const uses = ["yibu", "gongbu"]
      const ministries = MinistryDispatcher.getMinistryForStep(uses)
      expect(ministries).toEqual(["yibu", "gongbu"])
    })

    it("should get ministry descriptions", () => {
      const desc = MinistryDispatcher.getMinistryDescription("yibu")
      expect(desc).toContain("吏部")
      expect(desc).toContain("代码扫描")
    })

    it("should generate task prompt", () => {
      const step = {
        name: "Code Scan",
        uses: ["yibu"],
        input: { targetFile: "src/index.ts" },
        acceptanceCriteria: { "issues-found": "at least one issue" },
        constraints: { maxScanTime: "5 minutes" },
      }

      const prompt = MinistryDispatcher.generateTaskPrompt(step, ["yibu"])
      expect(prompt).toContain("Code Scan")
      expect(prompt).toContain("src/index.ts")
      expect(prompt).toContain("issues-found")
    })
  })

  describe("WorkflowStateManager", () => {
    it("should save and retrieve phase state", () => {
      const manager = new WorkflowStateManager()
      const state = { phase: "planning", timestamp: new Date() }

      manager.savePhaseState("phase-1", state)
      const retrieved = manager.getPhaseState("phase-1")

      expect(retrieved).toEqual(state)
    })

    it("should clear all states", () => {
      const manager = new WorkflowStateManager()

      manager.savePhaseState("phase-1", { data: "test" })
      manager.savePhaseState("phase-2", { data: "test2" })

      manager.clearAll()

      expect(manager.getPhaseState("phase-1")).toBeUndefined()
      expect(manager.getPhaseState("phase-2")).toBeUndefined()
    })

    it("should get all states", () => {
      const manager = new WorkflowStateManager()

      manager.savePhaseState("phase-1", { data: "test1" })
      manager.savePhaseState("phase-2", { data: "test2" })

      const allStates = manager.getAllStates()
      expect(allStates).toHaveProperty("phase-1")
      expect(allStates).toHaveProperty("phase-2")
    })
  })
})
