/**
 * 通信层类型定义
 */

export interface AgentRegistration {
  agentName: string
  isOnline: boolean
  lastSeen: number
  capabilities: string[]
}

export interface TaskNotification {
  id: string
  agentName: string
  task: any
  sentAt: number
  receivedAt?: number
  processedAt?: number
  status: 'pending' | 'sent' | 'received' | 'processed' | 'failed'
  retryCount: number
  error?: string
}

export interface TaskSLA {
  agentName: string
  maxResponseTimeMs: number
  maxProcessingTimeMs: number
}

export interface WorkflowEvent {
  id: string
  type: string
  sessionId: string
  timestamp: number
  taskId?: string
  agentName?: string
  data: Record<string, any>
  error?: string
}

export type WorkflowEventType =
  | 'workflow-started'
  | 'workflow-completed'
  | 'workflow-failed'
  | 'task-assigned'
  | 'task-started'
  | 'task-completed'
  | 'task-failed'
  | 'task-retried'
  | 'checkpoint-created'
  | 'rollback-triggered'
  | 'agent-timeout'

export interface Message {
  id: string
  type: string
  sessionId: string
  content: Record<string, any>
  priority: number
  retryCount: number
  maxRetries: number
  createdAt: number
  processedAt?: number
  error?: string
}

export interface Notification {
  id: string
  type: 'task-assignment' | 'task-completion' | 'error-alert' | 'status-update'
  recipient: string
  title: string
  message: string
  data?: Record<string, any>
  channels?: string[]
  retryCount?: number
  maxRetries?: number
}
