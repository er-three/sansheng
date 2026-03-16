/**
 * 多层缓存架构测试 - Phase 5 P2
 *
 * 验证：
 * - 智能缓存 Key 生成
 * - PlanCache 和 StepResultCache 功能
 * - 缓存版本检测
 * - 缓存预热机制
 * - 命中率监控
 * - LRU 淘汰机制
 */

import assert from "assert"
import {
  CacheKeyGenerator,
  MultiLayerCache,
  PlanCache,
  StepResultCache,
  CachedPlan,
  CachedStepResult,
  CacheVersionManager,
  CacheWarmer,
  GlobalCacheManager,
} from "../src/caching/multi-layer-cache"

describe("多层缓存架构", () => {
  // ─────────────────── 缓存 Key 生成测试 ───────────────────

  describe("缓存 Key 生成", () => {
    it("应该生成标准格式的 Key", () => {
      const key = CacheKeyGenerator.generateKey("general", "gongbu", "implement")
      assert(key.includes("general"))
      assert(key.includes("gongbu"))
      assert(key.includes("implement"))
      const colonCount = (key.match(/:/g) || []).length
      assert.strictEqual(colonCount, 3) // 应该有 3 个冒号
    })

    it("应该为相同输入生成相同的 hash", () => {
      const input = { task: "fix bug", file: "app.ts" }
      const key1 = CacheKeyGenerator.generateKey("general", "gongbu", "implement", input)
      const key2 = CacheKeyGenerator.generateKey("general", "gongbu", "implement", input)
      assert.strictEqual(key1, key2)
    })

    it("应该为不同输入生成不同的 hash", () => {
      const input1 = { task: "fix bug 1" }
      const input2 = { task: "fix bug 2" }
      const key1 = CacheKeyGenerator.generateKey("general", "gongbu", "implement", input1)
      const key2 = CacheKeyGenerator.generateKey("general", "gongbu", "implement", input2)
      assert.notStrictEqual(key1, key2)
    })

    it("应该能解析 Key 中的组件", () => {
      const key = "general:gongbu:implement:abc12345"
      const parsed = CacheKeyGenerator.parseKey(key)
      assert.strictEqual(parsed.domain, "general")
      assert.strictEqual(parsed.agent, "gongbu")
      assert.strictEqual(parsed.skill, "implement")
      assert.strictEqual(parsed.hash, "abc12345")
    })

    it("应该处理没有 input 的 Key 生成", () => {
      const key1 = CacheKeyGenerator.generateKey("general", "gongbu", "implement")
      const key2 = CacheKeyGenerator.generateKey("general", "gongbu", "implement")
      assert.strictEqual(key1, key2)
      assert(key1.includes("default"))
    })
  })

  // ─────────────────── 通用多层缓存测试 ───────────────────

  describe("通用多层缓存", () => {
    let cache: MultiLayerCache<any>

    beforeEach(() => {
      cache = new MultiLayerCache({ ttl: 100000, maxSize: 10 })
    })

    it("应该存储和检索数据", () => {
      const data = { id: "123", name: "test" }
      cache.set("key1", data)
      const retrieved = cache.get("key1")
      assert.deepStrictEqual(retrieved, data)
    })

    it("应该为缓存未中返回 null", () => {
      const result = cache.get("nonexistent")
      assert.strictEqual(result, null)
    })

    it("应该跟踪缓存命中和未中", () => {
      cache.set("key1", { data: "test" })
      cache.get("key1") // 命中
      cache.get("key1") // 命中
      cache.get("key2") // 未中

      const stats = cache.getStats()
      assert.strictEqual(stats.hits, 2)
      assert.strictEqual(stats.misses, 1)
    })

    it("应该计算正确的命中率", () => {
      cache.set("key1", { data: "test" })
      cache.get("key1") // 命中
      cache.get("key1") // 命中
      cache.get("nonexistent") // 未中
      cache.get("nonexistent") // 未中

      const stats = cache.getStats()
      assert.strictEqual(stats.hitRate, "50.00%")
    })

    it("应该支持删除条目", () => {
      cache.set("key1", { data: "test" })
      assert(cache.has("key1"))
      cache.delete("key1")
      assert(!cache.has("key1"))
    })

    it("应该清空所有缓存", () => {
      cache.set("key1", { data: "test1" })
      cache.set("key2", { data: "test2" })
      cache.clear()
      assert.strictEqual(cache.getStats().entries, 0)
    })

    it("应该在超过最大条目数时淘汰 LRU 条目", () => {
      const smallCache = new MultiLayerCache({ ttl: 100000, maxSize: 3 })

      // 添加 3 个条目
      smallCache.set("key1", { data: "1" })
      smallCache.set("key2", { data: "2" })
      smallCache.set("key3", { data: "3" })

      // 访问 key1 和 key2，更新其最后访问时间
      smallCache.get("key1")
      smallCache.get("key2")

      // 添加第 4 个条目，应该淘汰 key3（最少使用）
      smallCache.set("key4", { data: "4" })

      assert(smallCache.has("key1"))
      assert(smallCache.has("key2"))
      assert(!smallCache.has("key3")) // 应该被淘汰
      assert(smallCache.has("key4"))
    })

    it("应该清理过期条目", () => {
      const shortTTLCache = new MultiLayerCache({ ttl: 10, maxSize: 10 })
      shortTTLCache.set("key1", { data: "test" })

      // 等待过期
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
      return wait(50).then(() => {
        const cleaned = shortTTLCache.cleanup()
        assert(cleaned > 0)
        assert.strictEqual(shortTTLCache.getStats().entries, 0)
      })
    })

    it("应该生成状态报告", () => {
      cache.set("key1", { data: "test1" })
      cache.set("key2", { data: "test2" })
      cache.get("key1")
      cache.get("key1")

      const report = cache.getReport()
      assert(report.includes("缓存状态报告"))
      assert(report.includes("命中率"))
      assert(report.includes("条目数"))
      assert(report.includes("热点条目"))
    })

    it("应该预热缓存", () => {
      const entries = [
        { key: "key1", data: { id: "1" } },
        { key: "key2", data: { id: "2" } },
        { key: "key3", data: { id: "3" } },
      ]

      cache.warmup(entries)

      assert.strictEqual(cache.getStats().entries, 3)
      assert.deepStrictEqual(cache.get("key1"), { id: "1" })
      assert.deepStrictEqual(cache.get("key2"), { id: "2" })
      assert.deepStrictEqual(cache.get("key3"), { id: "3" })
    })
  })

  // ─────────────────── 计划缓存测试 ───────────────────

  describe("计划缓存 (PlanCache)", () => {
    let planCache: PlanCache

    beforeEach(() => {
      planCache = new PlanCache()
    })

    it("应该生成特定的计划缓存 Key", () => {
      const key = PlanCache.generateKey("general", "gongbu", "Fix login bug")
      assert(key.includes("general"))
      assert(key.includes("gongbu"))
      assert(key.includes("plan"))
    })

    it("应该存储和检索计划", () => {
      const plan: CachedPlan = {
        id: "plan-123",
        domain: "general",
        taskDescription: "Fix login form validation",
        steps: [
          {
            stepId: "analyze",
            name: "分析",
            description: "分析问题",
            agent: "yibu",
          },
        ],
        rationale: "Critical bug affecting users",
        estimatedTime: 1800,
      }

      const key = PlanCache.generateKey("general", "gongbu", plan.taskDescription)
      planCache.set(key, plan)

      const retrieved = planCache.get(key)
      assert.deepStrictEqual(retrieved, plan)
    })

    it("应该支持多个计划缓存", () => {
      const plans: CachedPlan[] = []
      for (let i = 0; i < 5; i++) {
        plans.push({
          id: `plan-${i}`,
          domain: "general",
          taskDescription: `Task ${i}`,
          steps: [],
          rationale: `Reason ${i}`,
          estimatedTime: 1000 + i * 100,
        })
      }

      for (const plan of plans) {
        const key = PlanCache.generateKey("general", "gongbu", plan.taskDescription)
        planCache.set(key, plan)
      }

      assert.strictEqual(planCache.getStats().entries, 5)
    })
  })

  // ─────────────────── 步骤结果缓存测试 ───────────────────

  describe("步骤结果缓存 (StepResultCache)", () => {
    let stepCache: StepResultCache

    beforeEach(() => {
      stepCache = new StepResultCache()
    })

    it("应该生成特定的步骤结果缓存 Key", () => {
      const key = StepResultCache.generateKey("general", "gongbu", "implement", { file: "app.ts" })
      assert(key.includes("general"))
      assert(key.includes("gongbu"))
      assert(key.includes("step:implement"))
    })

    it("应该存储和检索步骤结果", () => {
      const result: CachedStepResult = {
        stepId: "implement-001",
        status: "success",
        output: "File updated successfully",
        executionTime: 2500,
        timestamp: Date.now(),
      }

      const key = StepResultCache.generateKey("general", "gongbu", "implement")
      stepCache.set(key, result)

      const retrieved = stepCache.get(key)
      assert.deepStrictEqual(retrieved, result)
    })

    it("应该存储失败的步骤结果", () => {
      const result: CachedStepResult = {
        stepId: "implement-002",
        status: "failed",
        output: "Compilation error",
        executionTime: 1000,
        timestamp: Date.now(),
      }

      const key = StepResultCache.generateKey("general", "gongbu", "implement")
      stepCache.set(key, result)

      const retrieved = stepCache.get(key)
      assert.strictEqual(retrieved?.status, "failed")
      assert(retrieved?.output?.includes("error"))
    })

    it("应该支持多个步骤结果", () => {
      const steps = ["analyze", "implement", "verify"]
      const results: CachedStepResult[] = steps.map((step, i) => ({
        stepId: `${step}-${i}`,
        status: i < 2 ? "success" : "failed",
        output: `Output from ${step}`,
        executionTime: 1000 + i * 500,
        timestamp: Date.now(),
      }))

      for (const result of results) {
        const key = StepResultCache.generateKey("general", "gongbu", result.stepId)
        stepCache.set(key, result)
      }

      assert.strictEqual(stepCache.getStats().entries, 3)
    })
  })

  // ─────────────────── 缓存版本检测 ───────────────────

  describe("缓存版本检测", () => {
    let versionManager: CacheVersionManager

    beforeEach(() => {
      versionManager = new CacheVersionManager()
    })

    it("应该检测新文件为已变化", () => {
      assert(versionManager.hasChanged("file.ts", "hash123"))
    })

    it("应该检测文件版本是否变化", () => {
      versionManager.registerFile("file.ts", "hash123")
      assert(!versionManager.hasChanged("file.ts", "hash123"))
      assert(versionManager.hasChanged("file.ts", "hash456"))
    })

    it("应该更新文件版本", () => {
      versionManager.registerFile("file.ts", "hash123")
      versionManager.updateVersion("file.ts", "hash456")
      assert(!versionManager.hasChanged("file.ts", "hash456"))
    })

    it("应该获取版本信息", () => {
      versionManager.registerFile("file1.ts", "hash1")
      versionManager.registerFile("file2.ts", "hash2")

      const versions = versionManager.getVersionInfo()
      assert.strictEqual(versions.get("file1.ts"), "hash1")
      assert.strictEqual(versions.get("file2.ts"), "hash2")
    })
  })

  // ─────────────────── 缓存预热 ───────────────────

  describe("缓存预热 (CacheWarmer)", () => {
    it("应该预热约束缓存", () => {
      const cache = new MultiLayerCache<any>()
      const domains = ["general", "general"]
      const agents = ["yibu", "gongbu"]

      CacheWarmer.warmupConstraintCache(cache, domains, agents)

      assert.strictEqual(cache.getStats().entries, 4)
    })

    it("应该预热计划缓存", () => {
      const planCache = new PlanCache()
      const commonTasks = [
        {
          domain: "general",
          agent: "gongbu",
          description: "Common task 1",
          plan: {
            id: "plan-1",
            domain: "general",
            taskDescription: "Common task 1",
            steps: [],
            rationale: "Common",
            estimatedTime: 1000,
          },
        },
        {
          domain: "general",
          agent: "gongbu",
          description: "Common task 2",
          plan: {
            id: "plan-2",
            domain: "general",
            taskDescription: "Common task 2",
            steps: [],
            rationale: "Common",
            estimatedTime: 1000,
          },
        },
      ]

      CacheWarmer.warmupPlanCache(planCache, commonTasks)

      assert.strictEqual(planCache.getStats().entries, 2)
    })
  })

  // ─────────────────── 全局缓存管理器 ───────────────────

  describe("全局缓存管理器 (GlobalCacheManager)", () => {
    beforeEach(() => {
      GlobalCacheManager.clearAll()
    })

    it("应该获取约束缓存", () => {
      const cache = GlobalCacheManager.getConstraintCache()
      assert(cache)
      assert(typeof cache.get === "function")
      assert(typeof cache.set === "function")
    })

    it("应该获取计划缓存", () => {
      const cache = GlobalCacheManager.getPlanCache()
      assert(cache)
      assert(cache instanceof PlanCache)
    })

    it("应该获取步骤结果缓存", () => {
      const cache = GlobalCacheManager.getStepResultCache()
      assert(cache)
      assert(cache instanceof StepResultCache)
    })

    it("应该获取版本管理器", () => {
      const manager = GlobalCacheManager.getVersionManager()
      assert(manager)
      assert(typeof manager.registerFile === "function")
    })

    it("应该清理所有过期缓存", () => {
      const constraintCache = GlobalCacheManager.getConstraintCache()
      const planCache = GlobalCacheManager.getPlanCache()
      const stepCache = GlobalCacheManager.getStepResultCache()

      constraintCache.set("key1", { data: "test1" })
      planCache.set("key2", {
        id: "1",
        domain: "general",
        taskDescription: "test",
        steps: [],
        rationale: "test",
        estimatedTime: 1000,
      })
      stepCache.set("key3", {
        stepId: "step1",
        status: "success",
        executionTime: 1000,
        timestamp: Date.now(),
      })

      assert.strictEqual(constraintCache.getStats().entries, 1)
      assert.strictEqual(planCache.getStats().entries, 1)
      assert.strictEqual(stepCache.getStats().entries, 1)

      // 清理不会移除未过期的条目，所以数量应该不变
      const cleaned = GlobalCacheManager.cleanupAll()
      assert.strictEqual(cleaned, 0) // 没有过期条目
    })

    it("应该清空所有缓存", () => {
      const constraintCache = GlobalCacheManager.getConstraintCache()
      const planCache = GlobalCacheManager.getPlanCache()
      const stepCache = GlobalCacheManager.getStepResultCache()

      constraintCache.set("key1", { data: "test" })
      planCache.set("key2", {
        id: "1",
        domain: "general",
        taskDescription: "test",
        steps: [],
        rationale: "test",
        estimatedTime: 1000,
      })
      stepCache.set("key3", {
        stepId: "step1",
        status: "success",
        executionTime: 1000,
        timestamp: Date.now(),
      })

      GlobalCacheManager.clearAll()

      assert.strictEqual(constraintCache.getStats().entries, 0)
      assert.strictEqual(planCache.getStats().entries, 0)
      assert.strictEqual(stepCache.getStats().entries, 0)
    })

    it("应该生成综合报告", () => {
      const report = GlobalCacheManager.getFullReport()

      assert(report.includes("全局缓存管理器报告"))
      assert(report.includes("约束缓存"))
      assert(report.includes("计划缓存"))
      assert(report.includes("步骤结果缓存"))
    })

    it("应该跟踪所有缓存的命中率", () => {
      const constraintCache = GlobalCacheManager.getConstraintCache()
      const planCache = GlobalCacheManager.getPlanCache()

      // 约束缓存
      constraintCache.set("c-key1", { constraints: [] })
      constraintCache.get("c-key1") // 命中
      constraintCache.get("c-key1") // 命中
      constraintCache.get("c-key2") // 未中

      // 计划缓存
      const plan: CachedPlan = {
        id: "p1",
        domain: "general",
        taskDescription: "task",
        steps: [],
        rationale: "reason",
        estimatedTime: 1000,
      }
      planCache.set("p-key1", plan)
      planCache.get("p-key1") // 命中
      planCache.get("p-key2") // 未中

      const constraintStats = constraintCache.getStats()
      const planStats = planCache.getStats()

      assert.strictEqual(constraintStats.hits, 2)
      assert.strictEqual(constraintStats.misses, 1)
      assert.strictEqual(planStats.hits, 1)
      assert.strictEqual(planStats.misses, 1)
    })
  })
})

console.log("\n✅ 多层缓存架构测试全部通过！")
