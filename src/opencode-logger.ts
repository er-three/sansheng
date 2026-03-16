/**
 * OpenCode 日志集成层 - 专门处理日志输出到 OpenCode 控制台
 *
 * 作用：
 * - 确保所有日志都打印到 OpenCode client 控制台，而不是终端
 * - 提供降级方案（如果 client 不可用）
 * - 支持异步和同步的日志调用
 */

let opencodeClient: any = null

/**
 * 设置 OpenCode Client 实例
 * 必须在 Plugin 初始化时调用
 */
export function setOpencodeLogClient(client: any): void {
  opencodeClient = client
  if (client) {
    console.error("[OpencodeLogger] OpenCode client registered successfully")
  } else {
    // 显式清除
    opencodeClient = null
  }
}

/**
 * 获取当前的 OpenCode Client
 */
export function getOpencodeLogClient(): any {
  return opencodeClient
}

/**
 * 检查 OpenCode Client 是否可用
 */
export function isOpencodeClientAvailable(): boolean {
  return !!(opencodeClient && opencodeClient.app && opencodeClient.app.log)
}

/**
 * 核心日志函数 - 优先发送到 OpenCode 控制台
 */
export async function logToOpencode(
  category: string,
  message: string,
  level: "debug" | "info" | "warn" | "error" = "info"
): Promise<boolean> {
  // 构建日志对象
  const logEntry = {
    service: "@deep-flux/liubu",
    level,
    message: `[${category}] ${message}`,
    extra: {
      category,
      timestamp: new Date().toISOString(),
    },
  }

  // 优先：发送到 OpenCode 控制台
  if (isOpencodeClientAvailable()) {
    try {
      await opencodeClient.app.log(logEntry)
      return true // 成功发送到 OpenCode
    } catch (error) {
      console.error(
        `[OpencodeLogger] Failed to send log to OpenCode: ${error}`
      )
      // 失败时继续使用降级方案
    }
  }

  // 降级方案：打印到终端（仅当 OpenCode 不可用时）
  const timestamp = logEntry.extra.timestamp
  const prefix = `[${timestamp}] [${category}]`

  switch (level) {
    case "debug":
    case "info":
      console.log(`${prefix} [INFO]  ${message}`)
      break
    case "warn":
      console.warn(`${prefix} [WARN]  ${message}`)
      break
    case "error":
      console.error(`${prefix} [ERROR] ${message}`)
      break
  }

  return false // 降级方案（未发送到 OpenCode）
}

/**
 * 同步版本的日志函数（用于兼容旧代码）
 * 返回一个 Promise，但不阻塞调用者
 */
export function logToOpencodeSync(
  category: string,
  message: string,
  level: "debug" | "info" | "warn" | "error" = "info"
): Promise<boolean> {
  // 异步执行，但不阻塞当前代码
  return logToOpencode(category, message, level).catch(() => false)
}

/**
 * 状态诊断函数
 * 用于调试日志系统是否正常工作
 */
export function diagnoseLoggerStatus(): {
  clientAvailable: boolean
  clientType: string
  hasAppLog: boolean
  status: "ready" | "degraded" | "unavailable"
} {
  let status: "ready" | "degraded" | "unavailable"

  if (!opencodeClient) {
    status = "unavailable"
  } else if (isOpencodeClientAvailable()) {
    status = "ready"
  } else {
    status = "degraded"
  }

  return {
    clientAvailable: !!opencodeClient,
    clientType: opencodeClient ? typeof opencodeClient : "null",
    hasAppLog:
      !!(opencodeClient && opencodeClient.app && opencodeClient.app.log),
    status,
  }
}
