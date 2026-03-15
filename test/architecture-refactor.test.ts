/**
 * 架构重构验证测试
 *
 * 验证新的四层架构是否正确实现和集成。
 */

import {
  WorkflowManager,
  getWorkflowManager,
  type WorkflowDefinition,
  resolveRecipe,
  validateRecipe,
  executeWorkflow,
  createSession,
  getSessionMetadata,
  completeSession,
  on,
  emit,
  getEventHistory,
  clearEventHistory
} from '../src/core-exports.js'

describe('Architecture Refactor - New System', () => {
  describe('Core WorkflowManager', () => {
    it('should create WorkflowManager instance', () => {
      const manager = new WorkflowManager()
      expect(manager).toBeDefined()
    })

    it('should get global manager instance', () => {
      const manager = getWorkflowManager()
      expect(manager).toBeDefined()
    })

    it('should initialize WorkflowManager', async () => {
      const manager = new WorkflowManager({
        debug: true,
        logging: { level: 'DEBUG' }
      })
      await manager.initialize()
      expect(manager).toBeDefined()
    })
  })

  describe('ExecutionEngine Layer', () => {
    it('should validate Recipe', () => {
      const recipe = {
        name: 'test-recipe',
        version: '1.0',
        steps: [
          {
            id: 'step-1',
            name: 'First Step',
            agent: 'huangdi'
          }
        ]
      }

      const result = validateRecipe(recipe)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should detect invalid Recipe', () => {
      const recipe = {
        name: 'test-recipe',
        // missing version
        steps: []  // empty steps
      }

      const result = validateRecipe(recipe)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should resolve Recipe to tasks', () => {
      const recipe = {
        name: 'test-recipe',
        version: '1.0',
        steps: [
          {
            id: 'task-1',
            name: 'First Task',
            agent: 'zhongshu',
            dependencies: []
          },
          {
            id: 'task-2',
            name: 'Second Task',
            agent: 'shangshu',
            dependencies: ['task-1']
          }
        ]
      }

      const tasks = resolveRecipe(recipe, {})
      expect(tasks).toHaveLength(2)
      expect(tasks[0].id).toBe('task-1')
      expect(tasks[1].id).toBe('task-2')
      expect(tasks[1].dependencies).toContain('task-1')
    })

    it('should execute workflow', async () => {
      const definition: WorkflowDefinition = {
        sessionId: 'test-session-1',
        intent: 'test workflow',
        domain: 'asset-management'
      }

      const result = await executeWorkflow(definition)
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.status).toBe('completed')
    })
  })

  describe('SessionManager', () => {
    it('should create session', () => {
      const sessionId = 'session-' + Date.now()
      const metadata = createSession(sessionId)

      expect(metadata).toBeDefined()
      expect(metadata.sessionId).toBe(sessionId)
      expect(metadata.status).toBe('active')
    })

    it('should get session metadata', () => {
      const sessionId = 'session-' + Date.now()
      createSession(sessionId)

      const metadata = getSessionMetadata(sessionId)
      expect(metadata).not.toBeNull()
      expect(metadata?.sessionId).toBe(sessionId)
    })

    it('should complete session', () => {
      const sessionId = 'session-' + Date.now()
      createSession(sessionId)

      const result = completeSession(sessionId)
      expect(result).toBe(true)

      const metadata = getSessionMetadata(sessionId)
      expect(metadata?.status).toBe('completed')
      expect(metadata?.completedAt).toBeDefined()
    })
  })

  describe('CommunicationLayer - Events', () => {
    it('should emit and receive events', () => {
      const eventData = {
        id: 'event-1',
        type: 'task-completed',
        sessionId: 'session-test',
        timestamp: Date.now(),
        data: { taskId: 'task-1' }
      }

      let received = false

      const unsubscribe = on('task-completed', (event) => {
        expect(event.data.taskId).toBe('task-1')
        received = true
      })

      emit('task-completed', eventData)

      expect(received).toBe(true)
      unsubscribe()
    })

    it('should retrieve event history', () => {
      const sessionId = 'session-event-test-' + Date.now()

      emit('workflow-started', {
        id: 'event-1',
        type: 'workflow-started',
        sessionId,
        timestamp: Date.now(),
        data: {}
      })

      emit('task-completed', {
        id: 'event-2',
        type: 'task-completed',
        sessionId,
        timestamp: Date.now(),
        taskId: 'task-1',
        data: {}
      })

      const history = getEventHistory(sessionId)
      expect(history).toHaveLength(2)
      expect(history[0].type).toBe('workflow-started')
      expect(history[1].type).toBe('task-completed')
    })
  })

  describe('Integration - Full Workflow', () => {
    it('should execute complete workflow', async () => {
      const manager = new WorkflowManager({
        debug: false,
        logging: { level: 'INFO' }
      })

      // 初始化系统
      await manager.initialize()

      // 创建工作流定义
      const definition: WorkflowDefinition = {
        sessionId: 'integration-test-' + Date.now(),
        intent: 'Test complete workflow',
        domain: 'asset-management',
        variables: {
          module_name: 'test-module',
          asset_type: 'service'
        }
      }

      // 提交工作流
      const workflowId = await manager.submitWorkflow(definition)
      expect(workflowId).toBeDefined()

      // 检查工作流状态
      const status = manager.getWorkflowStatus(workflowId)
      expect(status).toBeDefined()

      // 清理
      await manager.dispose()
    })
  })
})
