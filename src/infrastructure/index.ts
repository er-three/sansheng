/**
 * 基础设施层导出接口
 *
 * 包含所有通用的工具、配置、验证和日志功能。
 */

// 从 utils.ts 导出通用工具（已存在）
export * from '../utils.js'

// 配置管理
export interface ConfigManager {
  getConfig(key: string): any
  setConfig(key: string, value: any): void
  getAllConfig(): Record<string, any>
}

// 缓存接口
export interface CacheManager {
  set(key: string, value: any, ttl?: number): void
  get(key: string): any | null
  has(key: string): boolean
  delete(key: string): boolean
  clear(): void
}

// 验证结果
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  data?: any
}

// 日志级别
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  TRACE = 'TRACE'
}

// 日志条目
export interface LogEntry {
  timestamp: number
  level: LogLevel | string
  module: string
  message: string
  data?: Record<string, any>
  sessionId?: string
}

/**
 * 全局配置管理器实例
 */
let globalConfig: Record<string, any> = {
  debug: false,
  rootPath: process.cwd(),
  logging: {
    level: 'INFO',
    enableConsole: true,
    enableFile: true
  },
  cache: {
    enabled: true,
    ttl: 3600000
  }
}

/**
 * 获取全局配置
 */
export function getConfig(key: string): any {
  const keys = key.split('.')
  let value = globalConfig

  for (const k of keys) {
    value = value?.[k]
  }

  return value
}

/**
 * 设置全局配置
 */
export function setConfig(key: string, value: any): void {
  const keys = key.split('.')
  let obj = globalConfig

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (!obj[k]) {
      obj[k] = {}
    }
    obj = obj[k]
  }

  obj[keys[keys.length - 1]] = value
}

/**
 * 获取所有配置
 */
export function getAllConfig(): Record<string, any> {
  return { ...globalConfig }
}

/**
 * 简单的内存缓存实现
 */
class SimpleCache implements CacheManager {
  private cache = new Map<string, { value: any; expiresAt?: number }>()

  set(key: string, value: any, ttl?: number): void {
    const expiresAt = ttl ? Date.now() + ttl : undefined
    this.cache.set(key, { value, expiresAt })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}

/**
 * 全局缓存实例
 */
const globalCache = new SimpleCache()

/**
 * 获取缓存管理器实例
 */
export function getCacheManager(): CacheManager {
  return globalCache
}

/**
 * 验证输入
 */
export function validateInput(
  input: any,
  rules: Array<{ field: string; required?: boolean; type?: string }>
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  for (const rule of rules) {
    const value = input[rule.field]

    if (rule.required && (value === undefined || value === null)) {
      errors.push(`Field '${rule.field}' is required`)
    }

    if (value !== undefined && rule.type && typeof value !== rule.type) {
      errors.push(`Field '${rule.field}' should be of type ${rule.type}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    data: input
  }
}
