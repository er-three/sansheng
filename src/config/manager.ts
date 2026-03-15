/**
 * 配置管理模块 - Phase 4
 * 统一处理官方 SDK 配置和本地 registry 配置
 *
 * 特性：
 * - 双层配置：官方 context.project.config + 本地 registry.json
 * - 变量替换：{env:VAR_NAME} 和 {file:path} 语法
 * - 环境变量访问：任何地方都可以引用环境变量
 * - 文件引用：支持相对路径和绝对路径
 */

import * as fs from "fs"
import * as path from "path"
import { Registry } from "../types.js"
import { log } from "../utils.js"

/**
 * 配置管理器
 * 提供统一的配置访问接口
 */
export class ConfigManager {
  private sdkConfig: Record<string, any> | null = null
  private localRegistry: Registry | null = null
  private substitutionCache: Map<string, string> = new Map()
  private root: string

  constructor(root: string, sdkConfig?: Record<string, any>) {
    this.root = root
    this.sdkConfig = sdkConfig || null
  }

  /**
   * 从 SDK 初始化配置（Phase 4 新增）
   * 当官方 OpenCode context 可用时调用
   */
  async initializeFromSDK(context: any): Promise<void> {
    try {
      if (context?.project?.config) {
        this.sdkConfig = context.project.config
        log("Config", "Initialized config from official SDK")
      }
    } catch (error) {
      log("Config", `Error initializing from SDK: ${error}`, "warn")
    }
  }

  /**
   * 获取配置值（支持嵌套访问）
   * 优先使用 SDK 配置，回退到本地 registry
   *
   * @param keyPath - 配置路径，支持点号嵌套如 "cache.ttl"
   * @param defaultValue - 默认值
   */
  get<T = any>(keyPath: string, defaultValue?: T): T {
    // 尝试从 SDK 配置获取
    if (this.sdkConfig) {
      const sdkValue = this._getNestedValue(this.sdkConfig, keyPath)
      if (sdkValue !== undefined) {
        return this._substituteVariables(sdkValue) as T
      }
    }

    // 回退到本地 registry
    // 处理缓存相关的特殊路径
    if (keyPath.startsWith("cache.")) {
      const registry = this._getRegistry()
      const cacheKey = keyPath.substring(6) // 移除 "cache." 前缀
      if (registry?.cache_settings) {
        // 处理 cache.ttl -> ttl_seconds 的映射
        let actualKey = cacheKey
        if (cacheKey === "ttl") {
          actualKey = "ttl_seconds"
        }
        const value = (registry.cache_settings as any)[actualKey]
        if (value !== undefined) {
          return this._substituteVariables(value) as T
        }
      }
    }

    // 处理活跃域
    if (keyPath === "active_domain") {
      const registry = this._getRegistry()
      const value = registry?.active_domain
      if (value !== undefined) {
        return this._substituteVariables(value) as T
      }
    }

    // 其他路径直接从 registry 的 variables 获取
    if (keyPath.startsWith("variables.")) {
      const varName = keyPath.substring(10) // 移除 "variables." 前缀
      const registry = this._getRegistry()
      const value = registry?.variables?.[varName]
      if (value !== undefined) {
        return this._substituteVariables(value) as T
      }
    }

    return defaultValue as T
  }

  /**
   * 获取所有变量（支持变量替换）
   */
  getAllVariables(): Record<string, string> {
    const registry = this._getRegistry()
    const variables = registry?.variables || {}

    // 对每个变量值执行替换
    const substituted: Record<string, string> = {}
    for (const [key, value] of Object.entries(variables)) {
      substituted[key] = this._substituteVariables(value) as string
    }

    return substituted
  }

  /**
   * 设置变量（存储到本地 registry）
   */
  setVariable(key: string, value: string): boolean {
    const registry = this._getRegistry()
    registry.variables[key] = value
    this.substitutionCache.clear() // 清除替换缓存
    return true
  }

  /**
   * 执行变量替换
   * 支持的语法：
   * - {env:VAR_NAME} - 环境变量
   * - {file:path/to/file} - 文件内容
   * - {var:variable_name} - registry 变量
   *
   * @param value - 待替换的值
   */
  private _substituteVariables(value: any): any {
    if (typeof value !== "string") {
      return value
    }

    // 检查缓存
    if (this.substitutionCache.has(value)) {
      return this.substitutionCache.get(value)
    }

    let result = value

    // 替换所有 {env:...} 模式
    result = result.replace(/\{env:([^}]+)\}/g, (match, varName) => {
      const envValue = process.env[varName]
      if (!envValue) {
        log(
          "Config",
          `Environment variable not found: ${varName} (in pattern: ${match})`,
          "warn"
        )
        return match // 保留未替换的值
      }
      return envValue
    })

    // 替换所有 {file:...} 模式
    result = result.replace(/\{file:([^}]+)\}/g, (match, filePath) => {
      try {
        // 相对于根目录解析路径
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.root, filePath)

        // 检查文件是否存在
        if (!fs.existsSync(fullPath)) {
          log("Config", `Referenced file not found: ${fullPath}`, "warn")
          return match
        }

        // 读取文件内容
        const content = fs.readFileSync(fullPath, "utf-8")
        return content
      } catch (error) {
        log("Config", `Error reading file ${filePath}: ${error}`, "warn")
        return match
      }
    })

    // 替换所有 {var:...} 模式
    result = result.replace(/\{var:([^}]+)\}/g, (match, varName) => {
      const registry = this._getRegistry()
      const varValue = registry?.variables?.[varName]
      if (!varValue) {
        log("Config", `Registry variable not found: ${varName}`, "warn")
        return match
      }
      return varValue
    })

    // 缓存结果
    this.substitutionCache.set(value, result)

    return result
  }

  /**
   * 嵌套获取对象属性
   */
  private _getNestedValue(obj: Record<string, any>, path: string): any {
    const keys = path.split(".")
    let current = obj

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key]
      } else {
        return undefined
      }
    }

    return current
  }

  /**
   * 获取本地 registry（如果尚未加载）
   */
  private _getRegistry(): Registry {
    if (!this.localRegistry) {
      // 延迟加载本地 registry
      try {
        const registryPath = path.join(this.root, "registry.json")
        if (fs.existsSync(registryPath)) {
          const content = fs.readFileSync(registryPath, "utf-8")
          const parsed = JSON.parse(content) as Registry
          this.localRegistry = parsed
        } else {
          this.localRegistry = this._getDefaultRegistry()
        }
      } catch (error) {
        log("Config", `Error loading registry: ${error}`, "warn")
        this.localRegistry = this._getDefaultRegistry()
      }
    }

    // 确保始终返回有效的 Registry 对象
    return this.localRegistry || this._getDefaultRegistry()
  }

  /**
   * 默认 registry
   */
  private _getDefaultRegistry(): Registry {
    return {
      version: "1.0.0",
      active_domain: "general",
      variables: {},
      cache_settings: {
        enabled: true,
        strategy: "multi-level",
        ttl_seconds: 3600
      }
    }
  }

  /**
   * 获取活跃的域
   */
  getActiveDomain(): string {
    return this.get("active_domain", "general")
  }

  /**
   * 设置活跃的域
   */
  setActiveDomain(domain: string): void {
    const registry = this._getRegistry()
    registry.active_domain = domain
  }

  /**
   * 获取缓存设置
   */
  getCacheSettings(): { enabled: boolean; strategy: string; ttl?: number } {
    const registry = this._getRegistry()
    return {
      enabled: registry?.cache_settings?.enabled ?? true,
      strategy: registry?.cache_settings?.strategy ?? "multi-level",
      ttl: registry?.cache_settings?.ttl_seconds ?? 3600
    }
  }

  /**
   * 清除替换缓存（在配置变化时调用）
   */
  clearCache(): void {
    this.substitutionCache.clear()
  }

  /**
   * 生成配置诊断报告
   */
  generateReport(): string {
    const lines = [
      "## 配置诊断报告",
      "",
      `SDK 配置可用: ${this.sdkConfig ? "✅" : "❌"}`,
      `本地 Registry 可用: ${this.localRegistry ? "✅" : "❌"}`,
      "",
      "### 活跃配置源",
      this.sdkConfig ? "- 官方 SDK (context.project.config)" : "- 本地 registry.json",
      "",
      "### 缓存设置",
      `- 启用: ${this.getCacheSettings().enabled}`,
      `- 策略: ${this.getCacheSettings().strategy}`,
      `- TTL: ${this.getCacheSettings().ttl}s`,
      "",
      "### 变量替换支持",
      "- {env:VAR_NAME} - 环境变量",
      "- {file:path} - 文件内容",
      "- {var:name} - registry 变量"
    ]

    return lines.join("\n")
  }
}

/**
 * 工厂函数：创建全局配置管理器实例
 */
export function createConfigManager(root: string, context?: any): ConfigManager {
  const manager = new ConfigManager(root, context?.project?.config)

  // 如果有 context，异步初始化 SDK 配置
  if (context) {
    manager.initializeFromSDK(context).catch((error) => {
      log("Config", `Failed to initialize from SDK: ${error}`, "warn")
    })
  }

  return manager
}
