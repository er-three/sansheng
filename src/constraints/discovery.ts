/**
 * 约束发现模块
 * 按照轻量级约定自动发现约束文件
 */

import * as path from "path"
import * as fs from "fs"
import { ConstraintDefinition } from "../types.js"
import { parseConstraintFile } from "./parser.js"
import { getFromMemoryCache, saveToMemoryCache } from "./cache.js"
import { log } from "../utils.js"

/**
 * 按照轻量级约定发现约束文件
 *
 * 搜索顺序（后者覆盖前者）：
 * 1. global.md / global.yaml
 * 2. domains/{domain}/ 目录 或 domains/{domain}.md 文件
 * 3. agents/{agent}.md / agents/{agent}.yaml
 * 4. domains/{domain}/{agent}.md / domains/{domain}/{agent}.yaml
 */
export function discoverConstraints(
  agentName: string,
  domain: string,
  projectRoot: string
): ConstraintDefinition[] {
  const constraintsDir = path.join(projectRoot, ".opencode", "constraints")

  // 如果约束目录不存在，返回空
  if (!fs.existsSync(constraintsDir)) {
    return []
  }

  const constraints: ConstraintDefinition[] = []
  const seen = new Map<string, ConstraintDefinition>() // 去重：按 name 去重

  // 1️⃣ 加载全局约束
  const globalFile1 = path.join(constraintsDir, "global.md")
  const globalFile2 = path.join(constraintsDir, "global.yaml")
  const globalFile = fs.existsSync(globalFile1) ? globalFile1 : globalFile2

  if (fs.existsSync(globalFile)) {
    const globalConstraints = parseConstraintFile(globalFile)
    for (const c of globalConstraints) {
      seen.set(c.name, c)
    }
  }

  // 2️⃣ 加载域约束
  // 优先级：.opencode/constraints/domains/{domain}/ > .opencode/constraints/domains/{domain}.md
  const domainDir = path.join(constraintsDir, "domains", domain)
  const domainFile1 = path.join(constraintsDir, "domains", `${domain}.md`)
  const domainFile2 = path.join(constraintsDir, "domains", `${domain}.yaml`)
  const domainFile3 = path.join(constraintsDir, `${domain}.md`)
  const domainFile4 = path.join(constraintsDir, `${domain}.yaml`)

  // 先检查目录
  if (fs.existsSync(domainDir) && fs.statSync(domainDir).isDirectory()) {
    const files = fs
      .readdirSync(domainDir)
      .filter((f) => f.endsWith(".md") || f.endsWith(".yaml"))

    for (const file of files) {
      const filePath = path.join(domainDir, file)
      const domainConstraints = parseConstraintFile(filePath)
      for (const c of domainConstraints) {
        seen.set(c.name, c)
      }
    }
  } else if (fs.existsSync(domainFile1)) {
    const domainConstraints = parseConstraintFile(domainFile1)
    for (const c of domainConstraints) {
      seen.set(c.name, c)
    }
  } else if (fs.existsSync(domainFile2)) {
    const domainConstraints = parseConstraintFile(domainFile2)
    for (const c of domainConstraints) {
      seen.set(c.name, c)
    }
  } else if (fs.existsSync(domainFile3)) {
    const domainConstraints = parseConstraintFile(domainFile3)
    for (const c of domainConstraints) {
      seen.set(c.name, c)
    }
  } else if (fs.existsSync(domainFile4)) {
    const domainConstraints = parseConstraintFile(domainFile4)
    for (const c of domainConstraints) {
      seen.set(c.name, c)
    }
  }

  // 3️⃣ 加载 Agent 约束
  const agentFile1 = path.join(constraintsDir, "agents", `${agentName}.md`)
  const agentFile2 = path.join(constraintsDir, "agents", `${agentName}.yaml`)

  if (fs.existsSync(agentFile1)) {
    const agentConstraints = parseConstraintFile(agentFile1)
    for (const c of agentConstraints) {
      seen.set(c.name, c)
    }
  } else if (fs.existsSync(agentFile2)) {
    const agentConstraints = parseConstraintFile(agentFile2)
    for (const c of agentConstraints) {
      seen.set(c.name, c)
    }
  }

  // 4️⃣ 加载细粒度约束（domain + agent 组合）
  const specificFile1 = path.join(constraintsDir, "domains", domain, `${agentName}.md`)
  const specificFile2 = path.join(constraintsDir, "domains", domain, `${agentName}.yaml`)

  if (fs.existsSync(specificFile1)) {
    const specificConstraints = parseConstraintFile(specificFile1)
    for (const c of specificConstraints) {
      seen.set(c.name, c)
    }
  } else if (fs.existsSync(specificFile2)) {
    const specificConstraints = parseConstraintFile(specificFile2)
    for (const c of specificConstraints) {
      seen.set(c.name, c)
    }
  }

  // 返回去重后的约束列表
  return Array.from(seen.values())
}

/**
 * 带缓存的约束发现
 */
export function discoverConstraintsWithCache(
  agentName: string,
  domain: string,
  projectRoot: string
): ConstraintDefinition[] {
  // 尝试从内存缓存获取
  const cached = getFromMemoryCache(agentName, domain)
  if (cached) {
    log("Constraint", `Cache HIT: ${domain}:${agentName} (${cached.length} constraints)`)
    return cached
  }

  // 缓存 MISS，发现约束
  log("Constraint", `Cache MISS: ${domain}:${agentName}, discovering...`)
  const constraints = discoverConstraints(agentName, domain, projectRoot)

  // 保存到内存缓存
  saveToMemoryCache(agentName, domain, constraints)

  return constraints
}
