/**
 * Domain 管理模块
 * 处理 domain.yaml 的读取和解析
 */

import * as path from "path"
import { DomainConfig } from "../types.js"
import { readFile } from "../utils.js"

/**
 * 读取 domain.yaml
 */
export function readDomain(root: string, domainName: string): DomainConfig | null {
  const domainPath = path.join(root, ".opencode", "domains", domainName, "domain.yaml")

  const content = readFile(domainPath)
  if (!content) return null

  try {
    const yaml = require("js-yaml")
    return yaml.load(content) as DomainConfig
  } catch {
    return null
  }
}

/**
 * 列出所有可用的 domain
 */
export function listDomains(root: string): string[] {
  try {
    const domainsDir = path.join(root, ".opencode", "domains")
    const fs = require("fs")

    if (!fs.existsSync(domainsDir)) {
      return []
    }

    return fs
      .readdirSync(domainsDir)
      .filter((file: string) =>
        fs.statSync(path.join(domainsDir, file)).isDirectory()
      )
  } catch {
    return []
  }
}

/**
 * 验证 domain 是否存在
 */
export function domainExists(root: string, domainName: string): boolean {
  return readDomain(root, domainName) !== null
}

/**
 * 获取 domain 的约束
 */
export function getDomainConstraints(root: string, domainName: string): string[] {
  const domain = readDomain(root, domainName)
  return domain?.constraints || []
}

/**
 * 获取 domain 的流水线步骤
 */
export function getDomainPipeline(root: string, domainName: string): any[] {
  const domain = readDomain(root, domainName)
  return domain?.pipeline || []
}
