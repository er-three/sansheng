/**
 * 优化的约束发现模块 - Phase 5
 * 支持约束分级注入，减少不必要的约束加载
 */

import * as path from "path"
import * as fs from "fs"
import { ConstraintDefinition } from "../types.js"
import { parseConstraintFile } from "./parser.js"
import { getFromMemoryCache, saveToMemoryCache } from "./cache.js"
import { log } from "../utils.js"
import {
  getConstraintInjectionProfile,
  estimateSavingsPercentage,
  ConstraintScope,
} from "../config/constraint-profile.js"

/**
 * 按照注入配置发现约束（优化版）
 * 仅加载指定范围内的约束，减少 token 消耗
 */
export function discoverConstraintsOptimized(
  agentName: string,
  domain: string,
  projectRoot: string
): ConstraintDefinition[] {
  // Phase 5: 获取约束注入配置
  const profile = getConstraintInjectionProfile(agentName, domain)
  const constraintsDir = path.join(projectRoot, ".opencode", "constraints")

  if (!fs.existsSync(constraintsDir)) {
    return []
  }

  const constraints: ConstraintDefinition[] = []
  const seen = new Map<string, ConstraintDefinition>()

  // 根据配置的 scopes 选择性加载约束
  const scopesToLoad = new Set(profile.scopes)

  // 1️⃣ 加载 UNIVERSAL 约束（必须）
  if (scopesToLoad.has(ConstraintScope.UNIVERSAL)) {
    const globalFile1 = path.join(constraintsDir, "global.md")
    const globalFile2 = path.join(constraintsDir, "global.yaml")
    const globalFile = fs.existsSync(globalFile1) ? globalFile1 : globalFile2

    if (fs.existsSync(globalFile)) {
      const globalConstraints = parseConstraintFile(globalFile)
      // 过滤：仅保留 universal 分类的约束
      for (const c of globalConstraints) {
        if (c.source?.includes("universal") || !c.source) {
          seen.set(c.name, c)
        }
      }
      log(
        "Constraint",
        `Loaded universal constraints for ${agentName}:${domain} (${globalConstraints.length} total, filtered)`
      )
    }
  }

  // 2️⃣ 加载 Agent 特化约束（如果配置要求）
  const agentSpecificScopes = [
    ConstraintScope.AGENT_IMPLEMENTATION,
    ConstraintScope.AGENT_CODE_REVIEW,
    ConstraintScope.AGENT_VERIFICATION,
  ]

  for (const scope of agentSpecificScopes) {
    if (scopesToLoad.has(scope)) {
      const agentFile1 = path.join(constraintsDir, "agents", `${agentName}.md`)
      const agentFile2 = path.join(constraintsDir, "agents", `${agentName}.yaml`)

      if (fs.existsSync(agentFile1)) {
        const agentConstraints = parseConstraintFile(agentFile1)
        for (const c of agentConstraints) {
          if (c.source?.includes(scope.toString())) {
            seen.set(c.name, c)
          }
        }
      } else if (fs.existsSync(agentFile2)) {
        const agentConstraints = parseConstraintFile(agentFile2)
        for (const c of agentConstraints) {
          if (c.source?.includes(scope.toString())) {
            seen.set(c.name, c)
          }
        }
      }
    }
  }

  // 3️⃣ 加载其他需要的约束
  for (const scope of scopesToLoad) {
    if (
      ![
        ConstraintScope.UNIVERSAL,
        ConstraintScope.AGENT_IMPLEMENTATION,
        ConstraintScope.AGENT_CODE_REVIEW,
        ConstraintScope.AGENT_VERIFICATION,
      ].includes(scope)
    ) {
      // 尝试加载特定约束文件
      const scopeFile1 = path.join(constraintsDir, `${scope}.md`)
      const scopeFile2 = path.join(constraintsDir, `${scope}.yaml`)

      if (fs.existsSync(scopeFile1)) {
        const scopeConstraints = parseConstraintFile(scopeFile1)
        for (const c of scopeConstraints) {
          seen.set(c.name, c)
        }
      } else if (fs.existsSync(scopeFile2)) {
        const scopeConstraints = parseConstraintFile(scopeFile2)
        for (const c of scopeConstraints) {
          seen.set(c.name, c)
        }
      }
    }
  }

  return Array.from(seen.values())
}

/**
 * 带缓存的优化约束发现
 */
export function discoverConstraintsWithCacheOptimized(
  agentName: string,
  domain: string,
  projectRoot: string
): ConstraintDefinition[] {
  // 优化：缓存 key 包含 Agent 信息，可以区分不同 Agent 的约束集
  const cacheKey = `${domain}:${agentName}`

  // 尝试从内存缓存获取
  const cached = getFromMemoryCache(agentName, domain)
  if (cached) {
    log(
      "Constraint",
      `Cache HIT: ${cacheKey} (${cached.length} constraints, optimized)`
    )
    return cached
  }

  // 缓存 MISS，发现约束（使用优化版本）
  log("Constraint", `Cache MISS: ${cacheKey}, discovering with optimization...`)
  const profile = getConstraintInjectionProfile(agentName, domain)
  const constraints = discoverConstraintsOptimized(agentName, domain, projectRoot)

  // 计算节省百分比
  const savingsPercent = estimateSavingsPercentage(agentName, domain)

  log(
    "Constraint",
    `Discovered ${constraints.length} constraints for ${agentName}:${domain} (saved ${savingsPercent}% through leveled injection)`
  )

  // 保存到内存缓存
  saveToMemoryCache(agentName, domain, constraints)

  return constraints
}

/**
 * 对比优化前后的约束消耗
 * 用于验证优化效果
 */
export function analyzeConstraintOptimization(
  agentName: string,
  domain: string,
  projectRoot: string
): { before: number; after: number; savings: string } {
  // 模拟未优化版本（加载所有约束）
  const constraintsDir = path.join(projectRoot, ".opencode", "constraints")
  let totalConstraintsCount = 0

  if (fs.existsSync(constraintsDir)) {
    const files = fs.readdirSync(constraintsDir)
    for (const file of files) {
      if (file.endsWith(".md") || file.endsWith(".yaml")) {
        totalConstraintsCount += parseConstraintFile(
          path.join(constraintsDir, file)
        ).length
      }
    }
  }

  // 实际优化版本
  const optimizedConstraints = discoverConstraintsWithCacheOptimized(
    agentName,
    domain,
    projectRoot
  )

  // 估算 token 消耗（粗略估计：每条约束约 500 tokens）
  const beforeTokens = totalConstraintsCount * 500
  const afterTokens = optimizedConstraints.length * 500
  const savings = (
    ((beforeTokens - afterTokens) / beforeTokens) *
    100
  ).toFixed(1)

  return {
    before: beforeTokens,
    after: afterTokens,
    savings: `${savings}%`,
  }
}
