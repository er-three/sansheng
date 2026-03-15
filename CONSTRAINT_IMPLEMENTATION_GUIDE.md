# 约束发现系统实现指南

**版本**：1.0
**状态**：✅ 已实现

---

## 📋 概述

约束发现系统已完全集成到 Plugin 中。系统会自动：

1. **发现约束文件** - 按照轻量级命名约定扫描 `.opencode/constraints/` 目录
2. **解析约束内容** - 支持 Markdown 和 YAML 两种格式
3. **合并与去重** - 同名约束取最后一个，避免重复注入
4. **注入到 Prompt** - 在 `experimental.chat.system.transform` 钩子中自动注入

---

## 🏗️ 文件结构

系统已创建以下约束文件作为示例：

```
.opencode/constraints/
├── global.md                              # 全局约束
├── general.yaml                           # 通用域约束（YAML 格式）
├── domains/
│   └── asset-management/
│       ├── asset-management.md            # 域约束
│       └── yibu.md                        # 细粒度约束（asset-management + yibu）
└── agents/
    └── gongbu.md                          # Agent 约束
```

---

## 📝 支持的格式

### Markdown 格式（推荐简洁场景）

```markdown
# 约束标题

## 约束名称 1

约束的内容，支持多行。
可以包含：
- 列表项
- **加粗文本**
- 代码块等

## 约束名称 2

另一个约束的内容
```

**示例**：[.opencode/constraints/global.md](/.opencode/constraints/global.md)

### YAML 格式（推荐结构化场景）

```yaml
version: 1.0
description: 约束集合描述

constraints:
  - name: "约束名称 1"
    content: |
      约束的详细内容
      支持多行
    priority: "high"

  - name: "约束名称 2"
    content: |
      另一个约束
    priority: "medium"
```

**示例**：[.opencode/constraints/general.yaml](/.opencode/constraints/general.yaml)

---

## 🔍 命名约定（轻量级）

只需遵循 2 个简单规则：

### 规则 1：放在约定目录

```
必须放在：.opencode/constraints/
可以嵌套：.opencode/constraints/domains/{domain}/
可以嵌套：.opencode/constraints/agents/
```

### 规则 2：遵循约定的文件名

| 场景 | 文件名示例 | 位置 |
|------|-----------|------|
| 全局约束 | `global.md` 或 `global.yaml` | `.opencode/constraints/` |
| 域约束 | `asset-management.md` | `.opencode/constraints/` 或 `domains/asset-management/` |
| Agent 约束 | `gongbu.md` | `.opencode/constraints/agents/` |
| 细粒度约束 | `yibu.md` | `.opencode/constraints/domains/asset-management/` |

---

## 🚀 使用场景

### 场景 1：小项目（一个全局文件）

```
.opencode/constraints/
└── global.md        # 所有规则都在这里
```

**优点**：简单直观

### 场景 2：中等项目（按域分类）

```
.opencode/constraints/
├── global.md                    # 通用规则
├── asset-management.md          # 资产管理域的规则
├── video.md                     # 视频处理域的规则
└── agents/
    ├── gongbu.md               # 公部（实现）的通用规则
    └── xingbu.md               # 行部（审查）的通用规则
```

**优点**：结构清晰，便于维护

### 场景 3：大项目（按域 + Agent 细分）

```
.opencode/constraints/
├── global.md
├── domains/
│   ├── asset-management/
│   │   ├── domain.md           # 该域所有 Agent 的通用规则
│   │   ├── yibu.md            # 该域的 yibu（扫描）特定规则
│   │   └── kubu.md            # 该域的 kubu（持久化）特定规则
│   └── video/
│       ├── domain.md
│       └── gongbu.md
└── agents/
    ├── gongbu.md
    ├── xingbu.md
    └── yibu.md
```

**优点**：最大灵活性，支持复杂的域 + Agent 组合

---

## 🔄 加载顺序与覆盖

约束按照以下顺序加载，**后者覆盖前者**（如果同名）：

```
1. global.md / global.yaml
   ↓
2. domains/{domain}.md 或 domains/{domain}/domain.md
   ↓
3. agents/{agent}.md
   ↓
4. domains/{domain}/{agent}.md  ← 最终优先级最高
```

**例子**：如果 `global.md` 中有"完整实现"约束，而 `domains/asset-management/yibu.md` 中也定义了同名约束，
则最终使用 `yibu.md` 中的版本。

---

## 💡 实现细节

### Plugin 钩子集成

```typescript
// 在 experimental.chat.system.transform 钩子中自动执行：

// 1. 调用 discoverConstraints() 发现约束
const discoveredConstraints = discoverConstraints(agentName, domain, root)

// 2. 按优先级排序
constraints.sort((a, b) => {
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
})

// 3. 注入到 system prompt
const injectionText = [
  "## 自动发现的约束（按优先级）",
  "",
  ...constraints.map((c) => `**${c.name}** (${c.source})：\n${c.content}`),
].join("\n")
output.system.push(injectionText)
```

### 性能特性

- **扫描范围**：只扫描 `.opencode/constraints/` 目录，不扫描整个项目
- **时间复杂度**：O(n)，其中 n = 约束文件数量（通常 < 100）
- **无 I/O 浪费**：直接查找约定位置的文件，不进行全局搜索

---

## 📊 实际例子

### 例 1：为 asset-management 域的 yibu Agent 注入约束

**约束文件**：
- `.opencode/constraints/global.md` → 全局约束
- `.opencode/constraints/domains/asset-management.md` → 域约束
- `.opencode/constraints/agents/yibu.md` → Agent 约束
- `.opencode/constraints/domains/asset-management/yibu.md` → 细粒度约束

**加载过程**：
```
Plugin 发现：agent=yibu, domain=asset-management

1. 查找 global.md       ✅ 找到 → 加载
2. 查找 asset-management  ✅ 找到 → 加载（如同名约束，覆盖）
3. 查找 agents/yibu.md  ✅ 找到 → 加载（覆盖）
4. 查找 domains/asset-management/yibu.md  ✅ 找到 → 加载（最终版本）

结果：system prompt 中注入了所有 4 个文件的约束
```

### 例 2：处理 general 域的 gongbu Agent

**约束文件**：
- `.opencode/constraints/global.md` → 全局约束
- `.opencode/constraints/general.yaml` → 域约束（YAML 格式）
- `.opencode/constraints/agents/gongbu.md` → Agent 约束
- （不存在细粒度约束）

**加载过程**：
```
Plugin 发现：agent=gongbu, domain=general

1. 查找 global.md              ✅ 加载
2. 查找 general.md / general.yaml   ✅ 找到 general.yaml → 加载
3. 查找 agents/gongbu.md       ✅ 加载
4. 查找 domains/general/gongbu.md   ❌ 不存在 → 跳过

结果：system prompt 中注入了 3 个文件的约束
```

---

## ✅ 验证与测试

### 如何验证约束已加载

1. **查看生成的 system prompt**：
   ```
   Plugin 会输出：
   ## 自动发现的约束（按优先级）
   **约束名称** (global.md):
   约束内容...
   ```

2. **运行测试**：
   ```bash
   npm test -- constraint-discovery.test.ts
   ```

3. **检查约束目录**：
   ```bash
   ls -R .opencode/constraints/
   ```

---

## 🔧 添加新约束

### 步骤 1：选择位置

- **全局规则** → `.opencode/constraints/global.md`
- **特定域的规则** → `.opencode/constraints/domains/{domain}/domain.md`
- **特定 Agent 的规则** → `.opencode/constraints/agents/{agent}.md`
- **特定组合** → `.opencode/constraints/domains/{domain}/{agent}.md`

### 步骤 2：创建文件

使用 Markdown 或 YAML 格式定义约束（见上面的格式示例）

### 步骤 3：命名约束

```markdown
## 约束名称

约束的详细描述和规则...
```

### 步骤 4：完成

Plugin 会在下一次执行时自动发现并注入新约束。无需修改代码，无需重启！

---

## ⚙️ 配置修改

### 支持的文件扩展名

- `.md` - Markdown 格式
- `.yaml` / `.yml` - YAML 格式
- （其他格式暂不支持）

### 优先级控制

在 YAML 格式中，使用 `priority` 字段控制优先级显示：

```yaml
- name: "高优先级约束"
  content: "内容"
  priority: "high"      # 最先显示

- name: "中优先级约束"
  content: "内容"
  priority: "medium"    # 次级显示

- name: "低优先级约束"
  content: "内容"
  priority: "low"       # 最后显示
```

Markdown 格式的约束默认优先级为 `high`。

---

## 🐛 常见问题

### Q: 约束没有被注入，怎么办？

**A**: 检查以下几点：
1. 文件是否在 `.opencode/constraints/` 目录下
2. 文件名是否遵循约定（见上面的表格）
3. 文件格式是否正确（Markdown 或 YAML）
4. 检查 Plugin 日志是否有错误信息

### Q: 同名约束冲突，哪个会生效？

**A**: 按照加载顺序，最后加载的生效。例如：
- 如果 `global.md` 和 `agents/gongbu.md` 都有"完整实现"约束
- 则 `agents/gongbu.md` 中的版本会生效

### Q: 能否禁用约束发现系统？

**A**: 可以。只需删除或重命名 `.opencode/constraints/` 目录，Plugin 会自动跳过自动发现。

### Q: 支持热重载吗？

**A**: 是的。Plugin 每次执行都会重新发现约束，无需重启。修改约束文件后，下一次执行时会自动加载新内容。

---

## 📚 相关文档

- [CONSTRAINT_NAMING_CONVENTION.md](./CONSTRAINT_NAMING_CONVENTION.md) - 详细的命名约定说明
- [CONSTRAINT_USAGE_EXAMPLES.md](./CONSTRAINT_USAGE_EXAMPLES.md) - 5 个实际使用例子
- [USER_DEFINED_CONSTRAINTS_SYSTEM.md](./USER_DEFINED_CONSTRAINTS_SYSTEM.md) - 灵活的用户定义系统

---

## ✨ 总结

| 功能 | 状态 | 说明 |
|------|------|------|
| Markdown 解析 | ✅ | 支持 `##` 标题分割约束 |
| YAML 解析 | ✅ | 支持 constraints 列表格式 |
| 自动发现 | ✅ | 按约定扫描 `.opencode/constraints/` |
| 优先级加载 | ✅ | global → domain → agent → specific |
| 去重合并 | ✅ | 同名约束自动去重 |
| 注入 Prompt | ✅ | 自动注入到 system prompt |
| 热重载 | ✅ | 无需重启，修改即生效 |

**系统已完全可用，建议开始使用！**
