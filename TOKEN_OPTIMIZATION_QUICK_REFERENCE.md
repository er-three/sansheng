# Token 优化快速参考指南

**更新日期**：2026-03-15
**优化潜力**：50-80% 的 Token 消耗降低

---

## 🎯 快速概览

### 当前系统消耗分布

```
单次任务预期 Token 消耗：166-223K tokens

分布：
┌─────────────────────────────────────┐
│ 约束注入 (Constraint Injection)     │ 73.5K (33-44%)
│ 工作流上下文重复 (Context)          │ 25-50K (11-23%)
│ 代码内容传输 (Code Content)         │ 25-40K (11-18%)
│ 并行执行报告 (Parallel Reports)     │ 10-20K (4-9%)
│ 其他 (Other)                        │ 30-40K (13-18%)
└─────────────────────────────────────┘
```

### 快速收益对比

| 优化方案 | 投入 | 收益 | ROI |
|--------|------|------|-----|
| P1-1: 约束分级 | 2天 | -30-50% | 🔴 极高 |
| P1-2: ID引用 | 2天 | -40-60% | 🔴 极高 |
| P1-3: 报告压缩 | 2天 | -20-30% | 🟡 高 |
| **P1 合计** | **6天** | **-50-70%** | **🔴 极高** |
| P2 所有 | 9天 | -15-25% | 🟡 高 |
| P3 所有 | 6天 | -10-15% | 🟡 中 |

---

## 📊 9 个优化方案速览

### P1 级（立即实施）

#### ✨ 优化 #1：约束分级注入 [30-50% 节省]

**问题**：每个 Agent 都收到 14.7K 的完整约束
```
hubo (外部资源)    : global (14.7K) → universal only (5K)   节省 66%
yibu (代码扫描)    : global (14.7K) → universal only (5K)   节省 66%
gongbu (代码实现)  : global (14.7K) → universal+special (8K) 节省 46%
平均                                                          节省 50%
```

**方案**：
```typescript
注入配置表：
- hubu, yibu: 仅注入 universal + security
- gongbu, bingbu, xingbu: + agent_specific
- 决策 Agent: + planning constraints
```

**实施难度**：⭐⭐ (简单)

---

#### ✨ 优化 #2：工作流 ID 引用 [40-60% 节省]

**问题**：计划被传输 5-6 次
```
原：plan(5-10K) × 5-6 = 25-60K tokens
优：plan(5-10K) × 1 + ID × 5-6 = 5.3-10.3K tokens
节省：45-82%
```

**方案**：
```typescript
Session 存储完整计划，只传 ID：
  @plan:xxx-123

Agent 需要时从 Session 查询
```

**实施难度**：⭐⭐⭐ (中等)

---

#### ✨ 优化 #3：报告自适应压缩 [20-30% 节省]

**问题**：包含详细的执行日志和完整统计
```
成功任务报告：2K/个
失败任务报告：5K/个

优化：
- 成功：聚合汇总 (50 字节/个)
- 失败：保留详细 (5K/个)

节省比例：40+ 个任务 × (2K - 50字) = 79K 节省
```

**方案**：
```yaml
报告模式：
- VERBOSE: 原生（保留用于调试）
- NORMAL: 简化版本（默认）
- BRIEF: 仅失败项

使用 NORMAL 模式可减少 65-85%
```

**实施难度**：⭐⭐ (简单)

---

### P2 级（高收益，中等难度）

#### ✨ 优化 #4：多层缓存架构 [15-25% 节省]

**当前**：仅缓存约束
```
ConstraintCache: domain:agent → constraints[]
```

**扩展**：三层缓存
```
Layer 1: ConstraintCache (已有)
  Key: domain:agent
  Hit率: 60-80%

Layer 2: PlanCache (新增)
  Key: domain:taskType:hash(input)
  Hit率: 30-40%

Layer 3: StepResultCache (新增)
  Key: domain:agent:skill:hash(input)
  Hit率: 20-30%

预期节省：15-25%
```

**实施难度**：⭐⭐⭐ (中等)

---

#### ✨ 优化 #5：约束压缩与精简 [10-20% 节省]

**改进**：
```
从 Markdown 到 YAML 结构化
- 原：14.7KB（冗余描述）
- 优：7-9KB（精简）
- 节省：40-50%
```

**例子**：
```markdown
# 原始
## 完整输出
必须展示每个步骤的完整结果...（8行）

# 精简后
complete_output: "Show all steps: input, process, result, errors"
```

**实施难度**：⭐ (简单)

---

#### ✨ 优化 #6：变量共享池 [5-15% 节省]

**问题**：变量被传输 6-8 次
```
原：vars(2-5K) × 6-8 = 12-40K tokens
优：vars(2-5K) × 1 + delta(200字) × 7 = 3.4-6.4K tokens
节省：71%
```

**方案**：
```typescript
Session 变量全局共享
- 第一次：完整加载 (2-5K)
- 后续：仅传递 delta
```

**实施难度**：⭐⭐ (简单)

---

### P3 级（持续改进）

#### ✨ 优化 #7-9：其他方案

| 方案 | 节省 | 难度 |
|------|------|------|
| 流式并行报告 | 5-10% | ⭐⭐⭐ |
| 约束 Hash 检测 | 5-10% | ⭐⭐ |
| Agent 负载均衡 | 3-8% | ⭐⭐ |

---

## 🚀 实施路线图

### Week 1-2：快速赢（预期 50-70% 节省）

```
Day 1-2: 约束分级注入
  □ 创建 ConstraintProfile 类型
  □ 实现 getConstraintProfile()
  □ 修改 plugin.ts 注入逻辑

Day 3-4: 工作流 ID 引用
  □ 增强 Session 存储结构
  □ 实现 PlanReference 类型
  □ 修改 huangdi/zhongshu/menxia Hook

Day 5-6: 报告自适应压缩
  □ 创建 ReportLevel enum
  □ 实现 compressReport()
  □ 修改 gongbu-level3-parallel.ts

验证：
  ✓ 约束文件大小
  ✓ 单次任务 Token 消耗
  ✓ 所有测试通过
```

### Week 3-4：架构优化（预期额外 15-25% 节省）

```
Day 7-10: 多层缓存架构
  □ 创建 PlanCache + StepResultCache
  □ 实现缓存 Key 生成
  □ 实现缓存预热机制
  □ 实现缓存失效检测

Day 11-12: 约束精简
  □ 转换 global.md → YAML
  □ 更新约束解析器
  □ 验证约束完整性

Day 13: 变量共享池
  □ 修改 Session 变量管理
  □ 实现 delta 计算
  □ 修改 Hook 传参方式

测试：
  ✓ 缓存命中率
  ✓ 文件大小
  ✓ 约束发现速度
```

### Week 5+：深度增强（预期额外 10-15% 节省）

```
□ Agent 协作优化
□ 特化 Agent 系统
□ Agent 学习与记忆
□ 性能监控仪表板
```

---

## 📈 监控与验证

### Token 消耗追踪

```bash
# 添加到 src/utils.ts
export function trackTokenUsage(metric: string, tokens: number) {
  logger.info(`TOKEN_USAGE[${metric}]: ${tokens}`)
}

# 使用示例
trackTokenUsage("constraint:injection", 14700)
trackTokenUsage("workflow:context", 5234)
```

### 预期数据点

| 阶段 | 约束 | 上下文 | 报告 | 合计 | 节省 |
|------|------|--------|------|------|------|
| 基线 | 73.5K | 37.5K | 15K | 166K | - |
| P1后 | 20K | 12K | 5K | 50K | -70% |
| P2后 | 20K | 12K | 5K | 45K | -73% |
| P3后 | 20K | 12K | 5K | 42K | -75% |

---

## 🎓 关键代码片段

### 1. 约束分级注入

```typescript
// src/config/constraint-profile.ts
enum ConstraintScope {
  UNIVERSAL = "universal",     // 所有 Agent
  AGENT_SPECIFIC = "agent",    // 特定 Agent
  DOMAIN_SPECIFIC = "domain",  // 特定域
}

interface ConstraintInjectionProfile {
  agent: string
  domain: string
  scopes: ConstraintScope[]
  compress: boolean
}

function getConstraintProfile(agent: string, domain: string): ConstraintInjectionProfile {
  const profiles: Record<string, ConstraintScope[]> = {
    hubu: [UNIVERSAL],
    yibu: [UNIVERSAL],
    gongbu: [UNIVERSAL, AGENT_SPECIFIC],
    bingbu: [UNIVERSAL, AGENT_SPECIFIC],
    xingbu: [UNIVERSAL, AGENT_SPECIFIC],
    zhongshu: [UNIVERSAL, PLANNING],
    menxia: [UNIVERSAL, PLANNING],
    shangshu: [UNIVERSAL, SCHEDULING],
  }

  return {
    agent,
    domain,
    scopes: profiles[agent] || [UNIVERSAL],
    compress: true
  }
}
```

### 2. 工作流 ID 引用

```typescript
// src/session/workflow-reference.ts
interface WorkflowReference {
  plan_id: string
  variables_id: string
  context_id: string
}

// 在 Hook 中使用
const ref: WorkflowReference = {
  plan_id: generateId(),
  variables_id: generateId(),
  context_id: generateId()
}

// 存储到 Session
session.workflow_plans.set(ref.plan_id, planContent)
session.workflow_variables.set(ref.variables_id, variables)

// 传递给 Agent 只需要引用
const agentInput = {
  "@ref": ref,
  "task_description": "..."
}
```

### 3. 报告自适应压缩

```typescript
// src/verification/report-compression.ts
enum ReportLevel {
  VERBOSE = "verbose",  // 完整
  NORMAL = "normal",    // 简化（默认）
  BRIEF = "brief"       // 极简
}

function compressReport(report: any, level: ReportLevel = "normal"): any {
  if (level === "verbose") return report

  if (level === "normal") {
    return {
      summary: `${report.successful_count} passed, ${report.failed_count} failed`,
      failures: report.failed_tasks,
      total_time: report.total_time,
      // 去掉：detailed logs, timestamps, etc
    }
  }

  if (level === "brief") {
    return {
      status: report.failed_count === 0 ? "success" : "partial",
      failures: report.failed_tasks.length,
      // 只保留最关键信息
    }
  }
}
```

---

## 🔍 问题排查指南

### 症状 1：优化后约束丢失

**检查清单**：
- [ ] ConstraintProfile 是否覆盖所有 Agent
- [ ] UNIVERSAL 约束是否完整
- [ ] 缓存是否过期

### 症状 2：Session 数据不一致

**检查清单**：
- [ ] Plan ID 是否唯一
- [ ] Session 清理机制是否正常
- [ ] 引用计数是否正确

### 症状 3：缓存命中率低

**检查清单**：
- [ ] 缓存 Key 是否稳定
- [ ] TTL 是否设置合理
- [ ] 缓存预热是否执行

---

## 📚 相关文档

- **深度分析**：[AGENT_SYSTEM_ENHANCEMENT_ANALYSIS.md](./AGENT_SYSTEM_ENHANCEMENT_ANALYSIS.md)
- **方案 B 总结**：[PHASE_1_2_3_4_COMPLETE_SUMMARY.md](./PHASE_1_2_3_4_COMPLETE_SUMMARY.md)
- **配置管理**：[PHASE_4_CONFIG_MANAGEMENT.md](./PHASE_4_CONFIG_MANAGEMENT.md)

---

## ✅ 验收标准

### Phase 5（快速赢）验收

```
□ 约束分级注入
  ├─ gongbu 约束 14.7K → 8K
  ├─ hubu 约束 14.7K → 5K
  └─ 平均节省 30-50%

□ 工作流 ID 引用
  ├─ 计划传输次数：6 → 1
  ├─ Plan 引用大小 < 200 字节
  └─ 节省 40-60%

□ 报告自适应压缩
  ├─ 成功任务 2K → 50 字节
  ├─ 失败任务保持 5K
  └─ 节省 20-30%

整体收益：50-70% ✓
```

### 整体目标

```
基线：166K tokens
目标：50-100K tokens
达成度：50-70% 节省 ✓
```

---

## 🎯 下一步行动

1. **审批**：确认优化方案
2. **规划**：分配资源和时间表
3. **实施**：按阶段逐个执行
4. **验证**：每个阶段后测试和度量
5. **监控**：持续跟踪 Token 消耗

---

**预期完成时间**：4-6 周
**预期效果**：Token 消耗降低 50-80%
**风险等级**：低（现有架构支持，增量改进）

