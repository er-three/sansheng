/**
 * SubAgent 安全防护系统
 * 防止 SubAgent 的无限递归、深层嵌套和循环调用
 *
 * 三层防护：
 * 1. 深度限制 - 防止过度嵌套
 * 2. 循环检测 - 防止调用循环
 * 3. Token预算 - 防止资源耗尽（后续实现）
 */

export const MAX_SUBAGENT_DEPTH = 3
export const DEFAULT_MAX_DEPTH = 3

/**
 * SubAgent调用上下文
 * 记录当前的调用栈、深度和资源消耗
 */
export interface SubagentCallContext {
  callStack: string[]              // 调用栈: [Agent1, SubAgent2, SubAgent3]
  depth: number                    // 当前深度
  maxDepth: number                 // 最大允许深度
  startTime?: number               // 开始时间
}

/**
 * 验证深度限制
 *
 * 原理：
 * - 深度0: 主Agent（初始）
 * - 深度1: 主Agent调用SubAgent（正常）
 * - 深度2: SubAgent调用另一个SubAgent（可接受）
 * - 深度3: SubAgent的SubAgent（边界）
 * - 深度4+: 禁止（防递归和过度嵌套）
 *
 * @param currentDepth 当前调用深度
 * @param maxDepth 最大允许深度（默认3）
 * @returns 验证结果
 */
export function validateSubagentCallDepth(
  currentDepth: number,
  maxDepth: number = MAX_SUBAGENT_DEPTH
): { allowed: boolean; reason?: string } {
  if (currentDepth >= maxDepth) {
    return {
      allowed: false,
      reason:
        `❌ SubAgent嵌套深度已达上限(${maxDepth})，禁止继续调用。\n` +
        `当前深度: ${currentDepth}\n` +
        `这样的限制是为了防止无限递归和过度消耗token。\n\n` +
        `调用链太深通常表示：\n` +
        `  1. 存在循环依赖（应该被循环检测拦截）\n` +
        `  2. 任务分解过细（应该合并某些步骤）\n` +
        `  3. 设计有缺陷（需要重新规划）`,
    }
  }

  return { allowed: true }
}

/**
 * 循环检测
 *
 * 检测当前调用链中是否有重复的Agent，防止循环调用
 * 例如：Agent A → SubAgent B → SubAgent C → Agent A（形成循环）
 *
 * @param callStack 完整的调用栈（包括本次调用）
 * @returns 检测结果
 */
export function detectCycle(
  callStack: string[]
): {
  hasCycle: boolean
  cycle?: string[]
  reason?: string
} {
  if (!callStack || callStack.length === 0) {
    return { hasCycle: false }
  }

  const seen = new Set<string>()

  for (let i = 0; i < callStack.length; i++) {
    const agentName = callStack[i]

    if (seen.has(agentName)) {
      // 找到循环
      const cycleStart = callStack.indexOf(agentName)
      const cycle = callStack.slice(cycleStart)

      return {
        hasCycle: true,
        cycle,
        reason:
          `❌ 检测到SubAgent循环调用，已拒绝。\n` +
          `循环路径: ${cycle.join(' → ')} → ${agentName}\n\n` +
          `这表示任务陷入死循环：\n` +
          `  - Agent A 调用了 Agent B\n` +
          `  - Agent B 最终又调用回了 Agent A\n\n` +
          `可能的原因：\n` +
          `  1. 设计缺陷（两个Agent相互依赖）\n` +
          `  2. 任务描述不清（导致Agent推理出循环）\n` +
          `  3. 权限设置有问题`,
      }
    }

    seen.add(agentName)
  }

  return { hasCycle: false }
}

/**
 * 初始化SubAgent调用上下文
 * 用于跟踪一个任务执行过程中的所有SubAgent调用
 */
export function createSubagentContext(maxDepth: number = MAX_SUBAGENT_DEPTH): SubagentCallContext {
  return {
    callStack: [],
    depth: 0,
    maxDepth,
    startTime: Date.now(),
  }
}

/**
 * 验证SubAgent调用是否安全
 * 同时检查深度限制和循环
 *
 * @param subagentName 要调用的SubAgent名称
 * @param context 当前调用上下文
 * @returns 验证结果
 */
export function validateSubagentCall(
  subagentName: string,
  context: SubagentCallContext
): { allowed: boolean; reason?: string } {
  // 检查1：深度限制
  const depthCheck = validateSubagentCallDepth(context.depth, context.maxDepth)
  if (!depthCheck.allowed) {
    return depthCheck
  }

  // 检查2：循环检测
  const newCallStack = [...context.callStack, subagentName]
  const cycleCheck = detectCycle(newCallStack)
  if (cycleCheck.hasCycle) {
    return {
      allowed: false,
      reason: cycleCheck.reason,
    }
  }

  return { allowed: true }
}

/**
 * 更新调用上下文
 * 在调用SubAgent前调用此函数，将新的Agent加入调用栈
 *
 * @param context 当前上下文
 * @param subagentName 新调用的SubAgent名称
 * @returns 更新后的上下文
 */
export function pushSubagentContext(context: SubagentCallContext, subagentName: string): SubagentCallContext {
  return {
    ...context,
    callStack: [...context.callStack, subagentName],
    depth: context.depth + 1,
  }
}

/**
 * 格式化调用栈为可读字符串
 *
 * @param callStack 调用栈数组
 * @returns 格式化后的字符串
 */
export function formatCallStack(callStack: string[]): string {
  if (!callStack || callStack.length === 0) {
    return '(无调用)'
  }
  return callStack.join(' → ')
}

/**
 * 诊断深度过深的问题
 * 用于生成更详细的错误信息
 *
 * @param context 调用上下文
 * @returns 诊断信息
 */
export function diagnoseDepthIssue(context: SubagentCallContext): string {
  const depth = context.depth
  const maxDepth = context.maxDepth
  const callStack = context.callStack

  const summary = `当前调用栈（深度${depth}/${maxDepth}）:\n  ${formatCallStack(callStack)}`

  if (depth < maxDepth) {
    return `${summary}\n\n（未达限制，可继续调用）`
  }

  if (depth === maxDepth) {
    return (
      `${summary}\n\n` +
      `⚠️ 调用栈已达到最大深度限制。\n` +
      `如果是合法需求，可以考虑：\n` +
      `  1. 重新设计任务，减少SubAgent调用层级\n` +
      `  2. 合并某些SubAgent的职责\n` +
      `  3. 调整最大深度设置（需要充分理由）`
    )
  }

  return summary
}
