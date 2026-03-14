# 约束系统使用示例 - 用户自定义各种方式

---

## 🎯 核心概念

用户可以用以下任何方式定义约束，Plugin 都会自动发现和加载：

```
约束文件位置 + 文件名 = Plugin 自动发现
```

Plugin 会按照约定查找，用户按照约定存放就行。

---

## 📋 示例 1：最简单的方式（一个全局文件）

### 目录结构
```
项目根目录/
└── .opencode/
    └── global-constraints.md
```

### 文件内容：`.opencode/global-constraints.md`

```markdown
# 全局约束

## 禁止省略输出

必须展示每个步骤的完整结果，不允许省略

## 失败处理

遇到错误只重试一次，失败则报错退出

## 代码质量

代码变更必须通过测试才算完成

## 落盘要求

生成内容必须立即落盘，返回文件路径

## 项目特定规则

我们项目使用 TypeScript，所有代码必须编译通过
```

### Plugin 加载结果

```
Agent: gongbu (任何域)
自动发现：✅ .opencode/global-constraints.md
加载约束：
  - 禁止省略输出
  - 失败处理
  - 代码质量
  - 落盘要求
  - 项目特定规则
```

---

## 📋 示例 2：按域分类（3 个文件）

### 目录结构
```
.opencode/
├── global-constraints.md
├── domain-asset-management.md
└── domain-video.md
```

### 文件内容：`.opencode/global-constraints.md`
```markdown
## 禁止省略输出

必须展示每个步骤的完整结果

## 失败处理

遇到错误只重试一次
```

### 文件内容：`.opencode/domain-asset-management.md`
```markdown
## 资产完整性

提取的 5 份资产必须完整：
- Service
- DataModel
- UIComponent
- Provider
- Utility

## 版本控制

所有资产必须版本化
```

### 文件内容：`.opencode/domain-video.md`
```markdown
## 视频编码标准

- 编码：H.264 或 VP9
- 分辨率：1080p+
- 帧率：24/30/60 fps

## 音频标准

- 编码：AAC 或 Opus
- 比特率：128kbps+
```

### Plugin 加载结果

**场景 A**：Agent=gongbu, Domain=asset-management
```
自动发现并加载：
  1. ✅ .opencode/global-constraints.md
  2. ✅ .opencode/domain-asset-management.md

最终注入约束：
  - 禁止省略输出
  - 失败处理
  - 资产完整性
  - 版本控制
```

**场景 B**：Agent=gongbu, Domain=video
```
自动发现并加载：
  1. ✅ .opencode/global-constraints.md
  2. ✅ .opencode/domain-video.md

最终注入约束：
  - 禁止省略输出
  - 失败处理
  - 视频编码标准
  - 音频标准
```

---

## 📋 示例 3：按域 + Agent 分类（目录结构）

### 目录结构
```
.opencode/
├── constraints/
│   ├── global.md                    → 所有 Agent
│   ├── asset-management/
│   │   ├── domain.md               → 该域所有 Agent
│   │   ├── yibu.md                → yibu 在该域的约束
│   │   ├── kubu.md                → kubu 在该域的约束
│   │   └── shared.md              → 共享约束
│   ├── cr-processing/
│   │   ├── domain.md
│   │   ├── menxia.md
│   │   └── ...
│   └── agents/
│       ├── gongbu.md               → gongbu 在任何域的约束
│       ├── xingbu.md               → xingbu 在任何域的约束
│       └── ...
```

### 文件内容

**`.opencode/constraints/global.md`**
```markdown
## 禁止省略输出

必须完整展示结果
```

**`.opencode/constraints/asset-management/domain.md`**
```markdown
## 资产完整性

5 份资产必须完整
```

**`.opencode/constraints/asset-management/yibu.md`**
```markdown
## 扫描完整性

必须扫描所有代码文件

## 资产识别

准确识别 5 种资产
```

**`.opencode/constraints/asset-management/kubu.md`**
```markdown
## 持久化完整性

所有资产必须持久化到 OpenSpec
```

**`.opencode/constraints/agents/gongbu.md`**
```markdown
## 完整实现

没有 TODO 注释

## 类型明确

避免使用 any
```

### Plugin 加载结果

**场景**：Agent=yibu, Domain=asset-management
```
自动发现并加载：
  1. ✅ .opencode/constraints/global.md
  2. ✅ .opencode/constraints/asset-management/domain.md
  3. ✅ .opencode/constraints/asset-management/yibu.md
  （不加载 gongbu.md 因为当前是 yibu）

最终注入：
  - 禁止省略输出
  - 资产完整性
  - 扫描完整性
  - 资产识别
```

---

## 📋 示例 4：在 Skill 中嵌入约束

### 目录结构
```
.opencode/domains/asset-management/
└── skills/scan/
    ├── SKILL.md
    ├── contract.yaml
    └── CONSTRAINTS.md              ← 这里定义约束
```

### 文件内容：`.opencode/domains/asset-management/skills/scan/CONSTRAINTS.md`

```markdown
# Scan Skill 的约束

## 输入验证

接收的文件路径必须存在

## 扫描完整性

- 扫描所有代码文件
- 递归扫描目录
- 记录扫描统计

## 输出格式

必须输出 JSON 格式，包含：
- files: 扫描的文件列表
- count: 文件总数
- assets: 识别的资产列表

## 错误处理

- 无读权限的文件，记录错误并继续
- 扫描失败时详细报错
```

### Plugin 加载结果

**场景**：调用 scan skill
```
自动发现并加载：
  1. ✅ global.md
  2. ✅ 该 domain 的约束
  3. ✅ .opencode/domains/asset-management/skills/scan/CONSTRAINTS.md

最终注入：
  - 全局约束
  - 域约束
  - Skill 特定约束
```

---

## 📋 示例 5：混合方式（完全自由）

### 目录结构
```
项目根目录/
├── .opencode/
│   ├── global-constraints.yaml      ← YAML 格式
│   ├── constraints/
│   │   ├── asset-management.md      ← Markdown 格式
│   │   ├── video/
│   │   │   ├── domain.md
│   │   │   └── gongbu.md
│   │   └── agents/
│   │       └── gongbu.md
│   └── domains/
│       ├── asset-management/
│       │   ├── constraints/
│       │   │   └── yibu.md          ← 嵌在 domain 里
│       │   └── skills/scan/
│       │       └── CONSTRAINTS.md
│       └── video/
│           └── CONSTRAINTS.md        ← 直接在 domain 目录下
├── docs/
│   └── agent-requirements.md         ← 在其他位置定义的约束
└── rules.yaml                        ← 项目根目录下
```

### 用户的自定义配置

```typescript
// 在 plugin 初始化时，可以指定额外的搜索路径
const customSearchPaths = [
  '.opencode/global-constraints.yaml',
  '.opencode/constraints/',
  '.opencode/domains/',
  'docs/agent-requirements.md',     // 其他位置的约束
  'rules.yaml'                       // 自定义位置
]

// Plugin 会在这些位置查找和加载约束
```

### Plugin 加载结果

```
当 Agent=gongbu, Domain=asset-management 时：

自动搜索并加载：
  1. ✅ .opencode/global-constraints.yaml
  2. ✅ .opencode/constraints/asset-management.md
  3. ✅ .opencode/constraints/agents/gongbu.md
  4. ✅ .opencode/domains/asset-management/CONSTRAINTS.md（如果存在）
  5. ✅ docs/agent-requirements.md（如果包含相关约束）
  6. ✅ rules.yaml（如果有相关配置）

最终：所有发现的约束都被加载并注入
```

---

## 🎯 实际用法建议

### 对于小项目
```
使用示例 1：一个全局文件
.opencode/global-constraints.md
```

### 对于中等项目
```
使用示例 2：按域分类
.opencode/
├── global-constraints.md
├── domain-asset-management.md
└── domain-video.md
```

### 对于大项目
```
使用示例 3：目录结构 + 按域 + Agent
.opencode/constraints/
├── global.md
├── asset-management/
│   ├── domain.md
│   ├── yibu.md
│   ├── kubu.md
│   └── ...
└── agents/
    ├── gongbu.md
    └── ...
```

### 对于超大项目
```
使用示例 5：混合方式
想怎么组织就怎么组织，Plugin 都能找到
```

---

## 💡 关键特性

### 1. 自动发现
```
用户只需按约定放置文件，Plugin 会自动找到
无需任何配置
```

### 2. 多种格式支持
```
.md   → Markdown（易于阅读）
.yaml → YAML（结构化）
.txt  → 纯文本
目录  → 递归读取所有文件
```

### 3. 按优先级加载
```
后面的约束覆盖前面的（如果有重复）
加载顺序：global → domain → agent → specific
```

### 4. 自动去重
```
相同名字的约束只加载一次
避免重复注入
```

### 5. 灵活扩展
```
新增域？添加新文件
新增 Agent？添加新文件
新增约束类型？自定义搜索路径
```

---

## 🔧 Plugin 实现要点

```typescript
// Plugin 需要实现以下功能：

1. discoverConstraints(criteria)
   // 根据条件自动查找约束文件

2. parseMarkdown(content)
   // 解析 ## 标题下的内容

3. parseYaml(content)
   // 解析 YAML 格式

4. mergeConstraints(constraints)
   // 合并多个约束，避免重复

5. loadConstraintsForAgent(agent, domain)
   // 综合的加载函数

6. injectToSystemPrompt(constraints, systemPrompt)
   // 注入到 Agent 的 system prompt
```

---

## ✅ 总结

**这个系统的核心理念：**

```
Plugin 提供自动发现机制
用户完全自由组织约束

用户只需遵循约定：
  ✅ 把约束文件放在约定位置
  ✅ 用约定的命名规则
  ✅ 用支持的格式（MD/YAML）

Plugin 自动：
  ✅ 发现这些文件
  ✅ 解析约束内容
  ✅ 按照优先级加载
  ✅ 注入到 Agent 的 system prompt

结果：完全灵活 + 完全自动化
```

没有强制的层级，没有预定义的结构，完全由用户决定。
