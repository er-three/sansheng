/**
 * 治理系统的核心执行引擎
 * 负责流程编排、依赖管理、状态追踪、并行调度
 */

import {
  Plan,
  Step,
  Task,
  TaskStatus,
  TaskType,
  ExecutionState,
  ExecutionReport,
  StepResult,
  ExecutionTimeline,
  AgentRole,
  Decision,
  GovernanceConfig,
  ErrorCode,
} from "./types.js"

export class WorkflowEngine {
  private config: GovernanceConfig
  private executionState: ExecutionState
  private timeline: ExecutionTimeline[] = []

  constructor(config: GovernanceConfig) {
    this.config = config
    this.executionState = {
      executionId: this.generateId(),
      planId: "",
      status: "running",
      startTime: new Date(),
      completedSteps: new Set(),
      failedSteps: new Map(),
      inProgressTasks: new Map(),
      decisions: new Map(),
    }
  }

  /**
   * 初始化执行 - 设置初始状态
   */
  public async initializePlan(plan: Plan): Promise<void> {
    this.executionState.planId = plan.id
    this.timeline.push({
      timestamp: new Date(),
      eventType: "step_started",
      stepId: "initialization",
      details: { totalSteps: plan.steps.length, criticalPath: plan.criticalPath },
    })
  }

  /**
   * 执行主循环 - 按照依赖关系循环执行Step
   */
  public async executeWorkflow(plan: Plan): Promise<ExecutionReport> {
    await this.initializePlan(plan)

    const startTime = Date.now()

    while (this.executionState.completedSteps.size < plan.steps.length) {
      // 1. 找出所有可执行的Step
      const readySteps = this.findReadySteps(plan)

      if (readySteps.length === 0) {
        // 检查是否有失败的Step
        if (this.executionState.failedSteps.size > 0) {
          this.executionState.status = "failed"
          break
        }
        // 可能存在循环依赖
        throw new Error("No ready steps but workflow not complete - circular dependency?")
      }

      // 2. 为每个ready step分配tasks
      const tasks: Task[] = []
      for (const step of readySteps) {
        for (const ministry of step.uses) {
          const task = this.createTask(step, ministry)
          tasks.push(task)
          this.executionState.inProgressTasks.set(task.id, task)
        }
      }

      // 3. 并行执行所有tasks
      await this.executeTasksInParallel(tasks)

      // 4. 处理执行结果
      for (const task of tasks) {
        await this.processTaskResult(task, plan)
      }
    }

    const duration = Date.now() - startTime

    // 生成最终报告
    return this.generateReport(plan, duration)
  }

  /**
   * 找出所有依赖都已完成的Step
   */
  private findReadySteps(plan: Plan): Step[] {
    const ready: Step[] = []

    for (const step of plan.steps) {
      if (this.executionState.completedSteps.has(step.id)) {
        continue  // 已完成，跳过
      }

      if (this.executionState.failedSteps.has(step.id)) {
        continue  // 已失败，跳过
      }

      // 检查依赖是否都完成
      const allDependenciesComplete = step.dependencies.every((depId: string) =>
        this.executionState.completedSteps.has(depId)
      )

      if (allDependenciesComplete) {
        ready.push(step)
      }
    }

    return ready
  }

  /**
   * 创建一个Task
   */
  private createTask(step: Step, ministry: AgentRole): Task {
    return {
      id: this.generateId(),
      taskId: this.generateId(),
      createdAt: new Date(),
      createdBy: AgentRole.SHANGSHU,
      taskType: TaskType.EXECUTE,
      stepId: step.id,
      stepName: step.name,
      ministry,
      prompt: step.prompt || `Execute step: ${step.name}`,
      input: step.input,
      priority: "normal",
      dependencies: step.dependencies.map((depId: string) => ({
        type: "step",
        id: depId,
        requiredStatus: TaskStatus.COMPLETED,
      })),
      status: TaskStatus.PENDING,
      metadata: {
        attempt: 1,
      },
      retryCount: 0,
    }
  }

  /**
   * 并行执行多个Tasks
   */
  private async executeTasksInParallel(tasks: Task[]): Promise<void> {
    const promises = tasks.map(task => this.executeTask(task))
    await Promise.all(promises)
  }

  /**
   * 执行单个Task
   */
  private async executeTask(task: Task): Promise<void> {
    try {
      task.status = TaskStatus.IN_PROGRESS
      task.metadata.startTime = new Date()

      this.recordTimeline({
        timestamp: new Date(),
        eventType: "step_started",
        stepId: task.stepId,
        details: { ministry: task.ministry, taskId: task.id },
      })

      // 模拟任务执行 - 实际应该调用对应的Agent
      // 这里只是占位符，实际实现会调用具体的Agent
      await this.simulateMinistryExecution(task)

      task.status = TaskStatus.COMPLETED
      task.metadata.endTime = new Date()
      task.metadata.durationMs = task.metadata.endTime.getTime() - task.metadata.startTime.getTime()

      this.recordTimeline({
        timestamp: new Date(),
        eventType: "step_completed",
        stepId: task.stepId,
        details: { ministry: task.ministry, duration: task.metadata.durationMs },
      })
    } catch (error) {
      task.status = TaskStatus.FAILED
      task.error = {
        code: ErrorCode.RUNTIME_ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      }

      this.recordTimeline({
        timestamp: new Date(),
        eventType: "step_failed",
        stepId: task.stepId,
        details: { ministry: task.ministry, error: task.error },
      })
    }
  }

  /**
   * 模拟部门执行（实际应该调用真实的Agent）
   */
  private async simulateMinistryExecution(task: Task): Promise<void> {
    // 这里应该调用实际的Agent逻辑
    // 目前只是等待一段时间来模拟执行
    const delay = Math.random() * 1000 + 500
    return new Promise(resolve => setTimeout(resolve, delay))
  }

  /**
   * 处理Task执行结果
   */
  private async processTaskResult(task: Task, plan: Plan): Promise<void> {
    const step = plan.steps.find(s => s.id === task.stepId)
    if (!step) return

    // 从in-progress中移除
    this.executionState.inProgressTasks.delete(task.id)

    if (task.status === TaskStatus.COMPLETED) {
      // 检查该Step的所有Tasks是否都完成
      const stepTasks = Array.from(this.executionState.inProgressTasks.values()).filter(
        (t: Task) => t.stepId === task.stepId
      )

      if (stepTasks.length === 0) {
        // 所有该Step的Tasks都完成了
        // 这里应该调用门下省进行验证
        const decision = await this.verifyStepWithMenxia(step, task)

        if (decision === Decision.PASS) {
          this.executionState.completedSteps.add(step.id)
        } else if (decision === Decision.RETRY) {
          task.retryCount++
          if (task.retryCount <= this.config.maxRetries) {
            task.status = TaskStatus.PENDING
            this.executionState.inProgressTasks.set(task.id, task)
          } else {
            this.executionState.failedSteps.set(step.id, task.retryCount)
          }
        } else if (decision === Decision.SKIP) {
          this.executionState.completedSteps.add(step.id)
        } else if (decision === Decision.ESCALATE) {
          this.executionState.failedSteps.set(step.id, task.retryCount)
        }
      }
    } else if (task.status === TaskStatus.FAILED) {
      task.retryCount++

      if (task.retryCount <= this.config.maxRetries) {
        // 允许重试
        task.status = TaskStatus.PENDING
        this.executionState.inProgressTasks.set(task.id, task)
      } else {
        // 超过重试次数，标记为失败
        this.executionState.failedSteps.set(step.id, task.retryCount)
      }
    }
  }

  /**
   * 调用门下省进行验证（模拟）
   */
  private async verifyStepWithMenxia(step: Step, task: Task): Promise<Decision> {
    // 这里应该调用实际的门下省验证逻辑
    // 目前只是模拟返回PASS
    if (task.status === TaskStatus.COMPLETED) {
      return Decision.PASS
    } else if (task.retryCount < this.config.maxRetries) {
      return Decision.RETRY
    } else {
      return Decision.ESCALATE
    }
  }

  /**
   * 记录时间线事件
   */
  private recordTimeline(event: ExecutionTimeline): void {
    this.timeline.push(event)
  }

  /**
   * 生成执行报告
   */
  private generateReport(plan: Plan, duration: number): ExecutionReport {
    const stepResults = new Map<string, StepResult>()

    for (const step of plan.steps) {
      const isCompleted = this.executionState.completedSteps.has(step.id)
      const failureCount = this.executionState.failedSteps.get(step.id) || 0

      stepResults.set(step.id, {
        stepId: step.id,
        name: step.name,
        status: isCompleted ? "completed" : failureCount > 0 ? "failed" : "pending",
        attempts: failureCount + 1,
        outputs: {},
        duration: 0,
      })
    }

    const completedSteps = this.executionState.completedSteps.size
    const failedSteps = this.executionState.failedSteps.size
    const totalAttempts = Array.from(this.executionState.failedSteps.values()).reduce((a: number, b: number) => a + b, 0) + completedSteps
    const successRate = completedSteps / plan.steps.length

    return {
      executionId: this.executionState.executionId,
      planId: this.executionState.planId,
      duration,
      totalSteps: plan.steps.length,
      completedSteps,
      failedSteps,
      inProgressSteps: 0,
      pendingSteps: plan.steps.length - completedSteps - failedSteps,
      statistics: {
        totalAttempts,
        successRate,
        averageStepDuration: duration / plan.steps.length,
      },
      stepResults,
      timeline: this.timeline,
    }
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取当前执行状态
   */
  public getExecutionState(): ExecutionState {
    return this.executionState
  }

  /**
   * 获取执行报告
   */
  public getReport(plan: Plan): ExecutionReport {
    const duration = Date.now() - this.executionState.startTime.getTime()
    return this.generateReport(plan, duration)
  }
}

/**
 * 依赖解析器 - 分析Step之间的依赖关系
 */
export class DependencyResolver {
  /**
   * 检查是否存在循环依赖
   */
  public static hasCyclicDependency(plan: Plan): boolean {
    const visited = new Set<string>()
    const recStack = new Set<string>()

    const hasCycle = (stepId: string): boolean => {
      visited.add(stepId)
      recStack.add(stepId)

      const step = plan.steps.find((s: Step) => s.id === stepId)
      if (!step) return false

      for (const depId of step.dependencies) {
        if (!visited.has(depId)) {
          if (this.hasCyclicDependencyHelper(depId, visited, recStack, plan)) {
            return true
          }
        } else if (recStack.has(depId)) {
          return true
        }
      }

      recStack.delete(stepId)
      return false
    }

    for (const step of plan.steps) {
      if (!visited.has(step.id)) {
        if (hasCycle(step.id)) {
          return true
        }
      }
    }

    return false
  }

  private static hasCyclicDependencyHelper(
    stepId: string,
    visited: Set<string>,
    recStack: Set<string>,
    plan: Plan
  ): boolean {
    visited.add(stepId)
    recStack.add(stepId)

    const step = plan.steps.find((s: Step) => s.id === stepId)
    if (!step) return false

    for (const depId of step.dependencies) {
      if (!visited.has(depId)) {
        if (this.hasCyclicDependencyHelper(depId, visited, recStack, plan)) {
          return true
        }
      } else if (recStack.has(depId)) {
        return true
      }
    }

    recStack.delete(stepId)
    return false
  }

  /**
   * 获取Step的所有依赖（包括传递依赖）
   */
  public static getAllDependencies(stepId: string, plan: Plan): Set<string> {
    const dependencies = new Set<string>()
    const visited = new Set<string>()

    const collectDeps = (id: string) => {
      if (visited.has(id)) return
      visited.add(id)

      const step = plan.steps.find((s: Step) => s.id === id)
      if (!step) return

      for (const depId of step.dependencies) {
        dependencies.add(depId)
        collectDeps(depId)
      }
    }

    collectDeps(stepId)
    return dependencies
  }

  /**
   * 获取关键路径（最长的依赖链）
   */
  public static getCriticalPath(plan: Plan): string[] {
    const paths = new Map<string, string[]>()

    // 拓扑排序
    const topoOrder = this.topologicalSort(plan)

    for (const stepId of topoOrder) {
      const step = plan.steps.find((s: Step) => s.id === stepId)
      if (!step) continue

      if (step.dependencies.length === 0) {
        paths.set(stepId, [stepId])
      } else {
        let longestPath: string[] = []
        for (const depId of step.dependencies) {
          const depPath = paths.get(depId) || []
          if (depPath.length > longestPath.length) {
            longestPath = depPath
          }
        }
        paths.set(stepId, [...longestPath, stepId])
      }
    }

    // 找最长的路径
    let criticalPath: string[] = []
    for (const path of paths.values()) {
      if (path.length > criticalPath.length) {
        criticalPath = path
      }
    }

    return criticalPath
  }

  /**
   * 拓扑排序
   */
  private static topologicalSort(plan: Plan): string[] {
    const visited = new Set<string>()
    const result: string[] = []

    const visit = (stepId: string) => {
      if (visited.has(stepId)) return
      visited.add(stepId)

      const step = plan.steps.find((s: Step) => s.id === stepId)
      if (!step) return

      for (const depId of step.dependencies) {
        visit(depId)
      }

      result.push(stepId)
    }

    for (const step of plan.steps) {
      visit(step.id)
    }

    return result
  }
}
