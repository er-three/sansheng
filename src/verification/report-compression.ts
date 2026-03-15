/**
 * 报告自适应压缩 - Phase 5 优化
 *
 * 支持多种报告级别：
 * - VERBOSE: 完整报告（保留现状）
 * - NORMAL: 简化版本（默认，成功任务聚合）
 * - BRIEF: 极简版本（仅失败项）
 *
 * 目标：减少报告 token 消耗，节省 20-30%
 */

import { log } from "../utils.js"

/**
 * 报告级别
 */
export enum ReportLevel {
  VERBOSE = "verbose",  // 完整报告
  NORMAL = "normal",    // 简化版本（默认）
  BRIEF = "brief",      // 极简版本
}

/**
 * 并行任务执行结果
 */
export interface ParallelTaskResult {
  id: string
  file: string
  status: "done" | "failed"
  start_time?: string
  end_time?: string
  duration_ms?: number
  execution_log?: string
  error?: string
  files_modified?: string[]
  lines_changed?: number
  complexity_score?: number
}

/**
 * 并行执行报告
 */
export interface ParallelReport {
  successful_count: number
  failed_count: number
  total_time: number
  parallel_subtasks: ParallelTaskResult[]
  theoretical_speedup?: string
  groups?: any[]
  summary?: string
  failed_tasks?: ParallelTaskResult[]
}

/**
 * 压缩后的报告
 */
export interface CompressedReport {
  level: ReportLevel
  successful_count: number
  failed_count: number
  total_time: number
  status: "success" | "partial" | "failed"
  summary?: string
  failures?: ParallelTaskResult[]
  success_summary?: {
    count: number
    avg_duration: number
    total_lines: number
    total_files: number
  }
}

/**
 * 压缩并行执行报告
 */
export function compressReport(
  report: ParallelReport,
  level: ReportLevel = ReportLevel.NORMAL
): CompressedReport {
  const baseReport: CompressedReport = {
    level,
    successful_count: report.successful_count,
    failed_count: report.failed_count,
    total_time: report.total_time,
    status:
      report.failed_count === 0
        ? "success"
        : report.successful_count > 0
          ? "partial"
          : "failed",
  }

  switch (level) {
    case ReportLevel.VERBOSE:
      // 保留完整报告
      return {
        ...baseReport,
        ...report,
      }

    case ReportLevel.NORMAL:
      // 简化版本：成功任务聚合，失败任务保留详情
      return compressNormal(baseReport, report)

    case ReportLevel.BRIEF:
      // 极简版本：仅失败项
      return compressBrief(baseReport, report)

    default:
      return baseReport
  }
}

/**
 * 生成简化版本报告（NORMAL）
 */
function compressNormal(
  baseReport: CompressedReport,
  report: ParallelReport
): CompressedReport {
  // 计算成功任务的汇总统计
  const successTasks = report.parallel_subtasks.filter((t) => t.status === "done")
  const failedTasks = report.parallel_subtasks.filter((t) => t.status === "failed")

  let totalLines = 0
  for (const task of successTasks) {
    if (task.lines_changed) {
      totalLines += task.lines_changed
    }
  }

  const successSummary = {
    count: successTasks.length,
    avg_duration: successTasks.length > 0
      ? successTasks.reduce((sum, t) => sum + (t.duration_ms || 0), 0) / successTasks.length
      : 0,
    total_lines: totalLines,
    total_files: successTasks.length,
  }

  // 生成摘要
  const summary = `✅ ${successTasks.length} 个任务完成`
    + (failedTasks.length > 0 ? `, ❌ ${failedTasks.length} 个任务失败` : "")

  log("Report", `Compressed to NORMAL: ${summary}`)

  return {
    ...baseReport,
    success_summary: successSummary,
    summary,
    failures: failedTasks.length > 0 ? failedTasks : undefined,
  }
}

/**
 * 生成极简版本报告（BRIEF）
 */
function compressBrief(
  baseReport: CompressedReport,
  report: ParallelReport
): CompressedReport {
  const failedTasks = report.parallel_subtasks.filter((t) => t.status === "failed")

  const summary = baseReport.status === "success"
    ? "✅ 全部完成"
    : `❌ ${failedTasks.length} 个失败`

  log("Report", `Compressed to BRIEF: ${summary}`)

  return {
    ...baseReport,
    summary,
    failures: failedTasks.length > 0 ? failedTasks : undefined,
  }
}

/**
 * 估算报告压缩的 token 节省
 */
export function estimateReportSavings(
  report: ParallelReport,
  level: ReportLevel
): {
  before: number
  after: number
  savings: string
} {
  // 估算原始报告大小（粗略）
  const before = JSON.stringify(report).length / 4  // token 估算

  const compressed = compressReport(report, level)
  const after = JSON.stringify(compressed).length / 4

  const savings = ((before - after) / before * 100).toFixed(1)

  return {
    before,
    after,
    savings: `${savings}%`,
  }
}

/**
 * 根据报告大小自动选择压缩级别
 */
export function autoSelectCompressionLevel(
  report: ParallelReport
): ReportLevel {
  const reportSize = JSON.stringify(report).length

  // 超过 20KB 使用 BRIEF
  if (reportSize > 20480) {
    return ReportLevel.BRIEF
  }

  // 超过 10KB 使用 NORMAL
  if (reportSize > 10240) {
    return ReportLevel.NORMAL
  }

  // 其他情况保留 VERBOSE
  return ReportLevel.VERBOSE
}

/**
 * 生成压缩统计报告
 */
export function generateCompressionStats(
  originalReport: ParallelReport,
  levels: ReportLevel[] = [ReportLevel.VERBOSE, ReportLevel.NORMAL, ReportLevel.BRIEF]
): string {
  const lines = [
    "## 报告压缩统计",
    "",
    `原始任务数: ${originalReport.parallel_subtasks.length}`,
    `成功: ${originalReport.successful_count}`,
    `失败: ${originalReport.failed_count}`,
    `总耗时: ${originalReport.total_time}ms`,
    "",
    "### 压缩效果对比",
    "",
    "| 级别 | 大小 (KB) | 节省比例 |",
    "|------|-----------|---------|",
  ]

  for (const level of levels) {
    const stats = estimateReportSavings(originalReport, level)
    const sizeFmt = (stats.after / 1024).toFixed(2)
    lines.push(`| ${level} | ${sizeFmt} | ${stats.savings} |`)
  }

  lines.push("")
  lines.push("### 建议")
  const recommended = autoSelectCompressionLevel(originalReport)
  lines.push(`根据报告大小，推荐使用 ${recommended} 级别`)

  return lines.join("\n")
}
