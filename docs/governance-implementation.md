# 治理系统实现指南

完整的三省六部多智能体协作框架的实现细节与使用指南。

## 📋 目录

- [系统组成](#系统组成)
- [核心概念](#核心概念)
- [使用指南](#使用指南)
- [工作流示例](#工作流示例)
- [API 参考](#api-参考)
- [扩展指南](#扩展指南)

## 系统组成

治理系统由以下几个核心模块组成：

### 1. 类型定义 (`src/governance/types.ts`)

定义了所有数据结构和枚举：

```typescript
// 核心枚举
- AgentRole: 9个角色（皇帝、三省、五部门）
- TaskStatus: 任务状态（PENDING, IN_PROGRESS, COMPLETED, FAILED）
- TaskType: 任务类型（PLAN, REVIEW, EXECUTE, VERIFY）
- Decision: 决策类型（PASS, RETRY, SKIP, ESCALATE）
- ErrorCode: 错误代码（SYNTAX_ERROR, RUNTIME_ERROR, TIMEOUT, etc.）

// 核心接口
- Plan: 完整的执行计划
- Step: 计划中的单个步骤
- Task: 分配给代理的具体任务
- ExecutionState: 执行过程中的状态
- ExecutionReport: 执行完成后的报告
- VerificationResult: 验证结果
- DecisionResult: 决策结果
```

### 2. 执行引擎 (`src/governance/execution-engine.ts`)

负责实际的工作流执行和依赖管理：

**WorkflowEngine 类：**
- `executeWorkflow(plan)`: 执行完整的工作流
- `findReadySteps(plan)`: 找出所有可执行的步骤
- `createTask(step, ministry)`: 为步骤创建任务
- `executeTasksInParallel(tasks)`: 并行执行多个任务
- `processTaskResult(task, plan)`: 处理任务结果
- `verifyStepWithMenxia(step, task)`: 调用门下省验证
- `generateReport(plan, duration)`: 生成执行报告

**DependencyResolver 类：**
- `hasCyclicDependency(plan)`: 检测循环依赖
- `getAllDependencies(stepId, plan)`: 获取传递依赖
- `getCriticalPath(plan)`: 计算关键路径
- `topologicalSort(plan)`: 拓扑排序

### 3. 协调器 (`src/governance/orchestrator.ts`)

实现 5 阶段工作流的中央协调：

**GovernanceOrchestrator 类：**
- 阶段1：`phase1Planning()` - 中书省规划
- 阶段2：`phase2Review()` - 门下省审核
- 阶段3：`phase3Execution()` - 尚书省执行
- 阶段4：`phase4Verification()` - 系统验证
- 完整流程：`executeCompleteWorkflow()`

**MinistryDispatcher 类：**
- `getMinistryForStep(uses)`: 根据 uses 字段获取部门
- `getMinistryDescription(ministry)`: 获取部门描述
- `generateTaskPrompt(step, ministries)`: 生成任务提示

## 核心概念

### 计划（Plan）

一个完整的执行计划包含：

```typescript
{
  id: "plan-001",
  domain: "general",
  createdBy: AgentRole.ZHONGSHU,
  steps: [
    {
      id: "step-1",
      name: "代码扫描",
      uses: [AgentRole.YIBU],           // 指定由哪个部门执行
      dependencies: [],                  // 依赖的步骤
      input: { ... },                   // 输入参数
      acceptanceCriteria: { ... },      // 验收标准
    },
    // ... 更多步骤
  ],
  dependencyGraph: { ... },            // 依赖关系图
  criticalPath: [...],                 // 关键路径
  estimatedDurationMinutes: 30,
}
```

### 步骤（Step）

每个步骤：
- 必须有唯一的 id
- 必须指定 `uses` 字段（执行该步骤的部门）
- 必须定义 `acceptanceCriteria`（验收标准）
- 可以有依赖关系（依赖其他步骤完成）

### 任务（Task）

当步骤被分发给部门时，会创建任务：

```typescript
{
  id: "task-001",
  taskId: "uuid-xxx",
  stepId: "step-1",
  ministry: AgentRole.YIBU,
  prompt: "执行指令...",
  status: TaskStatus.PENDING,
  // ... 其他字段
}
```

### 任务生命周期

```
PENDING → IN_PROGRESS → COMPLETED
                     ↘ FAILED
```

对于失败的任务：
1. 第一次失败 → 自动重试（最多 `maxRetries` 次）
2. 达到最大重试次数 → 上报给皇帝（人工决策）

## 使用指南

### 基础使用

```typescript
import {
  GovernanceOrchestrator,
  GovernanceConfig,
} from "@deep-flux/liubu"

// 配置
const config: GovernanceConfig = {
  maxRetries: 2,
  stepTimeoutSeconds: 300,
  globalTimeoutSeconds: 3600,
  parallelStepLimit: 5,
  enableLogging: true,
  logLevel: "info",
}

// 初始化
const orchestrator = new GovernanceOrchestrator(config)

// 执行完整工作流
const result = await orchestrator.executeCompleteWorkflow(
  "修复认证模块的登录 bug"
)

console.log("状态:", result.report.statistics.successRate)
```

### 创建计划

```typescript
import { Plan, AgentRole, AcceptanceCriteria } from "@deep-flux/liubu"

const plan: Plan = {
  id: "plan-001",
  domain: "general",
  createdBy: AgentRole.ZHONGSHU,
  steps: [
    {
      id: "step-1-scan",
      name: "代码扫描",
      uses: [AgentRole.YIBU],
      dependencies: [],
      input: { targetFile: "src/auth/login.ts" },
      acceptanceCriteria: {
        "issues-found": "找到问题根源",
      },
    },
    {
      id: "step-2-implement",
      name: "实现修复",
      uses: [AgentRole.GONGBU],
      dependencies: ["step-1-scan"],
      input: { fixType: "token-validation" },
      acceptanceCriteria: {
        "fix-applied": "修复已应用",
        "tests-pass": "所有测试通过",
      },
    },
  ],
  dependencyGraph: {
    "step-1-scan": [],
    "step-2-implement": ["step-1-scan"],
  },
  criticalPath: ["step-1-scan", "step-2-implement"],
  estimatedDurationMinutes: 20,
}
```

### 任务分发

```typescript
import { MinistryDispatcher } from "@deep-flux/liubu"

const step = {
  name: "代码扫描",
  uses: ["yibu"],
  input: { targetFile: "src/auth/login.ts" },
  acceptanceCriteria: { "issues-found": "找到问题" },
}

// 获取涉及的部门
const ministries = MinistryDispatcher.getMinistryForStep(step.uses)
// → ["yibu"]

// 生成分发指令
const prompt = MinistryDispatcher.generateTaskPrompt(step, ministries)
// → 格式化的任务指令
```

### 验证计划

```typescript
const orchestrator = new GovernanceOrchestrator(config)

// 检查循环依赖
if (orchestrator.hasCyclicDependency(plan)) {
  console.error("计划包含循环依赖")
}

// 获取关键路径
const criticalPath = orchestrator.getCriticalPath(plan)
console.log("关键路径:", criticalPath)

// 获取步骤的所有依赖
const allDeps = orchestrator.getAllDependencies("step-5", plan)
console.log("所有依赖:", allDeps)
```

## 工作流示例

### 示例1：完整的修复流程

需求：修复认证模块的登录 bug

1. **阶段1：规划（中书省）**
   - 分析问题范围
   - 制定 5 个步骤的执行计划
   - 为每个步骤指定所需部门

2. **阶段2：审核（门下省）**
   - 检查计划的完整性
   - 验证依赖关系
   - 批准或要求修改

3. **阶段3：执行（尚书省）**
   - 找出可执行的步骤
   - 并行发送任务到相关部门
   - 等待所有任务完成
   - 进行执行层验证

4. **阶段4：验证（御史台）**
   - 集成测试
   - E2E 测试
   - 性能测试

5. **阶段5：批准（皇帝）**
   - 最终决策
   - 发布或回滚

### 示例2：并行执行

三个独立的步骤可以并行执行：

```
┌─ 步骤1：代码扫描（吏部）
├─ 步骤2：依赖研究（户部）
└─ 步骤3：旧代码测试（兵部）
         [down]
    步骤4：实现新功能（工部）
```

尚书省会：
1. 同时发起 3 个任务
2. 等待全部完成
3. 再执行步骤4

### 示例3：失败重试

```
步骤执行失败
  [down]
第1次重试
  [down] (如果仍失败)
第2次重试
  [down] (如果仍失败)
上报皇帝（人工决策）
  ├─ 继续执行后续步骤
  ├─ 跳过该步骤
  ├─ 修改计划并重新开始
  └─ 停止执行
```

## API 参考

### GovernanceOrchestrator

```typescript
class GovernanceOrchestrator {
  // 5阶段工作流
  phase1Planning(requirement: string): Promise<Plan>
  phase2Review(plan: Plan): Promise<DecisionResult>
  phase3Execution(plan: Plan): Promise<ExecutionReport>
  phase4Verification(plan: Plan, report: ExecutionReport): Promise<VerificationResult>
  executeCompleteWorkflow(requirement: string): Promise<{...}>

  // 工具方法
  getCriticalPath(plan: Plan): string[]
  hasCyclicDependency(plan: Plan): boolean
  getAllDependencies(stepId: string, plan: Plan): Set<string>
  getExecutionState(): ExecutionState
  getReport(plan: Plan): ExecutionReport
}
```

### WorkflowEngine

```typescript
class WorkflowEngine {
  executeWorkflow(plan: Plan): Promise<ExecutionReport>
  initializePlan(plan: Plan): Promise<void>
  findReadySteps(plan: Plan): Step[]
  createTask(step: Step, ministry: AgentRole): Task
  executeTasksInParallel(tasks: Task[]): Promise<void>
  processTaskResult(task: Task, plan: Plan): Promise<void>
}
```

### DependencyResolver

```typescript
class DependencyResolver {
  static hasCyclicDependency(plan: Plan): boolean
  static getAllDependencies(stepId: string, plan: Plan): Set<string>
  static getCriticalPath(plan: Plan): string[]
  static topologicalSort(plan: Plan): string[]
}
```

### MinistryDispatcher

```typescript
class MinistryDispatcher {
  static getMinistryForStep(uses: string[]): string[]
  static getMinistryDescription(ministry: string): string
  static generateTaskPrompt(step: any, ministries: string[]): string
}
```

## 扩展指南

### 添加新的部门

1. 在 `types.ts` 中添加 AgentRole 枚举值
2. 在对应的 `.opencode/agents/` 中创建 markdown 定义
3. 在 `src/agents/` 中创建 TypeScript 实现
4. 在 `MinistryDispatcher.getMinistryDescription()` 中添加描述
5. 更新文档

### 自定义执行策略

```typescript
// 继承 WorkflowEngine 以自定义行为
class CustomWorkflowEngine extends WorkflowEngine {
  async executeTasksInParallel(tasks: Task[]): Promise<void> {
    // 自定义并行执行策略
  }
}

const config = { /* ... */ }
const engine = new CustomWorkflowEngine(config)
```

### 集成外部系统

```typescript
// 在 phase1Planning 中集成需求系统
async phase1Planning(requirement: string): Promise<Plan> {
  // 从外部系统读取需求
  const externalReq = await fetchFromExternalSystem(requirement)

  // 转换为内部 Plan 格式
  const plan = transformToPlan(externalReq)

  return plan
}
```

## 最佳实践

1. **计划设计**
   - 确保每个步骤都有明确的验收标准
   - 避免不必要的依赖
   - 合理安排并行步骤

2. **错误处理**
   - 设置合适的 maxRetries
   - 定义清晰的失败恢复策略
   - 确保所有错误都被记录

3. **性能优化**
   - 利用并行执行减少总时间
   - 使用关键路径指导资源分配
   - 设置合适的 timeout 值

4. **监控和日志**
   - 启用详细的日志记录
   - 定期检查执行报告
   - 跟踪关键指标（成功率、平均耗时等）

## 相关文档

- [系统架构](./architecture.md) - 11个智能体分层架构
- [治理系统总览](./governance-system.md) - 完整的权力结构和工作流
- [五部职责定义](./five-ministries-responsibilities.md) - 各部门的具体职责
- [三省决策权定义](./three-provinces-authority.md) - 决策权的分配
- [工作流执行规范](./workflow-execution.md) - 执行层的详细规范

## 版本信息

- 实现版本：3.0.1
- 状态：[OK] 生产就绪
- 最后更新：2026-03-17
