/**
 * 丞相府（Chancellery） - 工作流编排器
 *
 * 职责：
 * - 初始化工作流，制定工作计划
 * - 从配方生成具体的WorkflowTask
 * - 分配任务给各个Agent（三省六部）
 * - 推进工作流进度
 * - 追踪全局状态和进度
 */

import { log, findRoot } from "../utils.js"
import { WorkflowTask, WorkflowRecipe } from "../types.js"
import { getRecipe } from "./recipes.js"
import { getTaskQueue, addTask, completeTask, claimTask, failTask } from "../session/task-queue.js"
import { TASK_TO_AGENT_MAPPING } from "./agent-task-mapper.js"
import { saveWorkflowState, loadWorkflowState, hasPersistedState } from "./workflow-persistence.js"

/**
 * 丞相府工作流状态
 */
export enum ChancelleryState {
  UNINITIALIZED = "uninitialized",
  INITIALIZED = "initialized",
  IN_PROGRESS = "in_progress",
  BLOCKED = "blocked",
  COMPLETED = "completed",
  FAILED = "failed"
}

/**
 * 丞相府工作流信息
 */
export interface ChancelleryWorkflow {
  sessionId: string
  state: ChancelleryState
  recipeType: "simple" | "medium" | "complex" | "high_risk"
  createdAt: number
  totalTasks: number
  completedTasks: number
  failedTasks: number
  currentAgentTasks: Map<string, string> // agentName -> taskId
}

// 全局丞相府存储
const chancelleryMap = new Map<string, {
  workflow: ChancelleryWorkflow
  recipe: WorkflowRecipe
  taskIdSequence: number
  taskTypeMap: Map<string, string> // taskId -> stepType (understand, plan, etc.)
}>()

/**
 * 丞相府：初始化工作流
 *
 * 职责：
 * 1. 检查是否有已保存的工作流状态，如果有则恢复
 * 2. 否则创建任务队列
 * 3. 根据配方生成所有任务
 * 4. 建立任务依赖关系
 */
export function initializeChancellery(
  sessionId: string,
  recipeType: "simple" | "medium" | "complex" | "high_risk" = "medium"
): ChancelleryWorkflow {
  log("Chancellery", `丞相府初始化工作流: ${recipeType}`)

  // 检查是否有已保存的工作流状态
  const root = findRoot()
  if (hasPersistedState(root, sessionId)) {
    const snapshot = loadWorkflowState(root, sessionId)
    if (snapshot) {
      log("Chancellery", `从磁盘恢复工作流: ${sessionId}`, "info")

      // 恢复丞相府记录
      const workflow = snapshot.workflow
      workflow.currentAgentTasks = new Map(
        Object.entries(workflow.currentAgentTasks || {}) as [string, string][]
      )

      // 重建taskTypeMap（从菜谱恢复）
      const taskTypeMap = new Map<string, string>()
      const recipe = getRecipe(workflow.recipeType)
      if (recipe) {
        snapshot.tasks.forEach(task => {
          const stepType = recipe.steps.find(step => task.id.startsWith(step + "-"))
          if (stepType) {
            taskTypeMap.set(task.id, stepType)
          }
        })
      }

      chancelleryMap.set(sessionId, {
        workflow,
        recipe: getRecipe(workflow.recipeType)!,
        taskIdSequence: snapshot.tasks.length,
        taskTypeMap
      })

      log("Chancellery", `工作流已恢复: ${workflow.completedTasks}/${workflow.totalTasks}任务完成`)
      return workflow
    }
  }

  // 获取配方
  const recipe = getRecipe(recipeType)
  if (!recipe) {
    throw new Error(`[CHANCELLERY ERROR] 配方 ${recipeType} 不存在`)
  }

  // 创建任务队列
  const queue = getTaskQueue(sessionId)
  if (queue) {
    log("Chancellery", `任务队列已存在: ${sessionId}`, "warn")
  }

  // 生成所有任务
  const tasks = generateTasksFromRecipe(recipe, sessionId)

  // 添加任务到队列
  tasks.forEach(task => {
    addTask(sessionId, task)
  })

  // 创建丞相府记录
  const workflow: ChancelleryWorkflow = {
    sessionId,
    state: ChancelleryState.INITIALIZED,
    recipeType,
    createdAt: Date.now(),
    totalTasks: tasks.length,
    completedTasks: 0,
    failedTasks: 0,
    currentAgentTasks: new Map()
  }

  // 创建taskType映射
  const taskTypeMap = new Map<string, string>()
  tasks.forEach(task => {
    const stepType = recipe.steps.find((step, index) =>
      task.id.startsWith(step + "-")
    )
    if (stepType) {
      taskTypeMap.set(task.id, stepType)
    }
  })

  chancelleryMap.set(sessionId, {
    workflow,
    recipe,
    taskIdSequence: tasks.length,
    taskTypeMap
  })

  log("Chancellery", `工作流已初始化: ${tasks.length}个任务, 状态: ${workflow.state}`)

  return workflow
}

/**
 * 从配方生成WorkflowTask列表
 */
function generateTasksFromRecipe(recipe: WorkflowRecipe, sessionId: string): WorkflowTask[] {
  const tasks: WorkflowTask[] = []
  const taskIdMap = new Map<string, string>() // stepId -> taskId

  // 为每个步骤生成任务
  recipe.steps.forEach((stepId, index) => {
    const taskId = `${stepId}-${Date.now()}-${index}`
    taskIdMap.set(stepId, taskId)

    // 从映射中获取负责的Agent
    const responsibleAgent = TASK_TO_AGENT_MAPPING[stepId] || "unknown"

    const task: WorkflowTask = {
      id: taskId,
      name: getTaskNameByStep(stepId),
      agent: responsibleAgent,
      description: `${getTaskNameByStep(stepId)} - ${recipe.name}`,
      status: "pending",
      dependencies: [],
      outputs: {}
    }

    tasks.push(task)
  })

  // 建立依赖关系
  recipe.steps.forEach((stepId, index) => {
    if (index === 0) return // 第一个任务无依赖

    const currentTaskId = taskIdMap.get(stepId)!
    const prevTaskId = taskIdMap.get(recipe.steps[index - 1])!

    // 找到当前任务，添加前置依赖
    const task = tasks.find(t => t.id === currentTaskId)
    if (task) {
      task.dependencies.push(prevTaskId)
    }
  })

  log("Chancellery", `从${recipe.name}配方生成${tasks.length}个任务`)

  return tasks
}

/**
 * 获取任务的中文名称
 */
function getTaskNameByStep(stepId: string): string {
  const nameMap: Record<string, string> = {
    "understand": "理解需求",
    "plan": "制定计划",
    "menxia_quick_check": "快速风险检查",
    "menxia_review": "审核计划",
    "menxia_final_review": "最终审核",
    "libu_structure": "设计代码结构",
    "hubu_deps": "处理依赖",
    "bingbu_perf": "性能规划",
    "libu_rites_check": "标准检查",
    "execute": "执行实现",
    "verify": "验证检查"
  }
  return nameMap[stepId] || stepId
}

/**
 * 丞相府：获取下一个待分配的任务
 */
export function getNextTaskForAgent(sessionId: string, agentName: string): WorkflowTask | null {
  const queue = getTaskQueue(sessionId)
  if (!queue) {
    log("Chancellery", `任务队列不存在: ${sessionId}`, "warn")
    return null
  }

  // 找到第一个待分配的任务
  const nextTask = queue.tasks.find(t => t.status === "pending")
  if (!nextTask) {
    log("Chancellery", `没有待分配的任务 (${agentName})`)
    return null
  }

  // 检查Agent是否有权限执行此任务
  const chancellery = chancelleryMap.get(sessionId)
  if (chancellery) {
    const taskType = chancellery.taskTypeMap.get(nextTask.id)
    if (taskType) {
      const responsibleAgent = TASK_TO_AGENT_MAPPING[taskType]
      if (responsibleAgent && responsibleAgent !== agentName) {
        log("Chancellery", `任务${nextTask.id}应由${responsibleAgent}执行，不能由${agentName}执行`, "warn")
        return null
      }
    }
  }

  log("Chancellery", `分配任务给${agentName}: ${nextTask.name}`)

  return nextTask
}

/**
 * 丞相府：Agent声明任务
 */
export function claimTaskByAgent(sessionId: string, taskId: string, agentName: string): WorkflowTask {
  const queue = getTaskQueue(sessionId)
  if (!queue) {
    throw new Error(`[CHANCELLERY ERROR] 任务队列不存在: ${sessionId}`)
  }

  const task = claimTask(sessionId, taskId, agentName)

  // 更新丞相府记录
  const chancellery = chancelleryMap.get(sessionId)
  if (chancellery) {
    chancellery.workflow.currentAgentTasks.set(agentName, taskId)
    chancellery.workflow.state = ChancelleryState.IN_PROGRESS
  }

  log("Chancellery", `${agentName} 声明任务: ${task.name}`)

  return task
}

/**
 * 丞相府：推进工作流（完成任务）
 */
export function advanceWorkflow(sessionId: string, taskId: string, outputs: any = {}): WorkflowTask | null {
  const queue = getTaskQueue(sessionId)
  if (!queue) {
    throw new Error(`[CHANCELLERY ERROR] 任务队列不存在: ${sessionId}`)
  }

  const task = queue.tasks.find(t => t.id === taskId)
  if (!task) {
    throw new Error(`[CHANCELLERY ERROR] 任务不存在: ${taskId}`)
  }

  // 标记任务完成
  task.outputs = outputs
  completeTask(sessionId, taskId)

  // 更新丞相府统计
  const chancellery = chancelleryMap.get(sessionId)
  if (chancellery) {
    chancellery.workflow.completedTasks = queue.completedTasks.length

    // 清除该Agent的当前任务
    const agentName = task.claimedBy
    if (agentName) {
      chancellery.workflow.currentAgentTasks.delete(agentName)
    }

    // 检查是否完成所有任务
    if (chancellery.workflow.completedTasks === chancellery.workflow.totalTasks) {
      chancellery.workflow.state = ChancelleryState.COMPLETED
      log("Chancellery", `工作流已完成!`, "info")
    }
  }

  log("Chancellery", `任务完成: ${task.name}`)

  // 获取下一个任务
  const nextTask = queue.tasks.find(t => t.status === "pending")

  // 保存工作流状态到磁盘
  const root = findRoot()
  if (chancellery) {
    saveWorkflowState(root, chancellery.workflow, sessionId)
  }

  return nextTask || null
}

/**
 * 丞相府：任务失败处理
 */
export function failWorkflowTask(sessionId: string, taskId: string, reason: string): void {
  const queue = getTaskQueue(sessionId)
  if (!queue) {
    throw new Error(`[CHANCELLERY ERROR] 任务队列不存在: ${sessionId}`)
  }

  failTask(sessionId, taskId, reason)

  // 更新丞相府统计
  const chancellery = chancelleryMap.get(sessionId)
  if (chancellery) {
    chancellery.workflow.failedTasks++
    chancellery.workflow.state = ChancelleryState.BLOCKED

    // 保存失败状态到磁盘
    const root = findRoot()
    saveWorkflowState(root, chancellery.workflow, sessionId)
  }

  log("Chancellery", `任务失败: ${taskId}, 原因: ${reason}`, "error")
}

/**
 * 丞相府：获取工作流状态
 */
export function getChancelleryStatus(sessionId: string): ChancelleryWorkflow | null {
  const chancellery = chancelleryMap.get(sessionId)
  if (!chancellery) {
    return null
  }

  return chancellery.workflow
}

/**
 * 丞相府：生成工作流报告
 */
export function generateChancelleryReport(sessionId: string): string {
  const status = getChancelleryStatus(sessionId)
  if (!status) {
    return `[丞相府报告] 会话 ${sessionId} 不存在`
  }

  const queue = getTaskQueue(sessionId)
  const progressPercent = Math.round((status.completedTasks / status.totalTasks) * 100)

  return `
╔══════════════════════════════════════════════════╗
║          丞相府工作流进度报告                    ║
╚══════════════════════════════════════════════════╝

📋 工作流信息
  - 会话ID: ${status.sessionId}
  - 配方类型: ${status.recipeType}
  - 状态: ${status.state}
  - 创建时间: ${new Date(status.createdAt).toISOString()}

📊 进度统计
  - 总任务数: ${status.totalTasks}
  - 已完成: ${status.completedTasks}
  - 失败: ${status.failedTasks}
  - 进度: ${progressPercent}%

👥 当前分配
  ${Array.from(status.currentAgentTasks.entries())
    .map(([agent, taskId]) => `  - ${agent}: 正在执行 ${taskId}`)
    .join('\n') || '  无'}

${queue ? `
📝 任务详情
${queue.tasks.map(t => `  [${t.status.toUpperCase()}] ${t.name} (${t.id})`).join('\n')}
` : ''}
  `
}

/**
 * 清空会话数据（测试用）
 */
export function clearChancellery(sessionId: string): void {
  chancelleryMap.delete(sessionId)
  log("Chancellery", `清空会话数据: ${sessionId}`)
}
