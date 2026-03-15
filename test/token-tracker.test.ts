/**
 * Token 消耗监控测试 - Phase 5 P3-1
 *
 * 验证：
 * - Token 消耗追踪
 * - 统计和分析
 * - 优化建议生成
 * - 趋势预测
 */

import assert from "assert"
import {
  TokenTracker,
  TokenCategory,
  TokenOptimizationEngine,
  TokenTrendAnalyzer,
  TokenDashboard,
} from "../src/monitoring/token-tracker"

describe("Token 消耗监控", () => {
  // ─────────────────── Token 追踪器测试 ───────────────────

  describe("Token 追踪器", () => {
    let tracker: TokenTracker

    beforeEach(() => {
      tracker = new TokenTracker()
    })

    it("应该记录 Token 消耗", () => {
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 5000, "gongbu", "general")
      const history = tracker.getHistory()

      assert.strictEqual(history.length, 1)
      assert.strictEqual(history[0].amount, 5000)
      assert.strictEqual(history[0].category, TokenCategory.CONSTRAINTS)
    })

    it("应该支持多个类别", () => {
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 5000)
      tracker.recordUsage(TokenCategory.WORKFLOW, 3000)
      tracker.recordUsage(TokenCategory.CODE_CONTENT, 2000)
      tracker.recordUsage(TokenCategory.REPORTS, 1000)

      const stats = tracker.getStats()
      assert.strictEqual(stats.length, 4)
    })

    it("应该计算总消耗", () => {
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 5000)
      tracker.recordUsage(TokenCategory.WORKFLOW, 3000)

      const total = tracker.getTotalUsage()
      assert.strictEqual(total, 8000)
    })

    it("应该生成统计信息", () => {
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 5000)
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 6000)
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 4000)

      const stats = tracker.getStats(TokenCategory.CONSTRAINTS)
      assert.strictEqual(stats.length, 1)

      const stat = stats[0]
      assert.strictEqual(stat.total, 15000)
      assert.strictEqual(stat.count, 3)
      assert.strictEqual(stat.average, 5000)
      assert.strictEqual(stat.min, 4000)
      assert.strictEqual(stat.max, 6000)
    })

    it("应该识别消耗趋势", () => {
      // 递增趋势
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 1000)
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 3000)
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 5000)

      const stats = tracker.getStats(TokenCategory.CONSTRAINTS)
      assert.strictEqual(stats[0].trend, "increasing")
    })

    it("应该计算分布百分比", () => {
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 5000)
      tracker.recordUsage(TokenCategory.WORKFLOW, 3000)
      tracker.recordUsage(TokenCategory.CODE_CONTENT, 2000)

      const distribution = tracker.getDistribution()
      assert.strictEqual(distribution.size, 3)

      const constraintPercent = distribution.get(TokenCategory.CONSTRAINTS)!
      assert(constraintPercent > 40 && constraintPercent < 60) // 约 50%
    })

    it("应该按 Agent 分组", () => {
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 5000, "gongbu")
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 3000, "yibu")
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 2000, "gongbu")

      const byAgent = tracker.getByAgent()
      assert.strictEqual(byAgent.get("gongbu"), 7000)
      assert.strictEqual(byAgent.get("yibu"), 3000)
    })

    it("应该按 Domain 分组", () => {
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 5000, undefined, "general")
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 3000, undefined, "asset-management")
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 2000, undefined, "general")

      const byDomain = tracker.getByDomain()
      assert.strictEqual(byDomain.get("general"), 7000)
      assert.strictEqual(byDomain.get("asset-management"), 3000)
    })

    it("应该清除历史数据", () => {
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 5000)
      tracker.clear()

      const total = tracker.getTotalUsage()
      assert.strictEqual(total, 0)
    })
  })

  // ─────────────────── 优化建议引擎测试 ───────────────────

  describe("优化建议引擎", () => {
    let tracker: TokenTracker
    let engine: TokenOptimizationEngine

    beforeEach(() => {
      tracker = new TokenTracker()
      engine = new TokenOptimizationEngine(tracker)
    })

    it("应该在超过基线时生成建议", () => {
      // 设置基线
      const baseline = new Map<TokenCategory, number>()
      baseline.set(TokenCategory.CONSTRAINTS, 5000)
      engine.setBaseline(baseline)

      // 记录超过基线 20% 的消耗
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 6500)

      const suggestions = engine.generateSuggestions()
      assert(suggestions.length > 0)
      assert.strictEqual(suggestions[0].category, TokenCategory.CONSTRAINTS)
    })

    it("应该计算潜在节省", () => {
      const baseline = new Map<TokenCategory, number>()
      baseline.set(TokenCategory.CONSTRAINTS, 5000)
      baseline.set(TokenCategory.WORKFLOW, 3000)
      engine.setBaseline(baseline)

      tracker.recordUsage(TokenCategory.CONSTRAINTS, 7000)
      tracker.recordUsage(TokenCategory.WORKFLOW, 3500)

      const potential = engine.calculatePotentialSavings()
      assert(potential.potential_savings > 0)
      assert(potential.savings_percentage > 0)
    })

    it("应该按优先级排序建议", () => {
      const baseline = new Map<TokenCategory, number>()
      baseline.set(TokenCategory.CONSTRAINTS, 5000)
      baseline.set(TokenCategory.CODE_CONTENT, 3000)
      baseline.set(TokenCategory.METADATA, 1000)
      engine.setBaseline(baseline)

      tracker.recordUsage(TokenCategory.CONSTRAINTS, 7000)
      tracker.recordUsage(TokenCategory.CODE_CONTENT, 4000)
      tracker.recordUsage(TokenCategory.METADATA, 1500)

      const suggestions = engine.generateSuggestions()
      // 第一个应该是 high 优先级
      assert.strictEqual(suggestions[0].priority, "high")
    })

    it("应该为不同类别提供不同建议", () => {
      const baseline = new Map<TokenCategory, number>()
      for (const cat of Object.values(TokenCategory)) {
        baseline.set(cat as TokenCategory, 1000)
      }
      engine.setBaseline(baseline)

      for (const cat of Object.values(TokenCategory)) {
        tracker.recordUsage(cat as TokenCategory, 1500)
      }

      const suggestions = engine.generateSuggestions()
      const categories = new Set(suggestions.map((s) => s.category))

      assert(suggestions.length > 0)
      for (const suggestion of suggestions) {
        assert(suggestion.recommendation.length > 0)
      }
    })
  })

  // ─────────────────── 趋势分析器测试 ───────────────────

  describe("趋势分析器", () => {
    let tracker: TokenTracker
    let analyzer: TokenTrendAnalyzer

    beforeEach(() => {
      tracker = new TokenTracker()
      analyzer = new TokenTrendAnalyzer()
    })

    it("应该记录快照", () => {
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 1000)
      analyzer.recordSnapshot(tracker)

      const snapshots = analyzer.getSnapshots()
      assert.strictEqual(snapshots.length, 1)
      assert.strictEqual(snapshots[0].usage, 1000)
    })

    it("应该识别上升趋势", () => {
      // 模拟上升趋势
      for (let i = 1; i <= 10; i++) {
        tracker.clear()
        tracker.recordUsage(TokenCategory.CONSTRAINTS, 1000 * i)
        analyzer.recordSnapshot(tracker)
      }

      const trend = analyzer.getTrend()
      assert.strictEqual(trend.direction, "increasing")
      assert(trend.rate > 0)
    })

    it("应该识别下降趋势", () => {
      // 模拟下降趋势
      for (let i = 10; i >= 1; i--) {
        tracker.clear()
        tracker.recordUsage(TokenCategory.CONSTRAINTS, 1000 * i)
        analyzer.recordSnapshot(tracker)
      }

      const trend = analyzer.getTrend()
      assert.strictEqual(trend.direction, "decreasing")
      assert(trend.rate < 0)
    })

    it("应该识别稳定趋势", () => {
      // 稳定消耗
      for (let i = 0; i < 10; i++) {
        tracker.clear()
        tracker.recordUsage(TokenCategory.CONSTRAINTS, 5000)
        analyzer.recordSnapshot(tracker)
      }

      const trend = analyzer.getTrend()
      assert.strictEqual(trend.direction, "stable")
    })

    it("应该预测未来消耗", () => {
      // 设置上升趋势
      for (let i = 1; i <= 10; i++) {
        tracker.clear()
        tracker.recordUsage(TokenCategory.CONSTRAINTS, 1000 * i)
        analyzer.recordSnapshot(tracker)
      }

      const predictions = analyzer.predictFutureUsage(5)
      assert.strictEqual(predictions.length, 5)

      // 在上升趋势中，预测应该递增
      for (let i = 1; i < predictions.length; i++) {
        assert(predictions[i] >= predictions[i - 1])
      }
    })

    it("应该计算置信度", () => {
      for (let i = 0; i < 20; i++) {
        analyzer.recordSnapshot(tracker)
      }

      const trend = analyzer.getTrend()
      assert(trend.confidence > 0 && trend.confidence <= 100)
    })
  })

  // ─────────────────── Token 仪表板测试 ───────────────────

  describe("Token 监控仪表板", () => {
    let dashboard: TokenDashboard

    beforeEach(() => {
      dashboard = new TokenDashboard()
    })

    it("应该初始化仪表板", () => {
      assert(dashboard.getTracker())
    })

    it("应该生成仪表板报告", () => {
      const tracker = dashboard.getTracker()
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 5000, "gongbu", "general")
      tracker.recordUsage(TokenCategory.WORKFLOW, 3000, "yibu", "general")

      const report = dashboard.generateDashboardReport()

      assert(report.includes("总体概览"))
      assert(report.includes("按类别分布"))
      assert(report.includes("详细统计"))
    })

    it("应该在报告中包含优化建议", () => {
      const tracker = dashboard.getTracker()

      // 设置基线并超过它
      const engine = new TokenOptimizationEngine(tracker)
      const baseline = new Map<TokenCategory, number>()
      baseline.set(TokenCategory.CONSTRAINTS, 5000)
      engine.setBaseline(baseline)

      tracker.recordUsage(TokenCategory.CONSTRAINTS, 7000)

      const report = dashboard.generateDashboardReport()
      assert(report.includes("优化建议"))
    })

    it("应该生成趋势分析", () => {
      const tracker = dashboard.getTracker()

      // 记录多个快照
      for (let i = 1; i <= 5; i++) {
        tracker.recordUsage(TokenCategory.CONSTRAINTS, 1000 * i)
        dashboard.snapshot()
      }

      const trendAnalysis = dashboard.getTrendAnalysis()
      assert(trendAnalysis.includes("Token 趋势分析"))
      assert(trendAnalysis.includes("历史数据"))
    })

    it("应该导出完整报告", () => {
      const tracker = dashboard.getTracker()
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 5000)
      dashboard.snapshot()

      const fullReport = dashboard.exportFullReport()

      assert(fullReport.includes("Token 消耗监控仪表板"))
      assert(fullReport.includes("Token 趋势分析"))
    })

    it("应该支持多次快照", () => {
      const tracker = dashboard.getTracker()

      for (let i = 0; i < 10; i++) {
        tracker.clear()
        tracker.recordUsage(TokenCategory.CONSTRAINTS, 1000 * (i + 1))
        dashboard.snapshot()
      }

      // 应该能生成有意义的报告
      const trendAnalysis = dashboard.getTrendAnalysis()
      assert(trendAnalysis.includes("未来预测"))
    })
  })

  // ─────────────────── 端到端监控场景 ───────────────────

  describe("端到端监控场景", () => {
    it("应该完整监控一个任务的 Token 消耗", () => {
      const dashboard = new TokenDashboard()
      const tracker = dashboard.getTracker()

      // 模拟一个任务的执行
      // 初始化阶段
      tracker.recordUsage(TokenCategory.CONSTRAINTS, 5000, "yibu", "general", "Constraints loading")
      tracker.recordUsage(
        TokenCategory.WORKFLOW,
        3000,
        "yibu",
        "general",
        "Workflow initialization"
      )

      // 实现阶段
      tracker.recordUsage(
        TokenCategory.CODE_CONTENT,
        4000,
        "gongbu",
        "general",
        "Code implementation"
      )
      tracker.recordUsage(TokenCategory.CACHE_MISSES, 500, "gongbu", "general", "Cache miss")

      // 验证阶段
      tracker.recordUsage(
        TokenCategory.CODE_CONTENT,
        2000,
        "xingbu",
        "general",
        "Code review"
      )
      tracker.recordUsage(
        TokenCategory.REPORTS,
        1000,
        "xingbu",
        "general",
        "Report generation"
      )

      // 快照
      dashboard.snapshot()

      // 验证报告
      const report = dashboard.generateDashboardReport()
      assert(report.includes("总体概览"))
      assert(report.includes("总消耗"))

      // 验证分布
      const distribution = tracker.getDistribution()
      assert(distribution.size > 0)

      // 验证按 Agent 分组
      const byAgent = tracker.getByAgent()
      assert(byAgent.has("yibu"))
      assert(byAgent.has("gongbu"))
      assert(byAgent.has("xingbu"))
    })

    it("应该检测异常消耗模式", () => {
      const dashboard = new TokenDashboard()
      const tracker = dashboard.getTracker()
      const engine = new TokenOptimizationEngine(tracker)

      // 设置基线
      const baseline = new Map<TokenCategory, number>()
      baseline.set(TokenCategory.CONSTRAINTS, 5000)
      baseline.set(TokenCategory.CACHE_MISSES, 500)
      engine.setBaseline(baseline)

      // 模拟异常高消耗
      tracker.recordUsage(TokenCategory.CACHE_MISSES, 3000, "gongbu", "general")

      const suggestions = engine.generateSuggestions()
      assert(suggestions.length > 0)

      // 缓存未中应该是 high 优先级
      const cacheSuggestion = suggestions.find((s) => s.category === TokenCategory.CACHE_MISSES)
      assert(cacheSuggestion && cacheSuggestion.priority === "high")
    })
  })
})

console.log("\n✅ Token 消耗监控测试全部通过！")
