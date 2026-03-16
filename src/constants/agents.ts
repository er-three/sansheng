/**
 * Agent Name Constants
 * 中央集中管理所有Agent的名称定义
 *
 * 使用目的：
 * - 避免在代码中硬编码Agent名称
 * - 单一真实数据源（SSOT）
 * - 便于未来重构和重命名
 */

/**
 * 所有 Agent 的标准名称
 */
export const AGENT_NAMES = {
  // 战略层（Strategy Layer）
  HUANGDI: 'huangdi',        // 皇帝 - 最高战略决策者

  // 执行层（Executive Layer）
  ZHONGSHU: 'zhongshu',      // 中书省 - 计划制定者
  MENXIA: 'menxia',          // 门下省 - 计划审核者
  SHANGSHU: 'shangshu',      // 尚书省 - 执行调度者
  YUSHITAI: 'yushitai',      // 御史台 - 执行验证者

  // 工作层（Operational Layer - 六部）
  YIBU: 'yibu',              // 吏部 - 人事管理
  GONGBU: 'gongbu',          // 工部 - 代码实现
  HUBU: 'hubu',              // 户部 - 资源整合
  LIBU: 'libu',              // 礼部 - 技能协调
  BINGBU: 'bingbu',          // 兵部 - 测试执行
  XINGBU: 'xingbu',          // 刑部 - 代码审查
  KUBU: 'kubu',              // 库部 - 文档维护
} as const

/**
 * Agent 中文显示名称
 */
export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  [AGENT_NAMES.HUANGDI]: '皇帝',
  [AGENT_NAMES.ZHONGSHU]: '中书省',
  [AGENT_NAMES.MENXIA]: '门下省',
  [AGENT_NAMES.SHANGSHU]: '尚书省',
  [AGENT_NAMES.YUSHITAI]: '御史台',
  [AGENT_NAMES.YIBU]: '吏部',
  [AGENT_NAMES.GONGBU]: '工部',
  [AGENT_NAMES.HUBU]: '户部',
  [AGENT_NAMES.LIBU]: '礼部',
  [AGENT_NAMES.BINGBU]: '兵部',
  [AGENT_NAMES.XINGBU]: '刑部',
  [AGENT_NAMES.KUBU]: '库部',
}

/**
 * Agent 分组 - 按层级分类
 */
export const AGENT_GROUPS = {
  STRATEGY: [AGENT_NAMES.HUANGDI],
  EXECUTIVE: [
    AGENT_NAMES.ZHONGSHU,
    AGENT_NAMES.MENXIA,
    AGENT_NAMES.SHANGSHU,
    AGENT_NAMES.YUSHITAI,
  ],
  SIX_MINISTRIES: [
    AGENT_NAMES.YIBU,
    AGENT_NAMES.GONGBU,
    AGENT_NAMES.HUBU,
    AGENT_NAMES.LIBU,
    AGENT_NAMES.BINGBU,
    AGENT_NAMES.XINGBU,
    AGENT_NAMES.KUBU,
  ],
} as const

/**
 * 所有 Agent 名称列表
 */
export const ALL_AGENT_NAMES = [
  ...AGENT_GROUPS.STRATEGY,
  ...AGENT_GROUPS.EXECUTIVE,
  ...AGENT_GROUPS.SIX_MINISTRIES,
] as const

export type AgentName = typeof AGENT_NAMES[keyof typeof AGENT_NAMES]
