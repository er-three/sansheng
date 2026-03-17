# 治理系统快速开始指南

5 分钟快速上手三省六部治理系统。

## [TARGET] 目标

本指南将帮助你：
1. 理解治理系统的核心概念
2. 创建和执行第一个工作流
3. 理解五个阶段的流程
4. 进行基本的工作流调试

## 📦 安装和设置

### 项目依赖

治理系统需要：
- Node.js 16+
- TypeScript 5.0+
- @deep-flux/liubu 3.0.1+

### 基础导入

```typescript
import {
  GovernanceOrchestrator,
  GovernanceConfig,
  Plan,
  AgentRole,
  Decision,
} from '@deep-flux/liubu'
```

## 🚀 快速示例：修复一个 Bug

### Step 1: 配置系统

```typescript
const config: GovernanceConfig = {
  maxRetries: 2,           // 失败后最多重试 2 次
  stepTimeoutSeconds: 300, // 每个步骤最多 5 分钟
  globalTimeoutSeconds: 3600, // 整个工作流最多 1 小时
  parallelStepLimit: 5,    // 最多 5 个步骤并行
  enableLogging: true,
  logLevel: 'info'
}
```

### Step 2: 初始化协调器

```typescript
const orchestrator = new GovernanceOrchestrator(config)
```

### Step 3: 制定计划

```typescript
const plan: Plan = {
  id: 'plan-fix-login-bug',
  domain: 'general',
  createdBy: AgentRole.ZHONGSHU,

  // 定义执行步骤
  steps: [
    {
      id: 'step-1-scan',
      name: '代码扫描和问题诊断',
      uses: [AgentRole.YIBU],  // ← 吏部负责
      dependencies: [],         // ← 没有前置依赖
      input: {
        targetFile: 'src/auth/login.ts',
        scanType: 'bug-analysis'
      },
      acceptanceCriteria: {
        'root-cause-found': '必须找到 bug 根本原因',
        'analysis-complete': '分析要覆盖整个认证流程'
      }
    },
    {
      id: 'step-2-implement',
      name: '实现修复',
      uses: [AgentRole.GONGBU],  // ← 工部负责
      dependencies: ['step-1-scan'], // ← 依赖 step-1
      input: {
        fixType: 'token-validation',
        targetFile: 'src/auth/login.ts'
      },
      acceptanceCriteria: {
        'fix-applied': '修复已应用到代码',
        'syntax-valid': '代码无语法错误',
        'no-regression': '不破坏现有功能'
      }
    },
    {
      id: 'step-3-test',
      name: '单元测试和验证',
      uses: [AgentRole.BINGBU], // ← 兵部负责
      dependencies: ['step-2-implement'], // ← 依赖 step-2
      input: {
        testType: 'unit-integration',
        coverage: 80
      },
      acceptanceCriteria: {
        'tests-pass': '所有测试通过',
        'coverage-met': '代码覆盖率 ≥ 80%'
      }
    }
  ],

  // 依赖关系图（自动生成或手动指定）
  dependencyGraph: {
    'step-1-scan': [],
    'step-2-implement': ['step-1-scan'],
    'step-3-test': ['step-2-implement']
  },

  // 关键路径（影响总时间的最长链）
  criticalPath: ['step-1-scan', 'step-2-implement', 'step-3-test'],

  // 预计耗时
  estimatedDurationMinutes: 30
}
```

### Step 4: 执行工作流

#### 方式 A：完整工作流（推荐）

```typescript
try {
  const result = await orchestrator.executeCompleteWorkflow('修复登录 bug')

  console.log('[OK] 工作流完成')
  console.log('成功率:', result.report.statistics.successRate * 100 + '%')
  console.log('总耗时:', result.report.duration + 'ms')
  console.log('完成步骤:', result.report.completedSteps, '/', result.report.totalSteps)
} catch (error) {
  console.error('[NO] 工作流失败:', error)
}
```

#### 方式 B：分阶段执行（更细粒度的控制）

```typescript
// 阶段 1：规划（中书省）
const plan = await orchestrator.phase1Planning('修复登录 bug')
console.log('[OK] 计划已制定:', plan.id)

// 阶段 2：审核（门下省）
const approval = await orchestrator.phase2Review(plan)
if (approval.decision === Decision.PASS) {
  console.log('[OK] 计划已批准')
} else if (approval.decision === Decision.ESCALATE) {
  console.error('[NO] 计划被拒绝:', approval.reason)
  return
}

// 阶段 3：执行（尚书省）
const report = await orchestrator.phase3Execution(plan)
console.log('[OK] 执行完成')
console.log('成功率:', report.statistics.successRate)

// 阶段 4：验证（御史台）
const verification = await orchestrator.phase4Verification(plan, report)
console.log('[OK] 系统验证完成:', verification.status)
```

## 🔍 理解工作流的 5 个阶段

### Phase 1: 规划（中书省 - Planning）
**职责**：根据需求制定详细执行计划

```typescript
const plan = await orchestrator.phase1Planning(requirement)
// 输出：Plan 对象，包含所有步骤、依赖关系、验收标准
```

### Phase 2: 审核（门下省 - Review）
**职责**：检查计划的合理性和可行性

```typescript
const approval = await orchestrator.phase2Review(plan)
// 检查项：
// [PASS] 步骤结构完整性
// [PASS] 循环依赖检测
// [PASS] 验收标准定义
// 输出：Decision (PASS / SKIP / RETRY / ESCALATE)
```

### Phase 3: 执行（尚书省 - Execution）
**职责**：按计划逐步执行，向六部分发任务

```typescript
const report = await orchestrator.phase3Execution(plan)
// 执行流程：
// 1. 找出可执行的步骤（依赖都已完成）
// 2. 为每个步骤创建任务
// 3. 并行执行任务
// 4. 处理执行结果
// 输出：ExecutionReport
```

**并行执行示例**：
```
步骤1（吏部）┐
步骤2（户部）├─→ 同时执行（无依赖）
步骤3（兵部）┘
    [down]
步骤4（工部）→ 等所有上一步完成后再执行
```

### Phase 4: 验证（御史台 - Verification）
**职责**：系统级验证（集成测试、E2E 测试、性能验收）

```typescript
const verification = await orchestrator.phase4Verification(plan, report)
// 验证内容：
// [PASS] 所有步骤成功完成
// [PASS] 无遗留的集成问题
// [PASS] 性能指标满足要求
// 输出：VerificationResult
```

### Phase 5: 最终批准（皇帝）
**职责**：最高权力的最终决策

在实际系统中，这一步由 HuangdiAgent 负责，但在测试中我们可以模拟：

```typescript
const finalApproval = {
  decision: Decision.PASS,
  reason: '所有验证通过，可以发布'
}
```

## 💡 常见场景

### 场景 1：简单的顺序执行

```typescript
const simplePlan: Plan = {
  // ...
  steps: [
    { id: 'step-1', dependencies: [] },     // 第一步
    { id: 'step-2', dependencies: ['step-1'] }, // 依赖第一步
    { id: 'step-3', dependencies: ['step-2'] }  // 依赖第二步
  ]
  // 总耗时 ≈ step-1 + step-2 + step-3
}
```

### 场景 2：并行执行

```typescript
const parallelPlan: Plan = {
  // ...
  steps: [
    { id: 'step-1', dependencies: [] },           // 独立
    { id: 'step-2', dependencies: [] },           // 独立
    { id: 'step-3', dependencies: [] },           // 独立
    { id: 'step-4', dependencies: ['step-1', 'step-2', 'step-3'] } // 汇总
  ]
  // 总耗时 ≈ max(step-1, step-2, step-3) + step-4
  // 节省时间！
}
```

### 场景 3：多部门协作

```typescript
const multiMinistryStep = {
  id: 'step-1',
  name: '完整代码审查',
  uses: [AgentRole.YIBU, AgentRole.GONGBU, AgentRole.BINGBU], // 三个部门
  // 尚书省会同时向三个部门发起 task，等都完成后再继续
}
```

### 场景 4：失败处理

```typescript
// 如果步骤失败...
if (report.failedSteps > 0) {
  // 第一次失败自动重试（最多 maxRetries 次）
  // 第二次仍然失败则上报皇帝（人工决策）

  const humanDecision = {
    action: 'continue',  // 或 'skip', 'retry', 'stop'
    reason: '我检查了代码，这是预期行为'
  }
}
```

## [chart] 查看执行状态

```typescript
// 获取当前执行状态
const state = orchestrator.getExecutionState()
console.log('已完成:', state.completedSteps)
console.log('失败:', state.failedSteps)
console.log('执行中:', state.inProgressTasks)

// 获取执行报告
const report = orchestrator.getReport(plan)
console.log('成功率:', report.statistics.successRate * 100 + '%')
console.log('总耗时:', report.duration + 'ms')
console.log('平均步骤耗时:', report.statistics.averageStepDuration + 'ms')

// 查看关键路径（最长的依赖链）
const criticalPath = orchestrator.getCriticalPath(plan)
console.log('关键路径:', criticalPath)
```

## 🔧 高级用法

### 验证计划

```typescript
// 检查循环依赖
if (orchestrator.hasCyclicDependency(plan)) {
  console.error('[NO] 计划包含循环依赖，无法执行')
  return
}

// 获取所有依赖（包括传递依赖）
const allDeps = orchestrator.getAllDependencies('step-5', plan)
console.log('Step-5 依赖:', allDeps)

// 获取关键路径
const criticalPath = orchestrator.getCriticalPath(plan)
console.log('关键路径长度:', criticalPath.length)
```

### 自定义配置

```typescript
const customConfig: GovernanceConfig = {
  maxRetries: 3,              // 更多重试次数
  stepTimeoutSeconds: 600,    // 更长的超时时间
  globalTimeoutSeconds: 7200, // 更长的全局时间限制
  parallelStepLimit: 10,      // 更多并行步骤
  enableLogging: true,
  logLevel: 'debug'           // 更详细的日志
}
```

### 任务分发

```typescript
import { MinistryDispatcher } from '@deep-flux/liubu'

const step = {
  name: '代码实现',
  uses: ['gongbu', 'yibu']
}

// 获取涉及的部门
const ministries = MinistryDispatcher.getMinistryForStep(step.uses)
// → ['gongbu', 'yibu']

// 生成任务提示
const prompt = MinistryDispatcher.generateTaskPrompt(step, ministries)
// → 格式化的执行指令
```

## 📚 完整的示例代码

完整的可运行示例见：
- `src/governance/examples.ts` - 6 个完整示例
- `test/governance/e2e.test.ts` - 真实工作流场景

## 🎓 学习路径

### 初级（5 分钟）
1. 阅读本文档的"快速示例"部分
2. 运行 `npm run build`
3. 运行 `npm test -- test/governance/types.test.ts`

### 中级（20 分钟）
1. 研究执行引擎工作原理：`src/governance/execution-engine.ts`
2. 理解依赖解析：DependencyResolver 类
3. 查看集成测试：`test/governance/orchestrator.test.ts`

### 高级（1 小时）
1. 学习完整的 API 参考：`docs/governance-implementation.md`
2. 研究所有端到端测试场景：`test/governance/e2e.test.ts`
3. 理解验证框架：`docs/governance-system.md`

## ❓ 常见问题

### Q: 如何理解"uses"字段？

A: `uses` 字段指定哪个部门执行该步骤：
- `[AgentRole.YIBU]` - 由吏部执行（代码扫描）
- `[AgentRole.GONGBU]` - 由工部执行（代码实现）
- `[AgentRole.YIBU, AgentRole.GONGBU]` - 同时由吏部和工部执行（并行）

### Q: 最多可以有几个步骤？

A: 没有硬性限制，但要注意：
- 建议不超过 10-20 个步骤
- 优先使用并行执行减少总耗时
- 使用 `parallelStepLimit` 控制并行度

### Q: 失败了怎么办？

A: 有三种处理方式：
1. **自动重试**：第一次失败自动重试（可配置次数）
2. **人工介入**：达到重试上限后上报皇帝
3. **跳过**：通过 `Decision.SKIP` 跳过该步骤

### Q: 如何调试工作流？

A: 启用详细日志：
```typescript
const config = {
  enableLogging: true,
  logLevel: 'debug'  // 最详细的日志
}
```

### Q: 为什么我的计划被拒绝了？

A: 常见原因：
- [NO] 缺少 `uses` 字段
- [NO] 没有定义 `acceptanceCriteria`
- [NO] 包含循环依赖
- [NO] 依赖的步骤不存在

查看 `approval.reason` 了解具体原因。

## 🚀 下一步

- 查看 [实现指南](./governance-implementation.md) 了解 API 细节
- 查看 [测试指南](./testing.md) 学习如何编写测试
- 查看 [治理规范](./governance-system.md) 理解完整的权力结构

## 版本信息

- 文档版本：3.0.1
- 最后更新：2026-03-17
- 状态：[OK] 生产就绪
