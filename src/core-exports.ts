/**
 * 新架构核心导出
 *
 * 这个文件导出所有新架构的主要接口和类。
 * 用于与 OpenCode plugin 集成。
 */

// ============== Core 系统 ==============
export {
  WorkflowManager,
  getWorkflowManager,
  setWorkflowManager,
  type WorkflowDefinition,
  type WorkflowRecipe,
  type RecipeStep,
  type WorkflowStatus,
  type WorkflowResult,
  type TaskResult,
  type WorkflowCheckpoint,
  type TaskState,
  type WorkflowManagerConfig,
  type IWorkflowManager,
  type IExecutionEngine,
  type IObservabilityLayer,
  type IResiliencyLayer,
  type ICommunicationLayer,
  type ISessionManager
} from './core/index.js'

// ============== 执行引擎层 ==============
export {
  resolveRecipe,
  validateRecipe,
  getRecipeStepIds,
  canExecuteParallel,
  getRecipeTimeout,
  executeWorkflow,
  validateExecutionContext,
  executeTask,
  computeTopologicalOrder,
  areDependenciesMet,
  type Task,
  type TaskExecutionResult,
  type TaskQueue,
  type DependencyValidationResult
} from './layers/execution/index.js'

// ============== 会话管理层 ==============
export {
  createSession,
  getSessionMetadata,
  pauseSession,
  resumeSession,
  completeSession,
  failSession,
  checkSessionExpiration,
  getAllActiveSessions,
  deleteSession,
  setSessionVariable,
  getSessionVariable,
  getSessionVariables,
  generateSessionReport,
  clearSessions,
  type SessionStatus,
  type SessionMetadata
} from './session/index.js'

// ============== 通信层 ==============
export {
  on,
  emit,
  getEventHistory as getEventHistory,
  clearEventHistory,
  notifyAgentOfTask,
  getAgentNotifications,
  sendNotification,
  getPendingNotifications,
  retryFailedNotifications,
  type WorkflowEvent,
  type WorkflowEventType
} from './layers/communication/index.js'

// ============== 版本信息 ==============
export const VERSION = '4.0.0-refactor'
export const PHASE = 'Phase 4 - Architecture Refactor'

/**
 * 初始化新架构系统
 */
export async function initializeNewArchitecture(config?: any) {
  const { getWorkflowManager } = await import('./core/index.js')
  const manager = getWorkflowManager()
  await manager.initialize(config)
  return manager
}
