# 编程Agent的执行策略 - 定制化建议

## 问题

对于**编程类Agent**，三阶段方案是否都需要？还是有更优策略？

**答案：编程Agent需要更激进的策略**

---

## 编程Agent的特殊性

### 为什么编程Agent不同？

| 方面 | 普通Agent | 编程Agent |
|------|---------|----------|
| 错误代价 | 低 | **极高**（代码崩坏） |
| 修复成本 | 低 | **很高**（需要debug） |
| 影响范围 | 单个操作 | **整个系统** |
| 回滚难度 | 容易 | **困难** |
| 审计需求 | 中等 | **极高** |
| 对追踪性的需要 | 中等 | **必须** |

### 编程Agent常见的错误

```
❌ 直接修改代码而不规划
   → 引入bug或破坏架构

❌ 修改多个文件而不验证关系
   → 跨文件依赖崩坏

❌ 不写测试就改代码
   → 引入隐藏的回归

❌ 临时修改而不记录
   → 无法审计和追踪

❌ 一步修改太多东西
   → 无法定位问题
```

---

## 编程Agent的最优策略

### 结论：**需要更强的强制约束**

对于编程Agent，我建议：

```
不是：Phase 1 → Phase 2 → Phase 3（等待）
而是：Phase 1 + Phase 2 立刻结合

然后快速推进 Phase 3
```

---

## 推荐方案：编程Agent专用

### 🔴 **必做：第一阶段 + 第二阶段结合**

**为什么要结合？**

因为编程涉及代码修改，容错成本很高。不能依赖"等我改变习惯"。

**具体做法：**

#### 第一阶段（我的改变）- 编程专用

```
对于任何代码修改，必须：

1️⃣  声明任务
  "我声明开始 understand 任务"
  [分析需求和当前代码]
  "understand 完成"

2️⃣  制定计划
  "我声明开始 plan 任务"
  [设计修改方案]
  - 会修改哪些文件
  - 为什么这样修改
  - 可能的风险是什么
  "plan 完成"

3️⃣  等待审核
  "我声明开始 menxia_review 任务"
  [menxia 必须批准，不能跳过]

4️⃣  执行修改
  "我声明开始 execute 任务"
  - 逐个文件修改
  - 每个修改都验证
  - 运行测试

5️⃣  验证
  "我声明开始 verify 任务"
  [完整的测试和验证]
```

**关键：不能跳过任何环节**

#### 第二阶段（系统强制）- 立刻实施

```
编程Agent专用的强制检查：

✅ 代码修改前检查：
   if (没有声明任务) {
     拒绝执行
   }

✅ 文件修改前检查：
   if (修改超过10行) {
     if (没有计划) {
       拒绝执行
     }
   }

✅ 跨文件修改检查：
   if (修改超过3个文件) {
     if (没有经过menxia审核) {
       拒绝执行
     }
   }

✅ 代码质量检查：
   if (修改后没有运行测试) {
     标记为警告
     禁止合并
   }
```

---

### 🟡 **加速：第三阶段（提前规划）**

对于编程Agent，第三阶段不应该等待，应该**立刻规划和开始实施**：

**编程Agent的第三阶段改造：**

#### 3.1 强制代码审查门槛

```typescript
// 任何代码修改都必须通过这个门槛
export async function codeModificationGateway(change: CodeChange) {

  // 检查 1: 任务声明
  if (!change.taskId) {
    throw new Error("必须声明任务，否则拒绝修改")
  }

  // 检查 2: 修改计划
  if (!change.plan) {
    throw new Error("必须提供修改计划，否则拒绝修改")
  }

  // 检查 3: 影响分析
  if (change.filesAffected > 3 && !change.impactAnalysis) {
    throw new Error("跨文件修改必须进行影响分析")
  }

  // 检查 4: 测试计划
  if (!change.testPlan) {
    throw new Error("必须提供测试计划")
  }

  // 检查 5: menxia 审核（对于大改动）
  if (change.severity === "high" && !change.reviewedByMenxia) {
    throw new Error("高危修改必须经过 menxia 审核")
  }

  // 通过所有检查，允许修改
  return approveModification(change)
}
```

#### 3.2 自动化测试强制

```typescript
export async function codeModificationExecutor(change: CodeChange) {

  // 修改前
  const baseline = runAllTests()

  // 执行修改
  applyChange(change)

  // 修改后
  const afterChange = runAllTests()

  // 对比：必须没有新的失败
  if (hasNewFailures(baseline, afterChange)) {
    throw new Error("新引入了测试失败，回滚修改")
  }

  if (hasRegressions(baseline, afterChange)) {
    throw new Error("引入了回归，回滚修改")
  }

  // 通过验证，提交修改
  commitChange(change)
}
```

#### 3.3 修改可追踪性

```typescript
// 每个修改都必须有完整记录
interface CodeChangeRecord {
  taskId: string              // 关联的任务
  plan: string                // 修改计划
  filesAffected: string[]     // 修改的文件
  linesChanged: number        // 修改的代码行数
  reasonForChange: string     // 修改原因
  riskAssessment: string      // 风险评估
  testsPassed: boolean        // 测试是否通过
  reviewedBy: string[]        // 谁审核了
  timestamp: Date             // 什么时候

  // 关键：完整的审计线索
  auditTrail: AuditEntry[]
}

// 无法回避，必须记录
```

---

## 编程Agent的实施时间表

```
现在（Week 1）
│
├─ Phase 1 + 2（编程专用）
│  ├─ 我立刻改变行为
│  │  - 代码修改必须走完整流程
│  │  - 必须有计划和审核
│  │
│  └─ 系统立刻强制
│     - 没有计划不允许修改
│     - 没有测试不允许提交
│     - Hook 拦截违规操作
│
├─ Phase 3（提前推进）
│  Week 2-3 开始实施
│  ├─ 代码修改网关
│  ├─ 自动化强制检查
│  ├─ 修改可追踪性
│  └─ 审计日志完整
│
└─ 结果：编程Agent完全受控
   无法跳过任何安全环节
```

---

## 编程Agent vs 其他Agent

### 约束强度对比

```
普通任务 Agent：
  Phase 1（我改变）→ 逐步 Phase 2 & 3

编程 Agent：
  Phase 1 + Phase 2（立刻）→ 快速 Phase 3

理由：
  编程失误代价太高
  不能赌"自觉性"
  必须系统强制
```

### 审核强度对比

```
普通任务：
  menxia 审核"重要决定"

编程 Agent：
  menxia 必须审核所有跨文件修改
  必须审核所有涉及公共API的修改
  必须审核所有涉及数据结构的修改
```

---

## 我的推荐（编程Agent专用）

### ✅ **立刻执行：Phase 1 + Phase 2**

**对编程工作，我承诺：**

```
对于任何代码修改：

1. 必须声明任务
   - 无论多小的修改
   - 无论多简单的bug fix

2. 必须提供计划
   - 修改哪些文件
   - 为什么这样改
   - 风险是什么

3. 必须等待审核
   - menxia 必须批准
   - 对于大改动必须得到批准
   - 不能自作主张

4. 必须验证修改
   - 运行所有相关测试
   - 检查没有回归
   - 验证修改正确性

5. 必须记录完整
   - 谁做了什么
   - 为什么这样做
   - 什么时候做的
   - 通过了什么检查
```

### 🔴 **尽快推进：Phase 3**

```
编程Agent的 Phase 3 应该在 1-2 周内开始：

不应该等待，应该立刻规划：
- 代码修改网关
- 自动化强制检查
- 修改追踪系统
- 完整的审计日志

理由：
  编程任务太重要
  不能等待，必须快速强硬化
```

---

## 关键差异总结

### 普通Agent → 编程Agent

| 维度 | 普通Agent | 编程Agent |
|------|---------|----------|
| **Phase 1+2 时间** | 循序渐进 | **立刻结合** |
| **Phase 3 时间** | 1-2月后 | **1-2周内启动** |
| **审核强度** | 重要决定审核 | **所有跨文件修改审核** |
| **测试要求** | 可选建议 | **强制必做** |
| **追踪要求** | 记录即可 | **完整审计线索** |
| **允许的选择权** | 有一些 | **尽可能少** |

---

## 最终答案

### 对于编程Agent：

```
❌ 不是"等待三阶段逐步推进"

✅ 而是：
  1. Phase 1 + Phase 2 立刻执行
     - 我改变行为
     - 系统强制约束
     - 并行实施，不分先后

  2. Phase 3 加速推进
     - 不等待，立刻规划
     - 1-2周内开始实施
     - 尽快强硬化
```

### 理由：

```
编程任务太关键
  → 代码错误代价太高
  → 必须最严格的约束
  → 不能赌"自觉性"

因此：
  编程Agent 需要 最强的约束
  编程Agent 需要 最快的强硬化
  编程Agent 需要 最完整的追踪
```

---

## 我对编程工作的新承诺

```
从现在开始，对任何代码修改：

1. ✅ 必须声明任务（无例外）
2. ✅ 必须提供详细计划（无例外）
3. ✅ 必须等待 menxia 审核（无例外）
4. ✅ 修改后必须运行完整测试（无例外）
5. ✅ 必须记录完整的修改信息（无例外）

即使修改"看起来很小"
即使修改"似乎没有风险"

都必须走完整流程
```

这是编程Agent应该坚持的底线。
