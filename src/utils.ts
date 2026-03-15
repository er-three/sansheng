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
 * 全局 OpenCode client 存储
 * 由 Plugin 在初始化时设置
 */
let opencodeClient: any = null

export function setOpencodeClient(client: any): void {
  opencodeClient = client
}

/**
 * 内部异步日志实现
 */
async function logAsync(
  category: string,
  message: string,
  level: "debug" | "info" | "warn" | "error"
): Promise<void> {
  // 如果有 OpenCode client，使用官方 API
  if (opencodeClient && opencodeClient.app && opencodeClient.app.log) {
    try {
      await opencodeClient.app.log({
        service: "@deep-flux/liubu",
        level,
        message: `[${category}] ${message}`,
        extra: { category },
      })
      return
    } catch (error) {
      // 如果 API 调用失败，降级到 console 输出
      console.error("Failed to call client.app.log():", error)
    }
  }

  // 降级方案：输出到 console.error（更可靠地显示在 CLI 中）
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${category}]`

  switch (level) {
    case "debug":
    case "info":
      console.error(`${prefix} [INFO]  ${message}`)
      break
    case "warn":
      console.error(`${prefix} [WARN]  ${message}`)
      break
    case "error":
      console.error(`${prefix} [FAIL] ${message}`)
      break
  }
}

/**
 * 记录日志到 OpenCode
 * 支持同步和异步调用
 * - 同步用法（旧代码兼容）: log(category, message)
 * - 异步用法（推荐）: await log(category, message)
 */
export function log(
  category: string,
  message: string,
  level: "debug" | "info" | "warn" | "error" = "info"
): Promise<void> {
  // 返回 Promise，异步执行日志，但不阻塞当前代码
  // 这样旧代码 log(...) 可以继续工作，新代码可以 await log(...)
  return logAsync(category, message, level).catch((error) => {
    // 静默处理错误，避免影响主流程
    console.error("Logging error:", error)
  })
}
