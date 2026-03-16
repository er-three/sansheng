/**
 * 变量共享池 - Phase 5 P2-3
 *
 * 支持全局变量共享和增量传输：
 * - 全局变量仓库
 * - Delta 计算和传输
 * - 跨 Session 同步
 * - 变量版本管理
 *
 * 目标：减少重复变量传输，节省 5-15% token
 */

import { log } from "../utils.js"
import * as crypto from "crypto"

/**
 * 变量值类型
 */
export type VariableValue = string | number | boolean | object | null

/**
 * 变量定义
 */
export interface Variable {
  key: string
  value: VariableValue
  type: "string" | "number" | "boolean" | "object"
  created_at: number
  updated_at: number
  version: number
}

/**
 * 变量集合
 */
export interface VariableSet {
  [key: string]: VariableValue
}

/**
 * 变量 Delta（增量更新）
 */
export interface VariableDelta {
  added: VariableSet // 新增变量
  updated: VariableSet // 更新的变量
  deleted: string[] // 删除的变量
  hash: string // Delta 的哈希值
  timestamp: number
  version: number
}

/**
 * 全局变量仓库
 */
export class GlobalVariablePool {
  private variables: Map<string, Variable> = new Map()
  private history: VariableDelta[] = []
  private version = 0
  private lastHash = ""

  /**
   * 获取所有变量
   */
  getAll(): VariableSet {
    const result: VariableSet = {}
    for (const [key, variable] of this.variables.entries()) {
      result[key] = variable.value
    }
    return result
  }

  /**
   * 获取单个变量
   */
  get(key: string): VariableValue | undefined {
    return this.variables.get(key)?.value
  }

  /**
   * 设置变量
   */
  set(key: string, value: VariableValue): void {
    const existing = this.variables.get(key)
    const now = Date.now()

    this.variables.set(key, {
      key,
      value,
      type: this.inferType(value),
      created_at: existing?.created_at || now,
      updated_at: now,
      version: (existing?.version || 0) + 1,
    })

    log("VariablePool", `Set variable: ${key} = ${JSON.stringify(value).substring(0, 50)}`)
  }

  /**
   * 批量设置变量
   */
  setMany(vars: VariableSet): void {
    for (const [key, value] of Object.entries(vars)) {
      this.set(key, value)
    }
  }

  /**
   * 删除变量
   */
  delete(key: string): boolean {
    const existed = this.variables.delete(key)
    if (existed) {
      log("VariablePool", `Deleted variable: ${key}`)
    }
    return existed
  }

  /**
   * 清空所有变量
   */
  clear(): void {
    this.variables.clear()
    log("VariablePool", "Cleared all variables")
  }

  /**
   * 检查变量是否存在
   */
  has(key: string): boolean {
    return this.variables.has(key)
  }

  /**
   * 获取变量数量
   */
  size(): number {
    return this.variables.size
  }

  /**
   * 推断变量类型
   */
  private inferType(value: VariableValue): "string" | "number" | "boolean" | "object" {
    if (typeof value === "string") return "string"
    if (typeof value === "number") return "number"
    if (typeof value === "boolean") return "boolean"
    return "object"
  }

  /**
   * 获取当前哈希值
   */
  getHash(): string {
    const content = JSON.stringify(this.getAll())
    return crypto.createHash("md5").update(content).digest("hex").substring(0, 16)
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number
    string: number
    number: number
    boolean: number
    object: number
    version: number
    totalSize: number
  } {
    let stringCount = 0,
      numberCount = 0,
      booleanCount = 0,
      objectCount = 0
    let totalSize = 0

    for (const variable of this.variables.values()) {
      const size = JSON.stringify(variable.value).length
      totalSize += size

      switch (variable.type) {
        case "string":
          stringCount++
          break
        case "number":
          numberCount++
          break
        case "boolean":
          booleanCount++
          break
        case "object":
          objectCount++
          break
      }
    }

    return {
      total: this.variables.size,
      string: stringCount,
      number: numberCount,
      boolean: booleanCount,
      object: objectCount,
      version: this.version,
      totalSize,
    }
  }
}

/**
 * Delta 变量管理器
 */
export class VariableDeltaManager {
  private pool: GlobalVariablePool
  private lastSnapshot: VariableSet = {}
  private deltas: VariableDelta[] = []
  private version = 0

  constructor(pool: GlobalVariablePool) {
    this.pool = pool
    this.lastSnapshot = pool.getAll()
  }

  /**
   * 计算增量
   */
  computeDelta(): VariableDelta {
    const current = this.pool.getAll()
    const added: VariableSet = {}
    const updated: VariableSet = {}
    const deleted: string[] = []

    // 检查新增和更新
    for (const [key, value] of Object.entries(current)) {
      if (!(key in this.lastSnapshot)) {
        added[key] = value
      } else if (JSON.stringify(this.lastSnapshot[key]) !== JSON.stringify(value)) {
        updated[key] = value
      }
    }

    // 检查删除
    for (const key of Object.keys(this.lastSnapshot)) {
      if (!(key in current)) {
        deleted.push(key)
      }
    }

    const hash = this.computeDeltaHash(added, updated, deleted)
    this.version++

    const delta: VariableDelta = {
      added,
      updated,
      deleted,
      hash,
      timestamp: Date.now(),
      version: this.version,
    }

    this.deltas.push(delta)
    this.lastSnapshot = { ...current }

    return delta
  }

  /**
   * 计算 Delta 的哈希
   */
  private computeDeltaHash(
    added: VariableSet,
    updated: VariableSet,
    deleted: string[]
  ): string {
    const content = JSON.stringify({ added, updated, deleted })
    return crypto.createHash("md5").update(content).digest("hex").substring(0, 12)
  }

  /**
   * 应用 Delta
   */
  applyDelta(delta: VariableDelta): void {
    for (const [key, value] of Object.entries(delta.added)) {
      this.pool.set(key, value)
    }

    for (const [key, value] of Object.entries(delta.updated)) {
      this.pool.set(key, value)
    }

    for (const key of delta.deleted) {
      this.pool.delete(key)
    }

    this.lastSnapshot = this.pool.getAll()
    log("VariablePool", `Applied delta v${delta.version}: +${Object.keys(delta.added).length} ~${Object.keys(delta.updated).length} -${delta.deleted.length}`)
  }

  /**
   * 获取增量历史
   */
  getDeltaHistory(limit: number = 10): VariableDelta[] {
    return this.deltas.slice(-limit)
  }

  /**
   * 重置快照
   */
  resetSnapshot(): void {
    this.lastSnapshot = this.pool.getAll()
    this.deltas = []
    this.version = 0
  }

  /**
   * 获取统计
   */
  getStats(): {
    deltas_recorded: number
    current_version: number
    snapshot_size: number
    total_delta_size: number
  } {
    let totalDeltaSize = 0
    for (const delta of this.deltas) {
      totalDeltaSize += JSON.stringify(delta).length
    }

    return {
      deltas_recorded: this.deltas.length,
      current_version: this.version,
      snapshot_size: JSON.stringify(this.lastSnapshot).length,
      total_delta_size: totalDeltaSize,
    }
  }
}

/**
 * Session 变量管理器
 */
export class SessionVariableManager {
  private sessionId: string
  private variables: VariableSet = {}
  private version = 0
  private lastSyncTime = 0

  constructor(sessionId: string) {
    this.sessionId = sessionId
    this.lastSyncTime = Date.now()
  }

  /**
   * 同步全局变量（初始化）
   */
  syncGlobal(globalVars: VariableSet): void {
    this.variables = { ...globalVars }
    this.version = 0
    this.lastSyncTime = Date.now()
    log("VariablePool", `Session ${this.sessionId} synced with global variables (${Object.keys(globalVars).length} vars)`)
  }

  /**
   * 应用增量更新
   */
  applyDelta(delta: VariableDelta): void {
    for (const [key, value] of Object.entries(delta.added)) {
      this.variables[key] = value
    }

    for (const [key, value] of Object.entries(delta.updated)) {
      this.variables[key] = value
    }

    for (const key of delta.deleted) {
      delete this.variables[key]
    }

    this.version = delta.version
    log("VariablePool", `Session ${this.sessionId} applied delta v${delta.version}`)
  }

  /**
   * 获取变量
   */
  get(key: string): VariableValue | undefined {
    return this.variables[key]
  }

  /**
   * 获取所有变量
   */
  getAll(): VariableSet {
    return { ...this.variables }
  }

  /**
   * 设置本地变量（Session 级别）
   */
  setLocal(key: string, value: VariableValue): void {
    this.variables[key] = value
  }

  /**
   * 获取统计
   */
  getStats(): {
    session_id: string
    variable_count: number
    version: number
    last_sync: number
    size_bytes: number
  } {
    return {
      session_id: this.sessionId,
      variable_count: Object.keys(this.variables).length,
      version: this.version,
      last_sync: this.lastSyncTime,
      size_bytes: JSON.stringify(this.variables).length,
    }
  }
}

/**
 * 全局变量管理协调器
 */
export class GlobalVariableCoordinator {
  private globalPool: GlobalVariablePool = new GlobalVariablePool()
  private deltaManager: VariableDeltaManager = new VariableDeltaManager(this.globalPool)
  private sessions: Map<string, SessionVariableManager> = new Map()

  /**
   * 初始化全局变量
   */
  initializeGlobal(vars: VariableSet): void {
    this.globalPool.setMany(vars)
    this.deltaManager.resetSnapshot()
    log("VariablePool", `Initialized global pool with ${Object.keys(vars).length} variables`)
  }

  /**
   * 注册新 Session
   */
  registerSession(sessionId: string): SessionVariableManager {
    const manager = new SessionVariableManager(sessionId)
    manager.syncGlobal(this.globalPool.getAll())
    this.sessions.set(sessionId, manager)
    return manager
  }

  /**
   * 获取 Session 管理器
   */
  getSessionManager(sessionId: string): SessionVariableManager | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * 更新全局变量
   */
  updateGlobal(key: string, value: VariableValue): void {
    this.globalPool.set(key, value)
  }

  /**
   * 批量更新全局变量
   */
  updateGlobalMany(vars: VariableSet): void {
    this.globalPool.setMany(vars)
  }

  /**
   * 同步所有 Session
   */
  syncAllSessions(): VariableDelta {
    const delta = this.deltaManager.computeDelta()

    if (Object.keys(delta.added).length > 0 || Object.keys(delta.updated).length > 0 || delta.deleted.length > 0) {
      for (const session of this.sessions.values()) {
        session.applyDelta(delta)
      }
      log("VariablePool", `Synced ${this.sessions.size} sessions with delta v${delta.version}`)
    }

    return delta
  }

  /**
   * 广播变量更新
   */
  broadcast(key: string, value: VariableValue): void {
    this.updateGlobal(key, value)
    this.syncAllSessions()
  }

  /**
   * 获取全局变量池统计
   */
  getPoolStats() {
    return this.globalPool.getStats()
  }

  /**
   * 获取 Delta 管理器统计
   */
  getDeltaStats() {
    return this.deltaManager.getStats()
  }

  /**
   * 生成完整报告
   */
  generateReport(): string {
    const poolStats = this.getPoolStats()
    const deltaStats = this.getDeltaStats()

    const lines = [
      "## 全局变量共享池报告",
      "",
      "### 变量池统计",
      `- 总变量数：${poolStats.total}`,
      `- 字符串：${poolStats.string}`,
      `- 数字：${poolStats.number}`,
      `- 布尔：${poolStats.boolean}`,
      `- 对象：${poolStats.object}`,
      `- 总大小：${(poolStats.totalSize / 1024).toFixed(2)} KB`,
      `- 版本：${poolStats.version}`,
      "",
      "### Delta 管理统计",
      `- 记录的 Delta：${deltaStats.deltas_recorded}`,
      `- 当前版本：${deltaStats.current_version}`,
      `- 快照大小：${(deltaStats.snapshot_size / 1024).toFixed(2)} KB`,
      `- 总 Delta 大小：${(deltaStats.total_delta_size / 1024).toFixed(2)} KB`,
      "",
      "### Session 同步",
      `- 活跃 Session：${this.sessions.size}`,
      ...Array.from(this.sessions.entries())
        .map(([sessionId, manager]) => {
          const stats = manager.getStats()
          return `  - ${sessionId}：${stats.variable_count} 变量（v${stats.version}）`
        })
        .slice(0, 5), // 只显示前 5 个
      "",
      "### 预期节省",
      "- 全局变量：避免重复传输基础数据",
      "- Delta 传输：仅传输变化部分",
      `- 压缩率：约 ${((deltaStats.snapshot_size - deltaStats.total_delta_size) / deltaStats.snapshot_size * 100).toFixed(1)}%`,
      "",
    ]

    return lines.join("\n")
  }
}
