/**
 * 工作流持久化系统 - Phase 4
 *
 * 职责：
 * - 将ChancelleryWorkflow状态保存到磁盘
 * - 从磁盘恢复工作流状态
 * - 管理工作流快照和历史
 */

import * as path from "path"
import { log } from "../utils.js"
import { findRoot, writeFile, readFile, safeJsonParse, ensureDirExists } from "../utils.js"
import { ChancelleryWorkflow, ChancelleryState } from "./chancellery.js"
import { WorkflowTask, TaskQueue } from "../types.js"
import { getTaskQueue } from "../session/task-queue.js"

/**
 * 工作流持久化快照
 */
export interface WorkflowSnapshot {
  version: 1
  workflow: ChancelleryWorkflow
  tasks: WorkflowTask[]
  taskQueue: {
    sessionId: string
    recipeType: string
    tasks: WorkflowTask[]
    completedTasks: string[]
    failedTasks: string[]
    createdAt: number
  }
  savedAt: string
  checksum?: string
}

/**
 * 获取工作流持久化目录
 */
function getWorkflowPersistDir(root: string): string {
  return path.join(root, ".opencode", "workflows")
}

/**
 * 获取工作流持久化文件路径
 */
export function getWorkflowStatePath(root: string, sessionId: string): string {
  return path.join(getWorkflowPersistDir(root), `${sessionId}.json`)
}

/**
 * 计算快照校验和（简单实现）
 */
function calculateChecksum(snapshot: WorkflowSnapshot): string {
  const content = JSON.stringify({
    workflowState: snapshot.workflow.state,
    completedTasks: snapshot.workflow.completedTasks,
    failedTasks: snapshot.workflow.failedTasks,
    taskCount: snapshot.tasks.length
  })
  return Buffer.from(content).toString("base64").substring(0, 16)
}

/**
 * 保存工作流状态到磁盘
 */
export function saveWorkflowState(
  root: string,
  workflow: ChancelleryWorkflow,
  sessionId: string
): boolean {
  try {
    const persistDir = getWorkflowPersistDir(root)
    ensureDirExists(persistDir)

    // 获取task queue状态
    const taskQueue = getTaskQueue(sessionId)
    if (!taskQueue) {
      log("WorkflowPersistence", `Cannot save: task queue not found for session ${sessionId}`, "warn")
      return false
    }

    // 构建快照
    const snapshot: WorkflowSnapshot = {
      version: 1,
      workflow: {
        ...workflow,
        // Map需要转换为可序列化格式
        currentAgentTasks: Object.fromEntries(workflow.currentAgentTasks)
      } as any,
      tasks: taskQueue.tasks,
      taskQueue: {
        sessionId: taskQueue.sessionId,
        recipeType: taskQueue.recipeType,
        tasks: taskQueue.tasks,
        completedTasks: taskQueue.completedTasks,
        failedTasks: taskQueue.tasks.filter(t => t.status === "failed").map(t => t.id),
        createdAt: taskQueue.createdAt
      },
      savedAt: new Date().toISOString()
    }

    // 计算校验和
    snapshot.checksum = calculateChecksum(snapshot)

    // 写入文件
    const statePath = getWorkflowStatePath(root, sessionId)
    writeFile(statePath, JSON.stringify(snapshot, null, 2))

    log(
      "WorkflowPersistence",
      `Workflow state saved: ${sessionId} (${workflow.completedTasks}/${workflow.totalTasks} tasks)`,
      "debug"
    )

    return true
  } catch (error) {
    log(
      "WorkflowPersistence",
      `Failed to save workflow state: ${error instanceof Error ? error.message : String(error)}`,
      "error"
    )
    return false
  }
}

/**
 * 加载工作流状态从磁盘
 */
export function loadWorkflowState(root: string, sessionId: string): WorkflowSnapshot | null {
  try {
    const statePath = getWorkflowStatePath(root, sessionId)
    const content = readFile(statePath)

    if (!content) {
      log("WorkflowPersistence", `No saved state found for session ${sessionId}`, "debug")
      return null
    }

    const snapshot = safeJsonParse<WorkflowSnapshot>(content, {} as WorkflowSnapshot)
    if (!snapshot || !snapshot.version) {
      log("WorkflowPersistence", `Failed to parse workflow state for session ${sessionId}`, "error")
      return null
    }

    // 验证快照版本
    if (snapshot.version !== 1) {
      log("WorkflowPersistence", `Unsupported snapshot version: ${snapshot.version}`, "warn")
      return null
    }

    // 验证校验和
    const expectedChecksum = calculateChecksum(snapshot)
    if (snapshot.checksum && snapshot.checksum !== expectedChecksum) {
      log("WorkflowPersistence", `Checksum mismatch for session ${sessionId}`, "warn")
      // 不中止，继续加载但标记警告
    }

    log(
      "WorkflowPersistence",
      `Workflow state loaded: ${sessionId} (${snapshot.workflow.completedTasks}/${snapshot.workflow.totalTasks} tasks)`,
      "debug"
    )

    return snapshot
  } catch (error) {
    log(
      "WorkflowPersistence",
      `Failed to load workflow state: ${error instanceof Error ? error.message : String(error)}`,
      "error"
    )
    return null
  }
}

/**
 * 检查是否存在已保存的工作流状态
 */
export function hasPersistedState(root: string, sessionId: string): boolean {
  try {
    const statePath = getWorkflowStatePath(root, sessionId)
    const content = readFile(statePath)
    return !!content
  } catch {
    return false
  }
}

/**
 * 删除工作流状态（完成或清理时）
 */
export function deleteWorkflowState(root: string, sessionId: string): boolean {
  try {
    const statePath = getWorkflowStatePath(root, sessionId)
    const content = readFile(statePath)
    if (!content) {
      return true // 已经不存在
    }

    // 用Node.js fs删除文件
    const fs = require("fs")
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath)
    }

    log("WorkflowPersistence", `Workflow state deleted: ${sessionId}`, "debug")
    return true
  } catch (error) {
    log(
      "WorkflowPersistence",
      `Failed to delete workflow state: ${error instanceof Error ? error.message : String(error)}`,
      "error"
    )
    return false
  }
}

/**
 * 列出所有已保存的工作流会话
 */
export function listPersistedSessions(root: string): string[] {
  try {
    const persistDir = getWorkflowPersistDir(root)
    const fs = require("fs")

    if (!fs.existsSync(persistDir)) {
      return []
    }

    const files = fs.readdirSync(persistDir)
    return files
      .filter((f: string) => f.endsWith(".json"))
      .map((f: string) => f.replace(".json", ""))
  } catch (error) {
    log(
      "WorkflowPersistence",
      `Failed to list persisted sessions: ${error instanceof Error ? error.message : String(error)}`,
      "error"
    )
    return []
  }
}

/**
 * 生成工作流持久化报告
 */
export function generatePersistenceReport(root: string): string {
  const sessions = listPersistedSessions(root)

  if (sessions.length === 0) {
    return "No persisted workflow sessions found."
  }

  const lines = [
    "═══════════════════════════════════════════",
    "Persisted Workflow Sessions",
    "═══════════════════════════════════════════",
    ""
  ]

  sessions.forEach((sessionId) => {
    const snapshot = loadWorkflowState(root, sessionId)
    if (snapshot) {
      lines.push(`Session: ${sessionId}`)
      lines.push(`  State: ${snapshot.workflow.state}`)
      lines.push(`  Progress: ${snapshot.workflow.completedTasks}/${snapshot.workflow.totalTasks}`)
      lines.push(`  Saved: ${snapshot.savedAt}`)
      lines.push("")
    }
  })

  return lines.join("\n")
}
