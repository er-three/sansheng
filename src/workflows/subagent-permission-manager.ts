/**
 * SubAgent 权限管理系统
 * 实施"所有SubAgent调用必须使用task工具"的强制化
 *
 * 核心原则：没有例外
 * - 所有SubAgent调用 → task工具（必须）
 * - 直接调用 opencode.executeAgent → 禁止
 */

/**
 * SubAgent权限策略定义
 */
export interface SubagentPolicy {
  agentName: string
  can_call_subagent: boolean
  subagents_allowed: string[]
}

/**
 * 定义所有Agent的SubAgent调用权限
 *
 * 原则：
 * - 战略层Agent（皇帝）：可以调用三省
 * - 执行层Agent（三省六部）：权限有限
 * - 工作层Agent（六部）：通常不调用其他SubAgent
 */
export const SUBAGENT_POLICIES: SubagentPolicy[] = [
  {
    agentName: 'huangdi', // 皇帝
    can_call_subagent: true,
    subagents_allowed: ['zhongshu', 'menxia', 'shangshu'],  // 不能直接调用yushitai（御史台是尚书省专用）
  },
  {
    agentName: 'zhongshu', // 中书省
    can_call_subagent: true,
    subagents_allowed: ['menxia'],
  },
  {
    agentName: 'menxia', // 门下省
    can_call_subagent: false,
    subagents_allowed: [],
  },
  {
    agentName: 'shangshu', // 尚书省
    can_call_subagent: false,  // 尚书省使用 task() 工具调用六部和御史台，不使用 call_subagent
    subagents_allowed: [],
  },
  {
    agentName: 'yushitai', // 御史台
    can_call_subagent: false,
    subagents_allowed: [],
  },
  // 六部：执行层，一般不调用SubAgent
  {
    agentName: 'gongbu', // 工部
    can_call_subagent: false,
    subagents_allowed: [],
  },
  {
    agentName: 'libu', // 礼部
    can_call_subagent: false,
    subagents_allowed: [],
  },
  {
    agentName: 'yibu', // 吏部
    can_call_subagent: false,
    subagents_allowed: [],
  },
  {
    agentName: 'hubu', // 户部
    can_call_subagent: false,
    subagents_allowed: [],
  },
  {
    agentName: 'bingbu', // 兵部
    can_call_subagent: false,
    subagents_allowed: [],
  },
  {
    agentName: 'xingbu', // 刑部
    can_call_subagent: false,
    subagents_allowed: [],
  },
  {
    agentName: 'kubu', // 库部
    can_call_subagent: false,
    subagents_allowed: [],
  },
]

/**
 * 检查Agent是否有权调用SubAgent
 *
 * @param agentName Agent名称
 * @param targetSubagent 目标SubAgent名称（可选）
 * @returns 是否有权限
 */
export function canCallSubagent(agentName: string, targetSubagent?: string): boolean {
  const policy = SUBAGENT_POLICIES.find(p => p.agentName === agentName)

  if (!policy || !policy.can_call_subagent) {
    return false
  }

  if (targetSubagent && !policy.subagents_allowed.includes(targetSubagent)) {
    return false
  }

  return true
}

/**
 * 获取Agent允许调用的SubAgent列表
 *
 * @param agentName Agent名称
 * @returns 允许的SubAgent列表
 */
export function getAllowedSubagents(agentName: string): string[] {
  const policy = SUBAGENT_POLICIES.find(p => p.agentName === agentName)
  return policy?.subagents_allowed || []
}

/**
 * 检查调用栈信息
 * 用于确定调用是否来自task系统
 */
export interface CallerStackInfo {
  functionNames: string[]
  isFromTaskSystem: boolean
  callerPath: string
}

/**
 * 从调用栈中提取信息
 * 用于判断是否来自task系统的正常路径
 *
 * @param stack 调用栈字符串
 * @returns 调用栈信息
 */
export function extractCallerInfo(stack: string): CallerStackInfo {
  const lines = stack.split('\n')
  const functionNames: string[] = []

  // 提取函数名
  for (const line of lines) {
    const match = line.match(/at\s+(?:async\s+)?([^\s]+)/)
    if (match) {
      functionNames.push(match[1])
    }
  }

  // 检查是否来自task系统
  const isFromTaskSystem = functionNames.some(name =>
    name.includes('toolExecuteAfterHook') ||
    name.includes('executeSubagentCall') ||
    name.includes('toolCall') ||
    name.includes('callSubagent'),
  )

  const callerPath = functionNames.slice(0, 5).join(' ← ') || '(unknown)'

  return {
    functionNames,
    isFromTaskSystem,
    callerPath,
  }
}

/**
 * 生成权限错误信息
 *
 * @param agentName Agent名称
 * @param targetSubagent 目标SubAgent名称（可选）
 * @returns 错误信息
 */
export function generatePermissionDeniedError(agentName: string, targetSubagent?: string): string {
  const policy = SUBAGENT_POLICIES.find(p => p.agentName === agentName)

  if (!policy || !policy.can_call_subagent) {
    return (
      `❌ Agent "${agentName}" 没有权限调用SubAgent\n\n` +
      `原因：${policy ? 'Agent被设计为只执行任务，不能委派给其他Agent' : '未知的Agent'}。\n\n` +
      `解决方案：\n` +
      `  1. 使用高级Agent（如皇帝、中书省）来协调\n` +
      `  2. 重新设计任务分解流程`
    )
  }

  if (targetSubagent && !policy.subagents_allowed.includes(targetSubagent)) {
    return (
      `❌ Agent "${agentName}" 没有权限调用SubAgent "${targetSubagent}"\n\n` +
      `"${agentName}" 只能调用:\n` +
      `  - ${policy.subagents_allowed.join('\n  - ')}\n\n` +
      `原因：权限隔离，确保调用链清晰、可审计。\n\n` +
      `解决方案：\n` +
      `  1. 检查目标SubAgent是否正确\n` +
      `  2. 使用有权限的Agent来调用`
    )
  }

  return `❌ Agent "${agentName}" 的SubAgent调用被拒绝`
}

/**
 * 生成直接调用错误信息
 * 用户尝试直接调用opencode.executeAgent而不是使用task工具
 *
 * @param agentName Agent名称
 * @param targetSubagent 目标SubAgent名称
 * @returns 错误信息
 */
export function generateDirectCallError(agentName: string, targetSubagent: string): string {
  return (
    `❌ SubAgent调用被拒绝：不能直接调用\n\n` +
    `发现：Agent "${agentName}" 尝试直接调用 opencode.executeAgent("${targetSubagent}", ...)\n\n` +
    `问题：所有SubAgent调用必须通过 call_subagent 工具处理。\n\n` +
    `✅ 正确的方式：\n` +
    `  await toolCall('call_subagent', {\n` +
    `    subagent: '${targetSubagent}',\n` +
    `    prompt: '...'\n` +
    `  })\n\n` +
    `这样的强制是为了确保：\n` +
    `  1. 所有SubAgent调用都被验证（权限、预算）\n` +
    `  2. 所有SubAgent调用都被审计追踪\n` +
    `  3. 防止隐形的、不被追踪的SubAgent调用\n` +
    `  4. 完整的执行可追溯性`
  )
}
