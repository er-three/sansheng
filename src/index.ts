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
import { setOpencodeClient, log } from "./utils.js"
import {
  createTaskQueue,
  getTaskQueue,
  getVisibleTasks,
  addTask,
  claimTask,
  completeTask,
  failTask,
  getQueueStats
} from "./session/task-queue.js"
import { getRecipe, generateRecipeProgress, listAllRecipes } from "./workflows/recipes.js"
import { WorkflowTask } from "./types.js"

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
[SYSTEM] Sansheng Liubu Plugin Status

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

      initializeWorkflow: tool({
        description:
          "Initialize a workflow with task queue and recipe - 初始化工作流。用法：@initializeWorkflow simple|medium|complex|high_risk",
        args: {},
        async execute() {
          return `
[INFO] 初始化工作流

用法示例：
  @initializeWorkflow
  任务类型：medium
  任务描述：重构 Agent 系统

请运行命令时指定：
  1. 任务类型 (simple/medium/complex/high_risk)
  2. 任务描述

或查看可用的流程配方：
  @listRecipes
`.trim()
        }
      }),

      getTaskQueue: tool({
        description: "View the current task queue - 查看当前任务队列",
        args: {},
        async execute() {
          const sessionId = (globalThis as any).__sessionId__ || "default"

          try {
            const visibleTasks = getVisibleTasks(sessionId)
            const stats = getQueueStats(sessionId)

            if (visibleTasks.length === 0) {
              return "[INFO] 当前没有任务队列。请先使用 @initializeWorkflow 初始化工作流。"
            }

            const lines: string[] = ["[TASK QUEUE]", ""]

            for (let i = 0; i < visibleTasks.length; i++) {
              const task = visibleTasks[i]
              const statusIcon = {
                pending: "[PENDING]",
                claimed: "[CLAIMED]",
                in_progress: "[RUNNING]",
                done: "[OK]",
                failed: "[FAIL]"
              }[task.status]

              const blockedByStr =
                task.blockedBy && task.blockedBy.length > 0
                  ? ` <- blocked by: ${task.blockedBy.join(", ")}`
                  : ""

              lines.push(`${i + 1}. ${statusIcon} ${task.id}: ${task.name}`)
              lines.push(`   Agent: ${task.claimedBy || "not claimed"}`)
              if (blockedByStr) {
                lines.push(`   ${blockedByStr}`)
              }
              lines.push("")
            }

            lines.push("[STATISTICS]")
            lines.push(`Total tasks: ${stats.total}`)
            lines.push(`Pending: ${stats.pending}`)
            lines.push(`In Progress: ${stats.inProgress}`)
            lines.push(`Completed: ${stats.completed}`)
            lines.push(`Failed: ${stats.failed}`)

            return lines.join("\n")
          } catch (error) {
            return `[FAIL] Failed to get task queue: ${error}`
          }
        }
      }),

      claimTaskTool: tool({
        description:
          "Claim a task to start working on it - 声明任务。用法说明请查看文档。",
        args: {},
        async execute() {
          return `
[INFO] Claim Task Tool

用法：在你的消息中说明你要做的任务，系统会自动追踪。

示例：
  "我现在开始做 understand 任务"
  "我声明 plan 任务"
  "开始执行 execute 任务"

任务 ID 列表，使用 @getTaskQueue 查看。
`.trim()
        }
      }),

      completeTaskTool: tool({
        description: "Mark a task as completed - 标记任务完成",
        args: {},
        async execute() {
          return `
[INFO] Complete Task Tool

用法：在你的消息中说明任务完成，系统会自动追踪。

示例：
  "understand 任务完成，我理解了需求"
  "plan 任务完成，计划已制定"
  "执行完成，所有步骤已执行"

使用 @getTaskQueue 查看下一步任务。
`.trim()
        }
      }),

      listRecipes: tool({
        description: "List all available workflow recipes - 列出所有可用的流程配方",
        args: {},
        async execute() {
          return listAllRecipes()
        }
      })
    },
  }
}

export default SanshengLiubuPlugin
