/**
 * 审计系统 - Phase 3
 *
 * 持久化审计记录到文件：{root}/.opencode/audit/{sessionId}.json
 * 使用 src/utils.ts 中的工具函数
 */

import * as path from "path"
import { log, writeFile, readFile, safeJsonParse, ensureDirExists, findRoot, generateId } from "../utils.js"

/**
 * 审计记录结构
 */
export interface AuditRecord {
  id: string                      // UUID
  timestamp: string               // ISO string
  sessionId: string
  agentName: string
  operation: string
  taskId: string
  filesAffected: string[]
  linesChanged: number
  riskLevel: "low" | "medium" | "high"
  menxiaReviewed: boolean
  testsPassed: boolean
  gatewayChecks: string[]         // 通过的检查项
  result: "allowed" | "blocked"
  blockReason?: string
}

/**
 * 审计历史记录
 */
interface AuditHistory {
  version: string
  sessionId: string
  createdAt: string
  records: AuditRecord[]
}

/**
 * 获取审计文件路径
 */
function getAuditFilePath(root: string, sessionId: string): string {
  return path.join(root, ".opencode", "audit", `${sessionId}.json`)
}

/**
 * 追加审计记录
 */
export function appendAuditRecord(
  root: string,
  sessionId: string,
  record: Omit<AuditRecord, "id" | "timestamp">
): AuditRecord {
  try {
    const auditPath = getAuditFilePath(root, sessionId)
    ensureDirExists(path.dirname(auditPath))

    // 读取现有的历史记录
    const content = readFile(auditPath)
    let history: AuditHistory = content
      ? safeJsonParse<AuditHistory>(content, {
          version: "1.0",
          sessionId,
          createdAt: new Date().toISOString(),
          records: []
        })
      : {
          version: "1.0",
          sessionId,
          createdAt: new Date().toISOString(),
          records: []
        }

    // 创建新记录
    const newRecord: AuditRecord = {
      ...record,
      id: generateId('audit'),
      timestamp: new Date().toISOString()
    }

    // 添加到历史
    history.records.push(newRecord)

    // 写入文件
    const success = writeFile(auditPath, JSON.stringify(history, null, 2))
    if (!success) {
      log("AuditSystem", `Failed to write audit record to ${auditPath}`, "warn")
    } else {
      log("AuditSystem", `Audit record appended: ${newRecord.id} (${record.result})`)
    }

    return newRecord
  } catch (error) {
    log("AuditSystem", `Error appending audit record: ${error}`, "error")
    throw error
  }
}

/**
 * 获取审计历史
 */
export function getAuditHistory(root: string, sessionId: string): AuditRecord[] {
  try {
    const auditPath = getAuditFilePath(root, sessionId)
    const content = readFile(auditPath)

    if (!content) {
      return []
    }

    const history = safeJsonParse<AuditHistory>(content, {
      version: "1.0",
      sessionId,
      createdAt: new Date().toISOString(),
      records: []
    })

    return history.records
  } catch (error) {
    log("AuditSystem", `Error reading audit history: ${error}`, "warn")
    return []
  }
}

/**
 * 生成审计报告（可读格式）
 */
export function generateAuditReport(root: string, sessionId: string): string {
  try {
    const records = getAuditHistory(root, sessionId)

    if (records.length === 0) {
      return `# Audit Report for Session ${sessionId}\n\nNo audit records found.`
    }

    // 单次遍历收集统计数据和生成报告行
    const reportLines: string[] = []
    const stats = { blocked: 0, allowed: 0, highRisk: 0 }

    records.forEach((record, index) => {
      // 统计
      if (record.result === "blocked") stats.blocked++
      if (record.result === "allowed") stats.allowed++
      if (record.riskLevel === "high") stats.highRisk++

      // 生成报告行（但暂存，等先输出摘要）
      reportLines.push(JSON.stringify({
        index: index + 1,
        record
      }))
    })

    const summaryLines = [
      `# Audit Report for Session ${sessionId}`,
      "",
      "## Summary",
      `- **Total Records**: ${records.length}`,
      `- **Allowed**: ${stats.allowed}`,
      `- **Blocked**: ${stats.blocked}`,
      `- **High Risk**: ${stats.highRisk}`,
      "",
      "## Records",
      ""
    ]

    // 格式化每条记录
    const recordLines: string[] = []
    records.forEach((record, index) => {
      recordLines.push(`### Record ${index + 1}`)
      recordLines.push(`- **ID**: ${record.id}`)
      recordLines.push(`- **Timestamp**: ${record.timestamp}`)
      recordLines.push(`- **Agent**: ${record.agentName}`)
      recordLines.push(`- **Operation**: ${record.operation}`)
      recordLines.push(`- **Task**: ${record.taskId}`)
      recordLines.push(`- **Files**: ${record.filesAffected.length} file(s)`)
      recordLines.push(`- **Lines Changed**: ${record.linesChanged}`)
      recordLines.push(`- **Risk Level**: ${record.riskLevel}`)
      recordLines.push(`- **Menxia Reviewed**: ${record.menxiaReviewed ? "Yes" : "No"}`)
      recordLines.push(`- **Tests Passed**: ${record.testsPassed ? "Yes" : "No"}`)
      recordLines.push(`- **Result**: ${record.result.toUpperCase()}`)

      if (record.blockReason) {
        recordLines.push(`- **Block Reason**: ${record.blockReason}`)
      }

      recordLines.push("")
    })

    return [...summaryLines, ...recordLines].join("\n")
  } catch (error) {
    log("AuditSystem", `Error generating audit report: ${error}`, "error")
    return `Error generating report: ${error}`
  }
}

/**
 * 清空审计历史
 */
export function clearAuditHistory(root: string, sessionId: string): void {
  try {
    const auditPath = getAuditFilePath(root, sessionId)
    const success = writeFile(auditPath, JSON.stringify({
      version: "1.0",
      sessionId,
      createdAt: new Date().toISOString(),
      records: []
    }, null, 2))

    if (success) {
      log("AuditSystem", `Cleared audit history for session ${sessionId}`)
    }
  } catch (error) {
    log("AuditSystem", `Error clearing audit history: ${error}`, "warn")
  }
}
