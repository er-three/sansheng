/**
 * WorkflowManager - 核心工作流管理器
 *
 * 职责：
 *   1. 初始化四个功能层（执行、可观测、弹性、通信）
 *   2. 协调各层之间的交互
 *   3. 提供统一的工作流提交接口
 *   4. 管理工作流生命周期
 *   5. 提供工作流状态查询
 *
 * 集成点：
 *   - OpenCode plugin.ts → WorkflowManager
 *   - WorkflowManager → 四个功能层 + SessionManager
 *
 * 使用示例：
 *   const manager = new WorkflowManager(config)
 *   await manager.initialize()
 *   const workflowId = await manager.submitWorkflow(definition)
 *   const status = manager.getWorkflowStatus(workflowId)
 */

import { log } from '../utils.js'
import {
  WorkflowDefinition,
  WorkflowResult,
  WorkflowStatus,
  IWorkflowManager,
  IExecutionEngine,
  IObservabilityLayer,
  IResiliencyLayer,
  ICommunicationLayer,
  ISessionManager,
  WorkflowManagerConfig
} from './core-types.js'

export class WorkflowManager implements IWorkflowManager {
  private config: WorkflowManagerConfig
  private executionEngine: IExecutionEngine | null = null
  private observability: IObservabilityLayer | null = null
  private resiliency: IResiliencyLayer | null = null
  private communication: ICommunicationLayer | null = null
  private sessionManager: ISessionManager | null = null

  private workflows: Map<string, { definition: WorkflowDefinition; status: WorkflowStatus; result?: WorkflowResult }> = new Map()
  private initialized = false

  constructor(config?: WorkflowManagerConfig) {
    this.config = {
      execution: {
        timeout: 30000,
        maxParallel: 5,
        retryPolicy: {
          maxRetries: 3,
          initialDelayMs: 100,
          maxDelayMs: 30000,
          backoffMultiplier: 2
        },
        ...config?.execution
      },
      session: {
        ttl: 3600000, // 1 hour
        persistenceEnabled: true,
        ...config?.session
      },
      audit: {
        enabled: true,
        path: '.opencode/audit',
        ...config?.audit
      },
      cache: {
        enabled: true,
        ttl: 3600000,
        maxSize: 1000,
        ...config?.cache
      },
      logging: {
        level: 'INFO',
        enableConsole: true,
        enableFile: true,
        ...config?.logging
      },
      debug: config?.debug || false,
      rootPath: config?.rootPath || process.cwd()
    }

    log('WorkflowManager', `Constructor initialized with debug=${this.config.debug}`, 'debug')
  }

  /**
   * 初始化 WorkflowManager 和所有功能层
   *
   * 初始化顺序：
   *   1. 会话管理器
   *   2. 执行引擎
   *   3. 可观测性层
   *   4. 弹性层
   *   5. 通信层
   */
  async initialize(config?: WorkflowManagerConfig): Promise<void> {
    if (this.initialized) {
      log('WorkflowManager', 'Already initialized, skipping')
      return
    }

    if (config) {
      this.config = { ...this.config, ...config }
    }

    log('WorkflowManager', 'Initializing all subsystems', 'info')

    try {
      // 初始化会话管理器（基础）
      this.sessionManager = await this.initializeSessionManager()

      // 初始化各个功能层
      this.executionEngine = await this.initializeExecutionEngine()
      this.observability = await this.initializeObservability()
      this.resiliency = await this.initializeResiliency()
      this.communication = await this.initializeCommunication()

      this.initialized = true
      log('WorkflowManager', '✅ Initialization complete', 'info')
    } catch (error) {
      log('WorkflowManager', `❌ Initialization failed: ${String(error)}`, 'error')
      throw error
    }
  }

  /**
   * 提交工作流执行
   *
   * 流程：
   *   1. 创建会话
   *   2. 验证工作流定义
   *   3. 执行工作流（通过 ExecutionEngine）
   *   4. 记录结果
   *   5. 返回工作流 ID
   */
  async submitWorkflow(definition: WorkflowDefinition): Promise<string> {
    if (!this.initialized) {
      throw new Error('WorkflowManager not initialized')
    }

    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    log('WorkflowManager', `Workflow submitted: ${workflowId} (${definition.domain})`, 'info')

    try {
      // 1. 创建会话
      if (this.sessionManager) {
        this.sessionManager.createSession(definition.sessionId)
      }

      // 2. 记录工作流
      this.workflows.set(workflowId, {
        definition,
        status: 'pending'
      })

      // 3. 异步执行工作流
      this.executeWorkflowAsync(workflowId, definition)

      return workflowId
    } catch (error) {
      log('WorkflowManager', `Error submitting workflow: ${String(error)}`, 'error')
      throw error
    }
  }

  /**
   * 异步执行工作流（不阻塞调用者）
   */
  private async executeWorkflowAsync(workflowId: string, definition: WorkflowDefinition): Promise<void> {
    const entry = this.workflows.get(workflowId)
    if (!entry) return

    entry.status = 'running'

    try {
      if (!this.executionEngine) {
        throw new Error('ExecutionEngine not initialized')
      }

      // 执行工作流
      const result = await this.executionEngine.executeWorkflow(definition)

      // 保存结果
      entry.status = result.success ? 'completed' : 'failed'
      entry.result = result

      log('WorkflowManager', `Workflow execution complete: ${entry.status}`, 'info')
    } catch (error) {
      entry.status = 'failed'
      entry.result = {
        success: false,
        status: 'failed',
        output: {},
        errors: [String(error)],
        warnings: [],
        duration: 0,
        taskResults: []
      }

      log('WorkflowManager', `Workflow execution failed: ${workflowId} - ${String(error)}`, 'error')
    }
  }

  /**
   * 获取工作流状态
   */
  getWorkflowStatus(workflowId: string): WorkflowStatus | null {
    const entry = this.workflows.get(workflowId)
    return entry?.status || null
  }

  /**
   * 获取工作流执行结果
   */
  getWorkflowResult(workflowId: string): WorkflowResult | null {
    const entry = this.workflows.get(workflowId)
    return entry?.result || null
  }

  /**
   * 暂停工作流
   */
  async pauseWorkflow(workflowId: string): Promise<boolean> {
    const entry = this.workflows.get(workflowId)
    if (!entry) return false

    if (entry.status === 'running') {
      entry.status = 'paused'
      log('WorkflowManager', `Workflow paused: ${workflowId}`, 'info')
      return true
    }

    return false
  }

  /**
   * 恢复工作流
   */
  async resumeWorkflow(workflowId: string): Promise<boolean> {
    const entry = this.workflows.get(workflowId)
    if (!entry || entry.status !== 'paused') return false

    entry.status = 'running'
    log('WorkflowManager', `Workflow resumed: ${workflowId}`, 'info')

    // 继续执行
    this.executeWorkflowAsync(workflowId, entry.definition)
    return true
  }

  /**
   * 清理资源和关闭
   */
  async dispose(): Promise<void> {
    log('WorkflowManager', 'Disposing WorkflowManager')

    // 清空工作流缓存
    this.workflows.clear()

    // 清理各层资源（如果需要）
    // await this.executionEngine?.dispose?.()
    // await this.observability?.dispose?.()
    // ...

    this.initialized = false
  }

  // ========== 私有初始化方法 ==========

  private async initializeSessionManager(): Promise<ISessionManager> {
    log('WorkflowManager', 'Initializing SessionManager')
    // 返回一个简单的会话管理器实现
    // 真实实现会在 src/session/session-manager.ts 中
    return {
      createSession: (sessionId: string) => {
        log('SessionManager', `Session created: ${sessionId}`)
      },
      getSessionMetadata: (sessionId: string) => ({ sessionId, status: 'active' }),
      pauseSession: (sessionId: string) => true,
      resumeSession: (sessionId: string) => true,
      completeSession: (sessionId: string) => true,
      setVariable: (sessionId: string, key: string, value: any) => {},
      getVariable: (sessionId: string, key: string) => null
    }
  }

  private async initializeExecutionEngine(): Promise<IExecutionEngine> {
    log('WorkflowManager', 'Initializing ExecutionEngine')

    // 导入执行引擎的实现
    const { executeWorkflow, validateRecipe } = await import('../layers/execution/index.js')

    return {
      executeWorkflow: async (definition) => {
        // 使用实际的执行引擎
        return executeWorkflow(definition, {
          onTaskStart: (taskId: string) => {
            this.observability?.recordTaskStart(taskId)
          },
          onTaskComplete: (taskId: string, result: any) => {
            this.observability?.recordTaskCompletion(taskId, result)
          },
          onTaskFail: (taskId: string, error: Error) => {
            this.observability?.recordTaskFailure(taskId, error)
            // ResiliencyLayer error handling
          }
        })
      },
      resolveRecipe: (recipe) => {
        // 解析 Recipe（已在执行中处理）
      },
      validateDependencies: (sessionId) => {
        // 验证依赖（已在执行中处理）
        return true
      }
    }
  }

  private async initializeObservability(): Promise<IObservabilityLayer> {
    log('WorkflowManager', 'Initializing ObservabilityLayer')
    return {
      recordTaskStart: (taskId: string) => {},
      recordTaskCompletion: (taskId: string, result: any) => {},
      recordTaskFailure: (taskId: string, error: Error) => {},
      generateAuditReport: (sessionId: string) => '',
      getMetrics: (sessionId: string) => ({})
    }
  }

  private async initializeResiliency(): Promise<IResiliencyLayer> {
    log('WorkflowManager', 'Initializing ResiliencyLayer')
    return {
      getRecoveryStrategy: (error: Error) => 'retry',
      executeRecoveryStrategy: async (strategy: string, context: any) => true,
      createCheckpoint: (sessionId: string, label: string) => 'checkpoint-1',
      rollbackToCheckpoint: async (sessionId: string, checkpointId: string) => true
    }
  }

  private async initializeCommunication(): Promise<ICommunicationLayer> {
    log('WorkflowManager', 'Initializing CommunicationLayer')
    return {
      notifyAgent: async (agentName: string, task: any) => ({}),
      emit: (eventType: string, event: any) => {},
      on: (eventType: string, handler: (event: any) => void) => {}
    }
  }
}

// 创建全局实例
export let globalManager: WorkflowManager | null = null

export function getWorkflowManager(): WorkflowManager {
  if (!globalManager) {
    globalManager = new WorkflowManager()
  }
  return globalManager
}

export function setWorkflowManager(manager: WorkflowManager): void {
  globalManager = manager
}
