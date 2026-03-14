/**
 * 三省六部制 OpenCode Plugin
 *
 * 完整的多智能体协作框架，实现了 OmO（Omnichannel Operations）融合 Phase 1 & 2：
 * - 皇帝：战略决策者，设定目标、掌控全局、最终验收
 * - 中书省：规划专家，制定执行计划
 * - 门下省：审核官员，质量把关
 * - 尚书省：执行调度，按计划逐步分发任务
 * - 六部：具体实现者（吏部、户部、礼部、兵部、刑部、工部）
 *
 * 核心能力：
 * 1. Hash-Anchored Edits - 精确代码编辑定位
 * 2. AST 语义分析 - 代码结构感知
 * 3. OpenSpec 规范系统 - 版本化资产管理
 * 4. CR 变更请求处理 - 完整的变更流程
 * 5. 并行执行协议 - Level 1 步骤串行、Level 2 代理并行、Level 3 子任务并行
 * 6. 全局约束注入 - 自动注入到所有 Agent system prompt
 */

import { sanshengLiubuPlugin } from "./plugin"

// 默认导出：完整的执行层 Plugin
export default sanshengLiubuPlugin

/**
 * Plugin 初始化函数（向后兼容）
 */
export function registerSanshengLiubuPlugin(api?: any): void {
  if (api?.log) {
    api.log.info("[三省六部制] OpenCode Plugin 已加载（含完整执行层）");
    api.log.info("可用工具: init_parallel, pipeline_status, set_variables, switch_domain, list_domains");
    api.log.info("支持: Level 2 代理并行、全局约束注入、并行状态跟踪");
  }
}

// 导出类型和配置函数供外部使用
export const PLUGIN_NAME = "@sansheng/liubu"
export const PLUGIN_VERSION = "1.0.0"
export const PLUGIN_DESCRIPTION =
  "三省六部制 OpenCode Plugin - 分层多智能体协作框架（含 Level 2/3 并行 + 全局约束注入）"

/**
 * 获取 plugin 信息
 */
export function getPluginInfo() {
  return {
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    description: PLUGIN_DESCRIPTION,
    capabilities: {
      agents: ["huangdi", "zhongshu", "menxia", "shangshu", "yibu", "hubu", "libu", "bingbu", "xingbu", "gongbu", "kubu"],
      domains: ["asset-management", "cr-processing", "reverse-engineering", "video"],
      skills: [
        "scan", "extract", "mapping", "behavior", "detect", "verify-consistency", "openspec-persist",
        "asset-standards",
        "cr-proposal", "cr-specification", "cr-implementation", "cr-persist"
      ],
      tools: [
        "set_variables",
        "switch_domain",
        "pipeline_status",
        "verify_step",
        "list_domains",
        "openspec_write",
        "openspec_validate"
      ]
    }
  };
}

/**
 * 获取可用域列表
 */
export function getAvailableDomains() {
  return [
    {
      name: "asset-management",
      description: "从旧代码提取五份资产，强制并行提取 + bash 独立验证",
      skills: ["scan", "extract", "mapping", "behavior", "detect", "verify-consistency", "openspec-persist"]
    },
    {
      name: "cr-processing",
      description: "变更请求处理，修改现有 OpenSpec 资产并维护版本历史",
      skills: ["cr-proposal", "cr-specification", "cr-implementation", "cr-persist"]
    },
    {
      name: "reverse-engineering",
      description: "代码反向工程和项目标准化",
      skills: ["project-standards"]
    },
    {
      name: "video",
      description: "视频处理相关工作流",
      skills: []
    }
  ];
}

/**
 * 获取六部信息
 */
export function getSixMinistries() {
  return {
    yibu: {
      name: "吏部",
      description: "档案官员，负责代码扫描与信息采集",
      tools: ["read", "glob", "grep"]
    },
    hubu: {
      name: "户部",
      description: "工商官员，负责外部资源整合与全球审计",
      tools: ["webfetch", "websearch"]
    },
    libu: {
      name: "礼部",
      description: "仪式官员，负责工作流协调与工具技能调度",
      tools: ["skill", "todowrite"]
    },
    bingbu: {
      name: "兵部",
      description: "将领官员，负责战术执行与系统测试",
      tools: ["bash"]
    },
    xingbu: {
      name: "刑部",
      description: "审判官员，负责代码审查与质量把关",
      tools: ["read", "semantic_grep"]
    },
    gongbu: {
      name: "工部",
      description: "工程官员，负责代码实现与基础设施建设",
      tools: ["edit", "write", "read", "verify_edit_context"]
    },
    kubu: {
      name: "库部",
      description: "档案官员，负责 OpenSpec 规范化和资产持久化",
      tools: ["openspec_write", "openspec_validate"]
    }
  };
}

/**
 * 获取三省信息
 */
export function getThreeProvinces() {
  return {
    zhongshu: {
      name: "中书省",
      title: "规划任务，制定六部执行计划",
      role: "规划者"
    },
    menxia: {
      name: "门下省",
      title: "审核计划和执行结果，有权否决",
      role: "审核者"
    },
    shangshu: {
      name: "尚书省",
      title: "执行调度者，按审核通过的计划逐步调用六部",
      role: "执行者"
    }
  };
}
