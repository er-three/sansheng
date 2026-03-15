/**
 * 多层缓存架构 - Phase 5 P2 优化
 *
 * 支持三种缓存层：
 * 1. ConstraintCache - 约束缓存（已有）
 * 2. PlanCache - 计划缓存
 * 3. StepResultCache - 步骤结果缓存
 *
 * 目标：减少重复计算和传输，额外节省 15-25% token
 */

import * as crypto from "crypto"
import { log } from "../utils.js"

/**
 * 智能缓存 Key 生成器
 * 格式：domain:agent:skill:hash(input)
 */
export class CacheKeyGenerator {
  /**
   * 生成缓存 key
   */
  static generateKey(domain: string, agent: string, skill: string, input?: any): string {
    const inputHash = input ? this.hashInput(input) : "default"
    return `${domain}:${agent}:${skill}:${inputHash}`
  }

  /**
   * 为输入生成 hash
   */
  static hashInput(input: any): string {
    const inputStr = typeof input === "string" ? input : JSON.stringify(input)
    return crypto.createHash("md5").update(inputStr).digest("hex").substring(0, 8)
  }

  /**
   * 从 key 中提取组件
   */
  static parseKey(key: string): {
    domain: string
    agent: string
    skill: string
    hash: string
  } {
    const parts = key.split(":")
    return {
      domain: parts[0],
      agent: parts[1],
      skill: parts[2],
      hash: parts[3]
    }
  }
}

/**
 * 缓存条目元数据
 */
export interface CacheEntryMetadata {
  createdAt: number
  lastAccessed: number
  accessCount: number
  version: string
  size: number // 字节
}

/**
 * 缓存条目
 */
export interface CacheEntry<T> {
  key: string
  data: T
  metadata: CacheEntryMetadata
}

/**
 * 缓存统计
 */
export interface CacheStats {
  hits: number
  misses: number
  size: number
  entries: number
  avgAccessCount: number
  hitRate: string
}

/**
 * 通用多层缓存类
 */
export class MultiLayerCache<T> {
  private cache: Map<string, CacheEntry<T>>
  private hits = 0
  private misses = 0
  private ttl: number
  private maxSize: number // 最大条目数
  private version: string

  constructor(options: {
    ttl?: number
    maxSize?: number
    version?: string
  } = {}) {
    this.cache = new Map()
    this.ttl = options.ttl || 3600000 // 默认 1 小时
    this.maxSize = options.maxSize || 1000 // 默认最多 1000 条目
    this.version = options.version || "1.0.0"
  }

  /**
   * 获取缓存
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.misses++
      return null
    }

    // 检查过期
    if (Date.now() - entry.metadata.createdAt > this.ttl) {
      this.cache.delete(key)
      this.misses++
      return null
    }

    // 更新访问统计
    entry.metadata.lastAccessed = Date.now()
    entry.metadata.accessCount++
    this.hits++

    return entry.data
  }

  /**
   * 设置缓存
   */
  set(key: string, data: T): void {
    // 检查是否超过最大条目数
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // 清除最少使用的条目
      this.evictLRU()
    }

    const size = JSON.stringify(data).length
    this.cache.set(key, {
      key,
      data,
      metadata: {
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 1,
        version: this.version,
        size
      }
    })
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    return this.cache.has(key)
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(2) : "0.00"

    let totalAccessCount = 0
    for (const entry of this.cache.values()) {
      totalAccessCount += entry.metadata.accessCount
    }

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      entries: this.cache.size,
      avgAccessCount: this.cache.size > 0 ? totalAccessCount / this.cache.size : 0,
      hitRate: `${hitRate}%`
    }
  }

  /**
   * 生成状态报告
   */
  getReport(): string {
    const stats = this.getStats()
    const topEntries = Array.from(this.cache.values())
      .sort((a, b) => b.metadata.accessCount - a.metadata.accessCount)
      .slice(0, 5)

    return [
      `## 缓存状态报告`,
      ``,
      `**统计数据**:`,
      `- 缓存命中: ${stats.hits}`,
      `- 缓存未中: ${stats.misses}`,
      `- 命中率: ${stats.hitRate}`,
      `- 条目数: ${stats.entries}/${this.maxSize}`,
      `- 平均访问数: ${stats.avgAccessCount.toFixed(2)}`,
      ``,
      `**热点条目 (Top 5)**:`,
      ...topEntries.map((e) => `- ${e.key}: ${e.metadata.accessCount} 次访问 (${e.metadata.size} 字节)`),
      ``
    ].join("\n")
  }

  /**
   * 清理过期条目
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.metadata.createdAt > this.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * 清除最少使用的条目 (LRU)
   */
  private evictLRU(): void {
    let lruKey: string | null = null
    let lruAccessCount = Infinity
    let lruTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      // 先按访问次数排序，次数少的优先淘汰；次数相同则按访问时间排序
      if (
        entry.metadata.accessCount < lruAccessCount ||
        (entry.metadata.accessCount === lruAccessCount && entry.metadata.lastAccessed < lruTime)
      ) {
        lruAccessCount = entry.metadata.accessCount
        lruTime = entry.metadata.lastAccessed
        lruKey = key
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey)
      log("Cache", `Evicted LRU entry: ${lruKey}`)
    }
  }

  /**
   * 预热缓存
   */
  warmup(entries: Array<{ key: string; data: T }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.data)
    }
    log("Cache", `Warmed up cache with ${entries.length} entries`)
  }
}

/**
 * 计划缓存
 */
export interface CachedPlan {
  id: string
  domain: string
  taskDescription: string
  steps: Array<{
    stepId: string
    name: string
    description: string
    agent: string
  }>
  rationale: string
  estimatedTime: number
}

export class PlanCache extends MultiLayerCache<CachedPlan> {
  constructor() {
    super({
      ttl: 7200000, // 2 小时
      maxSize: 500,
      version: "1.0.0"
    })
  }

  /**
   * 生成计划缓存 key
   */
  static generateKey(domain: string, agent: string, taskDescription: string): string {
    return CacheKeyGenerator.generateKey(domain, agent, "plan", taskDescription)
  }
}

/**
 * 步骤结果缓存
 */
export interface CachedStepResult {
  stepId: string
  status: "success" | "failed"
  output?: string
  executionTime: number
  timestamp: number
}

export class StepResultCache extends MultiLayerCache<CachedStepResult> {
  constructor() {
    super({
      ttl: 3600000, // 1 小时
      maxSize: 2000,
      version: "1.0.0"
    })
  }

  /**
   * 生成步骤结果缓存 key
   */
  static generateKey(domain: string, agent: string, stepId: string, input?: any): string {
    return CacheKeyGenerator.generateKey(domain, agent, `step:${stepId}`, input)
  }
}

/**
 * 缓存版本检测
 */
export class CacheVersionManager {
  private versions: Map<string, string> = new Map()

  /**
   * 注册文件版本
   */
  registerFile(filePath: string, hash: string): void {
    this.versions.set(filePath, hash)
  }

  /**
   * 检查文件版本是否已变化
   */
  hasChanged(filePath: string, newHash: string): boolean {
    const oldHash = this.versions.get(filePath)
    if (!oldHash) return true // 新文件视为已变化
    return oldHash !== newHash
  }

  /**
   * 更新文件版本
   */
  updateVersion(filePath: string, hash: string): void {
    this.versions.set(filePath, hash)
  }

  /**
   * 获取版本信息
   */
  getVersionInfo(): Map<string, string> {
    return new Map(this.versions)
  }
}

/**
 * 缓存预热器
 */
export class CacheWarmer {
  /**
   * 预热约束缓存
   */
  static warmupConstraintCache(
    cache: MultiLayerCache<any>,
    domains: string[],
    agents: string[]
  ): void {
    const entries = []
    for (const domain of domains) {
      for (const agent of agents) {
        const key = `${domain}:${agent}`
        entries.push({
          key,
          data: { domain, agent, constraints: [] }
        })
      }
    }
    cache.warmup(entries)
  }

  /**
   * 预热计划缓存
   */
  static warmupPlanCache(
    cache: PlanCache,
    commonTasks: Array<{ domain: string; agent: string; description: string; plan: CachedPlan }>
  ): void {
    const entries = commonTasks.map((task) => ({
      key: PlanCache.generateKey(task.domain, task.agent, task.description),
      data: task.plan
    }))
    cache.warmup(entries)
  }
}

/**
 * 全局缓存管理器
 */
export class GlobalCacheManager {
  private static constraintCache: MultiLayerCache<any> = new MultiLayerCache({
    ttl: 3600000,
    maxSize: 200,
    version: "1.0.0"
  })

  private static planCache: PlanCache = new PlanCache()
  private static stepResultCache: StepResultCache = new StepResultCache()
  private static versionManager: CacheVersionManager = new CacheVersionManager()

  /**
   * 获取约束缓存
   */
  static getConstraintCache(): MultiLayerCache<any> {
    return this.constraintCache
  }

  /**
   * 获取计划缓存
   */
  static getPlanCache(): PlanCache {
    return this.planCache
  }

  /**
   * 获取步骤结果缓存
   */
  static getStepResultCache(): StepResultCache {
    return this.stepResultCache
  }

  /**
   * 获取版本管理器
   */
  static getVersionManager(): CacheVersionManager {
    return this.versionManager
  }

  /**
   * 清理所有过期缓存
   */
  static cleanupAll(): number {
    let total = 0
    total += this.constraintCache.cleanup()
    total += this.planCache.cleanup()
    total += this.stepResultCache.cleanup()
    return total
  }

  /**
   * 生成综合报告
   */
  static getFullReport(): string {
    const lines = [
      "## 全局缓存管理器报告",
      "",
      "### 约束缓存",
      this.constraintCache.getReport(),
      "",
      "### 计划缓存",
      this.planCache.getReport(),
      "",
      "### 步骤结果缓存",
      this.stepResultCache.getReport(),
      ""
    ]

    return lines.join("\n")
  }

  /**
   * 清空所有缓存
   */
  static clearAll(): void {
    this.constraintCache.clear()
    this.planCache.clear()
    this.stepResultCache.clear()
  }
}
