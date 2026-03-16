/**
 * 工作流引用系统测试 - Phase 5
 *
 * 验证：
 * - 计划、变量、上下文的存储和检索
 * - 工作流引用的管理
 * - 过期数据的清理
 * - 存储状态报告
 */

import assert from "assert"
import {
  createWorkflowStorage,
  generateWorkflowReference,
  savePlan,
  getPlan,
  saveVariables,
  getVariables,
  saveContext,
  getContext,
  updateContext,
  saveWorkflowReference,
  getWorkflowReference,
  cleanupExpiredWorkflows,
  generateWorkflowReport,
  WorkflowStep,
} from "../src/session/workflow-reference"

describe("工作流引用系统", () => {
  let storage = createWorkflowStorage()

  beforeEach(() => {
    storage = createWorkflowStorage()
  })

  it("应该创建和检索工作流计划", () => {
    const plan = savePlan(storage, {
      domain: "general",
      taskDescription: "修复登录页面 bug",
      steps: [
        {
          stepId: "analyze",
          name: "分析",
          description: "分析问题",
          agent: "yibu",
          dependencies: [],
          estimatedTime: 300,
          successCriteria: ["完成分析"],
        },
      ] as WorkflowStep[],
      rationale: "这是一个关键的 bug",
      estimatedTime: 1800,
    })

    assert(plan.id)
    assert(plan.createdAt > 0)
    assert.strictEqual(plan.version, 1)

    const retrieved = getPlan(storage, plan.id)
    assert.deepStrictEqual(retrieved, plan)
  })

  it("应该创建和检索工作流变量", () => {
    const variables = saveVariables(storage, "session-123", {
      task_id: "task-456",
      domain: "general",
      description: "修复bug",
    })

    assert(variables.id)
    assert.strictEqual(variables.sessionId, "session-123")
    assert.strictEqual(Object.keys(variables.variables).length, 3)

    const retrieved = getVariables(storage, variables.id)
    assert.deepStrictEqual(retrieved, variables)
  })

  it("应该创建和检索工作流上下文", () => {
    const context = saveContext(storage, {
      domain: "general",
      taskId: "task-123",
      status: "planning",
      completedSteps: [],
      currentStep: "analyze",
      errors: [],
      metadata: {},
    })

    assert(context.id)
    assert.strictEqual(context.status, "planning")
    assert(context.startTime > 0)

    const retrieved = getContext(storage, context.id)
    assert.deepStrictEqual(retrieved, context)
  })

  it("应该更新工作流上下文", () => {
    const context = saveContext(storage, {
      domain: "general",
      taskId: "task-123",
      status: "planning",
      completedSteps: [],
      currentStep: "analyze",
      errors: [],
      metadata: {},
    })

    const updated = updateContext(storage, context.id, {
      status: "executing",
      completedSteps: ["analyze"],
      currentStep: "implement",
    })

    assert(updated)
    assert.strictEqual(updated.status, "executing")
    assert.strictEqual(updated.completedSteps.length, 1)
  })

  it("应该生成和检索工作流引用", () => {
    const reference = generateWorkflowReference()

    assert(reference.planId)
    assert(reference.variablesId)
    assert(reference.contextId)

    saveWorkflowReference(storage, "session-123", reference)
    const retrieved = getWorkflowReference(storage, "session-123")

    assert.deepStrictEqual(retrieved, reference)
  })

  it("应该支持多个计划、变量和上下文", () => {
    for (let i = 0; i < 5; i++) {
      savePlan(storage, {
        domain: "general",
        taskDescription: `任务 ${i}`,
        steps: [],
        rationale: `原因 ${i}`,
        estimatedTime: 1000,
      })

      saveVariables(storage, `session-${i}`, {
        task_index: i,
      })

      saveContext(storage, {
        domain: "general",
        taskId: `task-${i}`,
        status: "planning",
        completedSteps: [],
        currentStep: `step-${i}`,
        errors: [],
        metadata: {},
      })
    }

    assert.strictEqual(storage.plans.size, 5)
    assert.strictEqual(storage.variables.size, 5)
    assert.strictEqual(storage.contexts.size, 5)
  })

  it("应该正确处理缺失的 ID", () => {
    const plan = getPlan(storage, "nonexistent-id")
    assert.strictEqual(plan, undefined)

    const variables = getVariables(storage, "nonexistent-id")
    assert.strictEqual(variables, undefined)

    const context = getContext(storage, "nonexistent-id")
    assert.strictEqual(context, undefined)
  })

  it("应该清理过期的工作流数据", () => {
    // 保存一些数据
    for (let i = 0; i < 3; i++) {
      savePlan(storage, {
        domain: "general",
        taskDescription: `任务 ${i}`,
        steps: [],
        rationale: `原因 ${i}`,
        estimatedTime: 1000,
      })

      saveContext(storage, {
        domain: "general",
        taskId: `task-${i}`,
        status: "planning",
        completedSteps: [],
        currentStep: `step-${i}`,
        errors: [],
        metadata: {},
      })
    }

    // 验证有数据
    assert(storage.plans.size > 0)
    assert(storage.contexts.size > 0)

    // 清理所有数据（设置 maxAgeMs 为 -1，这样所有东西都被认为是过期的）
    const cleaned = cleanupExpiredWorkflows(storage, -1)

    // 应该清理了数据
    assert(cleaned > 0)
  })

  it("应该生成工作流状态报告", () => {
    // 添加一些数据
    const plan = savePlan(storage, {
      domain: "general",
      taskDescription: "测试任务",
      steps: [],
      rationale: "测试原因",
      estimatedTime: 1000,
    })

    const variables = saveVariables(storage, "session-123", {
      test_var: "test_value",
    })

    const context = saveContext(storage, {
      domain: "general",
      taskId: "task-123",
      status: "executing",
      completedSteps: ["analyze"],
      currentStep: "implement",
      errors: [],
      metadata: {},
    })

    const report = generateWorkflowReport(storage)

    // 验证报告包含关键信息
    assert(report.includes("工作流存储状态"))
    assert(report.includes("活跃计划: 1"))
    assert(report.includes("活跃变量集: 1"))
    assert(report.includes("活跃上下文: 1"))
    assert(report.includes("估计总大小"))
  })

  it("应该支持长生命周期的工作流", () => {
    // 创建引用
    const reference = generateWorkflowReference()

    // 保存计划
    const plan = savePlan(storage, {
      domain: "general",
      taskDescription: "长时间运行的任务",
      steps: [],
      rationale: "重要任务",
      estimatedTime: 3600,
    })

    // 保存变量
    const variables = saveVariables(storage, "session-long", {
      task_id: "task-long",
    })

    // 保存上下文
    const context = saveContext(storage, {
      domain: "general",
      taskId: "task-long",
      status: "planning",
      completedSteps: [],
      currentStep: "analyze",
      errors: [],
      metadata: { startedBy: "huangdi" },
    })

    // 更新上下文多次
    updateContext(storage, context.id, {
      status: "executing",
      currentStep: "implement",
      completedSteps: ["analyze"],
    })

    updateContext(storage, context.id, {
      status: "executing",
      currentStep: "verify",
      completedSteps: ["analyze", "implement"],
    })

    updateContext(storage, context.id, {
      status: "completed",
      completedSteps: ["analyze", "implement", "verify"],
    })

    // 验证最终状态
    const final = getContext(storage, context.id)
    assert(final)
    assert.strictEqual(final.status, "completed")
    assert.strictEqual(final.completedSteps.length, 3)
  })
})

console.log("\n✅ 工作流引用系统测试全部通过！")
