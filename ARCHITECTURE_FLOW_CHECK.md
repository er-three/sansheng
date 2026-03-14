# 流程架构检查：并行方案与全局规则符合度

**检查时间**：2026-03-14
**检查内容**：sansheng-liubu plugin 是否符合三级并行架构和全局约束规则

---

## 📊 快速评分

| 方面 | 状态 | 符合度 | 说明 |
|------|------|--------|------|
| **Level 1 串行**（步骤间） | ✅ | 100% | domain.yaml 定义清楚 |
| **Level 2 并行**（代理间） | ⚠️ | 30% | 有架构，缺实现 |
| **Level 3 并行**（子任务间） | ❌ | 0% | 完全未实现 |
| **全局约束注入** | ❌ | 0% | 只有配置，无 hook |
| **流程执行** | ⚠️ | 40% | 配置完整，执行不完整 |

**总体**：🔴 **40-50%** 符合度（架构上符合，执行上不符合）

---

## 🔍 详细分析

### ✅ 已符合项

#### 1. Level 1：步骤间串行 - 100%

**要求**：步骤按顺序执行，无跳步

**现状**：✅ **已实现**

domain.yaml 中清晰定义了步骤顺序：
```yaml
pipeline:
  - id: analyze
    uses: [yibu, hubu]
  - id: implement
    uses: [gongbu, bingbu]
  - id: verify
    uses: [xingbu, bingbu]
```

**符合度**：✅ 100% - 配置清晰，执行框架（shangshu）能理解

---

### ⚠️ 部分符合项

#### 2. Level 2：步骤内代理并行 - 30%

**要求**：
- uses: [agent1, agent2] 中的多个 agent 真正并行执行
- Plugin 自动跟踪并行状态
- 所有 agent 完成后进入下一步

**现状**：
```
代码有：
✅ ParallelTask 接口定义（L29）
✅ ParallelStep 接口定义（L35）
✅ generatePipelineStatus() 函数（L96）
✅ tool.execute.after 钩子（L447）

代码缺：
❌ 初始化并行的 init_parallel 工具（应在 tool.execute.before）
❌ 实际的并行执行逻辑（Promise.all() 或类似）
❌ 并行状态的实时更新机制
```

**符合度**：⚠️ 30% - 架构框架存在，执行逻辑不完整

**具体缺陷**：
```typescript
// ✅ 已有：检测并行完成
if (state.parallel_execution && state.parallel_execution.step_id === stepId) {
  const parallelExec = state.parallel_execution
  const agent = (input as any).args?.agent || "unknown"
  const task = parallelExec.tasks.find(t => t.agent === agent)

  if (task) {
    task.status = 'done'
  }
  // ✅ 检查所有任务是否完成
  const allDone = parallelExec.tasks.every(t => t.status === 'done' || t.status === 'failed')
}

// ❌ 缺：如何启动并行？
// 应该有：
function init_parallel(step_id: string, agents: string[]): void {
  const tasks = agents.map(agent => ({
    agent,
    status: 'pending'
  }))

  state.parallel_execution = {
    step_id,
    tasks,
    all_done: false,
    started_at: new Date().toISOString()
  }
}
```

---

### ❌ 未实现项

#### 3. Level 3：代理内子任务并行 - 0%

**要求**：
- gongbu 自动识别独立文件修改
- 使用 Promise.all() 并行执行
- 返回 parallel_subtasks 数组
- 所有子任务验证成功

**现状**：
```
❌ 无 TaskDecomposer 集成
❌ 无并行子任务执行逻辑
❌ 无 parallel_subtasks 验证
❌ gongbu.md 中有规则，但 plugin 中无执行支持
```

**符合度**：❌ 0% - 完全未实现

**需要实现**：
```typescript
// gongbu 的并行执行示例
async function executeGongbuParallel(files: string[]): Promise<ParallelResult> {
  // 1. 分析依赖
  const groups = await TaskDecomposer.decompose(files)

  // 2. 并行执行每组
  const results = await Promise.all(
    groups.map(group =>
      executeGroup(group)
    )
  )

  // 3. 汇总并验证
  return {
    parallel_subtasks: results,
    theoretical_speedup: calculateSpeedup(results)
  }
}
```

---

#### 4. 全局约束注入 - 0%

**要求**：
- Plugin 读取 global-constraints.yaml
- 通过 experimental.chat.system.transform 钩子注入
- 所有 Agent 自动获得约束

**现状**：
```
✅ .opencode/global-constraints.yaml 已创建
✅ 定义了 9 类 30+ 条约束

❌ Plugin 中无读取约束的代码
❌ experimental.chat.system.transform 中无注入约束的逻辑
❌ 约束无法生效
```

**符合度**：❌ 0% - 配置存在，注入逻辑缺失

**需要实现**：
```typescript
"experimental.chat.system.transform": async (_input, output) => {
  try {
    // ← 这里缺：读取并注入全局约束

    const globalConstraints = readGlobalConstraints(ROOT)  // ❌ 没有这个
    const agentType = _input.agent_type || "unknown"

    // 注入通用约束
    const universalConstraints = globalConstraints.universal || []
    const constraintText = [
      "## 全局通用约束（必须遵守）",
      ...universalConstraints.map(c => `- ${c.content}`)
    ].join("\n")
    output.system.push(constraintText)  // ← 需要添加这一步

    // ... 原有逻辑继续
  }
}
```

---

## 📋 对比分析

### UATAgent 版本 vs sansheng-liubu 版本

| 功能 | UATAgent | sansheng-liubu | 备注 |
|------|----------|----------------|------|
| domain.yaml | ✅ | ✅ | 两者都有 |
| global-constraints.yaml | ✅ | ✅ | 两者都有 |
| ParallelTask/Step | ✅ | ❌ | UATAgent 有实现 |
| init_parallel 工具 | ✅ | ❌ | UATAgent 有 |
| 约束注入 Hook | ✅ | ❌ | UATAgent 有实现 |
| Level 2 并行支持 | ✅ | ❌ | UATAgent 完整 |
| Level 3 并行支持 | ✅ | ❌ | UATAgent 完整 |
| 可运行执行 | ✅ | ❌ | UATAgent 能实际执行 |

**结论**：sansheng-liubu 是 UATAgent 的简化配置版本，缺少执行层的实现

---

## 🎯 现状总结

### 什么已有（配置层）✅

```
.opencode/
├── global-constraints.yaml         ✅ 约束定义完整
├── domains/
│   ├── asset-management/
│   │   ├── domain.yaml            ✅ pipeline 清晰
│   │   └── skills/                ✅ 每个 skill 清晰
│   ├── cr-processing/             ✅ 类似
│   ├── reverse-engineering/       ✅ 类似
│   └── video/                     ✅ 类似
└── agents/
    ├── huangdi.md                 ✅ 路由规则清晰
    ├── zhongshu.md                ✅ 规划规则清晰
    ├── menxia.md                  ✅ 审核规则清晰
    ├── shangshu.md                ✅ 执行规则清晰（含 Level 3）
    └── 六部.md                    ✅ 职责清晰

结论：配置层 100% 符合架构规则
```

### 什么缺失（执行层）❌

```
Plugin (sansheng-liubu)
├── Level 2 并行执行        ❌ 缺 init_parallel + 状态跟踪
├── Level 3 并行执行        ❌ 缺 TaskDecomposer 集成
├── 约束注入 Hook           ❌ 缺 readGlobalConstraints + 注入
├── 并行状态管理            ⚠️ 有框架，无执行逻辑
└── 完整的执行引擎          ❌ 缺

结论：执行层 0-30% 符合架构规则
```

---

## 💡 问题的根源

这是一个**架构设计 vs 架构实现**的差距：

### 当前情况

```
【设计完美】
domain.yaml + agent.md + global-constraints.yaml
    ↓
所有规则定义都很清楚
    ↓
【执行不完整】
Plugin 代码
    ↓
缺少关键的执行逻辑
    ↓
【结果】
虽然设计完美，但实际运行时不能真正并行、不能注入约束
```

### 为什么会这样

1. **UATAgent** 是完整项目版本
   - 含完整的 Plugin 实现
   - 所有 hook 都已实现
   - 能真正执行三级并行

2. **sansheng-liubu** 是 npm package 版本
   - 抽取出来的是配置和接口定义
   - 简化了代码，删除了执行逻辑
   - 导出给外部使用的最小集合

---

## ✅ 清单

### 配置层 - 100% 符合
- [x] domain.yaml 定义清晰（pipeline, skills, uses）
- [x] global-constraints.yaml 完整（9 类 30+ 条）
- [x] agent 规则文档（huangdi → shangshu → 六部）
- [x] 并行规则说明（gongbu.md 有 Level 3 协议）
- [x] 自动路由规则（huangdi.md 有）

### 执行层 - 0-30% 符合
- [ ] Level 2 并行执行逻辑（缺 init_parallel）
- [ ] Level 3 并行执行逻辑（缺 TaskDecomposer）
- [ ] 约束注入 Hook（缺 readGlobalConstraints）
- [ ] 并行状态跟踪实现（有框架，无逻辑）
- [ ] 完整的执行引擎（缺）

---

## 🎯 结论

**你的问题的答案**：

### 代码流程符合度

```
设计规则：✅ 100% 符合
配置层：  ✅ 100% 符合
执行层：  ❌ 0-30% 符合

总体：🟡 40-50% 符合
```

### 具体情况

- ✅ **Level 1 串行**：完全符合（domain.yaml 定义清楚）
- ⚠️ **Level 2 并行**：30% 符合（有框架无执行）
- ❌ **Level 3 并行**：0% 符合（完全未实现）
- ❌ **全局约束**：0% 符合（配置存在，无注入）

### 原因

sansheng-liubu 是从 UATAgent 抽取出来的**配置 + 接口定义**，缺少了**执行逻辑**。它是设计完美的"蓝图"，但缺少"施工队"。

---

## 📝 这应该记作 TODO

- [ ] 向 sansheng-liubu 中添加 Level 2 并行执行逻辑
- [ ] 向 sansheng-liubu 中添加 Level 3 并行执行逻辑
- [ ] 向 sansheng-liubu 中添加约束注入 Hook
- [ ] 完整的执行引擎实现
- [ ] 集成 TaskDecomposer 工具
- [ ] 完整的端到端测试

**工期估算**：3-5 天（架构已定，就是补齐执行逻辑）
