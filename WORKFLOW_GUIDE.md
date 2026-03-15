# 三省六部制工作流使用指南

## 核心理念

这是一个**智能约束 + 硬约束**混合的多 Agent 协调系统：

- **80% 智能约束**（Prompt 指导）- 灵活但强大
- **20% 硬约束**（系统级验证）- 防止偷懒
- **结果**：经济（1.2-1.3x token）+ 可靠（防偷懒）

---

## 四种工作流模式

### 1. Simple（简单任务）- 快速路径

**适用场景：**
- 单文件修改
- 简单 bug 修复
- 小补丁

**流程：**
```
understand → menxia_quick_check → execute → verify
```

**关键路径（不能跳过）：**
- understand（理解需求）
- menxia_quick_check（快速风险检查）
- execute（执行）

**Token 成本：** ~50-60K

---

### 2. Medium（中等任务）- 标准路径

**适用场景：**
- 跨文件修改
- 功能实现
- 架构调整

**流程：**
```
understand → plan → menxia_review → execute → verify
```

**关键路径（不能跳过）：**
- understand
- plan
- menxia_review（重点：必须审核）
- execute

**Token 成本：** ~60-80K

**何时使用：** 大多数日常任务

---

### 3. Complex（复杂任务）- 完整路径

**适用场景：**
- 大规模重构
- 多模块协调
- 系统升级

**流程：**
```
understand → plan → menxia_review
  → libu_structure + hubu_deps + bingbu_perf + libu_rites_check (并行)
  → menxia_final_review → execute → verify
```

**关键路径：**
- understand
- plan
- menxia_review
- menxia_final_review
- execute

**并行任务：** libu + hubu + bingbu + libu_rites 可同时进行

**Token 成本：** ~150-200K

---

### 4. High Risk（高风险任务）- 双审核路径

**适用场景：**
- 删除代码
- 权限变更
- 数据库变更
- 依赖更新
- 安全相关修改

**流程：**
```
understand → plan → menxia_risk_check
  → oracle_consultation (新增)
  → menxia_final_approval → execute → verify
```

**关键路径：**
- understand
- plan
- menxia_risk_check
- oracle_consultation（必须有特殊顾问）
- menxia_final_approval
- execute

**Token 成本：** ~80-100K

**重点：** 需要 oracle 特殊咨询，extra gate

---

## 工作流执行步骤

### 步骤 1：初始化工作流

Emperor 启动工作流，指定任务类型：

```
用户："我想要重构整个 Agent 系统"

皇帝："这是一个复杂任务。初始化工作流。"

系统会创建任务队列：
  1. understand - [PENDING]
  2. plan - [PENDING] ← 等待 understand 完成
  3. menxia_review - [PENDING] ← 等待 plan 完成
  4. libu_structure - [PENDING] ← 等待 menxia_review 完成
  ... 等
```

### 步骤 2：查看任务队列

```
@getTaskQueue

输出：
[TASK QUEUE]
1. [PENDING] understand: 理解需求
   Agent: 未声明

2. [PENDING] plan: 制定计划
   Agent: 未声明
   ← blocked by: understand

3. [PENDING] menxia_review: 审核计划
   Agent: 未声明
   ← blocked by: plan

... etc
```

### 步骤 3：Agent 声明任务

当 Agent 要开始做某个任务时，**必须明确声明**：

```
皇帝："我现在声明开始任务 understand（理解需求）"

系统验证：
✅ 依赖完成？是（这是第一步）
✅ 任务存在？是
✅ 已被声明？否

结果：任务状态变为 CLAIMED
皇帝开始执行理解工作...
```

**禁止行为：**
- ❌ 跳过声明，直接开始工作
- ❌ 声明不存在的任务
- ❌ 声明前置依赖未完成的任务

### 步骤 4：执行任务

Agent 严格按照任务描述执行：

```
皇帝：
1. 阅读用户需求
2. 与 menxia 讨论初步风险
3. 列出 5 个关键理解点
4. 标记任务完成
```

**关键原则：**
- ✅ 逐步执行（不跳过）
- ✅ 每步都验证
- ✅ 遇到问题立即报告

### 步骤 5：完成任务

执行完毕后，**必须明确声明完成**：

```
皇帝："understand 任务完成。

输出：
  - 用户需求的核心是...
  - 涉及的文件包括...
  - 估计复杂度：medium
  - 主要风险：..."

系统：
✅ 标记任务为 DONE
✅ 自动解锁依赖此任务的下一步
✅ 通知 zhongshu："你的 plan 任务现已可以开始"
```

### 步骤 6：循环直到完成

```
understand ✅ 完成
  ↓
plan（zhongshu 开始）
  ↓
menxia_review（menxia 审核）
  ↓
execute（shangshu 执行）
  ↓
verify（皇帝 验证）
  ↓
全部完成 ✅
```

---

## Agent 角色和职责

### 皇帝（huangdi）- Primary Agent

**权力：**
- 决定工作流类型
- 协调全局
- 做最终验证

**不能做：**
- ❌ 自己写代码（权限限制）
- ❌ 跳过 menxia 审核
- ❌ 跳过规范流程

**责任：**
1. 理解需求
2. 监督流程
3. 处理障碍
4. 做最终决定

---

### 中书省（zhongshu）- 规划

**权力：**
- 制定详细计划
- 分解复杂任务

**职责：**
1. 分析需求（深入理解）
2. 研究现状（read/glob/grep）
3. 设计详细计划（5-10+ 步）
4. 分析风险（至少 3 个）
5. 列出资源和依赖

**关键交付物：**
```
[总体目标]
...

[执行步骤]
1. 步骤 1 - 做什么、为什么、预期结果
2. 步骤 2 - ...
... (至少 5-10 步)

[预期成果]
...

[潜在风险]
1. 风险 - 后果 - 缓解方案
2. ...

[成功标准]
...
```

---

### 门下省（menxia）- 审核

**权力（最强）：**
- ✅ 批准进行
- ⚠️ 要求修改
- ❌ 拒绝方案

**职责：**
1. 深入理解内容
2. 分析至少 5 个风险
3. 做出明确决定

**决策格式：**
```
[OK] 我批准这个计划。理由：
1. 方案技术上可行
2. 没有发现关键风险
3. 符合项目标准

[CYCLE] 需要修改以下内容再提交：
1. 问题 - 建议
2. ...

[FAIL] 我无法批准这个方案。原因：
1. 严重问题 - 后果
2. ...
```

**关键原则：**
- ✅ 花时间思考
- ✅ 坚持你的判断
- ✅ 不要匆忙批准
- ❌ 不要因为权力妥协判断

---

### 尚书省（shangshu）- 执行

**权力：**
- write / edit / bash（完全执行权限）

**职责：**
1. 严格遵循计划
2. 逐步执行和验证
3. 处理突发问题
4. 报告进度

**执行模式：**
```
对每一步：
1. 准备（检查文件、环境）
2. 执行（修改代码、运行命令）
3. 验证（测试、检查结果）
4. 问题处理（诊断和解决）

完成检查：
- 代码质量符合标准？
- 所有测试通过？
- 有没有回归？
- 有没有副作用？
```

---

### 六部（6 个专业部）

在 complex 任务中并行执行：

- **libu（吏部）** - 代码结构与组织
- **hubu（户部）** - 依赖与资源管理
- **libu-rites（礼部）** - 标准与规范
- **bingbu（兵部）** - 性能与优化
- **xingbu（刑部）** - 错误处理与恢复
- **gongbu（工部）** - 构建与部署

---

## 防偷懒机制详解

### 1. 任务队列可见性

所有 Agent 都能看到完整的任务列表。无法假装"不知道要做什么"。

```
Agent：我不知道下一步做什么...
系统：你可以看所有任务！@getTaskQueue
Agent：啊...
```

### 2. 强制依赖检查

试图跳过前置任务会被系统拦截：

```
Agent："我现在做 execute"
系统：[DEPENDENCY ERROR] execute 依赖 menxia_review，但还没完成！
Agent：...
```

### 3. 关键路径守护

尝试绕过关键路径的任务会被拒绝：

```
Agent："我跳过 menxia_review，直接执行"
系统：[WORKFLOW ERROR] menxia_review 在关键路径上，不能跳过！
Agent：...
```

### 4. Prompt 强化

每个 Agent 的 Prompt 都明确说明规则和禁止行为：

```
❌ 禁止直接调用 shangshu，跳过规划
❌ 禁止认为流程太慢而减少步骤
❌ 禁止相信这很简单，不需要规划
```

### 5. 系统级验证

plugin.ts 中的 hook 进行最后检查：

```
✅ 有没有声明任务？
✅ 任务是否存在？
✅ 依赖是否完成？
✅ 配方是否合规？
```

---

## 常见问题

### Q: 为什么不能跳过 menxia 审核？
**A:** menxia 是质量守门人。好的审核能防止：
- 隐藏的 bug
- 性能问题
- 安全漏洞
- 架构问题

跳过审核短期快，长期代价大。

### Q: 为什么要声明任务？
**A:** 声明能做到：
- 追踪谁在做什么
- 防止重复工作
- 强制依赖顺序
- 清晰的责任划分

### Q: 能不能同时做多个任务？
**A:** 在同步流程中不行。但在 complex 任务中，六部可以并行：
```
libu_structure + hubu_deps + bingbu_perf + libu_rites_check
```

### Q: 遇到计划外的问题怎么办？
**A:** 不要自作聪明改计划！应该：
1. 诊断问题
2. 在框架内尝试解决
3. 如果无法解决，报告给 Emperor 和 menxia
4. 等待指示

---

## Token 成本对比

| 任务类型 | Token 消耗 | 成本 | 备注 |
|---------|----------|------|------|
| Simple | 50-60K | $0.60 | 快速路径 |
| Medium | 60-80K | $0.75 | 标准路径 |
| Complex | 150-200K | $1.90 | 完整路径 |
| High Risk | 80-100K | $1.00 | 双审核 |

**对比 Claude Teams（7x token）：**
- Teams Simple：50K × 7 = 350K ❌ 昂贵
- 我们 Simple：50K ✅ 经济

---

## 最佳实践

1. **正确选择任务类型**
   - 不要过度工程化（Simple 用 complex 配方）
   - 不要过度简化（Complex 用 simple 配方）

2. **menxia 要认真**
   - 花时间思考
   - 提出具体问题
   - 坚持你的判断

3. **zhongshu 要详细**
   - 至少 5-10 个步骤
   - 至少 3 个风险
   - 成功标准明确

4. **shangshu 要严格**
   - 每步都验证
   - 不要跳过测试
   - 问题立即报告

5. **皇帝要有耐心**
   - 流程就是权力
   - 不要为了快而牺牲质量
   - 信任你的朝代

---

## 下一步改进（Phase 2）

- [ ] Oracle Agent（高风险任务的特殊顾问）
- [ ] 并行任务的自动化
- [ ] Token 消耗监控和报警
- [ ] 自动化流程优化建议
- [ ] Web UI 仪表板
- [ ] 工作流历史和统计

---

**最后记住：好的流程就是高效的流程。** 🎯
