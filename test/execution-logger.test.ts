/**
 * 执行日志系统测试
 */

import {
  logAgentExecution,
  getAgentExecutionHistory,
  getFullExecutionLog,
  generateExecutionReport,
  traceDecisionContext,
  analyzeAgentBehavior,
  clearExecutionLogs,
  ExecutionLogEntry
} from "../src/workflows/execution-logger.js"

describe("Execution Logger - 执行日志系统", () => {
  const sessionId = "test-session-001"

  beforeEach(() => {
    clearExecutionLogs(sessionId)
  })

  // ─────────────────────── 基础记录测试 ───────────────────────

  describe("基础记录 (Basic Logging)", () => {
    test("记录单个 Agent 执行", () => {
      logAgentExecution(sessionId, {
        agentName: "huangdi",
        taskId: "task-001",
        input: { prompt: "执行 task-001" },
        duration_ms: 1000,
        output: {
          type: "JSON",
          status: "success",
          data: { result: "approved" }
        }
      })

      const logs = getFullExecutionLog(sessionId)
      expect(logs.length).toBe(1)
      expect(logs[0].agentName).toBe("huangdi")
      expect(logs[0].output?.status).toBe("success")
    })

    test("记录包含决策信息的执行", () => {
      logAgentExecution(sessionId, {
        agentName: "menxia",
        taskId: "task-002",
        input: { prompt: "审核计划" },
        decision: {
          type: "approve",
          rationale: "计划符合 pipeline 顺序",
          alternatives: ["reject"]
        },
        duration_ms: 500,
        output: {
          type: "JSON",
          status: "success",
          data: { status: "APPROVED" }
        }
      })

      const logs = getFullExecutionLog(sessionId)
      expect(logs[0].decision?.type).toBe("approve")
      expect(logs[0].decision?.rationale).toContain("pipeline")
    })

    test("记录失败的执行", () => {
      logAgentExecution(sessionId, {
        agentName: "gongbu",
        taskId: "task-003",
        input: { prompt: "执行修改代码" },
        duration_ms: 2000,
        output: {
          type: "ERROR",
          status: "failure",
          error: "文件修改失败：权限不足"
        }
      })

      const logs = getFullExecutionLog(sessionId)
      expect(logs[0].output?.status).toBe("failure")
      expect(logs[0].output?.error).toContain("权限")
    })
  })

  // ─────────────────────── 查询和筛选 ───────────────────────

  describe("查询和筛选 (Query and Filter)", () => {
    beforeEach(() => {
      // 创建多个 Agent 的执行记录
      logAgentExecution(sessionId, {
        agentName: "zhongshu",
        taskId: "task-001",
        input: { prompt: "规划" },
        duration_ms: 1000,
        output: { type: "JSON", status: "success", data: {} }
      })

      logAgentExecution(sessionId, {
        agentName: "menxia",
        taskId: "task-002",
        input: { prompt: "审核" },
        duration_ms: 500,
        output: { type: "JSON", status: "success", data: {} }
      })

      logAgentExecution(sessionId, {
        agentName: "shangshu",
        taskId: "task-003",
        input: { prompt: "执行" },
        duration_ms: 1500,
        output: { type: "JSON", status: "success", data: {} }
      })

      logAgentExecution(sessionId, {
        agentName: "menxia",
        taskId: "task-004",
        input: { prompt: "验收" },
        duration_ms: 800,
        output: { type: "JSON", status: "success", data: {} }
      })
    })

    test("获取特定 Agent 的执行历史", () => {
      const menxiaLogs = getAgentExecutionHistory(sessionId, "menxia")
      expect(menxiaLogs.length).toBe(2)
      expect(menxiaLogs.every(log => log.agentName === "menxia")).toBe(true)
    })

    test("获取完整执行日志", () => {
      const allLogs = getFullExecutionLog(sessionId)
      expect(allLogs.length).toBe(4)
      expect(allLogs[0].agentName).toBe("zhongshu")
      expect(allLogs[3].agentName).toBe("menxia")
    })

    test("日志条目应该包含时间戳和唯一ID", () => {
      const logs = getFullExecutionLog(sessionId)
      expect(logs[0].id).toMatch(/^log-/)
      expect(logs[0].timestamp).toBeDefined()

      // 不同的日志应该有不同的ID
      expect(logs[0].id).not.toBe(logs[1].id)
    })
  })

  // ─────────────────────── 决策追溯 ───────────────────────

  describe("决策追溯 (Decision Tracing)", () => {
    test("追溯单个决策的完整上下文", () => {
      let logId1: string
      let logId2: string
      let logId3: string

      // Step 1: zhongshu 生成计划
      logAgentExecution(sessionId, {
        agentName: "zhongshu",
        taskId: "task-001",
        input: { prompt: "规划" },
        duration_ms: 1000,
        output: { type: "JSON", status: "success", data: { plan: "..." } }
      })
      logId1 = getFullExecutionLog(sessionId)[0].id

      // Step 2: menxia 审核（依赖 step 1）
      logAgentExecution(sessionId, {
        agentName: "menxia",
        taskId: "task-002",
        input: { prompt: "审核" },
        depends_on: [logId1],
        duration_ms: 500,
        output: { type: "JSON", status: "success", data: { status: "APPROVED" } }
      })
      logId2 = getFullExecutionLog(sessionId)[1].id

      // Step 3: shangshu 执行（依赖 step 2）
      logAgentExecution(sessionId, {
        agentName: "shangshu",
        taskId: "task-003",
        input: { prompt: "执行" },
        depends_on: [logId2],
        duration_ms: 1500,
        output: { type: "JSON", status: "success", data: { result: "..." } }
      })
      logId3 = getFullExecutionLog(sessionId)[2].id

      // 追溯 step 3 的完整上下文
      const context = traceDecisionContext(sessionId, logId3)
      expect(context.length).toBe(3)
      expect(context[0].agentName).toBe("zhongshu")
      expect(context[1].agentName).toBe("menxia")
      expect(context[2].agentName).toBe("shangshu")
    })

    test("追溯不存在的决策应该返回空数组", () => {
      const context = traceDecisionContext(sessionId, "non-existent-log-id")
      expect(context.length).toBe(0)
    })
  })

  // ─────────────────────── 行为分析 ───────────────────────

  describe("行为分析 (Behavior Analysis)", () => {
    test("分析 Agent 的决策模式", () => {
      logAgentExecution(sessionId, {
        agentName: "huangdi",
        decision: { type: "approve" },
        duration_ms: 1000,
        output: { type: "JSON", status: "success", data: {} }
      })

      logAgentExecution(sessionId, {
        agentName: "huangdi",
        decision: { type: "approve" },
        duration_ms: 1200,
        output: { type: "JSON", status: "success", data: {} }
      })

      logAgentExecution(sessionId, {
        agentName: "huangdi",
        decision: { type: "escalate" },
        duration_ms: 800,
        output: { type: "JSON", status: "success", data: {} }
      })

      const behavior = analyzeAgentBehavior(sessionId, "huangdi")
      expect(behavior.totalExecutions).toBe(3)
      expect(behavior.decisionDistribution["approve"]).toBe(2)
      expect(behavior.decisionDistribution["escalate"]).toBe(1)
      expect(behavior.successRate).toBe("100.0%")
      expect(behavior.averageDuration_ms).toBe(1000)
    })

    test("分析包含失败的执行", () => {
      logAgentExecution(sessionId, {
        agentName: "gongbu",
        duration_ms: 1000,
        output: { type: "JSON", status: "success", data: {} }
      })

      logAgentExecution(sessionId, {
        agentName: "gongbu",
        duration_ms: 500,
        output: { type: "ERROR", status: "failure", error: "错误" }
      })

      const behavior = analyzeAgentBehavior(sessionId, "gongbu")
      expect(behavior.totalExecutions).toBe(2)
      expect(behavior.successRate).toBe("50.0%")
      expect(behavior.errors).toBe(1)
    })
  })

  // ─────────────────────── 报告生成 ───────────────────────

  describe("报告生成 (Report Generation)", () => {
    test("生成执行日志报告", () => {
      logAgentExecution(sessionId, {
        agentName: "huangdi",
        duration_ms: 1000,
        output: { type: "JSON", status: "success", data: {} }
      })

      logAgentExecution(sessionId, {
        agentName: "zhongshu",
        duration_ms: 500,
        output: { type: "JSON", status: "success", data: {} }
      })

      const report = generateExecutionReport(sessionId)
      expect(report).toContain("Execution Log Report")
      expect(report).toContain("huangdi")
      expect(report).toContain("zhongshu")
      expect(report).toContain("2")
    })

    test("空日志报告应该提示无数据", () => {
      const report = generateExecutionReport("empty-session")
      expect(report).toContain("No execution logs")
    })

    test("报告应该包含决策追踪部分", () => {
      logAgentExecution(sessionId, {
        agentName: "menxia",
        decision: { type: "approve", rationale: "通过检查" },
        duration_ms: 500,
        output: { type: "JSON", status: "success", data: {} }
      })

      const report = generateExecutionReport(sessionId)
      expect(report).toContain("Decision Trace")
      expect(report).toContain("approve")
      expect(report).toContain("通过检查")
    })
  })

  // ─────────────────────── 清理 ───────────────────────

  describe("清理 (Cleanup)", () => {
    test("清空日志应该删除所有记录", () => {
      logAgentExecution(sessionId, {
        agentName: "test",
        duration_ms: 100,
        output: { type: "JSON", status: "success", data: {} }
      })

      expect(getFullExecutionLog(sessionId).length).toBe(1)

      clearExecutionLogs(sessionId)

      expect(getFullExecutionLog(sessionId).length).toBe(0)
    })
  })
})
