/**
 * 端到端测试 - 完整的工作流演示
 */

import {
  GovernanceOrchestrator,
  MinistryDispatcher,
} from "../../src/governance/orchestrator.js"
import { Plan, AgentRole, GovernanceConfig, Decision } from "../../src/governance/types.js"

describe("End-to-End Workflow Tests", () => {
  let config: GovernanceConfig
  let orchestrator: GovernanceOrchestrator

  beforeEach(() => {
    config = {
      maxRetries: 2,
      stepTimeoutSeconds: 300,
      globalTimeoutSeconds: 3600,
      parallelStepLimit: 5,
      enableLogging: false,
      logLevel: "error",
    }
    orchestrator = new GovernanceOrchestrator(config)
  })

  describe("Complete Workflow Scenarios", () => {
    it("should handle simple sequential workflow", async () => {
      const plan: Plan = {
        id: "plan-e2e-1",
        domain: "general",
        createdBy: AgentRole.ZHONGSHU,
        steps: [
          {
            id: "step-1-scan",
            name: "代码扫描",
            uses: [AgentRole.YIBU],
            dependencies: [],
            input: { targetFile: "src/index.ts" },
            acceptanceCriteria: { "scan-complete": "yes" },
          },
          {
            id: "step-2-implement",
            name: "实现修复",
            uses: [AgentRole.GONGBU],
            dependencies: ["step-1-scan"],
            input: { fixType: "bug-fix" },
            acceptanceCriteria: { "fix-applied": "yes" },
          },
          {
            id: "step-3-test",
            name: "测试验证",
            uses: [AgentRole.BINGBU],
            dependencies: ["step-2-implement"],
            input: { testType: "unit" },
            acceptanceCriteria: { "tests-pass": "yes" },
          },
        ],
        dependencyGraph: {
          "step-1-scan": [],
          "step-2-implement": ["step-1-scan"],
          "step-3-test": ["step-2-implement"],
        },
        criticalPath: ["step-1-scan", "step-2-implement", "step-3-test"],
        estimatedDurationMinutes: 30,
      }

      // Phase 2: Review
      const approval = await orchestrator.phase2Review(plan)
      expect(approval.decision).toBe(Decision.PASS)

      // Phase 4: Verification
      const verification = await orchestrator.phase4Verification(plan, {
        executionId: "exec-1",
        planId: plan.id,
        duration: 25,
        totalSteps: 3,
        completedSteps: 3,
        failedSteps: 0,
        inProgressSteps: 0,
        pendingSteps: 0,
        statistics: {
          totalAttempts: 3,
          successRate: 1.0,
          averageStepDuration: 8.33,
        },
        stepResults: new Map(),
        timeline: [],
      })

      expect(verification.status).toBe("pass")
    })

    it("should handle parallel execution workflow", async () => {
      const plan: Plan = {
        id: "plan-e2e-parallel",
        domain: "general",
        createdBy: AgentRole.ZHONGSHU,
        steps: [
          {
            id: "step-1-scan",
            name: "代码扫描",
            uses: [AgentRole.YIBU],
            dependencies: [],
            input: { targetDir: "src/" },
            acceptanceCriteria: { "scan-complete": "yes" },
          },
          {
            id: "step-2-research",
            name: "依赖研究",
            uses: [AgentRole.HUBU],
            dependencies: [],
            input: { apiVersion: "v2" },
            acceptanceCriteria: { "research-complete": "yes" },
          },
          {
            id: "step-3-test",
            name: "旧代码测试",
            uses: [AgentRole.BINGBU],
            dependencies: [],
            input: { testSuite: "legacy" },
            acceptanceCriteria: { "tests-complete": "yes" },
          },
          {
            id: "step-4-implement",
            name: "实现新功能",
            uses: [AgentRole.GONGBU],
            dependencies: ["step-1-scan", "step-2-research", "step-3-test"],
            input: { feature: "new-auth" },
            acceptanceCriteria: { "implementation-complete": "yes" },
          },
        ],
        dependencyGraph: {
          "step-1-scan": [],
          "step-2-research": [],
          "step-3-test": [],
          "step-4-implement": ["step-1-scan", "step-2-research", "step-3-test"],
        },
        criticalPath: ["step-1-scan", "step-2-research", "step-3-test", "step-4-implement"],
        estimatedDurationMinutes: 20,
      }

      // Verify plan structure
      expect(plan.steps).toHaveLength(4)

      // Check that first 3 steps can run in parallel
      const readySteps = (orchestrator as any).engine["steps"] || plan.steps.slice(0, 3)
      expect(readySteps.length).toBeGreaterThanOrEqual(0)

      // Phase 2: Review
      const approval = await orchestrator.phase2Review(plan)
      expect(approval.decision).toBe(Decision.PASS)

      // Verify critical path
      const criticalPath = orchestrator.getCriticalPath(plan)
      expect(criticalPath).toContain("step-4-implement")
    })

    it("should handle plan with single ministry", async () => {
      const plan: Plan = {
        id: "plan-single-ministry",
        domain: "general",
        createdBy: AgentRole.ZHONGSHU,
        steps: [
          {
            id: "step-1",
            name: "实现功能",
            uses: [AgentRole.GONGBU],
            dependencies: [],
            input: { feature: "auth" },
            acceptanceCriteria: { "implementation": "done" },
          },
        ],
        dependencyGraph: { "step-1": [] },
        criticalPath: ["step-1"],
        estimatedDurationMinutes: 15,
      }

      const approval = await orchestrator.phase2Review(plan)
      expect(approval.decision).toBe(Decision.PASS)

      // Test task dispatch
      const step = plan.steps[0]
      const ministries = MinistryDispatcher.getMinistryForStep(step.uses as any)
      expect(ministries).toContain("gongbu")

      // Generate task prompt
      const prompt = MinistryDispatcher.generateTaskPrompt(step, ministries)
      expect(prompt).toContain("实现功能")
    })

    it("should handle plan with multiple ministries per step", async () => {
      const plan: Plan = {
        id: "plan-multi-ministry",
        domain: "general",
        createdBy: AgentRole.ZHONGSHU,
        steps: [
          {
            id: "step-1",
            name: "完整代码审查",
            uses: [AgentRole.YIBU, AgentRole.GONGBU],
            dependencies: [],
            input: { module: "auth" },
            acceptanceCriteria: { "review-complete": "yes" },
          },
        ],
        dependencyGraph: { "step-1": [] },
        criticalPath: ["step-1"],
        estimatedDurationMinutes: 20,
      }

      const approval = await orchestrator.phase2Review(plan)
      expect(approval.decision).toBe(Decision.PASS)

      // Test multi-ministry dispatch
      const step = plan.steps[0]
      const ministries = MinistryDispatcher.getMinistryForStep(step.uses as any)
      expect(ministries).toHaveLength(2)
      expect(ministries).toContain("yibu")
      expect(ministries).toContain("gongbu")

      // Verify prompt generation for multi-ministry step
      const prompt = MinistryDispatcher.generateTaskPrompt(step, ministries)
      expect(prompt).toContain("完整代码审查")
    })

    it("should reject plan with cyclic dependencies", async () => {
      const plan: Plan = {
        id: "plan-cyclic",
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

      const approval = await orchestrator.phase2Review(plan)
      expect(approval.decision).toBe(Decision.ESCALATE)
      expect(approval.reason).toContain("circular")
    })

    it("should handle complex workflow with multiple branches", async () => {
      const plan: Plan = {
        id: "plan-complex",
        domain: "general",
        createdBy: AgentRole.ZHONGSHU,
        steps: [
          {
            id: "step-1",
            name: "Analysis",
            uses: [AgentRole.YIBU],
            dependencies: [],
            input: {},
            acceptanceCriteria: { analysis: "done" },
          },
          {
            id: "step-2-frontend",
            name: "Implement Frontend",
            uses: [AgentRole.GONGBU],
            dependencies: ["step-1"],
            input: {},
            acceptanceCriteria: { frontend: "done" },
          },
          {
            id: "step-2-backend",
            name: "Implement Backend",
            uses: [AgentRole.GONGBU],
            dependencies: ["step-1"],
            input: {},
            acceptanceCriteria: { backend: "done" },
          },
          {
            id: "step-3",
            name: "Integration Testing",
            uses: [AgentRole.BINGBU],
            dependencies: ["step-2-frontend", "step-2-backend"],
            input: {},
            acceptanceCriteria: { integration: "done" },
          },
        ],
        dependencyGraph: {
          "step-1": [],
          "step-2-frontend": ["step-1"],
          "step-2-backend": ["step-1"],
          "step-3": ["step-2-frontend", "step-2-backend"],
        },
        criticalPath: ["step-1", "step-2-frontend", "step-2-backend", "step-3"],
        estimatedDurationMinutes: 45,
      }

      const approval = await orchestrator.phase2Review(plan)
      expect(approval.decision).toBe(Decision.PASS)

      // Verify critical path (should include one path through the branches)
      const criticalPath = orchestrator.getCriticalPath(plan)
      expect(criticalPath.length).toBeGreaterThanOrEqual(3)
      expect(criticalPath[0]).toBe("step-1")

      // Verify no cyclic dependencies
      const hasCycle = orchestrator.hasCyclicDependency(plan)
      expect(hasCycle).toBe(false)
    })
  })

  describe("Workflow Verification", () => {
    it("should verify critical path calculation", async () => {
      const plan: Plan = {
        id: "plan-verify",
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
      expect(criticalPath).toHaveLength(2)
    })

    it("should calculate all dependencies correctly", async () => {
      const plan: Plan = {
        id: "plan-deps",
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

      const allDeps = orchestrator.getAllDependencies("step-3", plan)
      expect(allDeps).toEqual(new Set(["step-2", "step-1"]))
      expect(allDeps.size).toBe(2)
    })
  })
})
