/**
 * 约束分级注入配置 - Phase 5 优化
 *
 * 根据 Agent 类型和工作域，智能选择需要注入的约束
 * 目标：减少不必要的约束注入，节省 30-50% token
 */

/**
 * 约束作用域
 */
export enum ConstraintScope {
  // 基础
  UNIVERSAL = "universal",        // 所有 Agent 必须

  // Agent 特化
  AGENT_IMPLEMENTATION = "agent_implementation",  // gongbu
  AGENT_CODE_REVIEW = "agent_code_review",        // xingbu
  AGENT_VERIFICATION = "agent_verification",      // bingbu

  // 角色特化
  PLANNING = "planning",           // zhongshu, menxia
  SCHEDULING = "scheduling",       // shangshu
  ANALYSIS = "analysis",           // yibu, hubu
  MANAGEMENT = "management",       // kubu, libu

  // 功能特化
  PARALLEL_EXECUTION = "parallel_execution",      // 并行任务
  SKILL_DEFINITION = "skill_definition",          // 技能定义
  SECURITY = "security",           // 安全约束
  DOCUMENTATION = "documentation", // 文档约束
}

/**
 * Agent 约束注入配置
 */
export interface ConstraintInjectionProfile {
  agent: string
  domain: string
  scopes: ConstraintScope[]
  compress: boolean
  priority: "high" | "medium" | "low"
}

/**
 * 约束成本和价值表
 */
const CONSTRAINT_COST_TABLE: Record<ConstraintScope, {
  cost: "high" | "medium" | "low"
  agents: string[]
  description: string
}> = {
  [ConstraintScope.UNIVERSAL]: {
    cost: "high",
    agents: ["*"],  // 所有 Agent
    description: "基础约束，必须注入"
  },
  [ConstraintScope.AGENT_IMPLEMENTATION]: {
    cost: "high",
    agents: ["gongbu"],
    description: "代码实现约束，仅 gongbu 需要"
  },
  [ConstraintScope.AGENT_CODE_REVIEW]: {
    cost: "high",
    agents: ["xingbu"],
    description: "代码审查约束，仅 xingbu 需要"
  },
  [ConstraintScope.AGENT_VERIFICATION]: {
    cost: "high",
    agents: ["bingbu"],
    description: "测试验证约束，仅 bingbu 需要"
  },
  [ConstraintScope.PLANNING]: {
    cost: "medium",
    agents: ["zhongshu", "menxia"],
    description: "规划审核约束"
  },
  [ConstraintScope.SCHEDULING]: {
    cost: "medium",
    agents: ["shangshu"],
    description: "调度约束"
  },
  [ConstraintScope.ANALYSIS]: {
    cost: "low",
    agents: ["yibu", "hubu", "kubu", "libu"],
    description: "分析工作约束"
  },
  [ConstraintScope.MANAGEMENT]: {
    cost: "low",
    agents: ["kubu", "libu"],
    description: "管理工作约束"
  },
  [ConstraintScope.PARALLEL_EXECUTION]: {
    cost: "medium",
    agents: ["shangshu", "gongbu", "bingbu"],
    description: "并行执行约束"
  },
  [ConstraintScope.SKILL_DEFINITION]: {
    cost: "medium",
    agents: ["*"],
    description: "技能定义约束"
  },
  [ConstraintScope.SECURITY]: {
    cost: "low",
    agents: ["*"],
    description: "安全约束"
  },
  [ConstraintScope.DOCUMENTATION]: {
    cost: "low",
    agents: ["*"],
    description: "文档约束"
  },
}

/**
 * 根据 Agent 名称和工作域获取约束注入配置
 */
export function getConstraintInjectionProfile(
  agentName: string,
  domain: string
): ConstraintInjectionProfile {
  // 基础约束：所有 Agent 都必须有
  const baseScopes: ConstraintScope[] = [ConstraintScope.UNIVERSAL]

  // Agent 特化约束
  let agentScopes: ConstraintScope[] = []
  switch (agentName) {
    case "gongbu":
      agentScopes = [
        ConstraintScope.AGENT_IMPLEMENTATION,
        ConstraintScope.SECURITY,
        ConstraintScope.DOCUMENTATION,
      ]
      break

    case "bingbu":
      agentScopes = [
        ConstraintScope.AGENT_VERIFICATION,
        ConstraintScope.SECURITY,
      ]
      break

    case "xingbu":
      agentScopes = [
        ConstraintScope.AGENT_CODE_REVIEW,
        ConstraintScope.SECURITY,
      ]
      break

    case "zhongshu":
      agentScopes = [
        ConstraintScope.PLANNING,
        ConstraintScope.SKILL_DEFINITION,
      ]
      break

    case "menxia":
      agentScopes = [
        ConstraintScope.PLANNING,
      ]
      break

    case "shangshu":
      agentScopes = [
        ConstraintScope.SCHEDULING,
        ConstraintScope.PARALLEL_EXECUTION,
      ]
      break

    case "yibu":
    case "hubu":
      agentScopes = [
        ConstraintScope.ANALYSIS,
        ConstraintScope.SECURITY,
      ]
      break

    case "kubu":
    case "libu":
      agentScopes = [
        ConstraintScope.MANAGEMENT,
        ConstraintScope.SKILL_DEFINITION,
      ]
      break

    case "huangdi":
      // 皇帝需要更多约束以支持决策
      agentScopes = [
        ConstraintScope.PLANNING,
        ConstraintScope.SKILL_DEFINITION,
        ConstraintScope.PARALLEL_EXECUTION,
      ]
      break

    default:
      agentScopes = [ConstraintScope.SKILL_DEFINITION]
  }

  // 合并约束（去重）
  const allScopes = Array.from(new Set([...baseScopes, ...agentScopes]))

  // 根据 domain 额外添加约束
  if (domain === "asset-management" && !allScopes.includes(ConstraintScope.MANAGEMENT)) {
    allScopes.push(ConstraintScope.MANAGEMENT)
  }

  // 确定优先级
  const priority = calculatePriority(agentName, domain)

  // 根据优先级决定是否压缩
  const shouldCompress = priority === "low"

  return {
    agent: agentName,
    domain,
    scopes: allScopes,
    compress: shouldCompress,
    priority,
  }
}

/**
 * 计算 Agent 优先级（用于决定压缩策略）
 */
function calculatePriority(agentName: string, domain: string): "high" | "medium" | "low" {
  // 高优先级 Agent（关键决策和实现）
  if (["huangdi", "zhongshu", "menxia", "gongbu"].includes(agentName)) {
    return "high"
  }

  // 中等优先级 Agent（执行和审查）
  if (["xingbu", "bingbu", "shangshu"].includes(agentName)) {
    return "medium"
  }

  // 低优先级 Agent（分析和辅助）
  return "low"
}

/**
 * 获取约束成本表
 */
export function getConstraintCostInfo(scope: ConstraintScope) {
  return CONSTRAINT_COST_TABLE[scope]
}

/**
 * 评估约束注入配置的节省比例
 */
export function estimateSavingsPercentage(agentName: string, domain: string): number {
  const profile = getConstraintInjectionProfile(agentName, domain)

  // 计算注入约束的总成本
  let totalCost = 0
  for (const scope of profile.scopes) {
    const cost = CONSTRAINT_COST_TABLE[scope].cost
    totalCost += cost === "high" ? 3 : cost === "medium" ? 2 : 1
  }

  // 对比完整注入（所有 12 个约束，cost = 3 + 3 + 3 + 3 + 2 + 2 + 2 + 1 + 1 = 20）
  const fullCost = 20
  const savings = ((fullCost - totalCost) / fullCost) * 100

  return Math.round(savings)
}

/**
 * 生成约束注入配置报告
 */
export function generateConstraintProfileReport(): string {
  const agents = [
    "huangdi",
    "zhongshu",
    "menxia",
    "shangshu",
    "gongbu",
    "bingbu",
    "xingbu",
    "yibu",
    "hubu",
    "kubu",
    "libu",
  ]
  const domains = ["general", "asset-management"]

  const lines: string[] = [
    "## 约束注入配置报告",
    "",
    "Agent 约束分级注入配置表：",
    "",
    "| Agent | Domain | 约束数 | 优先级 | 压缩 | 节省 |",
    "|-------|--------|--------|--------|------|------|",
  ]

  for (const agent of agents) {
    for (const domain of domains) {
      const profile = getConstraintInjectionProfile(agent, domain)
      const savings = estimateSavingsPercentage(agent, domain)

      lines.push(
        `| ${agent} | ${domain} | ${profile.scopes.length} | ${profile.priority} | ${profile.compress ? "✓" : "✗"} | ${savings}% |`
      )
    }
  }

  lines.push("")
  lines.push("### 约束成本表")
  lines.push("")
  lines.push("| 约束类型 | 成本 | 适用 Agent | 描述 |")
  lines.push("|---------|------|-----------|------|")

  for (const [scope, info] of Object.entries(CONSTRAINT_COST_TABLE)) {
    const agents = info.agents.includes("*") ? "所有" : info.agents.join(", ")
    lines.push(`| ${scope} | ${info.cost} | ${agents} | ${info.description} |`)
  }

  return lines.join("\n")
}
