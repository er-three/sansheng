/**
 * Token 消耗监控系统 - Phase 5 P3-1
 *
 * 实时追踪和分析 Token 消耗：
 * - 按类别分解消耗
 * - 历史数据记录
 * - 趋势分析
 * - 自动优化建议
 *
 * 目标：识别优化机会，实现额外 5-10% 节省
 */

import { log } from "../utils.js"

/**
 * Token 消耗类别
 */
export enum TokenCategory {
  CONSTRAINTS = "constraints", // 约束系统
  WORKFLOW = "workflow", // 工作流内容
  CODE_CONTENT = "code_content", // 代码内容
  REPORTS = "reports", // 报告和输出
  CACHE_MISSES = "cache_misses", // 缓存失效
  METADATA = "metadata", // 元数据
}

/**
 * Token 消耗记录
 */
export interface TokenUsage {
  category: TokenCategory
  amount: number
  timestamp: number
  agent?: string
  domain?: string
  details?: string
}

/**
 * Token 消耗统计
 */
export interface TokenStats {
  category: TokenCategory
  total: number
  count: number
  average: number
  min: number
  max: number
  trend: "increasing" | "stable" | "decreasing"
}

/**
 * 优化建议
 */
export interface OptimizationSuggestion {
  category: TokenCategory
  current_usage: number
  potential_savings: number
  savings_percentage: number
  recommendation: string
  priority: "high" | "medium" | "low"
}

/**
 * Token 追踪器
 */
export class TokenTracker {
  private usages: TokenUsage[] = []
  private readonly maxHistorySize = 1000
  private session_start = Date.now()

  /**
   * 记录 Token 消耗
   */
  recordUsage(
    category: TokenCategory,
    amount: number,
    agent?: string,
    domain?: string,
    details?: string
  ): void {
    const usage: TokenUsage = {
      category,
      amount,
      timestamp: Date.now(),
      agent,
      domain,
      details,
    }

    this.usages.push(usage)

    // 限制历史大小
    if (this.usages.length > this.maxHistorySize) {
      this.usages.shift()
    }

    log("TokenTracker", `Recorded ${amount} tokens for ${category}`)
  }

  /**
   * 获取特定类别的统计
   */
  getStats(category?: TokenCategory): TokenStats[] {
    const statsMap = new Map<TokenCategory, TokenUsage[]>()

    // 按类别分组
    for (const usage of this.usages) {
      if (category && usage.category !== category) continue

      if (!statsMap.has(usage.category)) {
        statsMap.set(usage.category, [])
      }
      statsMap.get(usage.category)!.push(usage)
    }

    // 生成统计
    const stats: TokenStats[] = []
    for (const [cat, usages] of statsMap.entries()) {
      const amounts = usages.map((u) => u.amount)
      const total = amounts.reduce((a, b) => a + b, 0)
      const average = total / amounts.length

      // 计算趋势（简单：比较前半和后半的平均值）
      const mid = Math.floor(amounts.length / 2)
      const firstHalf = amounts.slice(0, mid).reduce((a, b) => a + b, 0) / mid || 0
      const secondHalf =
        amounts.slice(mid).reduce((a, b) => a + b, 0) / (amounts.length - mid) || 0

      let trend: "increasing" | "stable" | "decreasing" = "stable"
      if (secondHalf > firstHalf * 1.1) trend = "increasing"
      else if (secondHalf < firstHalf * 0.9) trend = "decreasing"

      stats.push({
        category: cat,
        total,
        count: usages.length,
        average,
        min: Math.min(...amounts),
        max: Math.max(...amounts),
        trend,
      })
    }

    return stats
  }

  /**
   * 获取总消耗
   */
  getTotalUsage(): number {
    return this.usages.reduce((sum, u) => sum + u.amount, 0)
  }

  /**
   * 获取各类别的百分比分布
   */
  getDistribution(): Map<TokenCategory, number> {
    const total = this.getTotalUsage()
    const distribution = new Map<TokenCategory, number>()

    const stats = this.getStats()
    for (const stat of stats) {
      distribution.set(stat.category, (stat.total / total) * 100)
    }

    return distribution
  }

  /**
   * 获取按 Agent 分解的消耗
   */
  getByAgent(): Map<string, number> {
    const byAgent = new Map<string, number>()

    for (const usage of this.usages) {
      if (!usage.agent) continue

      const current = byAgent.get(usage.agent) || 0
      byAgent.set(usage.agent, current + usage.amount)
    }

    return byAgent
  }

  /**
   * 获取按 Domain 分解的消耗
   */
  getByDomain(): Map<string, number> {
    const byDomain = new Map<string, number>()

    for (const usage of this.usages) {
      if (!usage.domain) continue

      const current = byDomain.get(usage.domain) || 0
      byDomain.set(usage.domain, current + usage.amount)
    }

    return byDomain
  }

  /**
   * 清除历史数据
   */
  clear(): void {
    this.usages = []
  }

  /**
   * 获取原始历史数据
   */
  getHistory(limit: number = 100): TokenUsage[] {
    return this.usages.slice(-limit)
  }
}

/**
 * Token 优化建议引擎
 */
export class TokenOptimizationEngine {
  private tracker: TokenTracker
  private baseline: Map<TokenCategory, number> = new Map()

  constructor(tracker: TokenTracker) {
    this.tracker = tracker
  }

  /**
   * 设置基线（用于对比）
   */
  setBaseline(baselines: Map<TokenCategory, number>): void {
    this.baseline = new Map(baselines)
  }

  /**
   * 生成优化建议
   */
  generateSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    const stats = this.tracker.getStats()

    for (const stat of stats) {
      // 获取基线值（默认为当前值）
      const baseline = this.baseline.get(stat.category) || stat.total

      // 如果当前消耗超过基线的 20%，生成建议
      if (stat.total > baseline * 1.2) {
        const excess = stat.total - baseline
        const savingsPercentage = (excess / stat.total) * 100

        let recommendation = ""
        let priority: "high" | "medium" | "low" = "medium"

        switch (stat.category) {
          case TokenCategory.CONSTRAINTS:
            recommendation = "考虑进一步优化约束注入，减少非必要约束的加载"
            priority = "high"
            break
          case TokenCategory.WORKFLOW:
            recommendation = "工作流内容消耗较高，考虑增加工作流 ID 引用的使用"
            priority = "high"
            break
          case TokenCategory.CODE_CONTENT:
            recommendation = "代码内容较多，考虑优化代码片段的选择和大小"
            priority = "medium"
            break
          case TokenCategory.REPORTS:
            recommendation = "报告内容较多，考虑增加报告压缩级别"
            priority = "medium"
            break
          case TokenCategory.CACHE_MISSES:
            recommendation = "缓存未中率较高，考虑优化缓存预热策略"
            priority = "high"
            break
          case TokenCategory.METADATA:
            recommendation = "元数据消耗较多，考虑简化元数据结构"
            priority = "low"
            break
        }

        suggestions.push({
          category: stat.category,
          current_usage: stat.total,
          potential_savings: excess,
          savings_percentage: savingsPercentage,
          recommendation,
          priority,
        })
      }
    }

    // 按优先级排序
    suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    return suggestions
  }

  /**
   * 计算潜在的总节省
   */
  calculatePotentialSavings(): {
    current_total: number
    potential_savings: number
    savings_percentage: number
  } {
    const suggestions = this.generateSuggestions()
    const current_total = this.tracker.getTotalUsage()
    const potential_savings = suggestions.reduce((sum, s) => sum + s.potential_savings, 0)

    return {
      current_total,
      potential_savings,
      savings_percentage: (potential_savings / current_total) * 100,
    }
  }
}

/**
 * Token 趋势分析器
 */
export class TokenTrendAnalyzer {
  private snapshots: { timestamp: number; usage: number }[] = []
  private readonly maxSnapshots = 100

  /**
   * 记录快照
   */
  recordSnapshot(tracker: TokenTracker): void {
    this.snapshots.push({
      timestamp: Date.now(),
      usage: tracker.getTotalUsage(),
    })

    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift()
    }
  }

  /**
   * 获取趋势（简单线性回归）
   */
  getTrend(): {
    direction: "increasing" | "stable" | "decreasing"
    rate: number
    confidence: number
  } {
    if (this.snapshots.length < 2) {
      return { direction: "stable", rate: 0, confidence: 0 }
    }

    // 计算简单的变化率
    const first = this.snapshots[0].usage
    const last = this.snapshots[this.snapshots.length - 1].usage
    const change = last - first
    const rate = (change / first) * 100

    let direction: "increasing" | "stable" | "decreasing" = "stable"
    if (rate > 5) direction = "increasing"
    else if (rate < -5) direction = "decreasing"

    // 简单的置信度（基于样本数）
    const confidence = Math.min((this.snapshots.length / 10) * 100, 100)

    return { direction, rate, confidence }
  }

  /**
   * 获取历史快照
   */
  getSnapshots(limit: number = 20): { timestamp: number; usage: number }[] {
    return this.snapshots.slice(-limit)
  }

  /**
   * 预测未来消耗
   */
  predictFutureUsage(intervals: number = 5): number[] {
    if (this.snapshots.length < 2) {
      return []
    }

    // 基于当前趋势的简单预测
    const trend = this.getTrend()
    const lastUsage = this.snapshots[this.snapshots.length - 1].usage
    const predictions: number[] = []

    for (let i = 1; i <= intervals; i++) {
      const predictedUsage = lastUsage * (1 + (trend.rate / 100) * i)
      predictions.push(Math.max(0, predictedUsage))
    }

    return predictions
  }
}

/**
 * Token 监控仪表板
 */
export class TokenDashboard {
  private tracker: TokenTracker
  private optimizationEngine: TokenOptimizationEngine
  private trendAnalyzer: TokenTrendAnalyzer

  constructor() {
    this.tracker = new TokenTracker()
    this.optimizationEngine = new TokenOptimizationEngine(this.tracker)
    this.trendAnalyzer = new TokenTrendAnalyzer()
  }

  /**
   * 获取追踪器
   */
  getTracker(): TokenTracker {
    return this.tracker
  }

  /**
   * 生成仪表板报告
   */
  generateDashboardReport(): string {
    const stats = this.tracker.getStats()
    const distribution = this.tracker.getDistribution()
    const byAgent = this.tracker.getByAgent()
    const byDomain = this.tracker.getByDomain()
    const suggestions = this.optimizationEngine.generateSuggestions()
    const potential = this.optimizationEngine.calculatePotentialSavings()
    const trend = this.trendAnalyzer.getTrend()

    const lines = [
      "# Token 消耗监控仪表板",
      "",
      "## 总体概览",
      `- 总消耗：${potential.current_total.toLocaleString()} tokens`,
      `- 潜在节省：${potential.potential_savings.toLocaleString()} tokens (${potential.savings_percentage.toFixed(1)}%)`,
      `- 趋势：${trend.direction} (${trend.rate.toFixed(1)}% 变化率，置信度 ${trend.confidence.toFixed(0)}%)`,
      "",
      "## 按类别分布",
      ...Array.from(distribution.entries()).map(
        ([cat, percent]) => `- ${cat}：${percent.toFixed(1)}%`
      ),
      "",
      "## 详细统计",
      ...stats.map(
        (s) =>
          `### ${s.category}\n- 总计：${s.total} tokens\n- 次数：${s.count}\n- 平均：${s.average.toFixed(0)} tokens\n- 范围：${s.min}-${s.max}\n- 趋势：${s.trend}`
      ),
      "",
      "## 按 Agent 分布",
      ...Array.from(byAgent.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([agent, amount]) => `- ${agent}：${amount.toLocaleString()} tokens`),
      "",
      "## 按 Domain 分布",
      ...Array.from(byDomain.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([domain, amount]) => `- ${domain}：${amount.toLocaleString()} tokens`),
      "",
      "## 优化建议",
      ...suggestions.map(
        (s) =>
          `### [${s.priority.toUpperCase()}] ${s.category}\n- 当前：${s.current_usage.toLocaleString()} tokens\n- 可节省：${s.potential_savings.toLocaleString()} tokens (${s.savings_percentage.toFixed(1)}%)\n- 建议：${s.recommendation}`
      ),
      "",
    ]

    return lines.join("\n")
  }

  /**
   * 快照当前状态
   */
  snapshot(): void {
    this.trendAnalyzer.recordSnapshot(this.tracker)
    log("TokenDashboard", `Recorded snapshot: ${this.tracker.getTotalUsage()} tokens`)
  }

  /**
   * 获取趋势分析
   */
  getTrendAnalysis(): string {
    const trend = this.trendAnalyzer.getTrend()
    const snapshots = this.trendAnalyzer.getSnapshots()
    const predictions = this.trendAnalyzer.predictFutureUsage(5)

    const lines = [
      "## Token 趋势分析",
      "",
      `**当前趋势**：${trend.direction}`,
      `**变化率**：${trend.rate.toFixed(1)}%`,
      `**置信度**：${trend.confidence.toFixed(0)}%`,
      "",
      "### 历史数据",
      ...snapshots.map(
        (s) =>
          `- ${new Date(s.timestamp).toLocaleTimeString()}：${s.usage.toLocaleString()} tokens`
      ),
      "",
      "### 未来预测 (基于当前趋势)",
      ...predictions.map((p, i) => `- 间隔 ${i + 1}：${p.toLocaleString()} tokens`),
      "",
    ]

    return lines.join("\n")
  }

  /**
   * 导出完整报告
   */
  exportFullReport(): string {
    return (
      this.generateDashboardReport() + "\n\n" + this.getTrendAnalysis()
    )
  }
}
