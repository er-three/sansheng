/**
 * Agent 与任务类型的映射
 *
 * 定义：哪个Agent执行哪种任务
 * 用于丞相府分配任务时的权限检查
 */

import { log } from "../utils.js"

/**
 * 任务类型与负责Agent的映射
 *
 * 遵循三省六部制：
 * - 皇帝 (huangdi)：最高决策
 * - 中书省 (zhongshu)：制定计划
 * - 门下省 (menxia)：审核决策
 * - 尚书省 (shangshu)：执行调度
 * - 六部 (libu/hubu/bingbu/xingbu/gongbu/kubu)：具体实施
 */
export const TASK_TO_AGENT_MAPPING: Record<string, string> = {
  // 理解需求 - 皇帝决策
  "understand": "huangdi",

  // 制定计划 - 中书省
  "plan": "zhongshu",

  // 快速检查 - 门下省
  "menxia_quick_check": "menxia",

  // 审核计划 - 门下省
  "menxia_review": "menxia",

  // 最终审核 - 门下省
  "menxia_final_review": "menxia",

  // 六部各自的任务
  "libu_structure": "libu",        // 礼部：设计结构
  "hubu_deps": "hubu",              // 户部：处理依赖
  "bingbu_perf": "bingbu",          // 兵部：性能规划
  "libu_rites_check": "libu",       // 礼部：标准检查
  "xingbu_review": "xingbu",        // 刑部：代码审查
  "gongbu_implement": "gongbu",     // 工部：代码实现
  "kubu_persist": "kubu",           // 库部：持久化

  // 执行 - 尚书省（作为总调度）
  "execute": "shangshu",

  // 验证 - 皇帝最终验收
  "verify": "huangdi"
}

/**
 * Agent与其能执行的任务类型列表
 * （反向映射，用于权限检查）
 */
export const AGENT_TO_TASKS_MAPPING: Record<string, string[]> = {}

// 自动生成反向映射
Object.entries(TASK_TO_AGENT_MAPPING).forEach(([task, agent]) => {
  if (!AGENT_TO_TASKS_MAPPING[agent]) {
    AGENT_TO_TASKS_MAPPING[agent] = []
  }
  AGENT_TO_TASKS_MAPPING[agent].push(task)
})

/**
 * 获取负责某个任务的Agent
 */
export function getResponsibleAgent(taskType: string): string | null {
  const agent = TASK_TO_AGENT_MAPPING[taskType]
  if (!agent) {
    log("AgentMapper", `未知的任务类型: ${taskType}`, "warn")
    return null
  }
  return agent
}

/**
 * 检查Agent是否有权执行某个任务
 */
export function canAgentExecuteTask(agentName: string, taskType: string): boolean {
  const responsibleAgent = getResponsibleAgent(taskType)
  if (!responsibleAgent) {
    return false
  }
  return responsibleAgent === agentName
}

/**
 * 获取某个Agent可以执行的所有任务类型
 */
export function getAgentTasks(agentName: string): string[] {
  return AGENT_TO_TASKS_MAPPING[agentName] || []
}

/**
 * 获取Agent的中文名称
 */
export function getAgentChineseName(agentName: string): string {
  const nameMap: Record<string, string> = {
    "huangdi": "皇帝（决策者）",
    "zhongshu": "中书省（规划者）",
    "menxia": "门下省（审核者）",
    "shangshu": "尚书省（执行者）",
    "libu": "礼部（仪式官员）",
    "hubu": "户部（工商官员）",
    "bingbu": "兵部（将领官员）",
    "xingbu": "刑部（审判官员）",
    "gongbu": "工部（工程官员）",
    "kubu": "库部（档案官员）"
  }
  return nameMap[agentName] || agentName
}

/**
 * 打印Agent权限清单（用于调试）
 */
export function printAgentPermissions(): string {
  const lines = ["═══════════════════════════════════════════", "Agent 权限清单", "═══════════════════════════════════════════"]

  Object.entries(AGENT_TO_TASKS_MAPPING).forEach(([agent, tasks]) => {
    lines.push(`\n${getAgentChineseName(agent)}:`)
    tasks.forEach(task => {
      lines.push(`  ✓ ${task}`)
    })
  })

  return lines.join("\n")
}
