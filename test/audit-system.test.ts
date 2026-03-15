/**
 * 审计系统测试 - Phase 3
 */

import * as path from "path"
import * as fs from "fs"
// Jest test suite
import {
  appendAuditRecord,
  getAuditHistory,
  generateAuditReport,
  clearAuditHistory,
  AuditRecord
} from "../src/workflows/audit-system.js"

describe("AuditSystem", () => {
  let testDir: string
  let sessionId: string

  beforeEach(() => {
    // 创建临时测试目录
    testDir = path.join(process.cwd(), ".test-audit-temp")
    sessionId = "test-session-123"

    // 确保目录结构存在
    const opencodePath = path.join(testDir, ".opencode")
    if (!fs.existsSync(opencodePath)) {
      fs.mkdirSync(opencodePath, { recursive: true })
    }
  })

  afterEach(() => {
    // 清理临时目录
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  it("should append a single audit record", () => {
    const record = appendAuditRecord(testDir, sessionId, {
      sessionId,
      agentName: "hubuAgent",
      operation: "Edit",
      taskId: "task-1",
      filesAffected: ["src/test.ts"],
      linesChanged: 10,
      riskLevel: "low",
      menxiaReviewed: false,
      testsPassed: true,
      gatewayChecks: ["workflow", "risk"],
      result: "allowed"
    })

    expect(record).toBeDefined()
    expect(record.id).toBeDefined()
    expect(record.timestamp).toBeDefined()
    expect(record.agentName).toBe("hubuAgent")
    expect(record.result).toBe("allowed")
  })

  it("should retrieve audit history", () => {
    // Append multiple records
    appendAuditRecord(testDir, sessionId, {
      sessionId,
      agentName: "hubuAgent",
      operation: "Edit",
      taskId: "task-1",
      filesAffected: ["src/test.ts"],
      linesChanged: 10,
      riskLevel: "low",
      menxiaReviewed: false,
      testsPassed: true,
      gatewayChecks: ["workflow"],
      result: "allowed"
    })

    appendAuditRecord(testDir, sessionId, {
      sessionId,
      agentName: "gongbuAgent",
      operation: "Write",
      taskId: "task-2",
      filesAffected: ["src/new-file.ts"],
      linesChanged: 50,
      riskLevel: "high",
      menxiaReviewed: true,
      testsPassed: true,
      gatewayChecks: ["workflow", "risk", "menxia"],
      result: "allowed"
    })

    const history = getAuditHistory(testDir, sessionId)
    expect(history.length).toBe(2)
    expect(history[0].agentName).toBe("hubuAgent")
    expect(history[1].agentName).toBe("gongbuAgent")
  })

  it("should record blocked modifications", () => {
    appendAuditRecord(testDir, sessionId, {
      sessionId,
      agentName: "libuAgent",
      operation: "Edit",
      taskId: "task-fail",
      filesAffected: ["src/config.ts"],
      linesChanged: 100,
      riskLevel: "high",
      menxiaReviewed: false,
      testsPassed: false,
      gatewayChecks: [],
      result: "blocked",
      blockReason: "Menxia review required but not completed"
    })

    const history = getAuditHistory(testDir, sessionId)
    expect(history.length).toBe(1)
    expect(history[0].result).toBe("blocked")
    expect(history[0].blockReason).toBe("Menxia review required but not completed")
  })

  it("should generate audit report", () => {
    appendAuditRecord(testDir, sessionId, {
      sessionId,
      agentName: "agent1",
      operation: "Edit",
      taskId: "task-1",
      filesAffected: ["file1.ts"],
      linesChanged: 20,
      riskLevel: "medium",
      menxiaReviewed: true,
      testsPassed: true,
      gatewayChecks: ["workflow", "risk", "menxia"],
      result: "allowed"
    })

    appendAuditRecord(testDir, sessionId, {
      sessionId,
      agentName: "agent2",
      operation: "Write",
      taskId: "task-2",
      filesAffected: ["file2.ts", "file3.ts"],
      linesChanged: 75,
      riskLevel: "high",
      menxiaReviewed: false,
      testsPassed: false,
      gatewayChecks: [],
      result: "blocked",
      blockReason: "High risk modification"
    })

    const report = generateAuditReport(testDir, sessionId)

    expect(report).toContain("Audit Report for Session test-session-123")
    expect(report).toContain("Total Records")
    expect(report).toContain("2")
    expect(report).toContain("Allowed")
    expect(report).toContain("Blocked")
    expect(report).toContain("High Risk")
    expect(report).toContain("agent1")
    expect(report).toContain("agent2")
  })

  it("should return empty report when no records exist", () => {
    const report = generateAuditReport(testDir, sessionId)
    expect(report).toContain("No audit records found")
  })

  it("should clear audit history", () => {
    appendAuditRecord(testDir, sessionId, {
      sessionId,
      agentName: "agent1",
      operation: "Edit",
      taskId: "task-1",
      filesAffected: ["file1.ts"],
      linesChanged: 10,
      riskLevel: "low",
      menxiaReviewed: false,
      testsPassed: true,
      gatewayChecks: ["workflow"],
      result: "allowed"
    })

    let history = getAuditHistory(testDir, sessionId)
    expect(history.length).toBe(1)

    clearAuditHistory(testDir, sessionId)

    history = getAuditHistory(testDir, sessionId)
    expect(history.length).toBe(0)
  })

  it("should handle nonexistent session gracefully", () => {
    const history = getAuditHistory(testDir, "nonexistent-session")
    expect(history).toEqual([])
  })

  it("should track multiple file modifications", () => {
    appendAuditRecord(testDir, sessionId, {
      sessionId,
      agentName: "agent1",
      operation: "Edit",
      taskId: "task-1",
      filesAffected: ["src/file1.ts", "src/file2.ts", "src/file3.ts"],
      linesChanged: 150,
      riskLevel: "high",
      menxiaReviewed: true,
      testsPassed: true,
      gatewayChecks: ["workflow", "risk", "menxia"],
      result: "allowed"
    })

    const history = getAuditHistory(testDir, sessionId)
    expect(history[0].filesAffected.length).toBe(3)
    expect(history[0].linesChanged).toBe(150)
  })
})
