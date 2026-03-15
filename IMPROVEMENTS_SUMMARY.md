# OpenCode 架构改进摘要

**日期**：2026-03-15
**总体符合度**：✅ 85%（很好）

---

## 🎯 核心问题（3 个）

### ❌ 问题 1：Plugin 导出模式不标准

**当前**：
```typescript
export const sanshengLiubuPlugin: any = { ... }
```

**应改为** ✅：
```typescript
export default async function sanshengLiubuPlugin(context: PluginContext) {
  return { ... }
}
```

**为什么重要**：
- 官方加载器期望异步函数，不是对象
- 无法访问 `context.project.config` 中的配置
- 不符合官方 Plugin 生态标准

**修复难度**：⭐ 简单（1 小时）

---

### ❌ 问题 2：使用了实验性 Hook

**当前**：
```typescript
"experimental.chat.system.transform": ...
"experimental.session.compacting": ...
```

**为什么有问题**：
- ⚠️ `experimental.*` Hook 随时可能变化
- ⚠️ 官方不保证稳定性
- ✅ 官方有稳定替代方案

**应改为** ✅：
```typescript
"session.updated": async (context, session) => {
  // 约束注入逻辑
}
```

**修复难度**：⭐⭐ 中等（2-3 小时）

---

### ❌ 问题 3：自己维护 Session 状态

**当前**：
```typescript
const sessions = new Map<string, SessionState>()  // ❌ 自己维护
```

**为什么有问题**：
- ❌ 违反官方推荐（应用 SDK API）
- ❌ 内存管理问题（虽然有清理，仍不最优）
- ❌ 无法跨进程共享状态
- ❌ 进程重启时丢失

**应改为** ✅：
```typescript
// 使用官方 SDK
await context.client.session.update(session.id, {
  metadata: {
    injected_constraints: { "general:gongbu": true }
  }
})
```

**修复难度**：⭐⭐⭐ 困难（4-5 小时）

---

## 🟡 次要问题（2 个）

### 问题 4：配置管理没用官方系统

**当前**：
```typescript
const registry = readRegistry(root)  // 自己读 JSON
```

**应改为** ✅：
```typescript
export default async function plugin(context: PluginContext) {
  const domain = context.project.config.domain  // 官方配置
}
```

**好处**：
- ✅ 自动支持环境变量 `{env:VAR}`
- ✅ 自动支持文件引用 `{file:path}`
- ✅ 自动配置合并

**修复难度**：⭐⭐ 中等（2-3 小时）

---

### 问题 5：缺少 CI/CD 和 npm 发布

**缺失**：
```
❌ GitHub Actions CI/CD
❌ npm publish 配置
❌ 发布到官方市场的配置
```

**修复难度**：⭐ 简单（1-2 小时）

---

## ✅ 做得很好的地方（超越官方标准）

| 方面 | 评分 | 说明 |
|------|------|------|
| 模块化架构 | ⭐⭐⭐⭐⭐ | 远超官方推荐 |
| 单一职责 | ⭐⭐⭐⭐⭐ | 完美遵循 |
| 类型安全 | ⭐⭐⭐⭐⭐ | 非常严格 |
| 测试覆盖 | ⭐⭐⭐⭐⭐ | 31 个测试全通过 |
| 文档完整 | ⭐⭐⭐⭐⭐ | 超过官方示例 |
| 代码质量 | ⭐⭐⭐⭐⭐ | 专业级别 |

---

## 📊 改进优先级和工作量

### 立即改进（这周）

| 问题 | 工作量 | 优先级 | 风险 |
|------|--------|--------|------|
| Plugin 导出模式 | 1h | 🔴 Critical | 高 |
| Experimental Hook | 2-3h | 🔴 Critical | 高 |
| **小计** | **3-4h** | | |

### 近期改进（下周）

| 问题 | 工作量 | 优先级 | 风险 |
|------|--------|--------|------|
| Session 状态管理 | 4-5h | 🟡 Important | 中 |
| 配置管理 | 2-3h | 🟡 Important | 低 |
| **小计** | **6-8h** | | |

### 长期改进（可选）

| 问题 | 工作量 | 优先级 |
|------|--------|--------|
| CI/CD 配置 | 1-2h | 🟢 Nice to Have |
| npm 发布 | 1h | 🟢 Nice to Have |
| **小计** | **2-3h** | |

---

## 🎬 行动计划

### 第 1 步：修改导出方式（1 小时）

**文件**：`src/index.ts` (新建)

```typescript
import type { PluginContext } from "@opencode-ai/plugin"
import { createPlugin } from "./plugin"

export default async function sanshengLiubuPlugin(context: PluginContext) {
  return createPlugin(context)
}
```

**修改**：`src/plugin.ts`

```typescript
// 改为导出工厂函数，不导出常量
export function createPlugin(context: PluginContext): OpenCodePlugin {
  return {
    name: "@sansheng/liubu",
    version: "1.0.0",
    hooks: { ... }
  }
}
```

---

### 第 2 步：替换 Hook（2-3 小时）

**替换这些**：
```typescript
❌ "experimental.chat.system.transform"
❌ "experimental.session.compacting"
```

**改为这些**：
```typescript
✅ "session.updated"      - 当 Session 更新时
✅ "session.created"      - 当 Session 创建时
✅ "tool.execute.after"   - 保留（已稳定）
✅ "tool.execute.before"  - 新增（可选）
```

---

### 第 3 步：迁移状态管理（4-5 小时）

**删除这个**：
```typescript
❌ const sessions = new Map<string, SessionState>()
❌ function getOrCreateSessionState() { ... }
❌ function markConstraintsInjected() { ... }
```

**改为这样**：
```typescript
✅ 使用官方 SDK：context.client.session.update()
✅ 在 session.metadata 中存储状态
✅ 自动持久化和跨进程共享
```

---

### 第 4 步：改进配置（2-3 小时）

**简化配置读取**：

```typescript
// 旧方式
const registry = readRegistry(root)

// 新方式
const domain = context.project.config?.domain || "general"
```

---

## 🚨 风险评估

### 高风险（立即修复）

```
❌ Experimental Hook 随时可能变化
   → 代码可能在下个 OpenCode 版本失效
   → 修复：改用稳定 Hook
```

```
❌ Plugin 导出模式不标准
   → 官方加载器可能无法识别
   → 修复：改为异步函数
```

### 中等风险（近期修复）

```
⚠️ Session 状态自己维护
   → 内存泄漏风险
   → 无法与其他工具共享状态
   → 修复：用官方 SDK
```

---

## 📈 改进前后对比

### 改进前

```
符合度         85% (很好，但有隐患)
风险等级       高 (Experimental Hook)
官方兼容性     70% (部分不符)
生态集成       60% (缺少发布)
```

### 改进后

```
符合度         98% (接近完美)
风险等级       低 (全用稳定 API)
官方兼容性     100% (完全符合)
生态集成       90% (可发布到市场)
```

---

## ⏰ 预计总工作量

```
立即改进    3-4h  【这周完成】
近期改进    6-8h  【下周完成】
长期改进    2-3h  【可选】
━━━━━━━━━━━━━━
总计       11-15h
```

---

## 🎯 建议决策

### 选项 A：快速修复（推荐）

```
✅ 做完立即改进的 3-4h 工作
   → 解决 Experimental Hook 问题
   → 改为标准导出模式
   → 降低风险到低

时间：本周完成
风险：从高降到低
```

### 选项 B：完整改进

```
✅ 做完全部改进（11-15h）
   → 完全符合官方标准
   → 可发布到 npm 官方市场
   → 生产就绪

时间：2 周完成
收益：最大化
```

### 选项 C：维持现状（不推荐）

```
❌ 保持现在的实现
   → 代码质量很好
   → 但有风险隐患
   → 无法发布到官方市场

风险：高（依赖 Experimental API）
```

---

## 📞 我的建议

**优先级排序**：

1. **必做**（本周）
   - ✅ 改 Plugin 导出模式
   - ✅ 替换 Experimental Hook
   - ⏱️ 工作量：3-4h

2. **应做**（下周）
   - ✅ 迁移到官方 Session API
   - ✅ 改进配置管理
   - ⏱️ 工作量：6-8h

3. **可做**（之后）
   - ✅ CI/CD 和 npm 发布
   - ⏱️ 工作量：2-3h

---

## ✍️ 总结

| 维度 | 现状 | 目标 | 工作量 |
|------|------|------|--------|
| 代码质量 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | - |
| OpenCode 兼容 | 85% | 98% | 3-4h |
| 风险等级 | 高 | 低 | 2-3h |
| 生态就绪 | 否 | 是 | 2-3h |

**总工作量**：11-15 小时，分成 3 个阶段

**关键决定**：选择选项 A（快速修复）还是选项 B（完整改进）？

我倾向建议 **选项 A + 选项 B** 的组合：
- 本周先做立即改进（降低风险）
- 下周做完整改进（完全符合官方）

这样既能快速解决风险，又不会拖太久。

---

**详细分析**：见 `OPENCODE_ARCHITECTURE_ANALYSIS.md`

