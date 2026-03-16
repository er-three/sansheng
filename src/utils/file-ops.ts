/**
 * 文件操作管理器
 *
 * 统一处理 JSON 文件的读取、写入、初始化等操作
 * 消除重复的文件操作代码
 */

import { readFile, writeFile, ensureDirExists, safeJsonParse, log } from "../utils.js"
import * as path from "path"
import { LOG_COMPONENT } from "../constants/index.js"

/**
 * 泛型 JSON 文件操作管理器
 *
 * @example
 * const auditOps = new JsonFileOps<AuditHistory>({
 *   createDefault: (sessionId) => ({
 *     version: "1.0",
 *     sessionId,
 *     createdAt: new Date().toISOString(),
 *     records: []
 *   }),
 *   component: LOG_COMPONENT.AUDIT_SYSTEM
 * })
 *
 * const history = auditOps.read(filePath)
 */
export class JsonFileOps<T> {
  private createDefault: (context?: any) => T
  private component: string

  constructor(options: {
    createDefault: (context?: any) => T
    component: string
  }) {
    this.createDefault = options.createDefault
    this.component = options.component
  }

  /**
   * 读取 JSON 文件，不存在时返回默认值
   */
  read(filePath: string, context?: any): T {
    try {
      const content = readFile(filePath)
      return content
        ? safeJsonParse<T>(content, this.createDefault(context))
        : this.createDefault(context)
    } catch (error) {
      log(this.component, `Failed to read file ${filePath}: ${error}`, "warn")
      return this.createDefault(context)
    }
  }

  /**
   * 写入 JSON 文件
   */
  write(filePath: string, data: T, pretty: boolean = true): boolean {
    try {
      ensureDirExists(path.dirname(filePath))
      const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
      return writeFile(filePath, content)
    } catch (error) {
      log(this.component, `Failed to write file ${filePath}: ${error}`, "error")
      return false
    }
  }

  /**
   * 读取-修改-写入模式
   *
   * 安全的原子操作（虽然不是真正的原子，但足够用于大多数场景）
   */
  readModifyWrite(
    filePath: string,
    modifier: (data: T) => T,
    context?: any
  ): boolean {
    try {
      const data = this.read(filePath, context)
      const modified = modifier(data)
      return this.write(filePath, modified)
    } catch (error) {
      log(this.component, `Failed in read-modify-write: ${error}`, "error")
      return false
    }
  }

  /**
   * 创建新文件（不覆盖已存在的文件）
   */
  createIfNotExists(filePath: string, context?: any): T {
    const content = readFile(filePath)
    if (content) {
      return safeJsonParse<T>(content, this.createDefault(context))
    }

    const defaultData = this.createDefault(context)
    this.write(filePath, defaultData)
    return defaultData
  }

  /**
   * 追加到数组字段
   *
   * 用于审计记录、日志等追加操作
   */
  appendToArray(
    filePath: string,
    arrayFieldName: string,
    item: any,
    context?: any
  ): boolean {
    return this.readModifyWrite(
      filePath,
      (data) => {
        const record = data as any
        if (!Array.isArray(record[arrayFieldName])) {
          record[arrayFieldName] = []
        }
        record[arrayFieldName].push(item)
        return data
      },
      context
    )
  }

  /**
   * 过滤数组字段
   *
   * 用于清空会话数据等操作
   */
  filterArray(
    filePath: string,
    arrayFieldName: string,
    predicate: (item: any) => boolean,
    context?: any
  ): boolean {
    return this.readModifyWrite(
      filePath,
      (data) => {
        const record = data as any
        if (Array.isArray(record[arrayFieldName])) {
          record[arrayFieldName] = record[arrayFieldName].filter(predicate)
        }
        return data
      },
      context
    )
  }

  /**
   * 获取数组字段
   */
  getArray(filePath: string, arrayFieldName: string, context?: any): any[] {
    const data = this.read(filePath, context)
    const record = data as any
    return Array.isArray(record[arrayFieldName]) ? record[arrayFieldName] : []
  }
}

/**
 * 便利函数：创建审计记录管理器
 */
export function createAuditOps<T extends { version: string; sessionId: string; createdAt: string; records?: any[] }>(
  component: string
) {
  return new JsonFileOps<T>({
    createDefault: (sessionId?: string) => ({
      version: "1.0",
      sessionId: sessionId || "",
      createdAt: new Date().toISOString(),
      records: [],
    } as unknown as T),
    component,
  })
}

/**
 * 便利函数：创建工作流快照管理器
 */
export function createSnapshotOps<T extends { version: number; tasks?: any[]; savedAt: string }>(
  component: string
) {
  return new JsonFileOps<T>({
    createDefault: () => ({
      version: 1,
      tasks: [],
      savedAt: new Date().toISOString(),
    } as unknown as T),
    component,
  })
}
