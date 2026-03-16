# 丞相府重构任务 - 明天优先处理

**创建时间**: 2026-03-16 20:00 UTC
**优先级**: 🔴 高
**状态**: ⏳ 待处理（明天第一项）
**预计工作量**: 8-12 小时
**关联文件**: BOUNDARY_ENHANCEMENT_PLAN.md Phase 1

---

## 📋 问题描述

### 当前状态混乱

存在职责重叠和混淆：

| 组件 | 实现方式 | 职责 | 状态 |
|------|---------|------|------|
| **丞相府 (Chancellery)** | 内部类 | 初始化工作流、生成任务、分配任务 | ✅ 代码存在，被使用 |
| **中书省 (zhongshuAgent)** | OpenCode Agent | 规划与方案设计 | ✅ 定义存在，**未被调用** |
| **门下省 (menxiaAgent)** | OpenCode Agent | 计划审核 | ✅ 定义存在，**未被调用** |
| **尚书省 (shangshuAgent)** | OpenCode Agent | 任务调度 | ✅ 定义存在，**未被调用** |
| **御史台 (yushitai)** | - | 执行验证 | ❌ **未实现** |

### 核心问题

1. **职责重叠**
   - 丞相府做"工作流规划"
   - 中书省也做"规划"
   - **谁才是真正的规划者？**

2. **代码混乱**
   - 三省六部有 Agent 定义但未被使用
   - 只有内部 Chancellery 在运行
   - 新架构设计（BOUNDARY_OPTIMIZATION_DESIGN.md）与现实代码不符

3. **新设计无法实施**
   - BOUNDARY_OPTIMIZATION_DESIGN.md 建议的"一分为二"无法实现
   - 御史台（新增）没有代码
   - 重试逻辑（来自 BOUNDARY_ENHANCEMENT_PLAN.md）无处安放

---

## ✅ 解决方案：完全使用 Agent（推荐）

### 方案概述

**移除内部丞相府，全面采用真实的三省六部 Agent 调用链**：

```
用户输入（皇帝的目标）
    ↓
[中书省 Agent] - 制定执行计划（读取 domain.yaml，生成任务）
    ↓
[门下省 Agent] - 审核计划（检查循环依赖、缺失步骤）
    ↓
[尚书省 Agent] - 协调调度（根据计划分配任务给六部）
    ↓
[六部 Agent] - 执行修改（Gongbu、Libu 等具体执行）
    ↓
[御史台 Agent] - 验证结果（NEW）
    ↓
[皇帝] - 最终决策
```

### 工作流程

#### 现在的流程（错误）
```
plugin.ts
  → initializeChancellery()（内部逻辑）
  → 生成任务队列
  → 没有真实的 Agent 参与
```

#### 改进后的流程（正确）
```
plugin.ts
  → 调用中书省 Agent（制定计划）
  → 调用门下省 Agent（审核计划）
  → 调用尚书省 Agent（协调执行）
  → 调用六部 Agent（实际执行）
  → 调用御史台 Agent（验证结果）
  → 返回皇帝（最终验收）
```

---

## 🔧 具体改动清单

### 第 1 步：完善现有 Agent（zhongshu, menxia, shangshu）

```markdown
文件: src/agents/zhongshuAgent.ts
改动:
  - ✅ 已有基础定义
  - TODO: 补充读取 domain.yaml 的具体逻辑
  - TODO: 补充生成任务队列的细节

文件: src/agents/menxiaAgent.ts
改动:
  - ✅ 已有基础定义
  - TODO: 补充循环依赖检测逻辑
  - TODO: 补充缺失步骤检测逻辑
  - TODO: 补充验证输出 schema

文件: src/agents/shangshuAgent.ts
改动:
  - ✅ 已有基础定义
  - TODO: 补充任务分配逻辑
  - TODO: 补充重试机制（来自 BOUNDARY_ENHANCEMENT_PLAN）
  - TODO: 补充失败分类处理
```

### 第 2 步：新增御史台 Agent

```markdown
文件: src/agents/yushitaiAgent.ts
内容: 新建
职责:
  - 验证执行结果
  - 分类失败原因（LOGIC/DATA/TIMEOUT/PERMISSION）
  - 确定是否需要重试或上报皇帝
```

### 第 3 步：修改 plugin.ts

```markdown
文件: src/plugin.ts
改动:

1. 移除或隔离丞相府的使用
   - 行 71-77: 删除 chancellery 相关导入
   - 行 350-364: 用真实的中书省 Agent 调用替换

2. 新增 Agent 调用链
   - 创建函数: executeWithAgents()
   - 调用顺序: 中书省 → 门下省 → 尚书省 → 六部 → 御史台
   - 支持部分失败重试（来自 BOUNDARY_ENHANCEMENT_PLAN）

3. 更新错误处理
   - 从丞相府的内部异常转为 Agent 的返回值处理
```

### 第 4 步：移除或标记为已弃用

```markdown
文件: src/workflows/chancellery.ts
状态: 标记为 @deprecated（暂不删除，用于参考）

文件: src/workflows/agent-task-mapper.ts
状态: 保留（供尚书省使用任务分配）

文件: src/session/task-queue.ts
状态: 保留（内部任务管理工具）
```

---

## 📝 修改文件详细清单

| 文件 | 操作 | 优先级 | 工作量 |
|------|------|--------|--------|
| `src/agents/zhongshuAgent.ts` | 增强提示词 | 🔴 高 | 2h |
| `src/agents/menxiaAgent.ts` | 增强提示词 | 🔴 高 | 2h |
| `src/agents/shangshuAgent.ts` | 增强提示词 + 重试逻辑 | 🔴 高 | 2h |
| `src/agents/yushitaiAgent.ts` | 新建 | 🔴 高 | 2h |
| `src/plugin.ts` | 大幅重构 hook 逻辑 | 🔴 高 | 3-4h |
| `src/workflows/chancellery.ts` | 标记为 @deprecated | 🟢 低 | 0.5h |
| 相关测试文件 | 更新或新增 | 🟡 中 | 2-3h |
| **总计** | | | **14-16h** |

---

## 🧪 测试计划

### 测试场景

```typescript
// 测试 1：完整的 Agent 调用链
✓ 用户给出目标
✓ 中书省生成计划
✓ 门下省批准计划
✓ 尚书省分配任务
✓ 六部执行修改
✓ 御史台验证结果
✓ 皇帝做最终决策

// 测试 2：验证失败处理
✓ 逻辑错误 → 重试 → 成功/仍失败上报
✓ 数据错误 → 立即上报（不重试）
✓ 权限错误 → 立即上报（不重试）
✓ 超时错误 → 重试 → 成功/仍失败上报

// 测试 3：边界场景
✓ 计划无法通过审核 → 返回皇帝
✓ Domain 变更 → 中书省检测 → 拒绝执行
✓ 并发任务 → 尚书省正确分配
✓ 部分任务失败 → 正确的恢复策略
```

---

## 📌 关键决策点

**Q: 是否保留 Chancellery 类？**
A: 暂时标记为 @deprecated，保留用于参考，确保不会有遗漏的逻辑

**Q: Task Queue 是否保留？**
A: 保留，作为内部状态管理工具（尚书省需要它来分配和追踪任务）

**Q: 三省六部 Agent 是否立即可用？**
A: 需要增强提示词，确保它们知道如何读取 domain.yaml、生成任务等

**Q: 预计何时完成？**
A: 明天一整天（8-12 小时）

---

## 📚 关联文档

- BOUNDARY_OPTIMIZATION_DESIGN.md - 新的架构设计
- BOUNDARY_ENHANCEMENT_PLAN.md - Phase 1 包含了类似的内容
- CODE_QUALITY_AUDIT_RESULTS.md - 质量审计

---

## ✅ 完成标准

- [ ] 所有 Agent 都有完整的实现
- [ ] plugin.ts 中完全移除对 Chancellery 的依赖
- [ ] 御史台 Agent 已创建并集成
- [ ] 所有测试用例都通过
- [ ] 新的 Agent 调用链已验证
- [ ] 文档已更新

---

**优先级**: 🔴🔴🔴 (最高)
**开始时间**: 明天上午
**预计完成**: 明天下午

