/**
 * 治理系统类型定义的单元测试
 */

import {
  AgentRole,
  TaskStatus,
  TaskType,
  Decision,
  ErrorCode,
  Plan,
  Step,
  Task,
} from "../../src/governance/types.js"

describe("Governance Types", () => {
  describe("Enums", () => {
    it("should have all AgentRole values", () => {
      expect(AgentRole.HUANGDI).toBe("huangdi")
      expect(AgentRole.ZHONGSHU).toBe("zhongshu")
      expect(AgentRole.MENXIA).toBe("menxia")
      expect(AgentRole.SHANGSHU).toBe("shangshu")
      expect(AgentRole.YIBU).toBe("yibu")
      expect(AgentRole.HUBU).toBe("hubu")
      expect(AgentRole.GONGBU).toBe("gongbu")
      expect(AgentRole.BINGBU).toBe("bingbu")
      expect(AgentRole.XINGBU).toBe("xingbu")
    })

    it("should have all TaskStatus values", () => {
      expect(TaskStatus.PENDING).toBe("pending")
      expect(TaskStatus.IN_PROGRESS).toBe("in_progress")
      expect(TaskStatus.COMPLETED).toBe("completed")
      expect(TaskStatus.FAILED).toBe("failed")
    })

    it("should have all TaskType values", () => {
      expect(TaskType.PLAN).toBe("plan")
      expect(TaskType.REVIEW).toBe("review")
      expect(TaskType.EXECUTE).toBe("execute")
      expect(TaskType.VERIFY).toBe("verify")
    })

    it("should have all Decision values", () => {
      expect(Decision.PASS).toBe("pass")
      expect(Decision.RETRY).toBe("retry")
      expect(Decision.SKIP).toBe("skip")
      expect(Decision.ESCALATE).toBe("escalate")
    })

    it("should have all ErrorCode values", () => {
      expect(ErrorCode.SYNTAX_ERROR).toBe("SYNTAX_ERROR")
      expect(ErrorCode.RUNTIME_ERROR).toBe("RUNTIME_ERROR")
      expect(ErrorCode.TIMEOUT).toBe("TIMEOUT")
      expect(ErrorCode.NETWORK_ERROR).toBe("NETWORK_ERROR")
    })
  })

  describe("Type validation", () => {
    it("should create a valid Plan", () => {
      const plan: Plan = {
        id: "plan-1",
        domain: "general",
        createdBy: AgentRole.ZHONGSHU,
        steps: [],
        dependencyGraph: {},
        criticalPath: [],
        estimatedDurationMinutes: 30,
      }

      expect(plan.id).toBe("plan-1")
      expect(plan.domain).toBe("general")
      expect(plan.createdBy).toBe(AgentRole.ZHONGSHU)
    })

    it("should create a valid Step with uses field", () => {
      const step: Step = {
        id: "step-1",
        name: "Code Scan",
        uses: [AgentRole.YIBU],
        dependencies: [],
        input: { targetFile: "src/index.ts" },
        acceptanceCriteria: {
          "issues-found": "at least one issue",
        },
      }

      expect(step.id).toBe("step-1")
      expect(step.uses).toEqual([AgentRole.YIBU])
      expect(step.acceptanceCriteria).toHaveProperty("issues-found")
    })

    it("should create a valid Task", () => {
      const task: Task = {
        id: "task-1",
        taskId: "uuid-xxx",
        createdAt: new Date(),
        createdBy: AgentRole.SHANGSHU,
        taskType: TaskType.EXECUTE,
        stepId: "step-1",
        stepName: "Code Implementation",
        ministry: AgentRole.GONGBU,
        prompt: "Implement the feature",
        priority: "normal",
        dependencies: [],
        status: TaskStatus.PENDING,
        metadata: {
          attempt: 1,
        },
        retryCount: 0,
      }

      expect(task.status).toBe(TaskStatus.PENDING)
      expect(task.ministry).toBe(AgentRole.GONGBU)
      expect(task.retryCount).toBe(0)
    })
  })
})
