/**
 * 错误恢复策略系统 - Phase 4
 */

import { log } from "../utils.js"

export type RecoveryStrategy = "retry" | "skip" | "rollback" | "alert" | "abort"

export interface ErrorHandler {
  errorPattern: RegExp
  strategy: RecoveryStrategy
  maxAttempts: number
  description: string
}

export interface ErrorRecoveryPolicy {
  handlers: ErrorHandler[]
  defaultStrategy: RecoveryStrategy
}

const policies = new Map<string, ErrorRecoveryPolicy>()

export function registerErrorHandler(
  sessionId: string,
  errorPattern: RegExp,
  strategy: RecoveryStrategy,
  maxAttempts: number = 3,
  description: string = ""
): void {
  if (!policies.has(sessionId)) {
    policies.set(sessionId, {
      handlers: [],
      defaultStrategy: "retry"
    })
  }

  const policy = policies.get(sessionId)!
  policy.handlers.push({
    errorPattern,
    strategy,
    maxAttempts,
    description
  })

  log("ErrorRecovery", `Handler registered: ${description || errorPattern.source}`)
}

export function getErrorHandler(sessionId: string, error: string): ErrorHandler | null {
  const policy = policies.get(sessionId)
  if (!policy) return null

  return policy.handlers.find(h => h.errorPattern.test(error)) || null
}

export function getRecoveryStrategy(sessionId: string, error: string): RecoveryStrategy {
  const handler = getErrorHandler(sessionId, error)
  if (handler) return handler.strategy

  const policy = policies.get(sessionId)
  return policy?.defaultStrategy || "retry"
}

export function setDefaultStrategy(sessionId: string, strategy: RecoveryStrategy): void {
  if (!policies.has(sessionId)) {
    policies.set(sessionId, { handlers: [], defaultStrategy: strategy })
  } else {
    policies.get(sessionId)!.defaultStrategy = strategy
  }
}

export function generateRecoveryReport(sessionId: string): string {
  const policy = policies.get(sessionId)
  if (!policy) return "No error recovery policy configured"

  const lines = [
    "═══════════════════════════════════════════",
    "Error Recovery Policy",
    "═══════════════════════════════════════════",
    "",
    `Default Strategy: ${policy.defaultStrategy}`,
    `Registered Handlers: ${policy.handlers.length}`,
    ""
  ]

  policy.handlers.forEach(h => {
    lines.push(`• ${h.description || h.errorPattern.source}`)
    lines.push(`  Pattern: ${h.errorPattern.source}`)
    lines.push(`  Strategy: ${h.strategy}`)
    lines.push(`  Max Attempts: ${h.maxAttempts}`)
  })

  return lines.join("\n")
}

export function clearPolicies(sessionId: string): void {
  policies.delete(sessionId)
}
