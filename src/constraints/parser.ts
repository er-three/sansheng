/**
 * 约束解析模块
 * 支持 Markdown 和 YAML 格式的约束文件解析
 */

import { ConstraintDefinition } from "../types.js"
import { readFile } from "../utils.js"
import * as fs from "fs"

/**
 * 解析 Markdown 格式的约束文件
 * 格式：## 约束名\n约束内容
 */
export function parseMarkdownConstraints(
  content: string,
  filePath: string
): ConstraintDefinition[] {
  const constraints: ConstraintDefinition[] = []
  const sections = content.split(/^## /m)

  // 第一个元素是文件头部，跳过
  for (const section of sections.slice(1)) {
    const lines = section.split("\n")
    const name = lines[0].trim()
    const body = lines.slice(1).join("\n").trim()

    if (name && body) {
      constraints.push({
        name,
        content: body,
        source: filePath,
        priority: "high" // Markdown 默认优先级高
      })
    }
  }

  return constraints
}

/**
 * 解析 YAML 格式的约束文件
 * 支持两种格式：
 * 1. constraints: [{ name, content }, ...]
 * 2. 直接的约束列表（扁平结构）
 */
export function parseYamlConstraints(
  content: string,
  filePath: string
): ConstraintDefinition[] {
  try {
    const yaml = require("js-yaml")
    const data = yaml.load(content) as any

    if (!data) return []

    const constraints: ConstraintDefinition[] = []

    // 格式1：constraints 字段包含约束列表
    if (Array.isArray(data.constraints)) {
      for (const constraint of data.constraints) {
        if (constraint.name && constraint.content) {
          constraints.push({
            name: constraint.name,
            content: constraint.content,
            source: filePath,
            priority: constraint.priority || "high"
          })
        }
      }
    }

    // 格式2：扁平结构（domain_X, agent_*, 等）
    for (const [key, value] of Object.entries(data)) {
      if (
        key.startsWith("universal") ||
        key.startsWith("domain_") ||
        key.startsWith("agent_")
      ) {
        if (Array.isArray(value)) {
          for (const constraint of value) {
            if (constraint.name && constraint.content) {
              constraints.push({
                name: constraint.name,
                content: constraint.content,
                source: filePath,
                priority: constraint.priority || "high"
              })
            }
          }
        }
      }
    }

    return constraints
  } catch (error) {
    return []
  }
}

/**
 * 解析单个约束文件（支持 MD 和 YAML）
 */
export function parseConstraintFile(filePath: string): ConstraintDefinition[] {
  if (!fs.existsSync(filePath)) return []

  try {
    const content = readFile(filePath)
    if (!content) return []

    if (filePath.endsWith(".md")) {
      return parseMarkdownConstraints(content, filePath)
    } else if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
      return parseYamlConstraints(content, filePath)
    }

    return []
  } catch (error) {
    return []
  }
}
