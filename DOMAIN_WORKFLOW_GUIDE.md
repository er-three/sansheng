# 域工作流指南 - 动态配方系统

## 概述

以前的资产提取和逆向工程流程是**完全死的、硬编码的**。现在已改造为**动态配方系统**，允许根据项目需求选择合适的工作流。

---

## 核心改进

### 之前（死流程）
```
资产提取：必须执行所有 7 个步骤
  scan → extract → mapping → behavior → detect → verify → persist

逆向工程：必须执行所有 6 个步骤
  infrastructure → tdd-red → ui-generation → tdd-green → refactor → audit

❌ 不能跳过
❌ 不能修改顺序
❌ 不能添加自定义步骤
❌ 无法适应不同项目
```

### 现在（动态配方）
```
资产提取：3 种配方可选
  • quick (4 步)     - 核心资产提取
  • standard (8 步)  - 完整提取
  • complete (10 步) - 强化检查

逆向工程：5 种配方可选
  • frontend-only (6 步)  - 前端专用
  • standard (7 步)       - 标准迁移
  • migration (6 步)      - 快速迁移
  • full-stack (10 步)    - 完整系统
  • high-risk (12 步)     - 关键应用

✅ 灵活选择
✅ Token 按需支付
✅ 快速迭代
✅ 适应各种场景
```

---

## 资产提取域（asset-management）

### 1. Quick 模式 - 快速提取

**适用场景：**
- 简单项目
- 快速原型
- 初步评估
- 概念验证

**流程：**
```
understand → scan → extract → persist
```

**关键步骤：**
1. **understand** - 理解项目结构
2. **scan** - 生成代码索引（code-index.yaml）
3. **extract** - 提取核心资产
4. **persist** - 保存到文件

**跳过的步骤：**
- ❌ mapping - UI 框架映射
- ❌ behavior - 行为场景
- ❌ detect - 框架污染检测
- ❌ verify - 一致性验证

**Token 成本：** ~55K
**耗时：** ~5 分钟
**产物：** 基础资产文件

**何时使用：**
```
用户："我有一个简单的前端项目，想快速提取资产"
系统："使用 quick 配方，5 分钟完成"
```

---

### 2. Standard 模式 - 标准提取

**适用场景：**
- 中等项目
- 生产环境
- 完整资产需求
- 一般迁移项目

**流程：**
```
understand → scan → extract → mapping → behavior → detect → verify → persist
```

**关键步骤：**
1. **understand** - 理解需求
2. **scan** - 生成代码索引
3. **extract** - 资产提取
4. **mapping** - UI 框架映射（并行可选）
5. **behavior** - 行为场景提取（并行可选）
6. **detect** - 框架代码检测
7. **verify** - 跨资产一致性验证
8. **persist** - OpenSpec 规范化保存

**并行执行：**
```
mapping + behavior 可以同时进行，提高效率
```

**Token 成本：** ~125K
**耗时：** ~15 分钟
**产物：** 完整资产档案

**何时使用：** 大多数日常项目

---

### 3. Complete 模式 - 完整提取

**适用场景：**
- 复杂项目
- 迁移评估
- 审计需求
- 长期维护项目

**流程：**
```
understand → scan → extract → mapping → behavior → detect → verify
  → quality-audit → performance → persist
```

**额外步骤：**
- **quality-audit** - 质量审计
- **performance** - 性能分析

**并行执行：**
```
mapping + behavior 并行
quality-audit + performance 并行
```

**Token 成本：** ~175K
**耗时：** ~25 分钟
**产物：** 完整资产档案 + 审计报告

**何时使用：** 复杂项目、需要详细分析

---

## 逆向工程域（reverse-engineering）

### 1. Frontend-Only 模式 - 前端专用

**适用场景：**
- 静态页面迁移
- 展示组件开发
- 简单交互逻辑
- 不涉及复杂业务逻辑

**流程：**
```
understand → infrastructure → ui-generation → tdd-green → refactor → audit
```

**跳过步骤：**
- ❌ tdd-red - 单元测试防护网（原因：逻辑简单）

**Token 成本：** ~90K
**耗时：** ~5 分钟
**产物：** UI 组件

**何时使用：**
```
用户："迁移一个静态页面，没有复杂逻辑"
系统："使用 frontend-only，快速完成"
```

---

### 2. Standard 模式 - 标准迁移

**适用场景：**
- 标准 Ionic 应用
- 业务逻辑中等
- 需要完整 TDD
- 大多数迁移项目

**流程：**
```
understand → infrastructure → tdd-red → ui-generation → tdd-green
  → refactor → audit
```

**完整 TDD 循环：**
1. **infrastructure** - Service、Provider、模型
2. **tdd-red** - 编写测试（失败）
3. **ui-generation** - UI 生成
4. **tdd-green** - 注入逻辑（通过测试）
5. **refactor** - 代码优化
6. **audit** - 全局审计

**Token 成本：** ~135K
**耗时：** ~12 分钟
**产物：** 完整迁移页面

**何时使用：** 标准 Ionic 应用迁移

---

### 3. Migration 模式 - 快速迁移

**适用场景：**
- 已有测试覆盖
- 快速迁移需求
- 遗留代码改造
- 时间紧张

**流程：**
```
understand → infrastructure → ui-generation → tdd-green → refactor → audit
```

**跳过步骤：**
- ❌ tdd-red - 单元测试（原因：已有遗留测试覆盖）

**Token 成本：** ~110K
**耗时：** ~10 分钟
**产物：** 迁移完成的页面

**何时使用：** 快速迁移、已有测试的项目

---

### 4. Full-Stack 模式 - 完整系统

**适用场景：**
- 复杂系统
- 长期维护项目
- 需要性能优化
- 需要集成测试

**流程：**
```
understand → infrastructure → tdd-red → ui-generation → tdd-green
  → refactor → integration-test → performance-tune → security-audit → audit
```

**额外步骤：**
- **integration-test** - 集成测试
- **performance-tune** - 性能调优
- **security-audit** - 安全审计

**并行执行：**
```
tdd-red + infrastructure 可并行
```

**Token 成本：** ~200K
**耗时：** ~20 分钟
**产物：** 完整迁移系统 + 测试 + 优化报告

**何时使用：** 复杂系统迁移

---

### 5. High-Risk 模式 - 高风险系统

**适用场景：**
- 关键系统
- 金融应用
- 医疗系统
- 需要双审核

**流程：**
```
understand → infrastructure → tdd-red → ui-generation → tdd-green
  → refactor → integration-test → security-audit → compliance-check
  → oracle-review → final-audit → audit
```

**额外步骤：**
- **compliance-check** - 合规性检查
- **oracle-review** - 专家复审
- **final-audit** - 最终审计

**双重审核：**
```
security-audit + compliance-check 并行
然后 oracle-review（专家）
最后 final-audit
```

**Token 成本：** ~225K
**耗时：** ~25 分钟
**产物：** 完整迁移 + 完整验证报告

**何时使用：** 关键系统，需要最高保证

---

## 工作流选择矩阵

### 资产提取选择

| 项目特征 | 推荐配方 | Token | 耗时 |
|---------|---------|-------|------|
| 简单项目 | quick | ~55K | 5min |
| 中等项目 | standard | ~125K | 15min |
| 复杂项目 | complete | ~175K | 25min |
| 快速原型 | quick | ~55K | 5min |
| 生产环境 | standard | ~125K | 15min |
| 迁移评估 | complete | ~175K | 25min |

### 逆向工程选择

| 项目特征 | 推荐配方 | Token | 耗时 |
|---------|---------|-------|------|
| 静态页面 | frontend-only | ~90K | 5min |
| 标准应用 | standard | ~135K | 12min |
| 快速迁移 | migration | ~110K | 10min |
| 复杂系统 | full-stack | ~200K | 20min |
| 关键应用 | high-risk | ~225K | 25min |

---

## 如何使用动态配方

### Step 1: 查看可用配方

```
@listDomainRecipes

输出：
Available domains with recipes:
1. asset-management - 资产管理和提取
   Recipes: quick, standard, complete

2. reverse-engineering - 逆向工程和迁移
   Recipes: frontend-only, standard, migration, full-stack, high-risk
```

### Step 2: 选择域和配方

```
用户："我要提取一个中等项目的资产"

系统：
  Asset Management Workflow

  选择配方：
  • quick - 核心资产 (5min)
  • standard - 完整资产 (15min) ← 推荐
  • complete - 强化检查 (25min)

用户："选择 standard"

系统：
  ✅ 初始化 asset-management 工作流
  ✅ 选择 standard 配方
  ✅ 创建任务队列：8 个任务
  ✅ 准备 yibu, bingbu, gongbu Agent
  ✅ 开始 understand 任务
```

### Step 3: 执行工作流

```
查看任务队列：@getTaskQueue
声明任务：say "我声明 scan 任务"
完成任务：say "scan 任务完成"
...循环执行...
```

---

## 动态配方的优势

### 1. 灵活性
- ✅ 根据项目选择合适的流程
- ✅ 可以跳过不必要的步骤
- ✅ 减少浪费的 token

### 2. 效率
- ✅ quick 模式 5 分钟完成
- ✅ 快速反馈
- ✅ 快速迭代

### 3. 成本优化
- ✅ 按需支付 token
- ✅ quick vs complete 省 67% token
- ✅ 成本透明

### 4. 质量保证
- ✅ standard 模式验证完整
- ✅ high-risk 模式多重检查
- ✅ 可根据需要提升质量

### 5. 可维护性
- ✅ 配方易于添加和修改
- ✅ 新的流程可以快速部署
- ✅ 配方文档化明确

---

## 与三省六部制的集成

### 任务队列驱动

所有配方都采用任务队列系统：

```
1. 初始化工作流（选择配方）
2. 创建任务队列（根据配方生成任务）
3. Agent 声明任务
4. 执行任务
5. 完成任务
6. 循环到全部完成

关键路径强制：关键步骤必须执行
并行优化：可并行步骤同时进行
```

### Agent 职责

- **yibu（一步）** - 资产提取协调
- **gongbu（工部）** - 构建和部署
- **bingbu（兵部）** - 性能优化
- **xingbu（刑部）** - 错误处理和安全

---

## 未来扩展

现在的 5 个逆向工程配方和 3 个资产配方可以继续扩展：

```
资产提取：可以添加
  - data-heavy（数据密集型）
  - ml-pipeline（ML 管道）
  - microservices（微服务架构）

逆向工程：可以添加
  - react-migration（React 迁移）
  - vue-migration（Vue 迁移）
  - angular-advanced（Angular 高级）
  - blazor-dotnet（Blazor/Dotnet）
```

每个新配方都可以：
- 添加新的步骤
- 定义新的约束
- 指定不同的 Agent 组合
- 设置特定的验证规则

---

## 总结

从**死流程** → **动态配方**，实现了：

| 方面 | 之前 | 现在 |
|------|------|------|
| 灵活性 | ❌ | ✅ 完全灵活 |
| 快速迭代 | ❌ | ✅ 5 分钟完成 |
| Token 优化 | ❌ | ✅ 按需支付 |
| 质量保证 | ⚠️ 固定 | ✅ 可调整 |
| 新流程添加 | ❌ 困难 | ✅ 容易 |

**这是从"铁板一块"到"灵活定制"的质的飞跃。** 🎯
