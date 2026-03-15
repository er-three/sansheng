import { type Plugin, tool } from "@opencode-ai/plugin"
import { huangdiAgent } from "./agents/huangdiAgent.js"
import { zhongshuAgent } from "./agents/zhongshuAgent.js"
import { menxiaAgent } from "./agents/menxiaAgent.js"
import { shangshuAgent } from "./agents/shangshuAgent.js"
import { libuAgent } from "./agents/libuAgent.js"
import { hubuAgent } from "./agents/hubuAgent.js"
import { libuRitesAgent } from "./agents/libuRitesAgent.js"
import { bingbuAgent } from "./agents/bingbuAgent.js"
import { xingbuAgent } from "./agents/xingbuAgent.js"
import { gongbuAgent } from "./agents/gongbuAgent.js"
import { sessionCreatedHook, sessionUpdatedHook, toolExecuteAfterHook } from "./plugin.js"
import { setOpencodeClient } from "./utils.js"

export const SanshengLiubuPlugin: Plugin = async (input: any) => {
  // 初始化 OpenCode client（用于官方日志 API）
  if (input && input.client) {
    setOpencodeClient(input.client)
  }
  return {
    async config(config: any) {
      if (!config.agent) {
        config.agent = {}
      }

      // Register the Emperor (Primary Agent)
      config.agent["huangdi"] = huangdiAgent()

      // Register the Three Departments (Subagents)
      config.agent["zhongshu"] = zhongshuAgent()
      config.agent["menxia"] = menxiaAgent()
      config.agent["shangshu"] = shangshuAgent()

      // Register the Six Ministries (Subagents)
      config.agent["libu"] = libuAgent()
      config.agent["hubu"] = hubuAgent()
      config.agent["libu-rites"] = libuRitesAgent()
      config.agent["bingbu"] = bingbuAgent()
      config.agent["xingbu"] = xingbuAgent()
      config.agent["gongbu"] = gongbuAgent()
    },

    // Phase 5: Session and Constraint Hooks
    "session.created": async (sessionInput: Record<string, unknown>) => {
      await sessionCreatedHook(sessionInput, input)
    },

    "session.updated": async (sessionInput: Record<string, unknown>) => {
      await sessionUpdatedHook(sessionInput, input)
    },

    "tool.execute.after": async (toolInput: Record<string, unknown>, output: { output: string }) => {
      await toolExecuteAfterHook(toolInput, output, input)
    },

    tool: {
      sanshengLiubuStatus: tool({
        description:
          "Get the status of the Sansheng Liubu agent system - 获取三省六部制代理系统的状态",
        args: {},
        async execute() {
          return `
[SPARKLES] Sansheng Liubu Plugin Status

[EMPEROR] Emperor (Primary Agent):
  • huangdi - Strategic coordinator

[DEPT] Three Departments (Planning, Review, Execution):
  • zhongshu (中书省) - Central Secretariat - Planning
  • menxia (门下省) - Chancellery - Review & QA
  • shangshu (尚书省) - Department of State Affairs - Execution

[MINISTRY] Six Ministries (Implementation Specialists):
  • libu (吏部) - Ministry of Civil Service - Code Structure
  • hubu (户部) - Ministry of Revenue - Dependencies
  • libu-rites (礼部) - Ministry of Rites - Standards
  • bingbu (兵部) - Ministry of War - Performance
  • xingbu (刑部) - Ministry of Justice - Error Handling
  • gongbu (工部) - Ministry of Works - Build & Deployment

All agents are ready for coordination!
`.trim()
        },
      }),
    },
  }
}

export default SanshengLiubuPlugin
