/**
 * Core 模块导出接口
 *
 * 统一的导出入口，为其他模块提供公共接口。
 */

export {
  WorkflowManager,
  getWorkflowManager,
  setWorkflowManager
} from './workflow-manager.js'

export type {
  WorkflowDefinition,
  WorkflowRecipe,
  RecipeStep,
  WorkflowStatus,
  WorkflowResult,
  TaskResult,
  WorkflowCheckpoint,
  TaskState,
  WorkflowManagerConfig,
  IWorkflowManager,
  IExecutionEngine,
  IObservabilityLayer,
  IResiliencyLayer,
  ICommunicationLayer,
  ISessionManager
} from './core-types.js'
