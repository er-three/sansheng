/**
 * 可观测性层类型定义
 */

export interface AgentHeartbeat {
  agentName: string
  lastActivity: number
  status: 'healthy' | 'idle' | 'timeout' | 'dead'
  activeTaskCount: number
  totalTasksCompleted: number
  failureCount: number
}

export interface WorkflowMetrics {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  successRate: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  agentThroughput: Map<string, number>
  p95Duration: number
  p99Duration: number
}

export interface AuditRecord {
  id: string
  timestamp: string
  sessionId: string
  agentName: string
  operation: string
  taskId: string
  filesAffected: string[]
  linesChanged: number
  riskLevel: 'low' | 'medium' | 'high'
  menxiaReviewed: boolean
  testsPassed: boolean
  gatewayChecks: string[]
  result: 'allowed' | 'blocked'
  blockReason?: string
}

export interface LogEntry {
  timestamp: number
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE'
  module: string
  message: string
  data?: Record<string, any>
  sessionId?: string
}
