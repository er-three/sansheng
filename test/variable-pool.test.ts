/**
 * 变量共享池测试 - Phase 5 P2-3
 *
 * 验证：
 * - 全局变量共享
 * - Delta 增量计算
 * - Session 变量同步
 * - 跨 Session 变量广播
 * - 版本管理
 */

import assert from "assert"
import {
  GlobalVariablePool,
  VariableDeltaManager,
  SessionVariableManager,
  GlobalVariableCoordinator,
  VariableSet,
  VariableDelta,
} from "../src/session/variable-pool"

describe("变量共享池", () => {
  // ─────────────────── 全局变量池测试 ───────────────────

  describe("全局变量池", () => {
    let pool: GlobalVariablePool

    beforeEach(() => {
      pool = new GlobalVariablePool()
    })

    it("应该存储和获取变量", () => {
      pool.set("task_id", "task-123")
      assert.strictEqual(pool.get("task_id"), "task-123")
    })

    it("应该支持不同的数据类型", () => {
      pool.set("string_var", "hello")
      pool.set("number_var", 42)
      pool.set("boolean_var", true)
      pool.set("object_var", { key: "value" })

      assert.strictEqual(pool.get("string_var"), "hello")
      assert.strictEqual(pool.get("number_var"), 42)
      assert.strictEqual(pool.get("boolean_var"), true)
      assert.deepStrictEqual(pool.get("object_var"), { key: "value" })
    })

    it("应该批量设置变量", () => {
      const vars = {
        var1: "value1",
        var2: 123,
        var3: true,
      }

      pool.setMany(vars)
      assert.strictEqual(pool.size(), 3)
      assert.strictEqual(pool.get("var1"), "value1")
    })

    it("应该获取所有变量", () => {
      pool.set("var1", "value1")
      pool.set("var2", "value2")

      const all = pool.getAll()
      assert.strictEqual(all.var1, "value1")
      assert.strictEqual(all.var2, "value2")
    })

    it("应该删除变量", () => {
      pool.set("var1", "value1")
      assert(pool.has("var1"))

      const deleted = pool.delete("var1")
      assert(deleted)
      assert(!pool.has("var1"))
    })

    it("应该清空所有变量", () => {
      pool.set("var1", "value1")
      pool.set("var2", "value2")

      pool.clear()
      assert.strictEqual(pool.size(), 0)
    })

    it("应该计算变量池的哈希值", () => {
      pool.set("var1", "value1")
      const hash1 = pool.getHash()

      pool.set("var2", "value2")
      const hash2 = pool.getHash()

      assert.notStrictEqual(hash1, hash2)
    })

    it("应该生成统计信息", () => {
      pool.set("string", "hello")
      pool.set("number", 42)
      pool.set("boolean", true)
      pool.set("object", { key: "value" })

      const stats = pool.getStats()
      assert.strictEqual(stats.total, 4)
      assert.strictEqual(stats.string, 1)
      assert.strictEqual(stats.number, 1)
      assert.strictEqual(stats.boolean, 1)
      assert.strictEqual(stats.object, 1)
    })
  })

  // ─────────────────── Delta 管理测试 ───────────────────

  describe("Delta 变量管理", () => {
    let pool: GlobalVariablePool
    let deltaManager: VariableDeltaManager

    beforeEach(() => {
      pool = new GlobalVariablePool()
      deltaManager = new VariableDeltaManager(pool)
      pool.setMany({ existing_var: "value1" })
      deltaManager.resetSnapshot()
    })

    it("应该检测新增变量", () => {
      pool.set("new_var", "new_value")
      const delta = deltaManager.computeDelta()

      assert.strictEqual(Object.keys(delta.added).length, 1)
      assert(delta.added.new_var)
    })

    it("应该检测更新变量", () => {
      pool.set("existing_var", "updated_value")
      const delta = deltaManager.computeDelta()

      assert.strictEqual(Object.keys(delta.updated).length, 1)
      assert.strictEqual(delta.updated.existing_var, "updated_value")
    })

    it("应该检测删除变量", () => {
      pool.delete("existing_var")
      const delta = deltaManager.computeDelta()

      assert.strictEqual(delta.deleted.length, 1)
      assert(delta.deleted.includes("existing_var"))
    })

    it("应该计算 Delta 的哈希值", () => {
      pool.set("new_var", "value")
      const delta1 = deltaManager.computeDelta()

      deltaManager.resetSnapshot()
      pool.set("another_var", "another_value")
      const delta2 = deltaManager.computeDelta()

      assert.notStrictEqual(delta1.hash, delta2.hash)
    })

    it("应该应用 Delta 到池", () => {
      const delta: VariableDelta = {
        added: { new_var: "new_value" },
        updated: { existing_var: "updated_value" },
        deleted: [],
        hash: "test-hash",
        timestamp: Date.now(),
        version: 1,
      }

      const newPool = new GlobalVariablePool()
      newPool.set("existing_var", "old_value")
      const newDeltaManager = new VariableDeltaManager(newPool)

      newDeltaManager.applyDelta(delta)

      assert.strictEqual(newPool.get("new_var"), "new_value")
      assert.strictEqual(newPool.get("existing_var"), "updated_value")
    })

    it("应该记录 Delta 历史", () => {
      pool.set("var1", "value1")
      deltaManager.computeDelta()

      pool.set("var2", "value2")
      deltaManager.computeDelta()

      const history = deltaManager.getDeltaHistory()
      assert.strictEqual(history.length, 2)
    })

    it("应该生成 Delta 统计", () => {
      pool.set("var1", "value1")
      deltaManager.computeDelta()

      const stats = deltaManager.getStats()
      assert.strictEqual(stats.deltas_recorded, 1)
      assert(stats.snapshot_size > 0)
    })
  })

  // ─────────────────── Session 变量管理测试 ───────────────────

  describe("Session 变量管理", () => {
    let sessionManager: SessionVariableManager
    const globalVars: VariableSet = {
      task_id: "task-123",
      domain: "general",
      agent: "gongbu",
    }

    beforeEach(() => {
      sessionManager = new SessionVariableManager("session-123")
      sessionManager.syncGlobal(globalVars)
    })

    it("应该同步全局变量", () => {
      assert.strictEqual(sessionManager.get("task_id"), "task-123")
      assert.strictEqual(sessionManager.get("domain"), "general")
    })

    it("应该应用 Delta 更新", () => {
      const delta: VariableDelta = {
        added: { new_var: "new_value" },
        updated: { task_id: "task-456" },
        deleted: ["agent"],
        hash: "hash",
        timestamp: Date.now(),
        version: 1,
      }

      sessionManager.applyDelta(delta)

      assert.strictEqual(sessionManager.get("task_id"), "task-456")
      assert.strictEqual(sessionManager.get("new_var"), "new_value")
      assert(!sessionManager.get("agent"))
    })

    it("应该设置本地变量", () => {
      sessionManager.setLocal("local_var", "local_value")
      assert.strictEqual(sessionManager.get("local_var"), "local_value")
    })

    it("应该获取所有变量", () => {
      const all = sessionManager.getAll()
      assert(all.task_id)
      assert(all.domain)
    })

    it("应该生成统计信息", () => {
      const stats = sessionManager.getStats()
      assert.strictEqual(stats.session_id, "session-123")
      assert.strictEqual(stats.variable_count, 3)
      assert(stats.size_bytes > 0)
    })
  })

  // ─────────────────── 全局协调器测试 ───────────────────

  describe("全局变量协调器", () => {
    let coordinator: GlobalVariableCoordinator

    beforeEach(() => {
      coordinator = new GlobalVariableCoordinator()
    })

    it("应该初始化全局变量", () => {
      const vars = { task_id: "task-1", domain: "general" }
      coordinator.initializeGlobal(vars)

      const stats = coordinator.getPoolStats()
      assert.strictEqual(stats.total, 2)
    })

    it("应该注册 Session", () => {
      coordinator.initializeGlobal({ var1: "value1" })
      const sessionManager = coordinator.registerSession("session-1")

      assert(sessionManager)
      assert.strictEqual(sessionManager.get("var1"), "value1")
    })

    it("应该更新全局变量", () => {
      coordinator.initializeGlobal({ var1: "value1" })
      coordinator.updateGlobal("var1", "updated_value")

      const stats = coordinator.getPoolStats()
      assert.strictEqual(stats.total, 1)
    })

    it("应该批量更新全局变量", () => {
      coordinator.updateGlobalMany({ var1: "value1", var2: "value2" })

      const stats = coordinator.getPoolStats()
      assert.strictEqual(stats.total, 2)
    })

    it("应该同步所有 Session", () => {
      coordinator.initializeGlobal({ var1: "value1" })
      const session1 = coordinator.registerSession("session-1")
      const session2 = coordinator.registerSession("session-2")

      coordinator.updateGlobal("var1", "updated_value")
      const delta = coordinator.syncAllSessions()

      assert.strictEqual(session1.get("var1"), "updated_value")
      assert.strictEqual(session2.get("var1"), "updated_value")
    })

    it("应该广播变量更新", () => {
      coordinator.initializeGlobal({ var1: "value1" })
      const session = coordinator.registerSession("session-1")

      coordinator.broadcast("var1", "new_value")

      assert.strictEqual(session.get("var1"), "new_value")
    })

    it("应该在没有变化时跳过同步", () => {
      coordinator.initializeGlobal({ var1: "value1" })
      const session = coordinator.registerSession("session-1")

      const delta1 = coordinator.syncAllSessions()
      const delta2 = coordinator.syncAllSessions() // 没有变化

      assert.strictEqual(Object.keys(delta1.added).length, 0)
      assert.strictEqual(Object.keys(delta2.added).length, 0)
    })

    it("应该生成完整报告", () => {
      coordinator.initializeGlobal({ var1: "value1", var2: "value2" })
      coordinator.registerSession("session-1")

      const report = coordinator.generateReport()

      assert(report.includes("全局变量共享池报告"))
      assert(report.includes("变量池统计"))
      assert(report.includes("Delta 管理统计"))
      assert(report.includes("Session 同步"))
    })
  })

  // ─────────────────── 端到端集成测试 ───────────────────

  describe("端到端变量共享流程", () => {
    it("应该完整支持多 Session 场景", () => {
      const coordinator = new GlobalVariableCoordinator()

      // 1. 初始化全局变量
      const initialVars = {
        task_id: "task-001",
        domain: "general",
        status: "initializing",
      }
      coordinator.initializeGlobal(initialVars)

      // 2. 创建多个 Session
      const session1 = coordinator.registerSession("session-1")
      const session2 = coordinator.registerSession("session-2")

      assert.strictEqual(session1.getStats().variable_count, 3)
      assert.strictEqual(session2.getStats().variable_count, 3)

      // 3. 更新全局变量（只修改 1 个字段）
      coordinator.updateGlobal("status", "processing")
      const delta = coordinator.syncAllSessions()

      // 验证 Delta 只包含更新的字段
      assert.strictEqual(Object.keys(delta.added).length, 0)
      assert.strictEqual(Object.keys(delta.updated).length, 1)
      assert(delta.updated.status)

      // 验证两个 Session 都同步了更新
      assert.strictEqual(session1.get("status"), "processing")
      assert.strictEqual(session2.get("status"), "processing")

      // 4. Session 本地设置额外变量
      session1.setLocal("local_result", "result-data")
      assert.strictEqual(session1.get("local_result"), "result-data")
      assert(!session2.get("local_result")) // 不影响其他 Session

      // 5. 添加新的全局变量
      coordinator.updateGlobal("step", "analyze")
      coordinator.syncAllSessions()

      // 验证新变量已同步
      assert.strictEqual(session1.get("step"), "analyze")
      assert.strictEqual(session2.get("step"), "analyze")

      // 6. 生成报告
      const report = coordinator.generateReport()
      assert(report.includes("全局变量共享池报告"))
    })

    it("应该计算 Delta 压缩率", () => {
      const coordinator = new GlobalVariableCoordinator()

      // 初始化较大的变量集
      const initialVars: VariableSet = {}
      for (let i = 0; i < 20; i++) {
        initialVars[`var_${i}`] = `value_${i}`.repeat(10)
      }

      coordinator.initializeGlobal(initialVars)

      // 获取初始快照大小
      const initialStats = coordinator.getDeltaStats()
      const snapshotSize = initialStats.snapshot_size

      // 只修改 1 个变量
      coordinator.updateGlobal("var_0", "updated_value")
      const delta = coordinator.syncAllSessions()

      // Delta 应该远小于完整快照
      const deltaSize = JSON.stringify(delta).length
      assert(deltaSize < snapshotSize / 2) // Delta 应该小于快照的一半
    })
  })
})

console.log("\n✅ 变量共享池测试全部通过！")
