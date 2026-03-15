# 约束系统快速开始（5 分钟）

**目标**：让你 5 分钟内掌握如何使用约束系统

---

## 🎯 核心概念（1 分钟）

约束系统让你定义"规则"，Plugin 会自动注入到 Agent 的 system prompt。

**只需做 2 件事**：
1. 把约束文件放在 `.opencode/constraints/` 目录
2. 文件名遵循约定规则

Plugin 会自动发现和注入。

---

## 📝 最简单的开始方式（2 分钟）

### 步骤 1：创建全局约束文件

创建文件：`.opencode/constraints/global.md`

```markdown
# 全局约束

## 完整输出

必须展示每个步骤的完整结果，不允许省略。

## 失败处理

遇到错误只重试一次，失败则报错退出。

## 代码质量

代码变更必须通过测试才算完成。
```

**完成！** 这就是你需要的全部。Plugin 会自动加载并注入。

---

## 📂 常见文件组织方式

### 方式 A：小项目（推荐）

```
.opencode/constraints/
└── global.md           # 所有规则都在这里
```

**优点**：简单、直观

### 方式 B：中等项目（推荐）

```
.opencode/constraints/
├── global.md           # 通用规则
├── asset-management.md # 资产管理域的规则
├── video.md            # 视频处理域的规则
└── agents/
    ├── gongbu.md      # 公部（实现）的规则
    └── xingbu.md      # 行部（审查）的规则
```

**优点**：结构清晰，容易扩展

### 方式 C：大项目（推荐）

```
.opencode/constraints/
├── global.md
├── domains/
│   ├── asset-management/
│   │   ├── domain.md   # 该域所有 Agent 通用
│   │   ├── yibu.md     # 该域的扫描特定规则
│   │   └── kubu.md     # 该域的持久化特定规则
│   └── video/
│       └── gongbu.md
└── agents/
    ├── gongbu.md
    ├── xingbu.md
    └── yibu.md
```

**优点**：最大灵活性

---

## 📝 两种文件格式

### Markdown 格式（更常用）

```markdown
# 标题（可选）

## 约束名称 1

约束的详细内容。
支持多行。
- 支持列表
- 支持格式化

## 约束名称 2

另一个约束的内容。
```

**示例**：[.opencode/constraints/global.md](/.opencode/constraints/global.md)

### YAML 格式（更结构化）

```yaml
version: 1.0

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

## 📋 命名规则速查表

| 你想要... | 文件名 | 位置 |
|----------|--------|------|
| 全局规则 | `global.md` | `.opencode/constraints/` |
| 某个域的规则 | `{domain}.md` 或 `domain.md` | `.opencode/constraints/domains/{domain}/` |
| 某个 Agent 的规则 | `{agent}.md` | `.opencode/constraints/agents/` |
| 特定域+Agent | `{agent}.md` | `.opencode/constraints/domains/{domain}/` |

**示例**：
- 全局 → `.opencode/constraints/global.md`
- 资产管理域 → `.opencode/constraints/domains/asset-management/domain.md`
- Gongbu Agent → `.opencode/constraints/agents/gongbu.md`
- 资产管理 + Yibu → `.opencode/constraints/domains/asset-management/yibu.md`

---

## 🚀 完整例子

### 例 1：为你的项目添加全局约束

**目标**：定义所有 Agent 都必须遵守的规则

**操作**：
1. 创建 `.opencode/constraints/` 目录（如果不存在）
2. 创建文件 `global.md`：

```markdown
## 禁止省略

必须展示完整结果。

## 先分析再实现

execute 前需要 analyze。

## 测试通过才完成

代码必须通过测试。
```

**结果**：所有 Agent 都会在 system prompt 中看到这些约束 ✅

### 例 2：为某个域添加特定规则

**目标**：仅对资产管理域的所有 Agent 有效

**操作**：
1. 创建目录 `.opencode/constraints/domains/asset-management/`
2. 创建文件 `domain.md`：

```markdown
## 资产完整性

必须包含 5 种资产：
- Service/API
- DataModel
- UIComponent
- Provider
- Utility

## 版本化

每个资产都要版本号。
```

**结果**：仅当 domain=asset-management 时注入 ✅

### 例 3：为某个 Agent 添加规则

**目标**：仅对 gongbu（实现代理）有效

**操作**：
1. 创建目录 `.opencode/constraints/agents/`
2. 创建文件 `gongbu.md`：

```markdown
## 完整实现

没有 TODO 注释。

## 无错误类型

不用 any 类型。
```

**结果**：仅当 agent=gongbu 时注入 ✅

---

## ✅ 验证是否工作

### 方法 1：查看日志

Plugin 执行时会输出：
```
## 自动发现的约束（按优先级）
**约束名称** (global.md):
约束内容...
```

### 方法 2：检查目录

```bash
# 查看约束文件是否存在
ls -la .opencode/constraints/

# 查看约束内容
cat .opencode/constraints/global.md
```

### 方法 3：查看 system prompt

Agent 执行时，约束会被注入到 system prompt。你可以看到：
```
## 自动发现的约束（按优先级）
...
```

---

## 💡 最佳实践

### ✅ 推荐做法

- 从 `global.md` 开始，定义所有 Agent 通用的规则
- 随着项目增长，按需添加域级和 Agent 级约束
- 使用简洁、易懂的约束描述
- 定期审查约束是否还在有效

### ❌ 避免做法

- 不要把所有约束都放在 global.md 中（大项目时不易维护）
- 不要在多个地方定义相同的约束（会导致混淆）
- 不要使用过长的约束描述（system prompt 会变得很长）

---

## 🔧 常见问题

**Q: 约束没有出现？**
A: 检查文件是否在 `.opencode/constraints/` 下，文件名是否遵循约定。

**Q: 两个约束有同名，哪个生效？**
A: 加载顺序后的生效（global < domain < agent < domain+agent）

**Q: 支持热重载吗？**
A: 是的，修改文件后下次执行时自动加载，不需要重启。

**Q: 能否禁用约束系统？**
A: 可以，删除或重命名 `.opencode/constraints/` 目录即可。

---

## 📚 进阶文档

- [CONSTRAINT_NAMING_CONVENTION.md](./CONSTRAINT_NAMING_CONVENTION.md) - 详细命名规则
- [CONSTRAINT_IMPLEMENTATION_GUIDE.md](./CONSTRAINT_IMPLEMENTATION_GUIDE.md) - 完整使用指南
- [CONSTRAINT_USAGE_EXAMPLES.md](./CONSTRAINT_USAGE_EXAMPLES.md) - 5 个实际例子

---

## 🎉 总结

**你现在可以**：

✅ 创建约束文件（Markdown 或 YAML）
✅ 放在 `.opencode/constraints/` 下
✅ 遵循简单的命名约定
✅ Plugin 自动发现和注入

**花 5 分钟，节省无数时间！** 🚀
