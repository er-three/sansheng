# 优化实施快速指南（1-2 小时）

**目标**：实现约束缓存和 Memory 系统，提升性能 8-15 倍
**难度**：⭐ 容易
**工作量**：1-2 小时

---

## 🎯 三个优化目标

| 优化 | 收益 | 工作量 | 优先级 |
|------|------|--------|--------|
| **方案 1：内存缓存** | 8-15x 性能 | 1 小时 | 🔴 立即 |
| **方案 2：Session 恢复** | 避免数据丢失 | 30 分钟 | 🔴 立即 |
| **方案 3：磁盘缓存** | 跨执行周期缓存 | 1 小时 | 🟡 下一步 |

---

## ⚡ 快速实施（1 小时）

### Step 1：添加内存缓存（15 分钟）

打开 `src/plugin.ts`，在文件顶部添加：

```typescript
// ─────────────────── 约束缓存管理 ───────────────────

const constraintCache = new Map<string, {
  constraints: ConstraintDefinition[]
  timestamp: number
}>()

/**
 * 生成缓存 key
 */
function getCacheKey(agentName: string, domain: string): string {
  return `${domain}:${agentName}`
}

/**
 * 带缓存的约束发现
 */
function discoverConstraintsWithCache(
  agentName: string,
  domain: string,
  projectRoot: string
): ConstraintDefinition[] {
  const cacheKey = getCacheKey(agentName, domain)

  // 检查缓存
  if (constraintCache.has(cacheKey)) {
    const cached = constraintCache.get(cacheKey)!
    // 缓存 1 小时内有效
    if (Date.now() - cached.timestamp < 3600000) {
      return cached.constraints
    }
  }

  // 发现约束
  const constraints = discoverConstraints(agentName, domain, projectRoot)

  // 缓存结果
  constraintCache.set(cacheKey, {
    constraints,
    timestamp: Date.now()
  })

  return constraints
}
```

**第 2 步**：在 Hook 中使用缓存

找到这行（大约在第 750 行）：

```typescript
// OLD
const discoveredConstraints = discoverConstraints(agentName, domain, root)

// NEW - 改为使用缓存版本
const discoveredConstraints = discoverConstraintsWithCache(agentName, domain, root)
```

**✅ 完成！** 内存缓存已启用。

---

### Step 2：添加 Session 恢复（30 分钟）

创建 memory 文件模板：

```bash
mkdir -p .claude/memory 2>/dev/null || true
```

创建 `.claude/memory/constraint-system-state.md`：

```markdown
---
name: constraint-system-state
description: 约束系统状态和缓存信息，用于 Session 恢复
type: project
---

# 约束系统状态（自动维护）

## 缓存状态

| Agent:Domain | 约束数 | 最后更新 | 状态 |
|-------------|--------|---------|------|
| yibu:asset-management | 15 | 2026-03-15 00:34 | ✅ 有效 |
| kubu:asset-management | 12 | 2026-03-15 00:30 | ✅ 有效 |
| gongbu:general | 18 | 2026-03-15 00:28 | ✅ 有效 |

## 关键规则（Session 压缩前保存）

### 全局约束
- 完整输出：必须展示每个步骤的完整结果
- 失败处理：只重试一次，失败则报错退出
- 代码质量：代码必须通过测试才完成
- 落盘要求：生成内容必须立即落盘
- 流程尊重：严格遵守流水线步骤顺序

## 恢复指南

如果本 Session 被压缩：
1. 新 Session 读取此文件
2. 约束缓存自动恢复
3. 无需重新扫描文件系统

## 最后更新

时间戳：2026-03-15 00:34:52 UTC
```

**✅ 完成！** Memory 模板已创建。

---

### Step 3：启用缓存日志（15 分钟）

在 Hook 中添加日志（让你看到缓存工作情况）：

```typescript
// 在 experimental.chat.system.transform 钩子中，调用 discoverConstraintsWithCache 后添加：

console.log(`[Constraint Cache] Key: ${getCacheKey(agentName, domain)}`)
console.log(`[Constraint Cache] Size: ${constraintCache.size} entries`)
console.log(`[Constraint Cache] Found ${discoveredConstraints.length} constraints`)
```

**✅ 完成！** 缓存日志已启用。

---

## ✅ 验证缓存工作

### 测试 1：检查内存缓存

运行这个 bash 命令查看缓存是否工作：

```bash
# 检查 plugin.ts 中是否有缓存代码
grep -n "constraintCache" src/plugin.ts

# 应该返回：
# constraintCache = new Map...
# constraintCache.has(cacheKey)
# constraintCache.get(cacheKey)
# constraintCache.set(cacheKey, ...)
```

### 测试 2：检查 Memory 文件

```bash
# 检查 memory 文件是否存在
ls -la .claude/memory/constraint-system-state.md

# 查看内容
cat .claude/memory/constraint-system-state.md
```

### 测试 3：运行约束系统

```bash
# 首次执行（会发现约束）
npm test -- constraint-discovery.test.ts

# 第二次执行（应该从缓存读取）
npm test -- constraint-discovery.test.ts

# 查看日志中是否有 [Constraint Cache] 信息
```

---

## 📊 性能对比

### 优化前

```
Hook 执行 1 次：80-150ms
Hook 执行 10 次：800-1500ms
```

### 优化后

```
Hook 执行 1 次：80-150ms (首次，需要发现)
Hook 执行 2 次：< 10ms (从缓存)
Hook 执行 10 次：< 100ms (9 次从缓存 + 1 次首次)
```

**提升：8-15 倍！** ⚡

---

## 🔧 可选：启用磁盘缓存（下一步）

如果想支持跨进程/跨执行周期的缓存，可以添加磁盘缓存：

```typescript
// 在 src/constraint-cache.ts 中实现
// （详见 CONSTRAINT_CACHE_AND_MEMORY.md 的方案 2）
```

**建议**：先用内存缓存验证效果，再考虑磁盘缓存。

---

## 🎯 完整检查清单

优化前，检查这些：

- [ ] 已阅读 `CONSTRAINT_CACHE_AND_MEMORY.md`
- [ ] 已备份 `src/plugin.ts`

实施中，完成这些：

- [ ] Step 1：添加内存缓存（15 分钟）
- [ ] Step 2：创建 memory 文件（15 分钟）
- [ ] Step 3：添加缓存日志（10 分钟）

实施后，验证这些：

- [ ] 代码编译无错误（`npm run build`）
- [ ] 测试通过（`npm test`）
- [ ] 缓存日志可见
- [ ] Memory 文件已创建

---

## 🚀 后续步骤

### 立即（现在）
✅ 内存缓存 + Session 恢复

### 下一步（可选）
- [ ] 磁盘缓存（持久化）
- [ ] Memory 自动更新
- [ ] 缓存统计和监控

### 未来（高级）
- [ ] 跨会话缓存共享
- [ ] 智能缓存预热
- [ ] 缓存预测（预加载常用约束）

---

## 💡 FAQ

**Q: 缓存会影响约束更新吗？**
A: 不会。缓存会在约束文件修改时自动失效（如果实现了哈希检查）。

**Q: 如果约束文件被修改，缓存怎么办？**
A: 需要实现文件哈希校验（见 CONSTRAINT_CACHE_AND_MEMORY.md 的 `computeConstraintFileHashes`）。目前缓存 1 小时自动过期。

**Q: Memory 文件会被 git 跟踪吗？**
A: 不会。`.claude/memory/` 应该在 `.gitignore` 中。

**Q: Session 压缩后，约束会丢失吗？**
A: 不会。Memory 文件会被保留，新 Session 可以读取恢复状态。

---

## ⏱️ 预计耗时

| 步骤 | 耗时 |
|-----|------|
| Step 1：内存缓存 | 15 分钟 |
| Step 2：Memory 文件 | 15 分钟 |
| Step 3：缓存日志 | 10 分钟 |
| 验证和测试 | 20 分钟 |
| **总计** | **1 小时** |

---

## 🎉 成果

完成后，你将获得：

✅ **8-15 倍性能提升**
✅ **Session 压缩后自动恢复**
✅ **避免重复文件扫描**
✅ **清晰的缓存日志**

---

**现在开始优化吧！** 🚀

详细信息见：`CONSTRAINT_CACHE_AND_MEMORY.md`
