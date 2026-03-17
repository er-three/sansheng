# 治理系统测试指南

完整的测试套件覆盖单元测试、集成测试和端到端测试。

## 📋 测试概览

### 文件结构

```
test/governance/
├── types.test.ts              # 类型定义测试
├── execution-engine.test.ts   # 执行引擎单元测试
├── orchestrator.test.ts       # 协调器集成测试
└── e2e.test.ts               # 端到端工作流测试
```

### 测试统计

| 测试套件 | 测试数 | 覆盖内容 |
|---------|--------|---------|
| types.test.ts | 4 | 枚举、类型验证 |
| execution-engine.test.ts | 8 | WorkflowEngine、DependencyResolver |
| orchestrator.test.ts | 12 | GovernanceOrchestrator、MinistryDispatcher、StateManager |
| e2e.test.ts | 12 | 完整工作流场景、并行执行、多部门分工 |
| **总计** | **36** | **单元、集成、端到端** |

**测试结果**: [OK] 全部通过（36/36）

## 运行测试

### 运行所有测试

```bash
npm test
```

### 运行治理系统测试

```bash
npm test -- test/governance/
```

### 运行特定测试文件

```bash
npm test -- test/governance/types.test.ts
npm test -- test/governance/execution-engine.test.ts
npm test -- test/governance/orchestrator.test.ts
npm test -- test/governance/e2e.test.ts
```

### Watch 模式（开发中）

```bash
npm run test:watch -- test/governance/
```

### 生成覆盖率报告

```bash
npm run test:coverage -- test/governance/
```

## 测试详解

### 1. 类型定义测试 (`types.test.ts`)

**覆盖范围**:
- [OK] 所有枚举值的定义
- [OK] 核心类型的创建和验证
- [OK] Plan、Step、Task 的结构验证

**示例测试**:
```typescript
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

  expect(step.uses).toEqual([AgentRole.YIBU])
})
```

### 2. 执行引擎测试 (`execution-engine.test.ts`)

**WorkflowEngine 测试**:
- [OK] 初始化和状态管理
- [OK] 可执行步骤的识别
- [OK] 任务的创建

**DependencyResolver 测试**:
- [OK] 循环依赖检测
- [OK] 关键路径计算
- [OK] 传递依赖计算
- [OK] 拓扑排序

**示例测试**:
```typescript
it("should detect cyclic dependencies", () => {
  const hasCycle = DependencyResolver.hasCyclicDependency(plan)
  expect(hasCycle).toBe(true)
})
```

### 3. 协调器测试 (`orchestrator.test.ts`)

**GovernanceOrchestrator 测试**:
- [OK] 计划验证
- [OK] 阶段2审核（拒绝循环依赖）
- [OK] 阶段2审核（批准有效计划）
- [OK] 关键路径获取

**MinistryDispatcher 测试**:
- [OK] 部门映射
- [OK] 部门描述生成
- [OK] 任务提示生成

**WorkflowStateManager 测试**:
- [OK] 状态保存和检索
- [OK] 状态清除
- [OK] 全量状态获取

**示例测试**:
```typescript
it("should approve valid plans in review phase", async () => {
  const approval = await orchestrator.phase2Review(validPlan)
  expect(approval.decision).toBe(Decision.PASS)
})
```

### 4. 端到端测试 (`e2e.test.ts`)

**完整工作流场景**:

#### 场景1：顺序执行
```
扫描 → 实现修复 → 测试验证
```

#### 场景2：并行执行
```
┌─ 代码扫描
├─ 依赖研究
└─ 旧代码测试
      [down]
   实现新功能
```

#### 场景3：多分支
```
    分析
   ↙    ↘
前端   后端
   ↖    ↗
 集成测试
```

**示例测试**:
```typescript
it("should handle parallel execution workflow", async () => {
  const plan: Plan = {
    steps: [
      { id: "step-1-scan", dependencies: [] },
      { id: "step-2-research", dependencies: [] },
      { id: "step-3-test", dependencies: [] },
      { id: "step-4-implement", dependencies: ["step-1", "step-2", "step-3"] },
    ],
    // ...
  }

  const approval = await orchestrator.phase2Review(plan)
  expect(approval.decision).toBe(Decision.PASS)
})
```

## 测试覆盖率

当前覆盖率目标：
- 行数覆盖率 (Lines): 50%
- 分支覆盖率 (Branches): 50%
- 函数覆盖率 (Functions): 50%
- 语句覆盖率 (Statements): 50%

运行覆盖率报告：
```bash
npm run test:coverage -- test/governance/
```

## 测试最佳实践

### 1. 单元测试
- 测试单个函数或类
- 独立于其他组件
- 快速执行

### 2. 集成测试
- 测试多个组件之间的交互
- 验证工作流的各个阶段
- 确保数据正确流动

### 3. 端到端测试
- 模拟真实的使用场景
- 验证完整的工作流
- 测试不同的业务流程

### 4. 命名规范

```typescript
describe("ComponentName", () => {
  describe("MethodName", () => {
    it("should do something specific", () => {
      // Arrange
      const input = { /* ... */ }

      // Act
      const result = functionUnderTest(input)

      // Assert
      expect(result).toEqual(expected)
    })
  })
})
```

## 常见问题

### Q: 如何运行单个测试？

```bash
npm test -- --testNamePattern="should detect cyclic dependencies"
```

### Q: 如何调试失败的测试？

```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand test/governance/types.test.ts
```

### Q: 如何更新快照？

```bash
npm test -- -u test/governance/
```

### Q: 如何只运行失败的测试？

```bash
npm test -- --onlyChanged
```

## 扩展测试

### 添加新的测试

1. 在 `test/governance/` 中创建新的 `.test.ts` 文件
2. 按照现有的命名和结构规范
3. 使用 `describe` 和 `it` 组织测试
4. 运行 `npm test` 验证

### 示例：添加验证框架测试

```typescript
// test/governance/verification.test.ts
import { VerificationFramework } from "../../src/governance/verification.js"

describe("Verification Framework", () => {
  it("should verify step results", () => {
    const framework = new VerificationFramework()
    const result = framework.verify({ /* ... */ })
    expect(result.status).toBe("pass")
  })
})
```

## CI/CD 集成

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

### Jest 配置

jest.config.js 已配置为：
- 使用 ts-jest 编译 TypeScript
- 设置 50% 的最低覆盖率
- 扫描 `test/` 和 `src/` 目录
- ESM 模块支持

## 相关文档

- [实现指南](./governance-implementation.md) - API 参考
- [系统架构](./architecture.md) - 整体设计
- [治理规范](./governance-system.md) - 工作流规范
