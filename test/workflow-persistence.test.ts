/**
 * 工作流持久化系统测试
 */

import * as path from "path"
import * as fs from "fs"
import {
  saveWorkflowState,
  loadWorkflowState,
  hasPersistedState,
  deleteWorkflowState,
  listPersistedSessions,
  generatePersistenceReport,
  getWorkflowStatePath,
  WorkflowSnapshot
} from "../src/workflows/workflow-persistence.js"
import { ChancelleryWorkflow, ChancelleryState } from "../src/workflows/chancellery.js"
import { createTaskQueue, addTask } from "../src/session/task-queue.js"
import { WorkflowTask } from "../src/types.js"

describe("WorkflowPersistence", () => {
  let testDir: string
  let sessionId: string

  beforeEach(() => {
    testDir = path.join(process.cwd(), ".test-persist-temp")
    sessionId = `test-session-${Date.now()}`

    // 创建.opencode目录结构
    const opencodePath = path.join(testDir, ".opencode")
    if (!fs.existsSync(opencodePath)) {
      fs.mkdirSync(opencodePath, { recursive: true })
    }
  })

  afterEach(() => {
    // 清理临时目录
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  it("should save workflow state to disk", () => {
    createTaskQueue(sessionId, "simple")

    // 创建任务
    const task: WorkflowTask = {
      id: "task-1",
      name: "Test Task",
      type: "execute",
      status: "pending",
      dependencies: [],
      claimedBy: null,
      outputs: {}
    }
    addTask(sessionId, task)

    // 创建工作流
    const workflow: ChancelleryWorkflow = {
      sessionId,
      state: ChancelleryState.IN_PROGRESS,
      recipeType: "simple",
      createdAt: Date.now(),
      totalTasks: 1,
      completedTasks: 0,
      failedTasks: 0,
      currentAgentTasks: new Map([["agent1", "task-1"]])
    }

    // 保存
    const result = saveWorkflowState(testDir, workflow, sessionId)

    expect(result).toBe(true)

    // 验证文件存在
    const statePath = getWorkflowStatePath(testDir, sessionId)
    expect(fs.existsSync(statePath)).toBe(true)

    // 验证文件内容
    const content = fs.readFileSync(statePath, "utf-8")
    const snapshot = JSON.parse(content) as WorkflowSnapshot
    expect(snapshot.version).toBe(1)
    expect(snapshot.workflow.sessionId).toBe(sessionId)
    expect(snapshot.workflow.state).toBe(ChancelleryState.IN_PROGRESS)
  })

  it("should load workflow state from disk", () => {
    createTaskQueue(sessionId, "simple")

    const task: WorkflowTask = {
      id: "task-1",
      name: "Test Task",
      type: "execute",
      status: "completed",
      dependencies: [],
      claimedBy: "agent1",
      outputs: { result: "success" }
    }
    addTask(sessionId, task)

    const workflow: ChancelleryWorkflow = {
      sessionId,
      state: ChancelleryState.COMPLETED,
      recipeType: "simple",
      createdAt: Date.now(),
      totalTasks: 1,
      completedTasks: 1,
      failedTasks: 0,
      currentAgentTasks: new Map()
    }

    // 保存
    saveWorkflowState(testDir, workflow, sessionId)

    // 加载
    const snapshot = loadWorkflowState(testDir, sessionId)

    expect(snapshot).not.toBeNull()
    expect(snapshot!.version).toBe(1)
    expect(snapshot!.workflow.completedTasks).toBe(1)
    expect(snapshot!.workflow.state).toBe(ChancelleryState.COMPLETED)
  })

  it("should detect when persisted state exists", () => {
    createTaskQueue(sessionId, "simple")

    const workflow: ChancelleryWorkflow = {
      sessionId,
      state: ChancelleryState.INITIALIZED,
      recipeType: "simple",
      createdAt: Date.now(),
      totalTasks: 5,
      completedTasks: 2,
      failedTasks: 0,
      currentAgentTasks: new Map()
    }

    // 初始应该不存在
    expect(hasPersistedState(testDir, sessionId)).toBe(false)

    // 保存后应该存在
    saveWorkflowState(testDir, workflow, sessionId)
    expect(hasPersistedState(testDir, sessionId)).toBe(true)
  })

  it("should delete workflow state", () => {
    createTaskQueue(sessionId, "simple")

    const workflow: ChancelleryWorkflow = {
      sessionId,
      state: ChancelleryState.COMPLETED,
      recipeType: "simple",
      createdAt: Date.now(),
      totalTasks: 1,
      completedTasks: 1,
      failedTasks: 0,
      currentAgentTasks: new Map()
    }

    // 保存
    saveWorkflowState(testDir, workflow, sessionId)
    expect(hasPersistedState(testDir, sessionId)).toBe(true)

    // 删除
    const result = deleteWorkflowState(testDir, sessionId)
    expect(result).toBe(true)
    expect(hasPersistedState(testDir, sessionId)).toBe(false)
  })

  it("should list persisted sessions", () => {
    // 创建多个会话
    for (let i = 0; i < 3; i++) {
      const sid = `session-${i}`
      createTaskQueue(sid, "simple")

      const workflow: ChancelleryWorkflow = {
        sessionId: sid,
        state: ChancelleryState.INITIALIZED,
        recipeType: "simple",
        createdAt: Date.now(),
        totalTasks: 1,
        completedTasks: 0,
        failedTasks: 0,
        currentAgentTasks: new Map()
      }

      saveWorkflowState(testDir, workflow, sid)
    }

    // 列出所有会话
    const sessions = listPersistedSessions(testDir)
    expect(sessions.length).toBeGreaterThanOrEqual(3)
    expect(sessions).toContain("session-0")
    expect(sessions).toContain("session-1")
    expect(sessions).toContain("session-2")
  })

  it("should generate persistence report", () => {
    // 创建一个会话
    createTaskQueue(sessionId, "simple")

    const workflow: ChancelleryWorkflow = {
      sessionId,
      state: ChancelleryState.IN_PROGRESS,
      recipeType: "medium",
      createdAt: Date.now(),
      totalTasks: 10,
      completedTasks: 3,
      failedTasks: 0,
      currentAgentTasks: new Map()
    }

    saveWorkflowState(testDir, workflow, sessionId)

    // 生成报告
    const report = generatePersistenceReport(testDir)

    expect(report).toContain("Persisted Workflow Sessions")
    expect(report).toContain(sessionId)
    expect(report).toContain("3/10")
    expect(report).toContain("in_progress")
  })

  it("should preserve agent task assignments", () => {
    createTaskQueue(sessionId, "simple")

    const workflow: ChancelleryWorkflow = {
      sessionId,
      state: ChancelleryState.IN_PROGRESS,
      recipeType: "complex",
      createdAt: Date.now(),
      totalTasks: 5,
      completedTasks: 1,
      failedTasks: 0,
      currentAgentTasks: new Map([
        ["agent1", "task-1"],
        ["agent2", "task-3"],
        ["menxia", "task-review"]
      ])
    }

    // 保存
    saveWorkflowState(testDir, workflow, sessionId)

    // 加载
    const snapshot = loadWorkflowState(testDir, sessionId)

    expect(snapshot!.workflow.currentAgentTasks).toBeDefined()
    const agentMap = Object.entries(snapshot!.workflow.currentAgentTasks || {})
    expect(agentMap.length).toBe(3)
    expect(agentMap.some(([a, t]) => a === "agent1" && t === "task-1")).toBe(true)
    expect(agentMap.some(([a, t]) => a === "menxia" && t === "task-review")).toBe(true)
  })

  it("should handle non-existent workflow state gracefully", () => {
    const snapshot = loadWorkflowState(testDir, "non-existent-session")
    expect(snapshot).toBeNull()
  })

  it("should verify checksum integrity", () => {
    createTaskQueue(sessionId, "simple")

    const workflow: ChancelleryWorkflow = {
      sessionId,
      state: ChancelleryState.COMPLETED,
      recipeType: "simple",
      createdAt: Date.now(),
      totalTasks: 1,
      completedTasks: 1,
      failedTasks: 0,
      currentAgentTasks: new Map()
    }

    saveWorkflowState(testDir, workflow, sessionId)

    // 加载应该成功
    const snapshot = loadWorkflowState(testDir, sessionId)
    expect(snapshot).not.toBeNull()
    expect(snapshot!.checksum).toBeDefined()
  })

  it("should return empty list for non-existent directory", () => {
    const nonExistentDir = path.join(testDir, "non-existent")
    const sessions = listPersistedSessions(nonExistentDir)
    expect(sessions).toEqual([])
  })

  it("should handle workflow state with no agent assignments", () => {
    createTaskQueue(sessionId, "simple")

    const workflow: ChancelleryWorkflow = {
      sessionId,
      state: ChancelleryState.INITIALIZED,
      recipeType: "simple",
      createdAt: Date.now(),
      totalTasks: 5,
      completedTasks: 0,
      failedTasks: 0,
      currentAgentTasks: new Map()
    }

    saveWorkflowState(testDir, workflow, sessionId)
    const snapshot = loadWorkflowState(testDir, sessionId)

    expect(snapshot!.workflow.currentAgentTasks).toBeDefined()
    expect(Object.keys(snapshot!.workflow.currentAgentTasks || {}).length).toBe(0)
  })
})
