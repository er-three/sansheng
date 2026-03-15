# OpenCode Plugin Agent 系统增强分析与 Token 消耗优化

**分析日期**：2026-03-15
**分析范围**：Agent 系统 + Token 消耗路径
**优化潜力**：50-70% Token 消耗降低

---

## 目录

1. [Agent 系统概览](#一agent-系统概览)
2. [Agent 完整定义](#二agent-完整定义)
3. [Token 消耗分析](#三token-消耗分析)
4. [优化机会评估](#四优化机会评估)
5. [约束系统深度分析](#五约束系统深度分析)
6. [增强建议](#六增强建议)

---

## 一、Agent 系统概览

### 系统设计理念

OpenCode Plugin 采用**三省六部制**，基于古代中国行政体系：
- **纵向**：皇帝 → 三省 → 六部（决策-规划-执行链）
- **横向**：多专业 Agent 并行协作
- **闭环**：规划→审核→执行→验收完整流程

```
┌─────────────────────────────────────────────────────┐
│                    皇帝 (huangdi)                    │
│              战略决策、目标制定、最终验收             │
└────────────┬────────────────┬───────────────────────┘
             │                │
    ┌────────▼──────┐  ┌──────▼────────┐
    │  中书省        │  │  门下省        │
    │  规划拆解      │  │  审核计划      │
    └────────┬───────┘  └──────┬────────┘
             │                │
       ┌─────▼────────────────▼───┐
       │    尚书省 (执行调度)      │
       │    分发给六部执行         │
       └─────┬────────────────────┘
             │
  ┌──────────┼──────────┬────────────┬─────────┐
  │          │          │            │         │
┌─▼┐ ┌──────▼──┐ ┌─────▼──┐ ┌──────▼──┐ ┌────▼──┐
│工│ │  兵部   │ │ 刑部   │ │ 吏部    │ │  户部  │
│部│ │ 系统    │ │ 代码   │ │ 代码    │ │  资源  │
│  │ │ 测试    │ │ 审查   │ │ 扫描    │ │ 整合   │
└──┘ └─────────┘ └────────┘ └─────────┘ └────────┘
```

### 系统规模

| 维度 | 规模 |
|------|------|
| **Agent 总数** | 11 个 |
| **工作域** | 4 个 |
| **约束总数** | 32+ |
| **Skills** | 15+ |
| **代码行数** | 40,000+ |
| **约束大小** | 14.7KB |

---

## 二、Agent 完整定义

### 2.1 核心 Agent 配置矩阵

| Agent | 类别 | 模型 | 步数 | 温度 | 主要职责 | Token 成本 |
|-------|------|------|------|------|---------|-----------|
| **huangdi** | primary | Opus 4.6 | 50 | 0.2 | 战略决策、最终验收 | 🔴 极高 |
| **zhongshu** | subagent | Opus 4.6 | 20 | 0.1 | 规划制定、任务分解 | 🔴 高 |
| **menxia** | subagent | Opus 4.6 | 10 | 0.0 | 严格审核、结果验收 | 🟡 中高 |
| **shangshu** | subagent | Haiku 4.5 | 100 | 0.0 | 执行调度、分发任务 | 🟡 中 |
| **gongbu** | subagent | Sonnet 4.6 | 80 | 0.1 | 代码实现、文件创建 | 🔴 高 |
| **bingbu** | subagent | Sonnet 4.6 | 50 | 0.0 | 系统测试、验证 | 🟡 中高 |
| **xingbu** | subagent | Opus 4.6 | 30 | 0.0 | 代码审查、质量把关 | 🟡 中 |
| **yibu** | subagent | Haiku 4.5 | 40 | 0.0 | 代码扫描、文件分析 | 🟢 低 |
| **hubu** | subagent | Haiku 4.5 | 20 | 0.0 | 外部资源、Web 搜索 | 🟢 低 |
| **kubu** | subagent | Haiku 4.5 | 25 | 0.0 | 资产管理、规范化 | 🟢 低 |
| **libu** | subagent | Haiku 4.5 | 30 | 0.0 | 工作流协调、调度 | 🟢 低 |

### 2.2 Agent 特点分析

#### 高成本 Agent（token 消耗 20%+）
```
huangdi (皇帝)
├─ 模型成本：Opus 4.6（最强）
├─ 决策频率：高（每个大步骤都决策）
├─ 调用方式：无限制（可多次调用）
└─ 典型消耗：3-5K tokens/次 × N 次 = 30-50K tokens

zhongshu (中书省)
├─ 模型成本：Opus 4.6
├─ 规划复杂度：高（需要完整拆解）
├─ 典型输出：5-10K tokens（详细计划）
└─ 预期消耗：15-25K tokens/次

menxia (门下省)
├─ 模型成本：Opus 4.6
├─ 审核严格度：高
└─ 预期消耗：10-15K tokens/次
```

#### 中等成本 Agent（token 消耗 5-15%）
```
gongbu (工部) - 代码实现
├─ 模型成本：Sonnet 4.6（较强）
├─ 消耗来源：代码内容（不是 prompt）
├─ 优化空间：低（本身是生成内容）
└─ 预期消耗：代码行数 × 2 tokens/行

bingbu (兵部) - 测试验证
├─ 模型成本：Sonnet 4.6
├─ 消耗来源：测试结果、日志输出
└─ 预期消耗：10-20K tokens/次

xingbu (刑部) - 代码审查
├─ 模型成本：Opus 4.6
├─ 消耗来源：代码内容 + 审查反馈
└─ 预期消耗：15-25K tokens/次
```

#### 低成本 Agent（token 消耗 <5%）
```
yibu, hubu, kubu, libu
├─ 模型成本：Haiku 4.5（最经济）
├─ 消耗模式：工具调用 + 简短反馈
└─ 预期消耗：2-5K tokens/次
```

---

## 三、Token 消耗分析

### 3.1 消耗点分布图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Token 消耗来源分布                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1️⃣ 约束注入 (Constraint Injection)           [30-50%] 🔴     │
│     每个 Agent 调用时重新注入全局约束                           │
│     消耗：5K-50K tokens/次                                      │
│     现状：虽标记已注入，但约束文本仍可能重复序列化             │
│     优化空间：最大                                              │
│                                                                 │
│  2️⃣ 工作流上下文 (Workflow Context)          [20-40%] 🟡     │
│     规划、变量、历史记录重复传递                               │
│     消耗：10K-100K+ tokens/次                                   │
│     现状：中书→门下→尚书→各部，每次完整传递                   │
│     优化空间：很大                                              │
│                                                                 │
│  3️⃣ 并行执行报告 (Parallel Reports)          [10-20%] 🟡     │
│     Level 2/3 并行的结果聚合汇总                               │
│     消耗：5K-20K tokens/次                                      │
│     现状：包含完整时间戳、日志、计算                           │
│     优化空间：中等                                              │
│                                                                 │
│  4️⃣ 代码内容传输 (Code Content)               [15-25%] 🟡     │
│     被审查、修改、测试的代码本身                               │
│     消耗：与代码体量成正比                                     │
│     现状：难以优化（业务需求）                               │
│     优化空间：小                                                │
│                                                                 │
│  5️⃣ 缓存未命中 (Cache Miss)                  [5-15%] 🟡      │
│     重复发现相同约束、相同计划                                │
│     消耗：每次缓存未命中重复计算                               │
│     现状：约束缓存有效，但计划缓存缺失                       │
│     优化空间：中等                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

总体：约束(30-50%) + 上下文(20-40%) + 报告(10-20%) = 60-110%
      （超过100%因为有重叠，实际占比：50-80%）
```

### 3.2 具体消耗路径示例

#### 示例：一个简单的代码实现任务

```
用户输入："修复登录页面的 bug"
         [约 200 tokens]

   ↓ huangdi 理解意图

"制定计划" [Opus 4.6]
   输入：用户请求 + 变量 + 全局约束[14.7K tokens]
         ┌─────────────────────┐
         │ global.md (全局约束) │ ← 【第1次注入】 14.7K
         │ general.yaml        │ ← 约束文件组织 5K
         └─────────────────────┘
   输出：详细计划 [5-10K tokens]

   → 小计：15K + 5-10K = 20-25K tokens

   ↓ menxia 审核计划

"审核计划" [Opus 4.6]
   输入：计划(5-10K) + 约束[14.7K] + 上下文[5K]
         ┌─────────────────────┐
         │ global.md (全局约束) │ ← 【第2次注入】 14.7K
         │ general.yaml        │ ← 重复加载 5K
         └─────────────────────┘
   输出：审核意见 [3-5K tokens]

   → 小计：15K + 5K + 5K + 3-5K = 28-33K tokens

   ↓ shangshu 启动执行

"执行分发" [Haiku 4.5]
   输入：计划(5-10K) + 约束[14.7K] + 所有变量[5K]
         ┌─────────────────────┐
         │ global.md (全局约束) │ ← 【第3次注入】 14.7K
         │ general.yaml        │ ← 重复加载 5K
         └─────────────────────┘
   输出：执行指令 [3-5K tokens]

   → 小计：15K + 5K + 5K + 3-5K = 28-33K tokens

   ↓ gongbu 实现代码

"编写代码" [Sonnet 4.6]
   输入：计划(5K) + 约束[14.7K] + 现有代码[10K]
         ┌──────────────────────┐
         │ global.md (全局约束)  │ ← 【第4次注入】 14.7K
         │ agents/gongbu.md     │ ← 工部特殊约束 3K
         │ domains/general.yaml │ ← 域约束 2K
         └──────────────────────┘
   输出：新代码 [5-15K tokens]

   → 小计：15K + 5K + 10K + 5-15K = 35-45K tokens

   ↓ bingbu 测试验证

"运行测试" [Sonnet 4.6]
   输入：代码(5-15K) + 测试配置[2K] + 约束[14.7K]
   输出：测试结果 [5-10K tokens]

   → 小计：15K + 5-15K + 2K + 5-10K = 27-42K tokens

   ↓ xingbu 代码审查

"审查代码" [Opus 4.6]
   输入：代码(5-15K) + 约束[14.7K] + 测试结果[5K]
   输出：审查意见 [3-10K tokens]

   → 小计：15K + 5-15K + 5K + 3-10K = 28-45K tokens

════════════════════════════════════════════════════════════
总计消耗：20-25 + 28-33 + 28-33 + 35-45 + 27-42 + 28-45
        = 166-223K tokens

约束注入次数：5 次 × 14.7K = 73.5K tokens（33-44%）
上下文重复：计划被传递 5 次 = 25-50K tokens（11-23%）
════════════════════════════════════════════════════════════
```

### 3.3 约束系统现状

#### 约束文件结构
```
.opencode/constraints/
├── global.md                          ← 全局约束（32条，14.7KB）
├── general.yaml
├── agents/
│   ├── gongbu.md                     ← 工部约束（4条）
│   ├── bingbu.md
│   ├── xingbu.md
│   └── ...
└── domains/
    ├── general/
    │   ├── gongbu.md
    │   └── ...
    └── asset-management/
        └── yibu.md
```

#### 约束发现算法
```typescript
// src/constraints/discovery.ts
搜索优先级（后覆盖前）：
1. global.md                           ← 全局约束
2. domains/{domain}/ + domains/{domain}.md  ← 域约束
3. agents/{agent}.md                   ← Agent 约束
4. domains/{domain}/{agent}.md         ← 细粒度约束

// 现状问题：
❌ 每次 Agent 调用都完整搜索和序列化
❌ 虽然有内存缓存，但约束文本本身仍重复传输
❌ 没有约束版本管理（文件修改时无法检测）
```

---

## 四、优化机会评估

### 4.1 P1 级优化（立即可实施，高收益）

#### ✨ 优化 #1：约束分级注入（预期节省 30-50%）

**问题现状**：
```typescript
// 现在：每个 Agent 都收到完整的 14.7K 约束
约束结构：
├─ universal (必须) - 7 条
├─ agent_implementation (仅 gongbu) - 4 条
├─ agent_code_review (仅 xingbu) - 3 条
├─ agent_verification (仅 bingbu) - 3 条
├─ parallel_execution (仅并行任务) - 4 条
├─ skill_definition (所有) - 4 条
├─ security (所有) - 4 条
└─ documentation (所有) - 3 条

// ❌ 问题：hubu 和 yibu 也会收到 agent_implementation 约束
```

**优化方案**：
```typescript
// Phase 5: 分级注入
interface ConstraintInjectionProfile {
  universal: true      // 所有 Agent 必须
  agent_specific: Map<string, boolean>  // 按 Agent 选择
  domain_specific: Map<string, boolean> // 按域选择
  skill_specific: Map<string, boolean>  // 按 Skill 选择
}

// 约束成本表
{
  "agent_implementation": { cost: "HIGH", agents: ["gongbu"], alternatives: "drop" },
  "agent_code_review":   { cost: "HIGH", agents: ["xingbu"], alternatives: "drop" },
  "agent_verification":  { cost: "HIGH", agents: ["bingbu"], alternatives: "drop" },
  "parallel_execution":  { cost: "MED", agents: ["shangshu"], alternatives: "drop" },
  "universal":          { cost: "HIGH", agents: "*", alternatives: "compress" }
}

// 注入决策
- 高频 Agent（hubu, yibu）：只注入 universal + security
- 代码 Agent（gongbu, xingbu, bingbu）：注入 universal + 特定约束
- 决策 Agent（zhongshu, menxia）：注入 universal + 规划约束
- 调度 Agent（shangshu）：注入 universal + 并行约束
```

**预期收益**：
```
hubu 约束从 14.7K → 5K     (节省 66%)
yibu 约束从 14.7K → 5K     (节省 66%)
gongbu 约束从 14.7K → 8K   (节省 46%)

平均节省：(6.7K + 6.7K + 6.7K) / 3 = 50%
```

#### ✨ 优化 #2：工作流 ID 引用（预期节省 40-60%）

**问题现状**：
```
中书省规划: {完整计划内容 5-10K}
        ↓
门下省审核: {计划 5-10K} + 上下文
        ↓
尚书省执行: {计划 5-10K} + 变量 + 历史
        ↓
各部执行: {计划 5-10K} + 所有状态}

// ❌ 问题：同一计划被传输 5-6 次
```

**优化方案**：
```typescript
// Phase 5: Session 内引用
interface WorkflowReference {
  plan_id: string           // UUID，存储在 Session
  variables_id: string      // 变量快照 ID
  context_id: string        // 执行上下文 ID
}

// Session 存储
Session {
  workflow_plans: Map<string, PlanContent>
  workflow_variables: Map<string, VariableSet>
  workflow_contexts: Map<string, ExecutionContext>
}

// Agent 收到引用而非完整内容
huangdi: "请制定计划"
  ↓
zhongshu: "@plan:xxx-123 请审核这个计划"
  // 不再传递完整计划，只传递 ID
  // 需要时从 Session 查询
  ↓
menxia: "@plan:xxx-123 审核通过"
  // 审核也用 ID 引用
  ↓
shangshu: "@plan:xxx-123 执行"
  // 执行时才获取完整计划
```

**收益计算**：
```
原始：计划 5-10K × 5-6 次 = 25-60K tokens
优化：计划 5-10K × 1 次 + ID 50字节 × 5-6 次 = 5-10K + 0.3K = 5.3-10.3K
节省：(25-60K - 5.3K) / (25-60K) = 45-79%
```

#### ✨ 优化 #3：报告自适应压缩（预期节省 20-30%）

**问题现状**：
```javascript
// gongbu-level3-parallel.ts
parallel_subtasks: [
  {
    id: "task-1",
    file: "src/pages/page1.tsx",
    status: "done",
    start_time: "2026-03-15T10:30:00Z",
    end_time: "2026-03-15T10:35:30Z",
    duration_ms: 330000,
    execution_log: "... 详细日志 50+ 行 ...",
    error: null,
    files_modified: ["src/pages/page1.tsx"],
    lines_changed: 45,
    complexity_score: 8.5
  },
  // ... 多个类似任务 × N
]

theoretical_speedup: "10x based on 40 independent groups..."
groups: [
  { level: 0, tasks: [task-1, task-2, ...], critical_path_length: 5 },
  // ... 多个分组
]
```

**优化方案**：
```typescript
// 自适应压缩
enum ReportLevel {
  VERBOSE = "complete",  // 保留现状
  NORMAL = "summary",    // 新增：简化版本
  BRIEF = "critical"     // 新增：仅保留失败
}

// NORMAL 格式
{
  id: "task-1",
  file: "src/pages/page1.tsx",
  status: "done",
  duration: 330,  // 秒而不是毫秒
  // 去掉：execution_log（除非有错误）
  // 去掉：end_time（计算得出）
}

// BRIEF 格式
failed_tasks: [
  { id: "task-5", file: "...", error: "..." }
],
successful_count: 39,
total_time: 330  // 聚合而非逐个

// 成功任务不单独报告，只汇总统计
success_summary: {
  count: 39,
  avg_duration: 320,
  total_lines: 1250,
  total_files: 39
}
```

**收益**：
```
原始报告：成功 × 2K + 失败 × 5K + 分组 × 3K = 50-80K
压缩后：成功汇总 1K + 失败详情 5-10K + 分组 1K = 7-16K
节省：65-87%
```

---

### 4.2 P2 级优化（高收益，中等难度）

#### ✨ 优化 #4：多层缓存架构（预期节省 15-25%）

**现状**：
```typescript
// 仅缓存约束
memoryCache: Map<`${domain}:${agentName}`, ConstraintDefinition[]>

// ❌ 缺失：计划缓存、步骤缓存
```

**优化**：
```typescript
// 三层缓存架构
PlanCache: Map<`${domain}:${taskType}:${hash}`, PlanContent>
    // 相同任务的计划可复用
    // 触发条件：任务描述相同或相似

StepResultCache: Map<`${domain}:${agent}:${skill}:${hash}`, StepResult>
    // 相同输入的步骤结果可复用
    // 触发条件：输入完全相同

ConstraintCache: Map<`${domain}:${agent}`, ConstraintDefinition[]>
    // 现有，增强版本检测

// 缓存策略
CacheKey 组成：domain:agent:skill:hash(input)
验证机制：Hash 内容变化时自动失效
预热机制：系统启动时加载常用约束和计划
```

**收益**：
```
假设：
- 相同任务出现 3-5 次（e.g. 多个模块的代码审查）
- 计划缓存命中率 30-40%
- 步骤结果缓存命中率 20-30%

预期节省：
  计划缓存：5-10K × 40% = 2-4K per hit
  步骤缓存：3-5K × 30% = 1-1.5K per hit
  总体：10-20%（取决于任务相似性）
```

#### ✨ 优化 #5：约束压缩与精简（预期节省 10-20%）

**现状**：
```markdown
# 全局约束 - 所有 Agent 必须遵守

## 完整输出

必须展示每个步骤的完整结果，不允许省略。包括：
- 输入参数
- 执行过程
- 最终结果
- 错误信息（如果有）

禁止只说"已完成"或"成功"，必须具体说明做了什么。

## 失败处理

遇到错误只重试一次，失败则报错退出。规则：
- 第一次失败：重试一次
- 第二次失败：报错并停止
- 禁止静默跳过失败

## 代码质量

代码变更必须通过测试才算完成。包括：
- 单元测试通过
- 集成测试通过
- 无编译错误
- 无 TypeScript 类型错误

## 落盘要求

生成内容必须立即落盘，返回文件路径。包括：
- 新建文件：返回完整路径
- 修改文件：说明修改了哪些位置
- 删除文件：确认操作
- 禁止只在对话框显示，不落盘

# ... 继续 8 个分类，共 32 条，14.7KB
```

**优化**：
```yaml
# 约束定义格式精简
constraints:
  - name: "complete_output"
    scope: ["universal"]
    rule: "Show all steps: input, process, result, errors"
    priority: "HIGH"

  - name: "single_retry"
    scope: ["universal"]
    rule: "On error: retry once, then fail"
    priority: "HIGH"

  - name: "test_required"
    scope: ["gongbu", "bingbu"]
    rule: "All code changes must pass tests (unit + integration)"
    priority: "HIGH"

  # ... 精简为 JSON 格式，节省 40-50% 的文本大小
```

**收益**：
```
原始约束：14.7KB
精简后：7-9KB（移除冗余描述，统一格式）
节省：40-50%
```

#### ✨ 优化 #6：变量共享池（预期节省 5-15%）

**问题**：
```
session.variables 在 Session 中重复序列化
huangdi 传递给 zhongshu
zhongshu 传递给 menxia
menxia 传递给 shangshu
...每个 Agent 都接收完整的变量集
```

**优化**：
```typescript
// Session 变量一次性预加载
Session {
  variables: Map<string, string>  // 全局共享
  variable_hash: string           // 用于检测变更
  last_update: timestamp
}

// Agent 收到变量引用而非完整内容
// 需要时从 Session 查询
variables: {
  "@ref": "session:variables",  // 引用而非完整内容
  "task_id": "abc-123",
  "domain": "general"
}

// 仅传输变更
delta: {
  "added": { "new_var": "value" },
  "removed": ["old_var"],
  "modified": { "existing_var": "new_value" }
}
```

**收益**：
```
原始：完整变量集 2-5K × 6-8 次 = 12-40K tokens
优化：完整变量集 2-5K × 1 次 + 增量 200 字节 × 7 次 = 2-5K + 1.4K = 3.4-6.4K
节省：(12-40K - 3.4K) / (12-40K) = 50-71%
```

---

### 4.3 P3 级优化（持续改进）

#### 优化 #7：并行执行流式报告（预期节省 5-10%）

```typescript
// 目前：所有并行任务完成后一次性返回报告

// 优化：使用流式报告
streaming_report: {
  timestamp: "2026-03-15T10:30:00Z",
  progress: { total: 40, completed: 35, failed: 0 },
  recent_completions: [
    { id: "task-39", status: "done", duration: 320 }
  ],
  eta: 5000  // 预计还需 5 秒
}
```

#### 优化 #8：约束文件 Hash 检测（预期节省 5-10%）

```typescript
// 检测约束文件是否修改
ConstraintHashMap: {
  "global.md": "abc123def456",
  "agents/gongbu.md": "xyz789pqr012",
  // ...
}

// 仅在哈希变更时重新加载和序列化
if (currentHash !== cachedHash) {
  reloadConstraints()
}
```

#### 优化 #9：Agent 负载均衡（预期节省 3-8%）

```typescript
// 调整不必要的步数
huangdi: 50 → 30     // 减少决策次数
zhongshu: 20 → 15    // 简化规划逻辑
menxia: 10 → 8       // 加快审核

// 调整温度参数
huangdi: 0.2 → 0.15  // 更一致的决策
gongbu: 0.1 → 0.05   // 更保守的实现
```

---

## 五、约束系统深度分析

### 5.1 约束全景图

```
global-constraints.yaml (14.7KB, 32 条)
│
├─ universal (7条, 4KB) - 所有 Agent 必须
│  ├─ complete_output
│  ├─ error_handling
│  ├─ code_quality
│  ├─ file_persistence
│  ├─ raw_reporting
│  ├─ no_override
│  └─ process_respect
│
├─ agent_implementation (4条, 1.5KB) - gongbu
│  ├─ full_implementation
│  ├─ no_branch_omission
│  ├─ explicit_types
│  └─ error_recovery
│
├─ agent_code_review (3条, 1KB) - xingbu
│  ├─ strict_review
│  ├─ critical_fix
│  └─ risk_identification
│
├─ agent_verification (3条, 1KB) - bingbu
│  ├─ test_pass_required
│  ├─ coverage_required
│  └─ performance_check
│
├─ parallel_execution (4条, 1.2KB)
│  ├─ true_parallelism
│  ├─ subtask_verify
│  ├─ fail_fast
│  └─ speedup_report
│
├─ skill_definition (4条, 1.2KB)
│  ├─ input_define
│  ├─ output_define
│  ├─ dependency_declare
│  └─ acceptance_criteria
│
├─ security (4条, 1.5KB)
│  ├─ no_hardcoded_creds
│  ├─ input_validate
│  ├─ sql_injection_prevent
│  └─ xss_prevent
│
└─ documentation (3条, 1KB)
   ├─ code_comment
   ├─ function_doc
   └─ changelog
```

### 5.2 约束发现流程优化

**现状流程**：
```
Agent 调用
  ↓
isConstraintsInjected(sessionId) 检查
  ├─ true → 跳过发现（仅此次）
  └─ false → 执行发现
  ↓
discoverConstraintsWithCache()
  ├─ 查询内存缓存
  ├─ 如果未命中 → 发现约束
  │  ├─ 加载 global.md
  │  ├─ 加载 domains/{domain}/
  │  ├─ 加载 agents/{agent}.md
  │  └─ 加载 domains/{domain}/{agent}.md
  │
  ├─ 去重 (按 constraint.name)
  ├─ 保存到内存缓存
  └─ 返回
  ↓
updateSessionConstraints() 存储
  ↓
markConstraintsInjected() 标记
  ↓
persistSessionStateToSDK() 持久化（Phase 3）
```

**优化后流程**：
```
Agent 调用
  ↓
getConstraintProfile(agentName, domain) 获取注入配置
  ├─ 查询约束成本表
  ├─ 决定注入哪些约束
  └─ 确定注入方式（完整/压缩/引用）
  ↓
checkConstraintVersion() 版本检查
  ├─ 计算约束文件 Hash
  ├─ 对比缓存 Hash
  └─ 如果版本相同 → 跳过重新加载
  ↓
getConstraints(agentName, domain, profile)
  ├─ 如果缓存命中 → 返回
  ├─ 否则 → 发现约束（仅加载需要的）
  └─ 应用压缩（如果启用）
  ↓
markConstraintsInjected() 标记
```

---

## 六、增强建议

### 6.1 Agent 系统增强方向

#### 🎯 方向 1：Agent 协作效率（短期）

**当前问题**：
- huangdi 每次决策都需要重新理解完整上下文
- 多 Agent 决策链缺乏上下文继承

**增强方案**：
```typescript
// Agent 上下文栈
interface AgentContext {
  sessionId: string
  previousAgent: string
  previousDecision: string
  decisionRationale: string
  timestamp: number
  confidence: number  // 决策置信度
}

// huangdi 可以引用前一个 Agent 的决策
"基于 menxia 的审核意见（置信度 95%），启动执行"
// 而不是重新理解审核意见
```

**收益**：
- 减少重复理解，token 节省 5-10%
- 加快决策速度

#### 🎯 方向 2：Agent 特化与通用 Agent（中期）

**增强方案**：
```
新增两类 Agent：

1. 专用 Agent（高效特化）
   - FileEditAgent：仅处理文件编辑
   - TestAgent：仅处理测试
   - AnalysisAgent：仅做分析

2. 通用 Agent（灵活多能）
   - GenericWorker：可处理多种任务
   - FallbackAgent：处理特殊情况

好处：
  - 专用 Agent 降低成本 30-40%
  - 通用 Agent 提高灵活性
  - 混合使用最优化
```

#### 🎯 方向 3：Agent 学习与记忆（长期）

**增强方案**：
```
每个 Agent 维护学习日志：
- 成功的决策模式
- 常见的失败原因
- 特定域的最佳实践

下次遇到类似任务时：
- 直接应用之前的成功模式
- 避免已知的失败陷阱
- 加快处理速度

预期收益：
- 任务处理速度提升 20-50%
- Agent 效率自动提升
```

### 6.2 实施路线图

#### Phase 5（2-3 周）：**快速优化**
```
✓ 优化 #1：约束分级注入         (3 天)
✓ 优化 #2：工作流 ID 引用        (2 天)
✓ 优化 #3：报告自适应压缩        (2 天)

预期总收益：50-70% token 节省
```

#### Phase 6（3-4 周）：**架构优化**
```
✓ 优化 #4：多层缓存架构          (4 天)
✓ 优化 #5：约束压缩精简          (2 天)
✓ 优化 #6：变量共享池            (3 天)

预期额外收益：15-25% token 节省
```

#### Phase 7（2-3 周）：**深度增强**
```
✓ 方向 1：Agent 协作效率         (3 天)
✓ 方向 2：特化 Agent 系统        (4 天)

预期额外收益：10-15% token 节省
```

### 6.3 关键指标与监控

#### Token 消耗追踪

```yaml
# 新增监控维度
token_metrics:
  constraint_injection:
    per_agent: token_count
    per_domain: token_count
    reduction_rate: percentage

  workflow_context:
    plan_transmission: token_count
    variable_transmission: token_count
    reduction_rate: percentage

  parallel_reports:
    per_task: token_count
    compression_rate: percentage

  cache_performance:
    hit_rate: percentage
    miss_penalty: token_count

  overall:
    baseline: token_count
    current: token_count
    improvement: percentage
```

#### 监控看板

```
Token 消耗地板（Token Dashboard）
├─ 实时消耗
│  ├─ 本次 Session: 5,234 tokens
│  ├─ 本小时: 45,231 tokens
│  └─ 今日: 324,421 tokens
│
├─ 优化效果
│  ├─ 约束分级：已节省 15,234 tokens (33%)
│  ├─ ID 引用：已节省 8,932 tokens (18%)
│  ├─ 报告压缩：已节省 6,234 tokens (11%)
│  └─ 总节省：30,400 tokens (62%)
│
├─ Agent 成本
│  ├─ huangdi: 12,543 tokens (28%)
│  ├─ zhongshu: 8,234 tokens (18%)
│  ├─ gongbu: 15,234 tokens (34%)
│  └─ 其他: 9,389 tokens (20%)
│
└─ 缓存效果
   ├─ 约束缓存命中率: 72%
   ├─ 计划缓存命中率: 45%
   └─ 步骤缓存命中率: 28%
```

---

## 七、总结与建议

### 核心发现

| 项目 | 现状 | 优化空间 | 优先级 |
|------|------|---------|--------|
| 约束注入 | 每次重复 14.7K | 分级注入减 50% | P1 🔴 |
| 工作流上下文 | 多次传输 | ID 引用减 60% | P1 🔴 |
| 并行报告 | 完整详细 | 自适应压缩减 30% | P1 🔴 |
| 缓存粒度 | 仅约束 | 扩展到计划 | P2 🟡 |
| 约束文本 | 冗余描述 | 精简减 40% | P2 🟡 |
| 变量管理 | 重复传输 | 共享池减 70% | P2 🟡 |

### 最优实施策略

```
三步走：

第 1 步（2 周）：快速赢
  ✓ 分级注入约束
  ✓ 工作流 ID 引用
  ✓ 报告自适应压缩
  → 预期节省：50-70%

第 2 步（3 周）：打造基础
  ✓ 多层缓存架构
  ✓ 约束精简压缩
  ✓ 变量共享池
  → 预期额外节省：15-25%

第 3 步（进行中）：深度优化
  ✓ Agent 协作增强
  ✓ 特化 Agent 系统
  ✓ Agent 学习与记忆
  → 预期额外节省：10-15%
```

### 风险评估

| 风险 | 概率 | 缓解方案 |
|------|------|---------|
| ID 引用导致数据不一致 | 低 | 强化 Session 一致性检查 |
| 缓存命中率低 | 中 | 实施预热和优先级机制 |
| 约束精简影响质量 | 低 | 保留 universal 完整性 |
| 性能变化难预测 | 中 | 完整的监控仪表板 |

---

**建议**：从 P1 优化开始，逐步实施 P2 和 P3，同时持续监控实际收益。预期 4-6 周内可实现 70-80% 的 Token 消耗优化。

