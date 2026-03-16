/**
 * 治理系统使用示例
 * 展示如何使用完整的三省六部工作流
 */

import {
  Plan,
  AgentRole,
  TaskStatus,
  GovernanceConfig,
  AcceptanceCriteria,
} from "./types.js"
import { GovernanceOrchestrator, MinistryDispatcher } from "./orchestrator.js"

/**
 * 示例1：完整工作流
 * 从规划到最终验收的完整端到端示例
 */
export async function exampleCompleteWorkflow() {
  // 配置治理系统
  const config: GovernanceConfig = {
    maxRetries: 2,
    stepTimeoutSeconds: 300,
    globalTimeoutSeconds: 3600,
    parallelStepLimit: 5,
    enableLogging: true,
    logLevel: "info",
  }

  // 初始化协调器
  const orchestrator = new GovernanceOrchestrator(config)

  // 执行完整工作流
  try {
    const result = await orchestrator.executeCompleteWorkflow(
      "修复认证模块的登录 bug"
    )

    console.log("=== 工作流完成 ===")
    console.log("计划ID:", result.plan.id)
    console.log("批准结果:", result.approval.decision)
    console.log("执行状态:", result.report.statistics.successRate * 100, "%")
    console.log("验证结果:", result.verification.status)
  } catch (error) {
    console.error("工作流失败:", error)
  }
}

/**
 * 示例2：创建一个详细的计划
 * 展示如何构造包含六部分工的完整计划
 */
export function exampleCreateDetailedPlan(): Plan {
  const plan: Plan = {
    id: "plan-auth-fix-001",
    domain: "general",
    createdBy: AgentRole.ZHONGSHU,
    steps: [
      {
        id: "step-1-analyze",
        name: "代码扫描与问题诊断",
        uses: [AgentRole.YIBU],
        dependencies: [],
        input: {
          targetFile: "src/auth/login.ts",
          scanType: "syntax-error-analysis",
        },
        acceptanceCriteria: {
          "issues-found": "至少找到问题根源",
          "analysis-complete": "完整分析所有相关代码",
        },
        prompt: "扫描登录模块，找出 bug 的根本原因",
        metadata: {
          attempt: 1,
        },
      },
      {
        id: "step-2-research",
        name: "外部依赖研究",
        uses: [AgentRole.HUBU],
        dependencies: ["step-1-analyze"],
        input: {
          apiEndpoint: "https://oauth.example.com",
          lookupType: "compatibility-check",
        },
        acceptanceCriteria: {
          "api-version-found": "确认当前使用的API版本",
          "breaking-changes-checked": "检查是否有破坏性变更",
        },
        prompt: "检查 OAuth API 的兼容性和最新变更",
        metadata: {
          attempt: 1,
        },
      },
      {
        id: "step-3-implement",
        name: "实现修复",
        uses: [AgentRole.GONGBU],
        dependencies: ["step-1-analyze", "step-2-research"],
        input: {
          fixType: "auth-token-validation",
          targetFile: "src/auth/login.ts",
        },
        acceptanceCriteria: {
          "fix-applied": "修复已应用且代码编译通过",
          "no-regression": "修复不破坏现有功能",
          "token-validation": "正确实现 token 验证",
        },
        prompt: "修复登录验证逻辑",
        metadata: {
          attempt: 1,
        },
      },
      {
        id: "step-4-test",
        name: "测试与验证",
        uses: [AgentRole.BINGBU],
        dependencies: ["step-3-implement"],
        input: {
          testType: "unit-integration",
          coverage: 80,
        },
        acceptanceCriteria: {
          "tests-pass": "所有测试通过",
          "coverage-met": "代码覆盖率 >= 80%",
          "auth-flow-verified": "完整的认证流程验证通过",
        },
        prompt: "编写测试并验证修复",
        metadata: {
          attempt: 1,
        },
      },
      {
        id: "step-5-debug",
        name: "问题诊断与修复验证",
        uses: [AgentRole.XINGBU],
        dependencies: ["step-4-test"],
        input: {
          diagnosticLevel: "deep",
          includePerformance: true,
        },
        acceptanceCriteria: {
          "no-errors": "没有运行时错误",
          "performance-ok": "性能没有下降",
          "edge-cases-handled": "处理边界情况",
        },
        prompt: "验证修复的稳定性和性能",
        metadata: {
          attempt: 1,
        },
      },
    ],
    dependencyGraph: {
      "step-1-analyze": [],
      "step-2-research": ["step-1-analyze"],
      "step-3-implement": ["step-1-analyze", "step-2-research"],
      "step-4-test": ["step-3-implement"],
      "step-5-debug": ["step-4-test"],
    },
    criticalPath: ["step-1-analyze", "step-2-research", "step-3-implement", "step-4-test", "step-5-debug"],
    estimatedDurationMinutes: 30,
    metadata: {
      attempt: 1,
    },
  }

  return plan
}

/**
 * 示例3：任务分发
 * 展示如何根据 uses 字段分发任务给六部
 */
export function exampleTaskDispatch() {
  const step = {
    name: "代码扫描与问题诊断",
    uses: ["yibu"],
    input: { targetFile: "src/auth/login.ts" },
    acceptanceCriteria: { "issues-found": "至少找到问题根源" },
    constraints: {
      maxScanTime: "5分钟",
      outputFormat: "structured-json",
    },
  }

  // 获取涉及的部门
  const ministries = MinistryDispatcher.getMinistryForStep(step.uses)
  console.log("涉及部门:", ministries)

  // 生成分发指令
  const prompt = MinistryDispatcher.generateTaskPrompt(step, ministries)
  console.log("分发指令:\n", prompt)

  // 对于多部门步骤
  const multiStepExample = {
    name: "完整代码审查",
    uses: ["yibu", "gongbu", "bingbu"],
    input: { module: "auth" },
  }

  const multiMinistries = MinistryDispatcher.getMinistryForStep(multiStepExample.uses)
  console.log("\n多部门任务涉及:", multiMinistries)
}

/**
 * 示例4：并行执行
 * 展示没有依赖关系的步骤如何并行执行
 */
export function exampleParallelExecution(): Plan {
  // 这个计划展示了三个并行步骤
  const plan: Plan = {
    id: "plan-parallel-001",
    domain: "general",
    createdBy: AgentRole.ZHONGSHU,
    steps: [
      {
        id: "step-1-scan",
        name: "代码扫描",
        uses: [AgentRole.YIBU],
        dependencies: [],
        input: { targetDir: "src/" },
        acceptanceCriteria: { "scan-complete": "扫描完成" },
      },
      {
        id: "step-2-research",
        name: "依赖研究",
        uses: [AgentRole.HUBU],
        dependencies: [], // 与 step-1 无依赖关系
        input: { apiVersion: "v2" },
        acceptanceCriteria: { "research-complete": "研究完成" },
      },
      {
        id: "step-3-test",
        name: "旧代码测试",
        uses: [AgentRole.BINGBU],
        dependencies: [], // 与 step-1, step-2 无依赖关系
        input: { testSuite: "legacy" },
        acceptanceCriteria: { "tests-complete": "测试完成" },
      },
      {
        id: "step-4-implement",
        name: "实现新功能",
        uses: [AgentRole.GONGBU],
        dependencies: ["step-1-scan", "step-2-research", "step-3-test"],
        input: { feature: "new-auth" },
        acceptanceCriteria: { "implementation-complete": "实现完成" },
      },
    ],
    dependencyGraph: {
      "step-1-scan": [],
      "step-2-research": [],
      "step-3-test": [],
      "step-4-implement": ["step-1-scan", "step-2-research", "step-3-test"],
    },
    criticalPath: ["step-1-scan", "step-2-research", "step-3-test", "step-4-implement"],
    estimatedDurationMinutes: 20,
  }

  console.log("并行步骤（将同时执行）:")
  console.log("  - ", plan.steps[0].name)
  console.log("  - ", plan.steps[1].name)
  console.log("  - ", plan.steps[2].name)
  console.log("\n串行步骤（依赖前面的步骤）:")
  console.log("  - ", plan.steps[3].name)

  return plan
}

/**
 * 示例5：重试逻辑
 * 展示失败重试的工作流程
 */
export function exampleRetryLogic() {
  const config: GovernanceConfig = {
    maxRetries: 2, // 最多重试2次
    stepTimeoutSeconds: 300,
    globalTimeoutSeconds: 3600,
    parallelStepLimit: 5,
    enableLogging: true,
    logLevel: "info",
  }

  console.log("重试策略:")
  console.log("1. 第一次失败 → 自动重试（最多", config.maxRetries, "次）")
  console.log("2. 达到最大重试次数 → 上报给皇帝（人工决策）")
  console.log("3. 人工决策选项：继续、跳过、修改计划、停止")
}

/**
 * 示例6：决策流程
 * 展示门下省（审核者）的批准流程
 */
export function exampleDecisionFlow() {
  const orchestrator = new GovernanceOrchestrator({
    maxRetries: 2,
    stepTimeoutSeconds: 300,
    globalTimeoutSeconds: 3600,
    parallelStepLimit: 5,
    enableLogging: true,
    logLevel: "info",
  })

  const testPlan = exampleCreateDetailedPlan()

  // 尝试验证计划
  const result = orchestrator.hasCyclicDependency(testPlan)
  console.log("计划是否有循环依赖:", result)

  // 获取关键路径
  const criticalPath = orchestrator.getCriticalPath(testPlan)
  console.log("关键路径:", criticalPath)

  console.log("\n批准流程:")
  console.log("1. 门下省检查计划结构")
  console.log("2. 门下省分析技术风险")
  console.log("3. 门下省做出决定（PASS/RETRY/ESCALATE）")
  console.log("4. 根据决定采取行动")
}

// 导出示例函数
export const examples = {
  completeWorkflow: exampleCompleteWorkflow,
  detailedPlan: exampleCreateDetailedPlan,
  taskDispatch: exampleTaskDispatch,
  parallelExecution: exampleParallelExecution,
  retryLogic: exampleRetryLogic,
  decisionFlow: exampleDecisionFlow,
}
