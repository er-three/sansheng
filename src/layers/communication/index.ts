/**
 * 通信层导出接口
 */

import { log } from '../../utils.js'

export type {
  AgentRegistration,
  TaskNotification,
  TaskSLA,
  WorkflowEvent,
  WorkflowEventType,
  Message,
  Notification
} from './communication-types.js'

// 事件订阅者存储
const eventSubscribers = new Map<string, Set<(event: any) => void>>()
const eventHistory: any[] = []

/**
 * 订阅事件
 */
export function on(
  eventType: string,
  handler: (event: any) => void
): () => void {
  if (!eventSubscribers.has(eventType)) {
    eventSubscribers.set(eventType, new Set())
  }

  eventSubscribers.get(eventType)!.add(handler)

  // 返回取消订阅函数
  return () => {
    eventSubscribers.get(eventType)?.delete(handler)
  }
}

/**
 * 发射事件
 */
export function emit(eventType: string, event: any): void {
  log('Communication', `Event emitted: ${eventType}`, 'debug')

  // 存储事件历史
  eventHistory.push({ ...event, type: eventType })
  if (eventHistory.length > 10000) {
    eventHistory.shift() // 保持内存占用
  }

  // 调用所有订阅者
  const handlers = eventSubscribers.get(eventType)
  if (handlers) {
    for (const handler of handlers) {
      try {
        handler(event)
      } catch (error) {
        log('Communication', `Error in event handler: ${String(error)}`, 'error')
      }
    }
  }
}

/**
 * 获取事件历史
 */
export function getEventHistory(sessionId: string): any[] {
  return eventHistory.filter(e => e.sessionId === sessionId)
}

/**
 * 清理事件历史
 */
export function clearEventHistory(sessionId: string): void {
  const indices: number[] = []
  for (let i = eventHistory.length - 1; i >= 0; i--) {
    if (eventHistory[i].sessionId === sessionId) {
      indices.push(i)
    }
  }

  for (const i of indices) {
    eventHistory.splice(i, 1)
  }
}

/**
 * 向 Agent 发送任务通知
 */
export async function notifyAgentOfTask(
  agentName: string,
  task: any
): Promise<any> {
  log('Communication', `Notifying agent ${agentName} of task`, 'info')

  // TODO: 实现真实的 Agent 通知逻辑
  return { success: true, notificationId: `notif-${Date.now()}` }
}

/**
 * 获取 Agent 的待处理通知
 */
export function getAgentNotifications(agentName: string): any[] {
  // TODO: 实现实际的通知查询
  return []
}

/**
 * 发送通知
 */
export async function sendNotification(
  notification: any,
  channels: string[] = ['event']
): Promise<any> {
  log('Communication', `Sending notification to ${notification.recipient}`, 'info')

  if (channels.includes('event')) {
    emit('notification', notification)
  }

  return { success: true, notificationId: notification.id }
}

/**
 * 获取未发送的通知
 */
export function getPendingNotifications(): any[] {
  return []
}

/**
 * 重试失败的通知
 */
export async function retryFailedNotifications(): Promise<number> {
  return 0
}
