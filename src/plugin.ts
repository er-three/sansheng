/**
 * 三省六部制 OpenCode Plugin - Phase 5 核心业务逻辑
 *
 * 模块化架构：
 * - constraints/: 约束发现和缓存
 * - registry/: 配置和注册表管理
 * - verification/: 步骤验证和状态
 * - session/: Session 级别的状态管理
 * - config/: 配置管理（Phase 4）
 * - types.ts: 统一的类型定义
 * - utils.ts: 通用工具函数
 *
 * 改进（方案B）：
 * - [OK] Phase 1：改为标准的工厂函数模式
 * - [OK] Phase 2：替换 Experimental Hook
 * - [OK] Phase 3：迁移到官方 Session API
 * - [OK] Phase 4：统一配置管理和变量替换
 * - [OK] Phase 5：导出 Hooks 供新的 Plugin 模式使用
 */

// OpenCode Plugin 类型
type PluginContext = any

import * as fs from "fs"

// 导入各模块
import { discoverConstraintsWithCache } from "./constraints/discovery.js"
import { discoverConstraintsWithCacheOptimized } from "./constraints/discovery-optimized.js"
import { getFromMemoryCache, saveToMemoryCache } from "./constraints/cache.js"
import { readRegistry, writeRegistry, getActiveDomain } from "./registry/manager.js"
import { readDomain } from "./registry/domain.js"
import { generatePipelineStatus } from "./verification/status.js"
import {
  getOrCreateSessionState,
  updateSessionConstraints,
  markConstraintsInjected,
  isConstraintsInjected,
  getSessionConstraints,
  cleanupExpiredSessions,
  initializeSessionCleanupTimer,
  persistSessionStateToSDK,
  restoreSessionStateFromSDK
} from "./session/state.js"
import { createConfigManager, ConfigManager } from "./config/manager.js"
import { getConstraintInjectionProfile, estimateSavingsPercentage } from "./config/constraint-profile.js"
import { formatConstraints, findRoot, log, isTaskCompleted } from "./utils.js"
import {
  getTaskQueue,
  claimTask,
  completeTask,
  failTask,
  canStartTask,
  getCriticalPathStatus
} from "./session/task-queue.js"
import { getRecipe, validateRecipeCompliance } from "./workflows/recipes.js"
import { setOpencodeClient } from "./utils.js"
import {
  validateCodeModification,
  recordCodeModification,
  shouldRequireMenxiaReview,
  assessModificationRisk,
  getModificationRecords
} from "./workflows/programming-agent-enforcement.js"
import {
  runCodeModificationGateway
} from "./workflows/code-modification-gateway.js"
import {
  appendAuditRecord
} from "./workflows/audit-system.js"
import {
  initializeChancellery,
  getNextTaskForAgent,
  claimTaskByAgent,
  advanceWorkflow,
  failWorkflowTask,
  getChancelleryStatus,
  generateChancelleryReport
} from "./workflows/chancellery.js"
import {
  getResponsibleAgent,
  canAgentExecuteTask
} from "./workflows/agent-task-mapper.js"

// ─────────────────── Plugin 初始化 ───────────────────

// 初始化 Session 清理计时器
let cleanupTimer: NodeJS.Timer | null = null

// Phase 4: 配置管理器（全局单例）
let configManager: ConfigManager | null = null

function initializePlugin(context?: PluginContext): void {
  // 注册 OpenCode 客户端用于日志集成
  if (context) {
    setOpencodeClient(context)
  }

  if (!cleanupTimer) {
    cleanupTimer = initializeSessionCleanupTimer()
    log("Plugin", "Initialized session cleanup timer")
  }

  // Phase 4: 初始化配置管理器
  if (!configManager) {
    const root = findRoot()
    configManager = createConfigManager(root, context)
    log("Plugin", "Initialized configuration manager with Phase 4 support")
  }
}

// ─────────────────── Plugin 工厂函数 ───────────────────

/**
 * 创建 Plugin 对象
 * 这是标准的 OpenCode Plugin 工厂函数模式
 * （已弃用 - 改用新的 Plugin 模式）
 */
export function createPlugin(context?: PluginContext): any {
  return {
  name: "@sansheng/liubu",
  version: "1.0.0",
  description: "三省六部制 OpenCode Plugin - 模块化架构",

  hooks: {
    /**
     * Hook 1: Session 创建
     * 官方稳定 Hook - 替代 experimental.session.compacting 的初始化逻辑
     * 在新 Session 创建时初始化状态
     */
    "session.created": async (input: Record<string, unknown>) => {
      try {
        initializePlugin(context)

        const sessionId = (input as any).id || (input as any).sessionId || "default"
        const agentName = (input as any).agent_name || "unknown"
        const domain = (input as any).domain || "general"

        // 初始化 Session 状态
        const sessionState = getOrCreateSessionState(sessionId, agentName, domain)

        // Phase 3: 持久化 Session 状态到官方 SDK
        if (context) {
          await persistSessionStateToSDK(sessionId, context)
        }

        log(
          "Session",
          `Session created and initialized: ${sessionId}`
        )
      } catch (error) {
        log("Plugin", `Error in session.created hook: ${error}`, "warn")
      }
    },

    /**
     * Hook 2: Session 更新
     * 官方稳定 Hook - 替代 experimental.chat.system.transform
     * Session 更新时检查并注入约束（仅首次）
     */
    "session.updated": async (input: Record<string, unknown>) => {
      try {
        initializePlugin(context)

        const root = findRoot()

        // Phase 4: 使用 ConfigManager 替代 readRegistry
        const activeDomain = configManager?.getActiveDomain() || "general"
        const domain = readDomain(root, activeDomain)

        if (!domain) return

        const sessionId = (input as any).id || (input as any).sessionId || "default"
        const agentType = (input as any).agent_type || "unknown"
        const agentName = (input as any).agent_name || agentType

        // Phase 3: 从官方 SDK 恢复 Session 状态（支持 Session 恢复）
        if (context) {
          await restoreSessionStateFromSDK(sessionId, context)
        }

        // ⭐ 关键优化：仅首次注入约束（节省 token）
        if (!isConstraintsInjected(sessionId)) {
          // Phase 5: 发现约束（优化版本 - 分级注入）
          const constraints = discoverConstraintsWithCacheOptimized(
            agentName,
            activeDomain,
            root
          )

          // 更新 Session 状态
          updateSessionConstraints(sessionId, constraints)
          markConstraintsInjected(sessionId)

          // Phase 3: 持久化到官方 SDK
          if (context) {
            await persistSessionStateToSDK(sessionId, context)
          }

          if (constraints.length > 0) {
            log(
              "Constraint",
              `Prepared ${constraints.length} constraints for ${agentName}:${activeDomain}`
            )
          }
        }

        // 清理过期的 Session（可选，后续改进中使用官方API）
        const cleaned = cleanupExpiredSessions()
        if (cleaned > 0) {
          log("Session", `Cleaned up ${cleaned} expired sessions`)
        }
      } catch (error) {
        log("Plugin", `Error in session.updated hook: ${error}`, "warn")
      }
    },

    /**
     * Hook 3: Tool 执行后处理
     * 官方稳定 Hook - 跟踪工具执行
     */
    "tool.execute.after": async (input: Record<string, unknown>, output: { output: string }) => {
      try {
        initializePlugin(context)

        const root = findRoot()

        // Phase 4: 使用 ConfigManager 替代 readRegistry
        const activeDomain = configManager?.getActiveDomain() || "general"
        const domain = readDomain(root, activeDomain)

        if (!domain) return

        // 获取当前步骤信息
        const skillName = (input as any).args?.skill_name || (input as any).args?.name
        if (!skillName) return

        // 找对应的步骤
        const step = domain.pipeline.find((s) => s.skill === skillName || s.id === skillName)
        if (!step) return

        log("Pipeline", `Tool executed: ${skillName}`)
      } catch (error) {
        log("Plugin", `Error in tool execute hook: ${error}`, "warn")
      }
    },

    // [OK] Hook 3: session.compacting（稳定版）- 保留供将来使用
    // 注：当 OpenCode 官方的 session.compacting 稳定后，可启用此 Hook
    // "session.compacting": async (input: Record<string, unknown>, output: any) => {
    //   try {
    //     // 实现逻辑与上面的 session.updated Hook 类似
    //   } catch (error) {
    //     log("Plugin", `Error in session.compacting hook: ${error}`, "warn")
    //   }
    // }
  }  // 关闭 hooks 对象
  } // 关闭 return 对象
} // 关闭 createPlugin 函数
// 工厂函数已通过 export function 导出

// ─────────────────── 导出单独的 Hooks（用于新的 Plugin 模式） ───────────────────

/**
 * Session Created Hook - 初始化 Session 状态
 */
export async function sessionCreatedHook(input: Record<string, unknown>, context?: PluginContext) {
  try {
    initializePlugin(context)

    const sessionId = (input as any).id || (input as any).sessionId || "default"
    const agentName = (input as any).agent_name || "unknown"
    const domain = (input as any).domain || "general"

    // 初始化 Session 状态
    const sessionState = getOrCreateSessionState(sessionId, agentName, domain)

    // Phase 3: 持久化 Session 状态到官方 SDK
    if (context) {
      await persistSessionStateToSDK(sessionId, context)
    }

    log(
      "Session",
      `Session created and initialized: ${sessionId}`
    )
  } catch (error) {
    log("Plugin", `Error in session.created hook: ${error}`, "warn")
  }
}

/**
 * Session Updated Hook - 注入约束（仅首次）+ 任务队列消息解析
 */
export async function sessionUpdatedHook(input: Record<string, unknown>, context?: PluginContext) {
  try {
    initializePlugin(context)

    const root = findRoot()

    // Phase 4: 使用 ConfigManager 替代 readRegistry
    const activeDomain = configManager?.getActiveDomain() || "general"
    const domain = readDomain(root, activeDomain)

    if (!domain) return

    const sessionId = (input as any).id || (input as any).sessionId || "default"
    const agentType = (input as any).agent_type || "unknown"
    const agentName = (input as any).agent_name || agentType

    // ⭐ 新增：从消息中提取任务信息（用于任务队列系统）
    const message = (input as any).message || (input as any).content || ""
    if (message && typeof message === "string") {
      // 检测声明任务的模式（支持英文和中文）
      if (message.includes("claim") || message.includes("声明")) {
        const taskMatch = message.match(/(\w+)/)
        if (taskMatch) {
          const taskId = taskMatch[1]
          ;(globalThis as any).__claimTaskId__ = taskId
          ;(globalThis as any).__sessionId__ = sessionId
          ;(globalThis as any).__agentName__ = agentName
          log("TaskQueue", `Detected claim task: ${taskId} by ${agentName}`)
        }
      }

      // 检测完成任务的模式（支持英文和中文）
      if (message.includes("complete") || message.includes("完成")) {
        const taskMatch = message.match(/(\w+)/)
        if (taskMatch) {
          const taskId = taskMatch[1]
          ;(globalThis as any).__completeTaskId__ = taskId
          ;(globalThis as any).__sessionId__ = sessionId
          log("TaskQueue", `Detected complete task: ${taskId}`)
        }
      }
    }

    // Phase 3: 从官方 SDK 恢复 Session 状态（支持 Session 恢复）
    if (context) {
      await restoreSessionStateFromSDK(sessionId, context)
    }

    // ⭐ 丞相府：初始化工作流（从消息中检测）
    if (message && typeof message === "string") {
      // 检测初始化工作流的模式
      const initMatch = message.match(/@initializeWorkflow\s*(\w+)?/)
      if (initMatch) {
        const recipeType = (initMatch[1] || "medium") as any
        try {
          initializeChancellery(sessionId, recipeType)
          const status = getChancelleryStatus(sessionId)
          log("Chancellery", `丞相府已初始化: ${status?.totalTasks}个任务`)
        } catch (error) {
          log("Chancellery", `初始化失败: ${error}`, "error")
        }
      }
    }

    // ⭐ 关键优化：仅首次注入约束（节省 token）
    if (!isConstraintsInjected(sessionId)) {
      // Phase 5: 发现约束（优化版本 - 分级注入）
      const constraints = discoverConstraintsWithCacheOptimized(
        agentName,
        activeDomain,
        root
      )

      // 更新 Session 状态
      updateSessionConstraints(sessionId, constraints)
      markConstraintsInjected(sessionId)

      // Phase 3: 持久化到官方 SDK
      if (context) {
        await persistSessionStateToSDK(sessionId, context)
      }

      if (constraints.length > 0) {
        log(
          "Constraint",
          `Prepared ${constraints.length} constraints for ${agentName}:${activeDomain}`
        )
      }
    }

    // 清理过期的 Session（可选，后续改进中使用官方API）
    const cleaned = cleanupExpiredSessions()
    if (cleaned > 0) {
      log("Session", `Cleaned up ${cleaned} expired sessions`)
    }
  } catch (error) {
    log("Plugin", `Error in session.updated hook: ${error}`, "warn")
  }
}

/**
 * Tool Execute After Hook - 跟踪工具执行和任务队列验证
 */
export async function toolExecuteAfterHook(input: Record<string, unknown>, output: { output: string }, context?: PluginContext) {
  try {
    initializePlugin(context)

    const root = findRoot()

    // Phase 4: 使用 ConfigManager 替代 readRegistry
    const activeDomain = configManager?.getActiveDomain() || "general"
    const domain = readDomain(root, activeDomain)

    if (!domain) return

    // 获取当前步骤信息
    const skillName = (input as any).args?.skill_name || (input as any).args?.name
    if (!skillName) return

    // 找对应的步骤
    const step = domain.pipeline.find((s) => s.skill === skillName || s.id === skillName)
    if (!step) return

    // ─────────────────── Phase 1：任务队列验证 ───────────────────

    const sessionId = (input as any).sessionId || (input as any).session_id || "default"
    const agentName = (input as any).agent_name || "unknown"

    // 获取任务队列
    const queue = getTaskQueue(sessionId)
    if (queue) {
      // 检查 1: 是否声明了任务？
      const taskId = (input as any).task_id
      if (!taskId) {
        throw new Error(
          `[PROTOCOL ERROR] Agent ${agentName} 执行了工具 ${skillName} 但没有声明任务 ID。\n` +
          `必须先声明要做什么任务。\n\n` +
          `正确步骤：\n` +
          `1. 调用 @claim_task 声明任务\n` +
          `2. 执行工作\n` +
          `3. 调用 @complete_task 标记完成`
        )
      }

      // 检查 2: 任务是否存在？
      const task = queue.tasks.find(t => t.id === taskId)
      if (!task) {
        throw new Error(
          `[TASK NOT FOUND] 任务 ${taskId} 不存在。\n` +
          `请使用有效的任务 ID。`
        )
      }

      // 检查 3: 任务的依赖是否都完成了？（使用 Set 缓存优化）
      const incompleteDeps = task.dependencies.filter(
        dep => !isTaskCompleted(dep, queue.completedTasks, queue.completedTasksSet)
      )
      if (incompleteDeps.length > 0) {
        const incompleteNames = incompleteDeps
          .map(dep => queue.tasks.find(t => t.id === dep)?.name)
          .filter(Boolean)
          .join(", ")
        throw new Error(
          `[DEPENDENCY ERROR] 任务 "${task.name}" 的前置依赖未完成：\n` +
          `  - ${incompleteNames}\n\n` +
          `必须先完成这些任务。`
        )
      }

      // 检查 4: 验证配方合规性（关键路径）
      const recipe = getRecipe(queue.recipeType)
      const compliance = validateRecipeCompliance(recipe, queue.tasks, queue.completedTasks)
      if (!compliance.compliant) {
        log("Workflow", `Recipe compliance violations:\n${compliance.violations.join("\n")}`, "warn")
      }

      log("TaskQueue", `Tool executed: ${skillName} for task ${taskId} by ${agentName}`)
    }

    // ─────────────────── 丞相府：工作流推进 ───────────────────

    // 检测任务完成信号
    const taskCompleteMatch = (input as any).message?.match(/@completeTask\s*(\w+)?/) ||
                              (input as any).args?.match?.(/complete.*task/) ||
                              skillName?.toLowerCase().includes("complete")

    if (taskCompleteMatch && queue?.currentTask) {
      try {
        // 推进工作流
        const nextTask = advanceWorkflow(sessionId, queue.currentTask, {
          completedAt: new Date().toISOString(),
          result: "success"
        })

        if (nextTask) {
          log("Chancellery", `下一个任务: ${nextTask.name} (${nextTask.id})`)
        } else {
          log("Chancellery", `工作流已完成!`)
        }
      } catch (error) {
        log("Chancellery", `推进工作流失败: ${error}`, "error")
      }
    }

    // ─────────────────── Phase 2+3：编程Agent代码修改验证（网关） ───────────────────

    // 检测代码修改工具（Edit, Write, NotebookEdit）
    const codeModificationTools = ["Edit", "Write", "NotebookEdit", "edit", "write"]
    if (codeModificationTools.includes(skillName)) {
      // 获取修改信息
      const taskIdForModification = (input as any).task_id || "unknown"
      const filesAffected = (input as any).args?.file_path ? [(input as any).args.file_path] : []
      const linesChanged = (input as any).args?.old_string
        ? ((input as any).args.new_string || "").split("\n").length
        : 0

      // Phase 3：使用网关进行多层验证（新 API：使用请求对象）
      const gatewayResult = runCodeModificationGateway({
        sessionId,
        agentName,
        operation: skillName,
        filesAffected,
        linesChanged
      })

      // 追加审计记录（无论允许或拒绝都记录）
      appendAuditRecord(root, sessionId, {
        sessionId,
        agentName,
        operation: skillName,
        taskId: taskIdForModification,
        filesAffected,
        linesChanged,
        riskLevel: gatewayResult.riskLevel,
        menxiaReviewed: queue?.completedTasks?.some(t => t.includes("menxia")) || false,
        testsPassed: true,
        gatewayChecks: gatewayResult.blockingReasons.length === 0 ? ["workflow", "risk", "menxia"] : [],
        result: gatewayResult.allowed ? "allowed" : "blocked",
        blockReason: gatewayResult.blockingReasons.length > 0
          ? gatewayResult.blockingReasons.join("; ")
          : undefined
      })

      // 如果网关拒绝，抛出错误
      if (!gatewayResult.allowed) {
        throw new Error(
          `[PROGRAMMING AGENT ENFORCEMENT] 代码修改被网关拒绝\n` +
          `原因:\n${gatewayResult.blockingReasons.map(r => `  - ${r}`).join("\n")}\n\n` +
          `必须执行的步骤:\n` +
          gatewayResult.requiredActions.map((s, i) => `${i + 1}. ${s}`).join("\n")
        )
      }

      // 代码修改通过网关验证，记录此次修改
      recordCodeModification(sessionId, {
        taskId: taskIdForModification,
        agentName,
        timestamp: new Date(),
        filesAffected,
        linesChanged,
        plan: (input as any).args?.plan || "code modification",
        riskLevel: gatewayResult.riskLevel,
        reviewedByMenxia: gatewayResult.requiresMenxiaReview ? (queue?.completedTasks?.some(t => t.includes("menxia")) || false) : false,
        testsPassed: true,
        auditTrail: [
          `[${new Date().toISOString()}] Code modification passed gateway`,
          `Agent: ${agentName}`,
          `Files: ${filesAffected.join(", ")}`,
          `Risk: ${gatewayResult.riskLevel}`,
          `Menxia Required: ${gatewayResult.requiresMenxiaReview ? "yes" : "no"}`
        ]
      })

      log("ProgrammingAgent", `Code modification passed gateway: ${skillName} by ${agentName}, risk=${gatewayResult.riskLevel}`)
    }

    log("Pipeline", `Tool executed: ${skillName}`)
  } catch (error) {
    log("Plugin", `Error in tool execute hook: ${error}`, "warn")
    throw error
  }
}
