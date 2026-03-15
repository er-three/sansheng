/**
 * Registry 管理模块
 * 处理 registry.json 的读写和管理
 */

import * as path from "path"
import { Registry } from "../types.js"
import { readFile, writeFile, safeJsonParse, log } from "../utils.js"

/**
 * 读取 registry.json
 */
export function readRegistry(root: string): Registry {
  const registryPath = path.join(root, "registry.json")
  const content = readFile(registryPath)

  if (content) {
    const defaultReg: Registry = {
      version: "1.0.0",
      active_domain: "general",
      variables: {},
      pipeline_state: undefined,
      cache_settings: {
        enabled: true,
        strategy: "multi-level",
        ttl_seconds: 3600
      }
    }
    const parsed = safeJsonParse<Registry>(content, defaultReg)
    if (parsed) return parsed
  }

  // 默认 registry
  return {
    version: "1.0.0",
    active_domain: "general",
    variables: {},
    pipeline_state: undefined,
    cache_settings: {
      enabled: true,
      strategy: "multi-level",
      ttl_seconds: 3600
    }
  }
}

/**
 * 写入 registry.json
 */
export function writeRegistry(root: string, registry: Registry): boolean {
  const registryPath = path.join(root, "registry.json")
  return writeFile(registryPath, JSON.stringify(registry, null, 2))
}

/**
 * 更新 registry 中的缓存设置
 */
export function updateRegistryCacheSettings(
  root: string,
  settings: Partial<Registry["cache_settings"]>
): boolean {
  const registry = readRegistry(root)

  if (registry.cache_settings) {
    registry.cache_settings = {
      ...registry.cache_settings,
      ...settings
    }
  } else {
    registry.cache_settings = {
      enabled: true,
      strategy: "multi-level",
      ...settings
    }
  }

  return writeRegistry(root, registry)
}

/**
 * 获取活跃的 domain
 */
export function getActiveDomain(root: string): string {
  const registry = readRegistry(root)
  return registry.active_domain || "general"
}

/**
 * 设置活跃的 domain
 */
export function setActiveDomain(root: string, domain: string): boolean {
  const registry = readRegistry(root)
  registry.active_domain = domain
  return writeRegistry(root, registry)
}

/**
 * 获取 registry 变量
 */
export function getRegistryVariable(root: string, key: string): string | undefined {
  const registry = readRegistry(root)
  return registry.variables[key]
}

/**
 * 设置 registry 变量
 */
export function setRegistryVariable(root: string, key: string, value: string): boolean {
  const registry = readRegistry(root)
  registry.variables[key] = value
  return writeRegistry(root, registry)
}

/**
 * 更新流水线状态
 */
export function updatePipelineState(root: string, state: any): boolean {
  const registry = readRegistry(root)
  registry.pipeline_state = state
  return writeRegistry(root, registry)
}

/**
 * 获取流水线状态
 */
export function getPipelineState(root: string): any {
  const registry = readRegistry(root)
  return registry.pipeline_state
}
