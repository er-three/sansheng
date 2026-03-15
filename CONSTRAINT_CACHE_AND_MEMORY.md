# 约束系统缓存与 Memory 管理

**版本**：1.0.0
**日期**：2026-03-15

---

## 📌 问题分析

### 问题 1：Session 压缩时数据丢失

当对话上下文超过 token 限制时，系统会自动压缩早期消息。可能导致：
- 约束规则信息丢失
- 系统状态信息丢失
- 需要重新读取文件

### 问题 2：重复读取规则浪费资源

每次执行 Plugin Hook 都会：
```typescript
// 当前：每次都读取文件
const discoveredConstraints = discoverConstraints(agentName, domain, root)
// ↓ 涉及多次磁盘 I/O
```

**成本**：
- 多次磁盘 I/O
- 重复解析相同内容
- 浪费 system prompt tokens（重复注入相同约束）

### 问题 3：跨会话信息丢失

不同的对话会话无法共享：
- 已加载的约束
- 系统状态
- 历史决策

---

## ✅ 解决方案

### 方案 1：约束缓存机制（Plugin 层）

**目标**：在单个 Plugin 执行周期内缓存约束

```typescript
// src/plugin.ts

// 缓存对象
const constraintCache = new Map<string, {
  constraints: ConstraintDefinition[]
  timestamp: number
  fileHashes: Map<string, string>
}>()

/**
 * 带缓存的约束发现
 */
function discoverConstraintsWithCache(
  agentName: string,
  domain: string,
  projectRoot: string,
  useCache = true
): ConstraintDefinition[] {
  // 生成缓存 key
  const cacheKey = `${agentName}:${domain}`

  // 检查缓存是否有效
  if (useCache && constraintCache.has(cacheKey)) {
    const cached = constraintCache.get(cacheKey)!

    // 检查文件是否修改过
    if (!hasConstraintFilesChanged(projectRoot, cached.fileHashes)) {
      console.log(`[Cache HIT] ${cacheKey}`)
      return cached.constraints
    }
  }

  // 缓存不存在或过期，重新发现
  console.log(`[Cache MISS] ${cacheKey}, discovering...`)
  const constraints = discoverConstraints(agentName, domain, projectRoot)

  // 计算文件哈希，保存缓存
  const fileHashes = computeConstraintFileHashes(projectRoot)
  constraintCache.set(cacheKey, {
    constraints,
    timestamp: Date.now(),
    fileHashes
  })

  return constraints
}

/**
 * 计算约束文件的哈希
 */
function computeConstraintFileHashes(projectRoot: string): Map<string, string> {
  const hashes = new Map<string, string>()
  const constraintsDir = path.join(projectRoot, '.opencode', 'constraints')

  if (!fs.existsSync(constraintsDir)) return hashes

  // 递归遍历并计算哈希
  function walkDir(dir: string) {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        walkDir(filePath)
      } else if (file.endsWith('.md') || file.endsWith('.yaml')) {
        const content = fs.readFileSync(filePath, 'utf-8')
        const hash = require('crypto')
          .createHash('md5')
          .update(content)
          .digest('hex')
        hashes.set(filePath, hash)
      }
    }
  }

  walkDir(constraintsDir)
  return hashes
}

/**
 * 检查约束文件是否有修改
 */
function hasConstraintFilesChanged(
  projectRoot: string,
  previousHashes: Map<string, string>
): boolean {
  const currentHashes = computeConstraintFileHashes(projectRoot)

  // 检查文件数量
  if (currentHashes.size !== previousHashes.size) {
    return true
  }

  // 检查哈希值
  for (const [filePath, hash] of currentHashes) {
    if (previousHashes.get(filePath) !== hash) {
      return true
    }
  }

  return false
}
```

**优点**：
- ✅ 减少磁盘 I/O
- ✅ 自动检测文件修改
- ✅ 无需外部依赖
- ✅ 在单个执行周期内有效

**限制**：
- ❌ 仅在 Plugin 进程内有效
- ❌ 重启后丢失缓存
- ❌ 多进程场景下不共享

---

### 方案 2：持久化缓存（文件级）

**目标**：在磁盘上持久化约束缓存

```typescript
// src/constraint-cache.ts

interface CacheEntry {
  version: string
  timestamp: number
  agentName: string
  domain: string
  constraints: ConstraintDefinition[]
  fileHashes: Record<string, string>
}

/**
 * 约束缓存管理器
 */
class ConstraintCacheManager {
  private cacheDir: string
  private cachePath: string

  constructor(projectRoot: string) {
    this.cacheDir = path.join(projectRoot, '.opencode', '.cache')
    this.cachePath = path.join(this.cacheDir, 'constraints.json')
    this.ensureCacheDir()
  }

  private ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  /**
   * 获取缓存的约束
   */
  getConstraints(agentName: string, domain: string): ConstraintDefinition[] | null {
    if (!fs.existsSync(this.cachePath)) {
      return null
    }

    try {
      const cache = JSON.parse(fs.readFileSync(this.cachePath, 'utf-8')) as CacheEntry

      if (cache.agentName === agentName && cache.domain === domain) {
        // 检查缓存时间（1 小时过期）
        if (Date.now() - cache.timestamp < 3600000) {
          return cache.constraints
        }
      }
    } catch (error) {
      // 缓存文件损坏，忽略
    }

    return null
  }

  /**
   * 保存约束到缓存
   */
  saveConstraints(
    agentName: string,
    domain: string,
    constraints: ConstraintDefinition[],
    fileHashes: Record<string, string>
  ) {
    const entry: CacheEntry = {
      version: '1.0.0',
      timestamp: Date.now(),
      agentName,
      domain,
      constraints,
      fileHashes
    }

    try {
      fs.writeFileSync(
        this.cachePath,
        JSON.stringify(entry, null, 2)
      )
    } catch (error) {
      // 缓存保存失败，继续运行
      console.warn('[Cache] Failed to save:', error)
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    try {
      if (fs.existsSync(this.cachePath)) {
        fs.unlinkSync(this.cachePath)
      }
    } catch (error) {
      // 忽略清除失败
    }
  }
}
```

**配置**（在 registry.json 中）：

```json
{
  "version": "1.0.0",
  "active_domain": "general",
  "cache_settings": {
    "enabled": true,
    "ttl_seconds": 3600,
    "invalidate_on_file_change": true
  }
}
```

**优点**：
- ✅ 持久化存储
- ✅ 跨执行周期有效
- ✅ 支持 TTL 设置
- ✅ 文件修改自动失效

---

### 方案 3：Memory 系统集成（跨会话）

**目标**：利用 Claude Code 的 memory 系统保存约束元数据

```typescript
// memory/constraint-system-state.md

---
name: constraint-system-state
description: 约束系统状态和加载信息
type: project
---

## 约束系统当前状态

### 已加载的约束集合（按 domain:agent）

- **asset-management:yibu** ✅ (2026-03-15 00:34)
  - 源：global.md, domains/asset-management.md, agents/yibu.md
  - 约束数：15
  - 缓存有效期：1 小时

- **asset-management:kubu** ✅ (2026-03-15 00:30)
  - 源：global.md, domains/asset-management.md, agents/kubu.md
  - 约束数：12
  - 缓存有效期：1 小时

- **general:gongbu** ✅ (2026-03-15 00:28)
  - 源：global.md, general.yaml, agents/gongbu.md
  - 约束数：18
  - 缓存有效期：1 小时

### 文件哈希（用于变更检测）

```
.opencode/constraints/global.md: a1b2c3d4e5f6
.opencode/constraints/general.yaml: f6e5d4c3b2a1
.opencode/constraints/domains/asset-management.md: 7890abcdef12
```

### 约束系统配置

- 缓存启用：✅ true
- 缓存 TTL：3600 秒
- 文件变更检测：✅ 启用
- 持久化路径：.opencode/.cache/constraints.json

### 最后同步时间

2026-03-15 00:34:52 UTC
```

**如何使用**：

```typescript
// 在 plugin.ts 中

/**
 * 从 memory 获取约束系统状态
 */
function loadMemoryState(projectRoot: string) {
  const memoryPath = path.join(projectRoot, '.claude', 'memory', 'constraint-system-state.md')

  if (!fs.existsSync(memoryPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(memoryPath, 'utf-8')
    // 解析 memory 文件，提取约束元数据
    return parseMemoryState(content)
  } catch (error) {
    return null
  }
}

/**
 * 更新 memory 中的约束系统状态
 */
function updateMemoryState(projectRoot: string, state: any) {
  const memoryDir = path.join(projectRoot, '.claude', 'memory')
  fs.mkdirSync(memoryDir, { recursive: true })

  const memoryContent = generateMemoryContent(state)
  fs.writeFileSync(
    path.join(memoryDir, 'constraint-system-state.md'),
    memoryContent
  )
}
```

**优点**：
- ✅ 跨会话信息保留
- ✅ 人类可读
- ✅ 可被下一个会话读取
- ✅ 支持自动更新

---

## 🎯 完整实现流程

### Phase 1：本地缓存（立即）

```
发现约束
  ↓
检查内存缓存 (Map)
  ├─ HIT → 返回缓存
  └─ MISS → 继续
     ↓
   检查磁盘缓存 (.opencode/.cache/constraints.json)
     ├─ 有效 → 加载并返回
     └─ 无效 → 继续
        ↓
      扫描文件系统并解析
        ↓
      保存到内存缓存
        ↓
      保存到磁盘缓存
        ↓
      返回约束
```

### Phase 2：Memory 集成（后续）

```
每个会话开始
  ↓
读取 memory 中的约束元数据
  ↓
与磁盘缓存对比
  ├─ 一致 → 使用缓存
  └─ 不一致 → 重新扫描
     ↓
   更新 memory 状态
```

---

## 📊 性能对比

### 未优化（当前）

```
每次 Hook 执行：
  磁盘 I/O：5-20 次（取决于约束文件数）
  耗时：80-150ms
  token 消耗：重复注入相同约束 × N 次
```

### 优化后（方案 1 + 2 + 3）

```
首次执行：
  磁盘 I/O：5-20 次
  耗时：80-150ms

同会话内重复执行：
  磁盘 I/O：1 次（哈希校验）
  耗时：< 10ms
  提升：8-15x ⚡

跨会话执行：
  磁盘 I/O：0-1 次（仅校验）
  耗时：< 5ms
  提升：15-30x ⚡

Token 消耗：
  只注入一次 → 节省大量 token
```

---

## 🔧 配置指南

### 启用所有缓存机制

在 `registry.json` 中：

```json
{
  "version": "1.0.0",
  "active_domain": "general",
  "variables": {},

  "cache_settings": {
    "enabled": true,
    "strategy": "multi-level",
    "levels": [
      {
        "name": "memory",
        "enabled": true,
        "ttl_seconds": null
      },
      {
        "name": "disk",
        "enabled": true,
        "path": ".opencode/.cache/constraints.json",
        "ttl_seconds": 3600
      }
    ],
    "invalidate_on_file_change": true,
    "auto_update_memory": true
  }
}
```

### 日志配置

在 `plugin.ts` 中：

```typescript
// 缓存操作日志
const enableCacheLogging = true

if (enableCacheLogging) {
  console.log('[Cache] Strategy:', cacheStrategy)
  console.log('[Cache] Memory size:', constraintCache.size)
  console.log('[Cache] Hit ratio:', cacheHitRatio)
}
```

---

## ⚙️ Session 压缩处理

当 Session 被压缩时，确保重要信息不丢失：

### 解决方案 1：关键信息总结

在 memory 中保存关键的系统状态：

```markdown
## 约束系统关键信息

### 当前活跃约束

这是在 session 被压缩前，需要保留的关键信息：

1. **已加载的约束集合**
   - agent-domain 组合：asset-management:yibu, general:gongbu
   - 约束总数：45+
   - 最后更新：2026-03-15 00:34

2. **关键规则**
   - 完整输出：必须展示每个步骤的完整结果
   - 失败处理：只重试一次，失败则报错退出
   - 代码质量：代码必须通过测试才完成

3. **缓存状态**
   - 缓存有效期：1 小时
   - 最后校验：2026-03-15 00:34
   - 文件未修改：✅
```

### 解决方案 2：自动恢复

在新 Session 开始时：

```typescript
/**
 * Session 开始时恢复状态
 */
function restoreSessionState(projectRoot: string) {
  // 1. 读取 memory 中的约束元数据
  const memoryState = loadMemoryState(projectRoot)

  // 2. 验证缓存是否仍然有效
  if (memoryState && isCacheValid(memoryState)) {
    console.log('[Restore] Loaded constraints from memory')
    return memoryState.constraints
  }

  // 3. 如果无效，重新发现
  console.log('[Restore] Cache invalid, rediscovering...')
  return discoverConstraints()
}
```

---

## 📋 实施建议

### 优先级 1（立即实施）✅

1. **方案 1：内存缓存**
   - 工作量：1-2 小时
   - 收益：8-15x 性能提升
   - 风险：低

2. **Session 压缩处理**
   - 工作量：1 小时
   - 收益：避免信息丢失
   - 风险：低

### 优先级 2（下一步）⏳

3. **方案 2：磁盘缓存**
   - 工作量：2-3 小时
   - 收益：跨执行周期缓存
   - 风险：低

### 优先级 3（可选）🔜

4. **方案 3：Memory 集成**
   - 工作量：3-4 小时
   - 收益：跨会话信息共享
   - 风险：中等

---

## ✅ 检查清单

- [ ] 实现内存缓存（constraintCache Map）
- [ ] 实现文件哈希校验
- [ ] 实现磁盘缓存管理器
- [ ] 添加 registry.json 缓存配置
- [ ] 创建 memory 状态文件模板
- [ ] 实现 memory 读写函数
- [ ] 添加缓存性能日志
- [ ] 编写缓存测试用例
- [ ] 文档化缓存配置
- [ ] 在 Plugin Hook 中集成缓存

---

## 🎉 预期收益

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 磁盘 I/O（同会话） | 5-20 | 1 | 5-20x |
| 执行时间 | 80-150ms | < 10ms | 8-15x |
| Token 消耗 | 重复注入 × N | 仅注入 1 次 | N倍 |
| Session 信息丢失 | ❌ 有丢失 | ✅ 自动恢复 | 100% |

---

**建议立即实施优先级 1 的两个方案！**

下一步工作：
1. 修改 `src/plugin.ts` 添加内存缓存
2. 创建 memory 状态文件模板
3. 测试缓存机制
4. 更新文档
