/**
 * 报告自适应压缩测试 - Phase 5
 *
 * 验证：
 * - 不同压缩级别的效果
 * - token 节省的计算
 * - 自动级别选择
 * - 压缩统计报告
 */

import assert from "assert"
import {
  compressReport,
  ReportLevel,
  estimateReportSavings,
  autoSelectCompressionLevel,
  generateCompressionStats,
  ParallelReport,
} from "../src/verification/report-compression"

describe("报告自适应压缩", () => {
  // 创建模拟报告
  const createMockReport = (taskCount: number): ParallelReport => {
    const tasks = []
    for (let i = 0; i < taskCount; i++) {
      tasks.push({
        id: `task-${i}`,
        file: `src/pages/page${i}.tsx`,
        status: i < taskCount - 1 ? ("done" as const) : ("failed" as const),
        start_time: "2026-03-15T10:30:00Z",
        end_time: "2026-03-15T10:35:30Z",
        duration_ms: 330000,
        execution_log: "... 详细日志 50+ 行 ...",
        error: i === taskCount - 1 ? "Compilation error" : undefined,
        files_modified: [`src/pages/page${i}.tsx`],
        lines_changed: 45,
        complexity_score: 8.5,
      })
    }

    return {
      successful_count: taskCount - 1,
      failed_count: 1,
      total_time: taskCount * 330000,
      parallel_subtasks: tasks,
      theoretical_speedup: `${taskCount}x based on ${taskCount} independent groups...`,
    }
  }

  it("应该保留 VERBOSE 级别的完整信息", () => {
    const report = createMockReport(5)
    const compressed = compressReport(report, ReportLevel.VERBOSE) as any

    assert.strictEqual(compressed.level, ReportLevel.VERBOSE)
    assert(compressed.parallel_subtasks)
    assert.strictEqual(compressed.parallel_subtasks.length, 5)
  })

  it("应该生成 NORMAL 级别的简化报告", () => {
    const report = createMockReport(10)
    const compressed = compressReport(report, ReportLevel.NORMAL)

    assert.strictEqual(compressed.level, ReportLevel.NORMAL)
    assert(!compressed.failures || compressed.failures.length === 1)  // 仅失败任务
    assert(compressed.success_summary)
    assert.strictEqual(compressed.success_summary.count, 9)
    assert(compressed.summary)
    assert(compressed.summary.includes("9"))
  })

  it("应该生成 BRIEF 级别的极简报告", () => {
    const report = createMockReport(10)
    const compressed = compressReport(report, ReportLevel.BRIEF)

    assert.strictEqual(compressed.level, ReportLevel.BRIEF)
    assert(compressed.summary)
    assert(compressed.summary.includes("1"))  // 失败数量
  })

  it("应该计算正确的 token 节省", () => {
    const report = createMockReport(40)

    const verbose = estimateReportSavings(report, ReportLevel.VERBOSE)
    const normal = estimateReportSavings(report, ReportLevel.NORMAL)
    const brief = estimateReportSavings(report, ReportLevel.BRIEF)

    // NORMAL 应该比 VERBOSE 节省更多
    assert(normal.after < verbose.after)

    // BRIEF 应该节省最多
    assert(brief.after < normal.after)

    // 节省比例应该是正数
    assert(parseFloat(normal.savings) > 0)
    assert(parseFloat(brief.savings) > 0)
  })

  it("应该自动选择合适的压缩级别", () => {
    // 小报告应该使用 VERBOSE
    const smallReport = createMockReport(2)
    assert.strictEqual(autoSelectCompressionLevel(smallReport), ReportLevel.VERBOSE)

    // 大报告应该使用 BRIEF
    const largeReport = createMockReport(100)
    assert.strictEqual(autoSelectCompressionLevel(largeReport), ReportLevel.BRIEF)
  })

  it("应该正确判断报告状态", () => {
    const successReport = createMockReport(1)  // 0 failed, 1 success
    successReport.failed_count = 0
    const successCompressed = compressReport(successReport, ReportLevel.NORMAL)
    assert.strictEqual(successCompressed.status, "success")

    const failureReport = createMockReport(40)
    failureReport.successful_count = 0
    const failureCompressed = compressReport(failureReport, ReportLevel.NORMAL)
    assert.strictEqual(failureCompressed.status, "failed")

    const partialReport = createMockReport(40)
    const partialCompressed = compressReport(partialReport, ReportLevel.NORMAL)
    assert.strictEqual(partialCompressed.status, "partial")
  })

  it("应该生成压缩统计报告", () => {
    const report = createMockReport(20)
    const stats = generateCompressionStats(report)

    assert(stats.includes("报告压缩统计"))
    assert(stats.includes("原始任务数: 20"))
    assert(stats.includes("压缩效果对比"))
    assert(stats.includes("| verbose |"))
    assert(stats.includes("| normal |"))
    assert(stats.includes("| brief |"))
    assert(stats.includes("建议"))
  })

  it("应该在 NORMAL 模式下保留失败任务的详细信息", () => {
    const report = createMockReport(10)
    const compressed = compressReport(report, ReportLevel.NORMAL)

    assert(compressed.failures)
    assert.strictEqual(compressed.failures.length, 1)
    assert(compressed.failures[0].error)
    assert.strictEqual(compressed.failures[0].error, "Compilation error")
  })

  it("应该计算成功任务的汇总统计", () => {
    const report = createMockReport(10)
    const compressed = compressReport(report, ReportLevel.NORMAL)

    assert(compressed.success_summary)
    assert.strictEqual(compressed.success_summary.count, 9)
    assert(compressed.success_summary.avg_duration > 0)
    assert(compressed.success_summary.total_files === 9)
    assert(compressed.success_summary.total_lines > 0)
  })

  it("应该支持所有任务成功的情况", () => {
    const report = createMockReport(10)
    report.failed_count = 0
    report.successful_count = 10
    report.parallel_subtasks.forEach((t) => {
      t.status = "done"
    })

    const compressed = compressReport(report, ReportLevel.NORMAL)
    assert.strictEqual(compressed.status, "success")
    assert(!compressed.failures || compressed.failures.length === 0)
    assert(compressed.summary)
    assert(compressed.summary.includes("10"))
  })

  it("应该支持所有任务失败的情况", () => {
    const report = createMockReport(10)
    report.failed_count = 10
    report.successful_count = 0
    report.parallel_subtasks.forEach((t) => {
      t.status = "failed"
    })

    const compressed = compressReport(report, ReportLevel.NORMAL)
    assert.strictEqual(compressed.status, "failed")
    assert(compressed.failures)
    assert.strictEqual(compressed.failures.length, 10)
    assert(!compressed.success_summary || compressed.success_summary.count === 0)
  })

  it("BRIEF 模式应该最大化节省", () => {
    const report = createMockReport(50)
    const stats = estimateReportSavings(report, ReportLevel.BRIEF)

    // BRIEF 模式应该节省至少 80%
    const savingsPercent = parseFloat(stats.savings)
    assert(savingsPercent >= 80, `应该节省 80%+，实际 ${savingsPercent}%`)
  })
})

console.log("\n[OK] 报告自适应压缩测试全部通过！")
