/**
 * 工具函数
 * 各模块共享的通用工具
 */

import * as fs from "fs"
import * as path from "path"

/**
 * 查找项目根目录
 */
export function findRoot(worktree?: string): string {
  const cwd = worktree || process.cwd()
  const opencodePath = path.join(cwd, ".opencode")
  if (fs.existsSync(opencodePath)) {
    return cwd
  }
  // 向上查找
  const parent = path.dirname(cwd)
  if (parent === cwd) return cwd
  return findRoot(parent)
}

/**
 * 确保目录存在
 */
export function ensureDirExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * 读取文件内容
 */
export function readFile(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null
    return fs.readFileSync(filePath, "utf-8")
  } catch (error) {
    return null
  }
}

/**
 * 写入文件内容
 */
export function writeFile(filePath: string, content: string): boolean {
  try {
    ensureDirExists(path.dirname(filePath))
    fs.writeFileSync(filePath, content, "utf-8")
    return true
  } catch (error) {
    return false
  }
}

/**
 * 获取文件哈希（MD5）
 */
export function getFileHash(filePath: string): string | null {
  try {
    const content = readFile(filePath)
    if (!content) return null

    const crypto = require("crypto")
    return crypto
      .createHash("md5")
      .update(content)
      .digest("hex")
  } catch (error) {
    return null
  }
}

/**
 * 安全的 JSON 解析
 */
export function safeJsonParse<T>(content: string, defaultValue: T): T {
  try {
    return JSON.parse(content)
  } catch {
    return defaultValue
  }
}

/**
 * 生成缓存 key
 */
export function getCacheKey(agentName: string, domain: string): string {
  return `${domain}:${agentName}`
}

/**
 * 格式化约束为 Markdown
 */
export function formatConstraints(constraints: any[]): string {
  return [
    "## 自动发现的约束（按优先级）",
    "",
    ...constraints
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
        const priorityA = a.priority && priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 2
        const priorityB = b.priority && priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 2
        return priorityA - priorityB
      })
      .map((c) => `**${c.name}** (${c.source}):\n${c.content}`),
    ""
  ].join("\n")
}

/**
 * 记录日志（可扩展）
 */
export function log(category: string, message: string, level: "info" | "warn" | "error" = "info"): void {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${category}]`

  switch (level) {
    case "info":
      console.log(`${prefix} ${message}`)
      break
    case "warn":
      console.warn(`${prefix} ⚠️  ${message}`)
      break
    case "error":
      console.error(`${prefix} ❌ ${message}`)
      break
  }
}
