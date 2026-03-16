/**
 * 约束缓存模块
 * 支持内存缓存和磁盘缓存
 */

import { ConstraintDefinition } from "../types.js"
import { getCacheKey, getFileHash } from "../utils.js"

// ─────────────────── 内存缓存 ───────────────────

interface MemoryCacheEntry {
  constraints: ConstraintDefinition[]
  timestamp: number
}

const memoryCache = new Map<string, MemoryCacheEntry>()
const MEMORY_CACHE_TTL = 3600000 // 1 小时

/**
 * 从内存缓存获取约束
 */
export function getFromMemoryCache(agentName: string, domain: string): ConstraintDefinition[] | null {
  const key = getCacheKey(agentName, domain)
  const cached = memoryCache.get(key)

  if (cached) {
    // 检查是否过期
    if (Date.now() - cached.timestamp < MEMORY_CACHE_TTL) {
      return cached.constraints
    }
    // 过期，删除
    memoryCache.delete(key)
  }

  return null
}

/**
 * 保存约束到内存缓存
 */
export function saveToMemoryCache(
  agentName: string,
  domain: string,
  constraints: ConstraintDefinition[]
): void {
  const key = getCacheKey(agentName, domain)
  memoryCache.set(key, {
    constraints,
    timestamp: Date.now()
  })
}

/**
 * 清除内存缓存
 */
export function clearMemoryCache(): void {
  memoryCache.clear()
}

/**
 * 获取内存缓存统计信息
 */
export function getMemoryCacheStats(): {
  size: number
  entries: Array<{ key: string; constraints: number }>
} {
  const entries = Array.from(memoryCache.entries()).map(([key, value]) => ({
    key,
    constraints: value.constraints.length
  }))

  return {
    size: memoryCache.size,
    entries
  }
}

// ─────────────────── 清理过期缓存 ───────────────────

/**
 * 清理过期的内存缓存条目
 */
export function cleanupExpiredCache(): number {
  let cleaned = 0
  const now = Date.now()

  for (const [key, entry] of memoryCache.entries()) {
    if (now - entry.timestamp >= MEMORY_CACHE_TTL) {
      memoryCache.delete(key)
      cleaned++
    }
  }

  return cleaned
}

// ─────────────────── 缓存统计 ───────────────────

/**
 * 获取缓存状态报告
 */
export function getCacheReport(): string {
  const stats = getMemoryCacheStats()

  return [
    `## 约束缓存状态`,
    ``,
    `- 内存缓存项数：${stats.size}`,
    ...stats.entries.map((e) => `  - ${e.key}：${e.constraints} 个约束`),
    ``
  ].join("\n")
}
