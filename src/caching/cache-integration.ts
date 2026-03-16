/**
 * 缓存集成模块 - Phase 5 P2
 *
 * 将多层缓存系统与 OpenCode 插件集成：
 * - Constraint 缓存集成
 * - Plan 缓存集成
 * - Step 结果缓存集成
 * - Cache 预热机制
 * - Cache 清理策略
 */

import { log } from "../utils.js"
import {
  GlobalCacheManager,
  CacheKeyGenerator,
  PlanCache,
  StepResultCache,
  CachedPlan,
  CachedStepResult,
} from "./multi-layer-cache.js"

/**
 * 约束缓存集成
 */
export class ConstraintCacheIntegration {
  /**
   * 从缓存获取约束（带 fallback）
   */
  static getConstraintsCached(agentName: string, domain: string, loader: () => any[]): any[] {
    const constraintCache = GlobalCacheManager.getConstraintCache()
    const key = `${domain}:${agentName}`

    // 尝试从缓存获取
    let constraints = constraintCache.get(key)
    if (constraints) {
      log("Cache", `Constraint cache hit for ${key}`)
      return constraints
    }

    // 缓存未中，加载并存储
    log("Cache", `Constraint cache miss for ${key}, loading...`)
    constraints = loader()
    constraintCache.set(key, constraints)

    return constraints
  }

  /**
   * 获取缓存统计
   */
  static getStats() {
    return GlobalCacheManager.getConstraintCache().getStats()
  }

  /**
   * 清理过期约束
   */
  static cleanup(): number {
    return GlobalCacheManager.getConstraintCache().cleanup()
  }
}

/**
 * 计划缓存集成
 */
export class PlanCacheIntegration {
  /**
   * 从缓存获取或生成计划
   */
  static getPlanCached(
    domain: string,
    agent: string,
    taskDescription: string,
    generator: () => CachedPlan
  ): CachedPlan {
    const planCache = GlobalCacheManager.getPlanCache()
    const key = PlanCache.generateKey(domain, agent, taskDescription)

    // 尝试从缓存获取
    let plan = planCache.get(key)
    if (plan) {
      log("Cache", `Plan cache hit for ${key}`)
      return plan
    }

    // 缓存未中，生成并存储
    log("Cache", `Plan cache miss for ${key}, generating...`)
    plan = generator()
    planCache.set(key, plan)

    return plan
  }

  /**
   * 预热计划缓存（用于启动时的常见任务）
   */
  static warmupCommonPlans(
    commonTasks: Array<{
      domain: string
      agent: string
      description: string
      plan: CachedPlan
    }>
  ): void {
    const planCache = GlobalCacheManager.getPlanCache()
    const entries = commonTasks.map((task) => ({
      key: PlanCache.generateKey(task.domain, task.agent, task.description),
      data: task.plan,
    }))
    planCache.warmup(entries)
    log("Cache", `Warmed up ${commonTasks.length} common plans`)
  }

  /**
   * 获取缓存统计
   */
  static getStats() {
    return GlobalCacheManager.getPlanCache().getStats()
  }

  /**
   * 生成报告
   */
  static getReport(): string {
    return GlobalCacheManager.getPlanCache().getReport()
  }
}

/**
 * 步骤结果缓存集成
 */
export class StepResultCacheIntegration {
  /**
   * 从缓存获取或执行步骤
   */
  static getStepResultCached(
    domain: string,
    agent: string,
    stepId: string,
    input: any,
    executor: () => CachedStepResult
  ): CachedStepResult {
    const stepCache = GlobalCacheManager.getStepResultCache()
    const key = StepResultCache.generateKey(domain, agent, stepId, input)

    // 尝试从缓存获取
    let result = stepCache.get(key)
    if (result) {
      log("Cache", `Step result cache hit for ${key}`)
      return result
    }

    // 缓存未中，执行并存储
    log("Cache", `Step result cache miss for ${key}, executing...`)
    result = executor()
    stepCache.set(key, result)

    return result
  }

  /**
   * 更新步骤结果缓存
   */
  static updateStepResult(
    domain: string,
    agent: string,
    stepId: string,
    input: any,
    result: CachedStepResult
  ): void {
    const stepCache = GlobalCacheManager.getStepResultCache()
    const key = StepResultCache.generateKey(domain, agent, stepId, input)
    stepCache.set(key, result)
    log("Cache", `Updated step result in cache for ${key}`)
  }

  /**
   * 获取缓存统计
   */
  static getStats() {
    return GlobalCacheManager.getStepResultCache().getStats()
  }

  /**
   * 生成报告
   */
  static getReport(): string {
    return GlobalCacheManager.getStepResultCache().getReport()
  }
}

/**
 * 缓存版本管理集成
 */
export class CacheVersionIntegration {
  /**
   * 注册约束文件版本（用于检测约束是否更新）
   */
  static registerConstraintFile(filePath: string, hash: string): void {
    const versionManager = GlobalCacheManager.getVersionManager()
    versionManager.registerFile(filePath, hash)
    log("Cache", `Registered constraint file version: ${filePath}`)
  }

  /**
   * 检查约束文件是否已变化
   */
  static hasConstraintFileChanged(filePath: string, newHash: string): boolean {
    const versionManager = GlobalCacheManager.getVersionManager()
    return versionManager.hasChanged(filePath, newHash)
  }

  /**
   * 清除所有版本信息（用于强制重新加载）
   */
  static clearVersionInfo(): void {
    GlobalCacheManager.getVersionManager()
    // 创建新实例将导致所有文件被视为已变化
  }
}

/**
 * 全局缓存清理策略
 */
export class CacheCleanupStrategy {
  /**
   * 执行定期清理（建议每 30 分钟运行一次）
   */
  static performPeriodicCleanup(): number {
    const cleaned = GlobalCacheManager.cleanupAll()
    log("Cache", `Periodic cleanup: removed ${cleaned} expired entries`)
    return cleaned
  }

  /**
   * 清理约束缓存（当约束文件变化时）
   */
  static clearConstraintCacheOnFileChange(): void {
    const constraintCache = GlobalCacheManager.getConstraintCache()
    constraintCache.clear()
    log("Cache", "Cleared all constraint cache due to file changes")
  }

  /**
   * 清理计划缓存（用于新会话）
   */
  static clearPlanCacheForNewSession(): void {
    const planCache = GlobalCacheManager.getPlanCache()
    const oldStats = planCache.getStats()
    planCache.clear()
    log("Cache", `Cleared plan cache (was ${oldStats.entries} entries)`)
  }

  /**
   * 清理步骤结果缓存（在步骤定义变化时）
   */
  static clearStepResultCacheOnDefinitionChange(): void {
    const stepCache = GlobalCacheManager.getStepResultCache()
    const oldStats = stepCache.getStats()
    stepCache.clear()
    log("Cache", `Cleared step result cache (was ${oldStats.entries} entries)`)
  }

  /**
   * 清空所有缓存（用于强制刷新）
   */
  static clearAllCaches(): void {
    GlobalCacheManager.clearAll()
    log("Cache", "Cleared all caches")
  }
}

/**
 * 缓存监控和报告
 */
export class CacheMonitoring {
  /**
   * 生成完整的缓存监控报告
   */
  static generateFullReport(): string {
    const lines = [
      "# 缓存系统监控报告",
      "",
      GlobalCacheManager.getFullReport(),
      "",
      "## 缓存清理建议",
      "",
    ]

    // 检查各缓存是否接近满容
    const constraintStats = GlobalCacheManager.getConstraintCache().getStats()
    const planStats = GlobalCacheManager.getPlanCache().getStats()
    const stepStats = GlobalCacheManager.getStepResultCache().getStats()

    if (constraintStats.hitRate === "0.00%") {
      lines.push("- [WARN] 约束缓存命中率为 0%，可能需要预热")
    }
    if (parseFloat(planStats.hitRate) < 30) {
      lines.push("- [WARN] 计划缓存命中率偏低，可能需要调整 TTL 或预热")
    }
    if (parseFloat(stepStats.hitRate) < 50) {
      lines.push("- [WARN] 步骤结果缓存命中率偏低，可能需要增加缓存大小")
    }

    lines.push("")
    lines.push("## 缓存优化建议")

    const totalHits = constraintStats.hits + planStats.hits + stepStats.hits
    if (totalHits > 0) {
      lines.push(`- [OK] 缓存命中 ${totalHits} 次，有效降低了 token 消耗`)
    }

    if (constraintStats.avgAccessCount > 5) {
      lines.push("- [OK] 约束被频繁访问，缓存策略有效")
    }

    return lines.join("\n")
  }

  /**
   * 监控缓存大小
   */
  static monitorCacheSizes(): {
    constraint: number
    plan: number
    step: number
    total: number
  } {
    const constraintCache = GlobalCacheManager.getConstraintCache()
    const planCache = GlobalCacheManager.getPlanCache()
    const stepCache = GlobalCacheManager.getStepResultCache()

    const sizes = {
      constraint: constraintCache.getStats().entries,
      plan: planCache.getStats().entries,
      step: stepCache.getStats().entries,
      total: 0,
    }

    sizes.total = sizes.constraint + sizes.plan + sizes.step

    return sizes
  }

  /**
   * 获取缓存命中率汇总
   */
  static getHitRateSummary(): {
    constraint: string
    plan: string
    step: string
    overall: string
  } {
    const constraintStats = GlobalCacheManager.getConstraintCache().getStats()
    const planStats = GlobalCacheManager.getPlanCache().getStats()
    const stepStats = GlobalCacheManager.getStepResultCache().getStats()

    const totalHits = constraintStats.hits + planStats.hits + stepStats.hits
    const totalMisses = constraintStats.misses + planStats.misses + stepStats.misses
    const overall = totalHits + totalMisses > 0
      ? ((totalHits / (totalHits + totalMisses)) * 100).toFixed(2)
      : "0.00"

    return {
      constraint: constraintStats.hitRate,
      plan: planStats.hitRate,
      step: stepStats.hitRate,
      overall: `${overall}%`,
    }
  }
}
