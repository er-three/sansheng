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
import {
  getDomainRecipes,
  getDomainRecipe,
  listDomainRecipes,
  isDomainRecipeValid
} from "./workflows/domain-recipes.js"
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
      }),

      listDomainRecipes: tool({
        description:
          "List recipes for a specific domain (asset-management or reverse-engineering) - 列出特定域的流程配方",
        args: {},
        async execute() {
          return `
Available domains with recipes:
1. asset-management - 资产管理和提取
   Recipes: quick (5min), standard (15min), complete (25min)

2. reverse-engineering - 逆向工程和迁移
   Recipes: frontend-only, standard, migration, full-stack, high-risk

Use: @selectDomain to choose a domain and recipe.
`.trim()
        }
      }),

      selectDomain: tool({
        description:
          "Select a domain and recipe to initialize workflow - 选择域和配方初始化工作流",
        args: {},
        async execute() {
          return `
[INFO] Domain Selection

选择你的工作域和配方：

【资产管理（asset-management）】
  @initAssetManagementWorkflow

  快速提取：  "quick"    - 仅核心资产 (5min, ~55K token)
  标准提取：  "standard" - 完整资产 (15min, ~125K token)
  完整提取：  "complete" - 强化检查 (25min, ~175K token)

【逆向工程（reverse-engineering）】
  @initReverseEngineeringWorkflow

  前端专用：  "frontend_only" - 展示组件 (5min, ~90K token)
  标准迁移：  "standard"      - 完整迁移 (12min, ~135K token)
  快速迁移：  "migration"     - 有测试项目 (10min, ~110K token)
  完整系统：  "full_stack"    - 复杂系统 (20min, ~200K token)
  高风险系统："high_risk"     - 关键应用 (25min, ~225K token)

示例用法：
  选择资产快速提取：
  "我想要做资产快速提取，用 quick 模式"

  选择逆向工程标准迁移：
  "我想要做 Ionic 迁移，用标准流程"
`.trim()
        }
      }),

      initAssetManagementWorkflow: tool({
        description: "Initialize asset management workflow - 初始化资产管理工作流",
        args: {},
        async execute() {
          return `
[INFO] Asset Management Workflow Initialization

使用方式：
1. 选择配方：quick / standard / complete
2. 描述你的项目
3. 系统会创建对应的任务队列

示例：
  "我要提取一个简单的 Angular 项目资产，用 quick 模式"

系统会：
  ✅ 初始化任务队列
  ✅ 加载对应的约束
  ✅ 准备 yibu, bingbu, gongbu 等 Agent
  ✅ 开始 scan 步骤
`.trim()
        }
      }),

      initReverseEngineeringWorkflow: tool({
        description: "Initialize reverse engineering workflow - 初始化逆向工程工作流",
        args: {},
        async execute() {
          return `
[INFO] Reverse Engineering Workflow Initialization

使用方式：
1. 选择配方：frontend-only / standard / migration / full-stack / high-risk
2. 描述你的项目复杂度和需求
3. 系统会创建对应的任务队列

示例：
  "我要迁移一个 Ionic 应用，标准流程"

系统会：
  ✅ 初始化 TDD 全流程
  ✅ 加载 Section 2A 路径表
  ✅ 准备 yibu, gongbu, xingbu, bingbu Agent
  ✅ 开始 infrastructure 步骤
`.trim()
        }
      })
    },
  }
}

export default SanshengLiubuPlugin
