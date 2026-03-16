# 治理系统故障排除指南

常见问题及解决方案。

## 🔴 计划验证失败

### 错误：计划被拒绝 (Decision.ESCALATE)

#### 问题 1：缺少 `uses` 字段

```
错误信息：Step "代码扫描" missing uses field (which ministries execute it)
```

**原因**：每个步骤必须明确指定由哪个或哪些部门执行

**解决方案**：
```typescript
// ❌ 错误
const step = {
  id: 'step-1',
  name: '代码扫描',
  // 缺少 uses 字段
}

// ✅ 正确
const step = {
  id: 'step-1',
  name: '代码扫描',
  uses: [AgentRole.YIBU],  // ← 必须指定
}
```

#### 问题 2：缺少验收标准

```
错误信息：Step "实现修复" missing acceptance criteria
```

**原因**：验收标准用于判断步骤是否成功完成

**解决方案**：
```typescript
// ❌ 错误
const step = {
  id: 'step-2',
  name: '实现修复',
  acceptanceCriteria: {}  // 空的
}

// ✅ 正确
const step = {
  id: 'step-2',
  name: '实现修复',
  acceptanceCriteria: {
    'fix-applied': '代码修改已应用',
    'tests-pass': '单元测试全部通过',
    'no-regression': '不破坏现有功能'
  }
}
```

#### 问题 3：存在循环依赖

```
错误信息：Plan contains circular dependencies
```

**原因**：Step A 依赖 Step B，但 Step B 又依赖 Step A（或形成更长的循环）

**诊断方法**：
```typescript
// 检查是否有循环依赖
if (orchestrator.hasCyclicDependency(plan)) {
  console.error('检测到循环依赖！')

  // 可视化依赖关系
  console.log('依赖关系图：')
  for (const step of plan.steps) {
    console.log(`${step.name}:`, step.dependencies)
  }
}
```

**解决方案**：检查并修正依赖关系

```
❌ 循环依赖：
Step 1 → Step 2
   ↑        ↓
   └────────┘

✅ 正确的依赖：
Step 1 → Step 2 → Step 3
```

#### 问题 4：依赖的步骤不存在

```
错误信息：Step "实现修复" depends on non-existent step: undefined-step
```

**原因**：`dependencies` 数组中引用了不存在的步骤 ID

**解决方案**：
```typescript
// ❌ 错误
const steps = [
  {
    id: 'step-1',
    name: '扫描',
    dependencies: []
  },
  {
    id: 'step-2',
    name: '实现',
    dependencies: ['undefined-step']  // 不存在！
  }
]

// ✅ 正确
const steps = [
  {
    id: 'step-1',
    name: '扫描',
    dependencies: []
  },
  {
    id: 'step-2',
    name: '实现',
    dependencies: ['step-1']  // 正确引用
  }
]
```

## 🟡 执行失败

### 问题：步骤执行失败，已重试但仍失败

```
Task Status: FAILED
Retry Count: 2 (max retries exceeded)
```

**处理流程**：

```
执行失败
  ↓
第1次失败 → 自动重试
  ↓
第2次失败 → 上报皇帝（人工决策）
```

**检查失败信息**：
```typescript
const report = await orchestrator.phase3Execution(plan)

// 查看失败的步骤
report.stepResults.forEach((result, stepId) => {
  if (result.status === 'failed') {
    console.error(`Step ${stepId} failed:`)
    console.error('- Error:', result.errors)
    console.error('- Attempts:', result.attempts)
  }
})
```

**解决方案**：

1. **增加重试次数**
   ```typescript
   const config = {
     maxRetries: 5  // 从 2 增加到 5
   }
   ```

2. **增加超时时间**
   ```typescript
   const config = {
     stepTimeoutSeconds: 600  // 从 300 增加到 600
   }
   ```

3. **调整步骤参数**
   ```typescript
   // 如果是扫描失败，可能需要更宽松的标准
   const step = {
     acceptanceCriteria: {
       'issues-found': 'at least one issue',  // 改为更容易满足
     }
   }
   ```

4. **人工干预**
   ```typescript
   // 如果两次重试都失败，人工决策
   const humanDecision = {
     action: 'skip',  // 跳过该步骤
     reason: '这个错误是环境问题，不影响功能'
   }
   ```

### 问题：超时（Timeout）

```
错误：ErrorCode.TIMEOUT
信息：Step execution exceeded timeout
```

**原因**：步骤执行时间超过配置的 `stepTimeoutSeconds`

**解决方案**：

```typescript
// 增加超时时间
const config: GovernanceConfig = {
  stepTimeoutSeconds: 300,   // 原来 5 分钟
  // 改为
  stepTimeoutSeconds: 600    // 现在 10 分钟
}
```

## 🟠 并行执行问题

### 问题：预期并行但没有并行执行

**症状**：
- 预计时间应该是 10 分钟（三个 5 分钟的步骤并行）
- 实际时间是 15 分钟（像是顺序执行）

**检查方法**：
```typescript
// 查看执行时间线
report.timeline.forEach(event => {
  console.log(`${event.timestamp}: ${event.eventType} - ${event.stepId}`)
})

// 或检查步骤执行顺序
const executionOrder = report.timeline
  .filter(e => e.eventType === 'step_started')
  .map(e => e.stepId)
console.log('执行顺序:', executionOrder)
```

**常见原因**：

1. **步骤有不必要的依赖**
   ```typescript
   // ❌ 错误（不应该相互依赖）
   const steps = [
     { id: 'step-1', dependencies: [] },
     { id: 'step-2', dependencies: ['step-1'] },  // 不必要
     { id: 'step-3', dependencies: ['step-2'] }   // 不必要
   ]

   // ✅ 正确（可以并行）
   const steps = [
     { id: 'step-1', dependencies: [] },
     { id: 'step-2', dependencies: [] },  // 无依赖
     { id: 'step-3', dependencies: [] }   // 无依赖
   ]
   ```

2. **并行度限制**
   ```typescript
   // 如果设置过低，会限制并行度
   const config = {
     parallelStepLimit: 2  // ← 这限制了并行度
   }

   // 改为
   const config = {
     parallelStepLimit: 5  // 或更高
   }
   ```

## 🔵 性能优化

### 问题：工作流执行时间太长

**分析步骤**：

```typescript
// 1. 查看总耗时
console.log('总耗时:', report.duration, 'ms')

// 2. 查看关键路径（决定总耗时的最长链）
const criticalPath = orchestrator.getCriticalPath(plan)
console.log('关键路径:', criticalPath)

// 3. 查看每个步骤的耗时
report.stepResults.forEach((result, stepId) => {
  console.log(`${stepId}: ${result.duration}ms`)
})
```

**优化建议**：

1. **增加并行度**
   ```typescript
   // 重构依赖关系，使更多步骤可以并行
   // Before:
   // step-1 → step-2 → step-3 → step-4
   // 耗时：4 个单位

   // After:
   // step-1 → (step-2, step-3 并行) → step-4
   // 耗时：3 个单位
   ```

2. **减少验收标准**
   ```typescript
   // 不要过度验证，只验证必要的标准
   acceptanceCriteria: {
     'core-requirement': 'must have',
     // 移除不必要的：
     // 'nice-to-have': 'optional'
   }
   ```

3. **使用缓存和优化**
   ```typescript
   // 对于重复的操作，使用缓存
   const cache = new Map()
   if (!cache.has(key)) {
     cache.set(key, expensiveOperation())
   }
   ```

## 📊 监控和调试

### 启用详细日志

```typescript
const config: GovernanceConfig = {
  enableLogging: true,
  logLevel: 'debug'  // 最详细
}
```

**日志级别**（从少到多）：
- `error` - 只显示错误
- `warn` - 错误和警告
- `info` - 错误、警告、信息（默认）
- `debug` - 所有内容（最详细）

### 实时监控

```typescript
// 定期检查执行状态
const interval = setInterval(() => {
  const state = orchestrator.getExecutionState()
  console.log({
    completedSteps: state.completedSteps.size,
    failedSteps: state.failedSteps.size,
    inProgressTasks: state.inProgressTasks.size
  })
}, 5000)  // 每 5 秒检查一次

// 执行完成后清除
// clearInterval(interval)
```

### 生成诊断报告

```typescript
function generateDiagnosticsReport(plan: Plan, report: ExecutionReport) {
  return {
    // 计划信息
    planId: plan.id,
    totalSteps: plan.steps.length,
    criticalPath: orchestrator.getCriticalPath(plan),

    // 执行统计
    completedSteps: report.completedSteps,
    failedSteps: report.failedSteps,
    duration: report.duration,
    successRate: report.statistics.successRate,

    // 性能指标
    averageStepDuration: report.statistics.averageStepDuration,
    totalAttempts: report.statistics.totalAttempts,

    // 问题列表
    failedStepDetails: report.stepResults
      .entries()
      .filter(([_, result]) => result.status === 'failed')
      .map(([stepId, result]) => ({
        stepId,
        name: result.name,
        error: result.errors
      }))
  }
}
```

## 🛠️ 高级调试

### 调试循环依赖

```typescript
function findCyclicPath(plan: Plan): string[] | null {
  const visited = new Set<string>()
  const path: string[] = []

  function dfs(stepId: string): boolean {
    if (path.includes(stepId)) {
      return true  // 找到循环
    }

    if (visited.has(stepId)) {
      return false
    }

    visited.add(stepId)
    path.push(stepId)

    const step = plan.steps.find(s => s.id === stepId)
    if (step) {
      for (const dep of step.dependencies) {
        if (dfs(dep)) {
          return true
        }
      }
    }

    path.pop()
    return false
  }

  for (const step of plan.steps) {
    if (dfs(step.id)) {
      return path  // 返回循环的路径
    }
  }

  return null
}
```

### 追踪任务分发

```typescript
// 添加日志来追踪任务分发
const originalDispatch = MinistryDispatcher.generateTaskPrompt
MinistryDispatcher.generateTaskPrompt = (step, ministries) => {
  console.log(`📤 向以下部门分发任务:`)
  ministries.forEach(m => {
    console.log(`  → ${MinistryDispatcher.getMinistryDescription(m)}`)
  })
  return originalDispatch(step, ministries)
}
```

## 📚 更多资源

- [快速开始](./getting-started.md)
- [测试指南](./testing.md)
- [实现指南](./governance-implementation.md)
- [治理规范](./governance-system.md)

## 🆘 获取帮助

如果问题未在本指南中解决：

1. 启用 `logLevel: 'debug'` 收集详细日志
2. 生成诊断报告（见上方）
3. 检查测试用例：`test/governance/`
4. 查看相关文档

**常用诊断命令**：
```bash
# 运行治理系统测试
npm test -- test/governance/

# 运行特定测试
npm test -- test/governance/e2e.test.ts

# 生成覆盖率报告
npm run test:coverage -- test/governance/
```
