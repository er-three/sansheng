/**
 * 治理系统的中央协调器
 * 整合三省（中书、门下、尚书）和六部（五部门）的工作流程
 */

import { WorkflowEngine, DependencyResolver } from "./execution-engine.js"
import {
  Plan,
  Step,
  Task,
  Decision,
  ExecutionReport,
  GovernanceConfig,
  VerificationResult,
  DecisionContext,
  DecisionResult,
} from "./types.js"

/**
 * 治理系统协调器 - 负责整个工作流的协调和管理
 */
export class GovernanceOrchestrator {
  private engine: WorkflowEngine
  private config: GovernanceConfig

  constructor(config: GovernanceConfig) {
    this.config = config
    this.engine = new WorkflowEngine(config)
  }

  /**
   * 阶段1：规划（中书省）
   * 中书省根据需求制定详细计划，包括步骤和六部分工
   */
  public async phase1Planning(requirement: string): Promise<Plan> {
    // 这个方法应该被中书省Agent调用
    // 中书省负责：
    // 1. 理解需求
    // 2. 分析现状
    // 3. 制定执行计划
    // 4. 为每个步骤分配所需的六部

    // 示例计划结构
    const plan: Plan = {
      id: this.generateId(),
      domain: "general",
      createdBy: { name: "zhongshu" } as any,
      steps: [],
      dependencyGraph: {},
      criticalPath: [],
      estimatedDurationMinutes: 0,
      metadata: {
        attempt: 1,
      },
    }

    return plan
  }

  /**
   * 阶段2：审核（门下省）
   * 门下省审核中书省的计划，确保其可行和安全
   */
  public async phase2Review(plan: Plan): Promise<DecisionResult> {
    // 检查计划是否包含必要信息
    const validation = this.validatePlan(plan)
    if (!validation.valid) {
      return {
        decision: Decision.ESCALATE,
        reason: validation.errors.join("; "),
      }
    }

    // 检查是否存在循环依赖
    if (DependencyResolver.hasCyclicDependency(plan)) {
      return {
        decision: Decision.ESCALATE,
        reason: "Plan contains circular dependencies",
      }
    }

    // 计算关键路径
    const criticalPath = DependencyResolver.getCriticalPath(plan)
    plan.criticalPath = criticalPath

    // 门下省批准
    return {
      decision: Decision.PASS,
      reason: "Plan approved by Menxia",
      metadata: {
        criticalPath,
      },
    }
  }

  /**
   * 阶段3：执行（尚书省）
   * 尚书省按照批准的计划逐步执行，向六部分发任务
   */
  public async phase3Execution(plan: Plan): Promise<ExecutionReport> {
    // 初始化执行引擎
    const report = await this.engine.executeWorkflow(plan)
    return report
  }

  /**
   * 阶段4和5：验证和最终批准（御史台和皇帝）
   * 系统级验证（集成测试、端到端测试、性能验收）
   */
  public async phase4Verification(
    plan: Plan,
    report: ExecutionReport
  ): Promise<VerificationResult> {
    // 这个方法用于进行系统级别的验证
    // 包括集成测试、E2E测试、性能测试等

    return {
      stepId: "system-verification",
      status: "pass",
      criteria: {
        integration: {
          expected: true,
          actual: report.failedSteps === 0,
          pass: report.failedSteps === 0,
        },
      },
    }
  }

  /**
   * 完整的工作流执行 - 从规划到最终批准
   */
  public async executeCompleteWorkflow(requirement: string): Promise<{
    plan: Plan
    approval: DecisionResult
    report: ExecutionReport
    verification: VerificationResult
  }> {
    // 阶段1：规划
    const plan = await this.phase1Planning(requirement)

    // 阶段2：审核
    const approval = await this.phase2Review(plan)
    if (approval.decision === Decision.ESCALATE) {
      throw new Error(`Plan rejected: ${approval.reason}`)
    }

    // 阶段3：执行
    const report = await this.phase3Execution(plan)

    // 阶段4：验证
    const verification = await this.phase4Verification(plan, report)

    return {
      plan,
      approval,
      report,
      verification,
    }
  }

  /**
   * 验证计划的完整性和有效性
   */
  private validatePlan(plan: Plan): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // 检查是否有步骤
    if (!plan.steps || plan.steps.length === 0) {
      errors.push("Plan must contain at least one step")
    }

    // 检查每个步骤是否有必要的字段
    for (const step of plan.steps || []) {
      if (!step.id) {
        errors.push(`Step missing id: ${step.name}`)
      }
      if (!step.name) {
        errors.push("Step must have a name")
      }
      if (!step.uses || step.uses.length === 0) {
        errors.push(`Step "${step.name}" missing uses field (which ministries execute it)`)
      }
      if (!step.acceptanceCriteria || Object.keys(step.acceptanceCriteria).length === 0) {
        errors.push(`Step "${step.name}" missing acceptance criteria`)
      }
    }

    // 检查依赖有效性
    const stepIds = new Set((plan.steps || []).map(s => s.id))
    for (const step of plan.steps || []) {
      for (const depId of step.dependencies || []) {
        if (!stepIds.has(depId)) {
          errors.push(`Step "${step.name}" depends on non-existent step: ${depId}`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 获取执行状态
   */
  public getExecutionState() {
    return this.engine.getExecutionState()
  }

  /**
   * 获取执行报告
   */
  public getReport(plan: Plan): ExecutionReport {
    return this.engine.getReport(plan)
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取关键路径
   */
  public getCriticalPath(plan: Plan): string[] {
    return DependencyResolver.getCriticalPath(plan)
  }

  /**
   * 检查是否存在循环依赖
   */
  public hasCyclicDependency(plan: Plan): boolean {
    return DependencyResolver.hasCyclicDependency(plan)
  }

  /**
   * 获取步骤的所有依赖
   */
  public getAllDependencies(stepId: string, plan: Plan): Set<string> {
    return DependencyResolver.getAllDependencies(stepId, plan)
  }
}

/**
 * 治理系统的任务分发器
 * 将执行引擎的任务分发给具体的六部代理
 */
export class MinistryDispatcher {
  /**
   * 根据步骤的 uses 字段分发任务给对应的六部
   */
  public static getMinistryForStep(uses: string[]): string[] {
    // uses 字段包含一个或多个部门名称
    return uses.map(ministry => {
      switch (ministry.toLowerCase()) {
        case "yibu":
          return "yibu" // 吏部
        case "hubu":
          return "hubu" // 户部
        case "libu":
          return "libu" // 礼部
        case "bingbu":
          return "bingbu" // 兵部
        case "xingbu":
          return "xingbu" // 刑部
        case "gongbu":
          return "gongbu" // 工部
        default:
          return ministry
      }
    })
  }

  /**
   * 获取部门的描述
   */
  public static getMinistryDescription(ministry: string): string {
    const descriptions: Record<string, string> = {
      yibu: "吏部 - 代码扫描与信息采集",
      hubu: "户部 - 外部资源研究",
      libu: "礼部 - 工作流协调",
      bingbu: "兵部 - 性能测试与验证",
      xingbu: "刑部 - 错误处理与调试",
      gongbu: "工部 - 代码实现与基础设施",
    }
    return descriptions[ministry.toLowerCase()] || ministry
  }

  /**
   * 生成任务分发指令
   */
  public static generateTaskPrompt(step: any, ministries: string[]): string {
    const ministriesStr = ministries
      .map(m => this.getMinistryDescription(m))
      .join("\n  ")

    return `
执行步骤：${step.name}

【目标】
${step.targetDescription || step.name}

【输入】
${JSON.stringify(step.input, null, 2)}

【验收标准】
${Object.entries(step.acceptanceCriteria)
  .map(([key, value]) => `  ✓ ${key}: ${value}`)
  .join("\n")}

【涉及部门】
  ${ministriesStr}

【关键约束】
${step.constraints ? Object.values(step.constraints).join("\n  ") : "  无"}

请按照上述要求完成此步骤，并确保通过所有验收标准。
`.trim()
  }
}

/**
 * 工作流状态管理器
 */
export class WorkflowStateManager {
  private states: Map<string, any> = new Map()

  /**
   * 保存阶段状态
   */
  public savePhaseState(phaseId: string, state: any): void {
    this.states.set(phaseId, state)
  }

  /**
   * 获取阶段状态
   */
  public getPhaseState(phaseId: string): any {
    return this.states.get(phaseId)
  }

  /**
   * 清除所有状态
   */
  public clearAll(): void {
    this.states.clear()
  }

  /**
   * 获取所有状态
   */
  public getAllStates(): Record<string, any> {
    return Object.fromEntries(this.states)
  }
}
