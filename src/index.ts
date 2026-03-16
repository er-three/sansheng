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
import { analyzeRequirement, generateAnalysisReport } from "./workflows/requirement-analyzer.js"
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
          "Claim a task - 声明任务。在消息中包含任务ID（如 understand, plan, execute）",
        args: {},
        async execute(input: any) {
          const sessionId = (globalThis as any).__sessionId__ || "default"
          const agentName = (globalThis as any).__agentName__ || "unknown"
          const taskId = (globalThis as any).__claimTaskId__

          if (!taskId) {
            return `
[INFO] 声明任务工具

用法：先说明要声明什么任务，然后系统会自动追踪。

示例：
  "我现在声明 understand 任务"
  "我声明 plan 任务"
  "声明 execute 任务"

查看可用任务：@getTaskQueue
`.trim()
          }

          try {
            const task = claimTask(sessionId, taskId, agentName)
            return `
[OK] 任务已声明

[任务详情]
ID: ${task.id}
名称: ${task.name}
声明者: ${agentName}
状态: claimed

开始执行此任务！
`.trim()
          } catch (error) {
            return `
[FAILED] 声明任务失败: ${error}

查看任务列表：@getTaskQueue
`.trim()
          }
        }
      }),

      completeTaskTool: tool({
        description: "Complete a task - 完成任务。在消息中包含任务ID",
        args: {},
        async execute(input: any) {
          const sessionId = (globalThis as any).__sessionId__ || "default"
          const taskId = (globalThis as any).__completeTaskId__

          if (!taskId) {
            return `
[INFO] 完成任务工具

用法：先说明完成什么任务，然后系统会自动追踪。

示例：
  "understand 任务完成"
  "plan 任务完成"
  "execute 任务完成"

查看任务列表：@getTaskQueue
`.trim()
          }

          try {
            const task = completeTask(sessionId, taskId)
            return `
[OK] 任务已完成

[任务详情]
ID: ${task.id}
名称: ${task.name}
状态: done

下一步任务：@getTaskQueue
`.trim()
          } catch (error) {
            return `
[FAILED] 完成任务失败: ${error}

查看任务列表：@getTaskQueue
`.trim()
          }
        }
      }),

      analyzeRequirement: tool({
        description:
          "Analyze requirement and recommend recipe - 分析需求并推荐配方。用法：说明你的需求，系统自动分析",
        args: {},
        async execute(input: any) {
          // 获取上下文中用户的最新消息作为输入
          const userInput = (globalThis as any).__lastUserInput__ ||
                           (input && typeof input === "string" ? input : "")

          if (!userInput || userInput.trim().length === 0) {
            return `
[INFO] 需求分析工具使用示例

在你的消息中描述需求，系统会自动分析：

✅ 修复一个认证模块的 bug
✅ 迁移一个 Ionic 应用到 React
✅ 重构整个 Agent 系统架构
✅ 线上支付模块的紧急修复
✅ 提取一个简单前端项目的资产

系统会推荐最合适的工作流配方、复杂度、风险等级和成本预测。
`.trim()
          }

          try {
            const analysis = analyzeRequirement(userInput)
            const report = generateAnalysisReport(analysis)

            const domainName = {
              "general": "General",
              "cr-processing": "CRProcessing"
            }[analysis.domain] || "General"

            return `
${report}

[下一步]
使用 @init${domainName}Workflow 启动工作流，然后选择 ${analysis.recipeName} 配方
`.trim()
          } catch (error) {
            return `[ERROR] 分析失败: ${error}`
          }
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
          "List recipes for all domains - 列出所有域的流程配方",
        args: {},
        async execute() {
          return `
[ALL DOMAINS] - 所有可用的工作域和配方

1. general - 通用编程
   ├─ quick_fix (3 步)     - 简单修复 (5min, ~70K token)
   ├─ standard (4 步)      - 标准流程 (10min, ~120K token)
   └─ comprehensive (6 步) - 强化审计 (15min, ~180K token)

2. cr-processing - 变更请求处理
   ├─ hotfix (4 步)    - 紧急修复 (5min, ~90K token)
   ├─ standard (5 步)  - 标准流程 (12min, ~140K token)
   └─ complete (8 步)  - 完整版本 (20min, ~200K token)

总计：2 个域 × 3-5 个配方 = 8 个工作流模式可选

使用：@selectDomain 选择你需要的域和配方
`.trim()
        }
      }),

      selectDomain: tool({
        description:
          "Select a domain and recipe to initialize workflow - 选择域和配方初始化工作流",
        args: {},
        async execute() {
          return `
[INFO] Domain Selection - 选择工作域

所有可用的工作域和配方：

【通用编程（general）】
  @initGeneralWorkflow

  快速修复：  "quick_fix"      - 简单修复 (5min, ~70K token)
  标准流程：  "standard"       - 完整流程 (10min, ~120K token)
  加强流程：  "comprehensive"  - 强化审计 (15min, ~180K token)

【变更请求（cr-processing）】
  @initCRProcessingWorkflow

  紧急修复：  "hotfix"    - 线上 bug (5min, ~90K token)
  标准 CR：   "standard"  - 正常变更 (12min, ~140K token)
  完整版本：  "complete"  - 重大变更 (20min, ~200K token)

使用示例：
  修复简单 bug：
  "我要修复一个 bug，用通用编程的 quick_fix 模式"

  线上紧急修复：
  "线上 bug，用 cr-processing 的 hotfix 模式"
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
      }),

      initGeneralWorkflow: tool({
        description: "Initialize general programming workflow - 初始化通用编程工作流",
        args: {},
        async execute() {
          return `
[INFO] General Programming Workflow Initialization

使用方式：
1. 选择配方：quick-fix / standard / comprehensive
2. 描述你的编程任务
3. 系统会创建对应的任务队列

配方说明：
  • quick-fix (3 步)     - 简单修复，skip 验证 (~70K token, 5min)
  • standard (4 步)      - 标准流程，完整分析-实现-验证 (~120K token, 10min)
  • comprehensive (6 步) - 加强版，包含性能和安全审计 (~180K token, 15min)

示例：
  "我要修复一个简单的 bug，用 quick-fix"
  "我要开发一个新功能，用 standard"
  "我要开发关键模块，用 comprehensive"

系统会：
  ✅ 初始化编程工作流
  ✅ 准备 yibu, hubu, gongbu, bingbu, xingbu Agent
  ✅ 开始 analyze 步骤
`.trim()
        }
      }),

      initCRProcessingWorkflow: tool({
        description: "Initialize change request processing workflow - 初始化变更请求工作流",
        args: {},
        async execute() {
          return `
[INFO] Change Request Processing Workflow Initialization

使用方式：
1. 选择配方：hotfix / standard / complete
2. 描述变更请求的内容
3. 系统会创建对应的任务队列

配方说明：
  • hotfix (4 步)    - 紧急修复，skip 规格设计 (~90K token, 5min)
  • standard (5 步)  - 标准流程，完整提议-规格-实现-持久化 (~140K token, 12min)
  • complete (8 步)  - 完整版本，包含兼容性审计 (~200K token, 20min)

示例：
  "线上 bug 修复，用 hotfix"
  "新功能的 CR，用 standard"
  "API 升级，用 complete"

系统会：
  ✅ 初始化 CR 工作流
  ✅ 准备 yibu, hubu, libu, xingbu, gongbu, kubu Agent
  ✅ 开始 cr-proposal 步骤
`.trim()
        }
      })
    },
  }
}

export default SanshengLiubuPlugin
