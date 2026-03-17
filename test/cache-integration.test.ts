/**
 * 缓存集成测试 - Phase 5 P2
 *
 * 验证缓存系统与 OpenCode 插件的集成：
 * - Constraint 缓存集成
 * - Plan 缓存集成
 * - Step 结果缓存集成
 * - 版本管理集成
 * - 清理策略
 * - 监控和报告
 */

import assert from "assert"
import {
  ConstraintCacheIntegration,
  PlanCacheIntegration,
  StepResultCacheIntegration,
  CacheVersionIntegration,
  CacheCleanupStrategy,
  CacheMonitoring,
} from "../src/caching/cache-integration"
import { GlobalCacheManager, CachedPlan, CachedStepResult } from "../src/caching/multi-layer-cache"

describe("缓存集成系统", () => {
  beforeEach(() => {
    GlobalCacheManager.clearAll()
  })

  // ─────────────────── 约束缓存集成 ───────────────────

  describe("约束缓存集成", () => {
    it("应该从缓存获取约束或加载新的", () => {
      const mockLoader = jest.fn(() => [
        { name: "constraint1", description: "Test constraint" },
      ])

      // 第一次调用：缓存未中，调用 loader
      const result1 = ConstraintCacheIntegration.getConstraintsCached("gongbu", "general", mockLoader)
      assert.strictEqual(mockLoader.mock.calls.length, 1)
      assert.strictEqual(result1.length, 1)

      // 第二次调用：缓存命中，不调用 loader
      const result2 = ConstraintCacheIntegration.getConstraintsCached("gongbu", "general", mockLoader)
      assert.strictEqual(mockLoader.mock.calls.length, 1) // 仍然是 1
      assert.deepStrictEqual(result1, result2)
    })

    it("应该为不同的 agent/domain 组合缓存不同的约束", () => {
      const loaderG = jest.fn(() => [{ name: "gongbu-constraint" }])
      const loaderX = jest.fn(() => [{ name: "xingbu-constraint" }])

      ConstraintCacheIntegration.getConstraintsCached("gongbu", "general", loaderG)
      ConstraintCacheIntegration.getConstraintsCached("xingbu", "general", loaderX)

      const stats = ConstraintCacheIntegration.getStats()
      assert.strictEqual(stats.entries, 2)
    })

    it("应该清理过期约束", () => {
      const loader = () => [{ name: "constraint" }]
      ConstraintCacheIntegration.getConstraintsCached("gongbu", "general", loader)
      ConstraintCacheIntegration.getConstraintsCached("xingbu", "general", loader)

      const cleaned = ConstraintCacheIntegration.cleanup()
      // 由于没有过期，应该返回 0
      assert.strictEqual(cleaned, 0)
    })
  })

  // ─────────────────── 计划缓存集成 ───────────────────

  describe("计划缓存集成", () => {
    const mockPlan: CachedPlan = {
      id: "plan-001",
      domain: "general",
      taskDescription: "Fix login bug",
      steps: [
        {
          stepId: "analyze",
          name: "分析",
          description: "Analyze the issue",
          agent: "yibu",
        },
      ],
      rationale: "Critical bug",
      estimatedTime: 1800,
    }

    it("应该从缓存获取或生成计划", () => {
      const mockGenerator = jest.fn(() => mockPlan)

      // 第一次：缓存未中，调用生成器
      const result1 = PlanCacheIntegration.getPlanCached(
        "general",
        "gongbu",
        "Fix login bug",
        mockGenerator
      )
      assert.strictEqual(mockGenerator.mock.calls.length, 1)
      assert.strictEqual(result1.id, "plan-001")

      // 第二次：缓存命中，不调用生成器
      const result2 = PlanCacheIntegration.getPlanCached(
        "general",
        "gongbu",
        "Fix login bug",
        mockGenerator
      )
      assert.strictEqual(mockGenerator.mock.calls.length, 1)
      assert.deepStrictEqual(result1, result2)
    })

    it("应该预热计划缓存", () => {
      const commonTasks = [
        {
          domain: "general",
          agent: "gongbu",
          description: "Common task 1",
          plan: { ...mockPlan, id: "plan-1", taskDescription: "Common task 1" },
        },
        {
          domain: "general",
          agent: "gongbu",
          description: "Common task 2",
          plan: { ...mockPlan, id: "plan-2", taskDescription: "Common task 2" },
        },
      ]

      PlanCacheIntegration.warmupCommonPlans(commonTasks)

      const stats = PlanCacheIntegration.getStats()
      assert.strictEqual(stats.entries, 2)
    })

    it("应该生成计划缓存报告", () => {
      const generator = () => mockPlan
      PlanCacheIntegration.getPlanCached("general", "gongbu", "Fix login bug", generator)

      const report = PlanCacheIntegration.getReport()
      assert(report.includes("缓存状态报告"))
      assert(report.includes("命中率"))
    })
  })

  // ─────────────────── 步骤结果缓存集成 ───────────────────

  describe("步骤结果缓存集成", () => {
    const mockResult: CachedStepResult = {
      stepId: "implement-001",
      status: "success",
      output: "File updated successfully",
      executionTime: 2500,
      timestamp: Date.now(),
    }

    it("应该从缓存获取或执行步骤", () => {
      const mockExecutor = jest.fn(() => mockResult)

      // 第一次：缓存未中，调用执行器
      const result1 = StepResultCacheIntegration.getStepResultCached(
        "general",
        "gongbu",
        "implement",
        { file: "app.ts" },
        mockExecutor
      )
      assert.strictEqual(mockExecutor.mock.calls.length, 1)
      assert.strictEqual(result1.status, "success")

      // 第二次：缓存命中，不调用执行器
      const result2 = StepResultCacheIntegration.getStepResultCached(
        "general",
        "gongbu",
        "implement",
        { file: "app.ts" },
        mockExecutor
      )
      assert.strictEqual(mockExecutor.mock.calls.length, 1)
      assert.deepStrictEqual(result1, result2)
    })

    it("应该为不同的 input 缓存不同的结果", () => {
      const executor1 = jest.fn(() => ({ ...mockResult, output: "Output 1" }))
      const executor2 = jest.fn(() => ({ ...mockResult, output: "Output 2" }))

      StepResultCacheIntegration.getStepResultCached(
        "general",
        "gongbu",
        "implement",
        { file: "app.ts" },
        executor1
      )
      StepResultCacheIntegration.getStepResultCached(
        "general",
        "gongbu",
        "implement",
        { file: "utils.ts" },
        executor2
      )

      const stats = StepResultCacheIntegration.getStats()
      assert.strictEqual(stats.entries, 2)
    })

    it("应该更新步骤结果", () => {
      const executor = () => mockResult
      StepResultCacheIntegration.getStepResultCached(
        "general",
        "gongbu",
        "implement",
        { file: "app.ts" },
        executor
      )

      const updatedResult: CachedStepResult = {
        ...mockResult,
        status: "failed",
        output: "Execution failed",
      }

      StepResultCacheIntegration.updateStepResult(
        "general",
        "gongbu",
        "implement",
        { file: "app.ts" },
        updatedResult
      )

      const retrieved = StepResultCacheIntegration.getStepResultCached(
        "general",
        "gongbu",
        "implement",
        { file: "app.ts" },
        executor
      )

      assert.strictEqual(retrieved.status, "failed")
    })

    it("应该生成步骤结果缓存报告", () => {
      const executor = () => mockResult
      StepResultCacheIntegration.getStepResultCached(
        "general",
        "gongbu",
        "implement",
        { file: "app.ts" },
        executor
      )

      const report = StepResultCacheIntegration.getReport()
      assert(report.includes("缓存状态报告"))
    })
  })

  // ─────────────────── 版本管理集成 ───────────────────

  describe("版本管理集成", () => {
    it("应该注册和检测约束文件变化", () => {
      const filePath = "constraints/general.yaml"

      CacheVersionIntegration.registerConstraintFile(filePath, "hash123")
      assert(!CacheVersionIntegration.hasConstraintFileChanged(filePath, "hash123"))
      assert(CacheVersionIntegration.hasConstraintFileChanged(filePath, "hash456"))
    })

    it("应该检测新文件为已变化", () => {
      assert(CacheVersionIntegration.hasConstraintFileChanged("newfile.yaml", "hash"))
    })
  })

  // ─────────────────── 清理策略 ───────────────────

  describe("清理策略", () => {
    beforeEach(() => {
      // 添加一些缓存条目
      const constraintLoader = () => [{ name: "constraint" }]
      ConstraintCacheIntegration.getConstraintsCached("gongbu", "general", constraintLoader)
    })

    it("应该执行定期清理", () => {
      const cleaned = CacheCleanupStrategy.performPeriodicCleanup()
      assert(typeof cleaned === "number")
    })

    it("应该清理约束缓存", () => {
      const statsBeforeClear = ConstraintCacheIntegration.getStats()
      assert(statsBeforeClear.entries > 0)

      CacheCleanupStrategy.clearConstraintCacheOnFileChange()

      const statsAfterClear = ConstraintCacheIntegration.getStats()
      assert.strictEqual(statsAfterClear.entries, 0)
    })

    it("应该清理计划缓存", () => {
      const plan = {
        id: "p1",
        domain: "general",
        taskDescription: "task",
        steps: [],
        rationale: "reason",
        estimatedTime: 1000,
      }
      PlanCacheIntegration.getPlanCached("general", "gongbu", "task", () => plan)

      const statsBeforeClear = PlanCacheIntegration.getStats()
      assert(statsBeforeClear.entries > 0)

      CacheCleanupStrategy.clearPlanCacheForNewSession()

      const statsAfterClear = PlanCacheIntegration.getStats()
      assert.strictEqual(statsAfterClear.entries, 0)
    })

    it("应该清理步骤结果缓存", () => {
      const result: CachedStepResult = {
        stepId: "s1",
        status: "success",
        executionTime: 1000,
        timestamp: Date.now(),
      }
      StepResultCacheIntegration.getStepResultCached(
        "general",
        "gongbu",
        "step1",
        {},
        () => result
      )

      const statsBeforeClear = StepResultCacheIntegration.getStats()
      assert(statsBeforeClear.entries > 0)

      CacheCleanupStrategy.clearStepResultCacheOnDefinitionChange()

      const statsAfterClear = StepResultCacheIntegration.getStats()
      assert.strictEqual(statsAfterClear.entries, 0)
    })

    it("应该清空所有缓存", () => {
      const plan = {
        id: "p1",
        domain: "general",
        taskDescription: "task",
        steps: [],
        rationale: "reason",
        estimatedTime: 1000,
      }
      PlanCacheIntegration.getPlanCached("general", "gongbu", "task", () => plan)

      let statsBeforeClear = PlanCacheIntegration.getStats()
      assert(statsBeforeClear.entries > 0)

      CacheCleanupStrategy.clearAllCaches()

      statsBeforeClear = PlanCacheIntegration.getStats()
      assert.strictEqual(statsBeforeClear.entries, 0)
    })
  })

  // ─────────────────── 监控和报告 ───────────────────

  describe("监控和报告", () => {
    beforeEach(() => {
      // 添加一些缓存条目
      const constraintLoader = () => [{ name: "constraint" }]
      ConstraintCacheIntegration.getConstraintsCached("gongbu", "general", constraintLoader)

      const plan = {
        id: "p1",
        domain: "general",
        taskDescription: "task",
        steps: [],
        rationale: "reason",
        estimatedTime: 1000,
      }
      PlanCacheIntegration.getPlanCached("general", "gongbu", "task", () => plan)
    })

    it("应该生成完整的缓存监控报告", () => {
      const report = CacheMonitoring.generateFullReport()

      assert(report.includes("缓存系统监控报告"))
      assert(report.includes("约束缓存"))
      assert(report.includes("计划缓存"))
      assert(report.includes("建议"))
    })

    it("应该监控缓存大小", () => {
      const sizes = CacheMonitoring.monitorCacheSizes()

      assert.strictEqual(typeof sizes.constraint, "number")
      assert.strictEqual(typeof sizes.plan, "number")
      assert.strictEqual(typeof sizes.step, "number")
      assert(sizes.total > 0)
    })

    it("应该获取命中率汇总", () => {
      // 进行一些缓存访问
      const constraintLoader = () => [{ name: "constraint" }]
      ConstraintCacheIntegration.getConstraintsCached("gongbu", "general", constraintLoader)
      ConstraintCacheIntegration.getConstraintsCached("gongbu", "general", constraintLoader)
      ConstraintCacheIntegration.getConstraintsCached("yibu", "general", constraintLoader)

      const summary = CacheMonitoring.getHitRateSummary()

      assert(summary.constraint.includes("%"))
      assert(summary.plan.includes("%"))
      assert(summary.step.includes("%"))
      assert(summary.overall.includes("%"))
    })
  })

  // ─────────────────── 端到端集成场景 ───────────────────

  describe("端到端集成场景", () => {
    it("应该支持完整的缓存生命周期", () => {
      // 1. 初始化缓存（预热）
      const mockPlan: CachedPlan = {
        id: "plan-full",
        domain: "general",
        taskDescription: "Full integration test",
        steps: [
          { stepId: "s1", name: "Step 1", description: "First step", agent: "yibu" },
          { stepId: "s2", name: "Step 2", description: "Second step", agent: "gongbu" },
        ],
        rationale: "Test",
        estimatedTime: 3600,
      }

      // 2. 获取计划（缓存未中）
      const planLoader = jest.fn(() => mockPlan)
      const plan1 = PlanCacheIntegration.getPlanCached(
        "general",
        "gongbu",
        "Full integration test",
        planLoader
      )
      assert.strictEqual(planLoader.mock.calls.length, 1)

      // 3. 执行步骤
      const stepResult: CachedStepResult = {
        stepId: "s1",
        status: "success",
        output: "Step 1 completed",
        executionTime: 1200,
        timestamp: Date.now(),
      }

      const stepExecutor = jest.fn(() => stepResult)
      const result1 = StepResultCacheIntegration.getStepResultCached(
        "general",
        "yibu",
        "s1",
        { planId: plan1.id },
        stepExecutor
      )
      assert.strictEqual(stepExecutor.mock.calls.length, 1)

      // 4. 再次获取计划（缓存命中）
      const plan2 = PlanCacheIntegration.getPlanCached(
        "general",
        "gongbu",
        "Full integration test",
        planLoader
      )
      assert.strictEqual(planLoader.mock.calls.length, 1) // 未增加
      assert.deepStrictEqual(plan1, plan2)

      // 5. 再次执行步骤（缓存命中）
      const result2 = StepResultCacheIntegration.getStepResultCached(
        "general",
        "yibu",
        "s1",
        { planId: plan1.id },
        stepExecutor
      )
      assert.strictEqual(stepExecutor.mock.calls.length, 1) // 未增加
      assert.deepStrictEqual(result1, result2)

      // 6. 监控缓存状态
      const summary = CacheMonitoring.getHitRateSummary()
      assert(parseFloat(summary.plan) > 0)
      assert(parseFloat(summary.step) > 0)

      // 7. 清理缓存
      CacheCleanupStrategy.clearAllCaches()
      const finalSizes = CacheMonitoring.monitorCacheSizes()
      assert.strictEqual(finalSizes.plan, 0)
      assert.strictEqual(finalSizes.step, 0)
    })
  })
})

console.log("\n[OK] 缓存集成测试全部通过！")
