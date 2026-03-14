# 用户定义约束系统 - 自动发现和加载机制

**设计时间**：2026-03-15
**核心理念**：用户自由定义，Plugin 自动发现加载
**灵活性**：完全由用户决定约束的组织方式

---

## 🎯 核心设计原则

Plugin 提供一个**自动发现和加载机制**：
- 用户可以用任意方式定义约束（MD/YAML/Skill）
- 采用**约定大于配置**的方式
- Plugin 按照约定的命名规则自动发现并加载
- 用户完全自由，无任何强制

---

## 📋 约束文件命名约定

### 方案 A：基于文件名的约束发现

```
约束文件放在特定目录：.opencode/constraints/ 或 .opencode/agents/

命名规则：
  global-constraints.md          → 全局约束（所有 Agent）
  domain-{name}-constraints.md   → 特定域约束
  agent-{name}-constraints.md    → 特定 Agent 约束
  domain-{name}-agent-{name}.md  → 最细粒度约束

例子：
  global-constraints.md                    → 所有 Agent 都读这个
  domain-asset-management-constraints.md   → asset-management 域的约束
  domain-cr-processing-constraints.md      → cr-processing 域的约束
  agent-gongbu-constraints.md              → gongbu Agent 的约束
  agent-xingbu-constraints.md              → xingbu Agent 的约束
  domain-asset-management-agent-yibu.md    → asset-management 域 + yibu 的约束
  domain-video-agent-gongbu.md             → video 域 + gongbu 的约束
```

### 方案 B：基于目录结构的约束发现

```
.opencode/
├── constraints/
│   ├── global.md                  → 全局约束
│   ├── asset-management/
│   │   ├── domain.md              → 域约束
│   │   ├── yibu.md               → yibu 专用约束
│   │   ├── hubu.md               → hubu 专用约束
│   │   ├── kubu.md               → kubu 专用约束
│   │   └── ...
│   ├── cr-processing/
│   │   ├── domain.md
│   │   ├── menxia.md
│   │   ├── shangshu.md
│   │   └── ...
│   ├── video/
│   │   ├── domain.md
│   │   ├── gongbu.md
│   │   └── ...
│   └── agents/
│       ├── gongbu.md              → gongbu 通用约束（所有域）
│       ├── xingbu.md              → xingbu 通用约束（所有域）
│       └── ...
```

### 方案 C：混合方式（推荐）

```
用户可以混合使用 MD、YAML、Skill：

.opencode/
├── constraints/
│   ├── global.yaml               → 全局约束（YAML 格式）
│   ├── global-constraints.md     → 全局约束（Markdown 格式）
│   ├── asset-management.yaml     → 域约束（YAML）
│   ├── asset-management.md       → 域约束（Markdown）
│   ├── agent-gongbu.md           → Agent 约束
│   └── domain-video-agent-gongbu/ → 最细粒度（可以是目录）
│       ├── README.md             → 说明
│       ├── encoding.md           → 编码约束
│       ├── audio.md              → 音频约束
│       └── performance.md        → 性能约束

或者用 Skill 定义：
├── domains/asset-management/
│   ├── constraints/              → 该域的所有约束
│   │   ├── scanning.md          → 扫描约束
│   │   ├── extraction.md        → 提取约束
│   │   ├── verification.md      → 验证约束
│   │   └── persistence.md       → 持久化约束
│   └── skills/
│       └── scan/
│           └── CONSTRAINTS.md    → 该 skill 的约束
```

---

## 🔍 Plugin 的自动发现机制

### 发现流程

```typescript
// Plugin 加载约束的流程

function loadConstraintsForAgent(agentName, agentType, domain) {
  const constraints = []

  // 第 1 步：发现全局约束
  const globalConstraints = discoverConstraints({
    type: 'global',
    // 自动查找：
    //   - .opencode/constraints/global.md
    //   - .opencode/constraints/global.yaml
    //   - .opencode/global-constraints.md
    //   - 其他约定的位置
  })
  constraints.push(...globalConstraints)

  // 第 2 步：发现域约束
  const domainConstraints = discoverConstraints({
    type: 'domain',
    domain: domain,
    // 自动查找：
    //   - .opencode/constraints/{domain}/domain.md
    //   - .opencode/constraints/{domain}.md
    //   - .opencode/domains/{domain}/constraints/
    //   - domain-{domain}-constraints.md
    //   - 等等
  })
  constraints.push(...domainConstraints)

  // 第 3 步：发现 Agent 约束
  const agentConstraints = discoverConstraints({
    type: 'agent',
    agent: agentName,
    // 自动查找：
    //   - .opencode/constraints/{domain}/{agentName}.md
    //   - .opencode/agents/{agentName}.md
    //   - agent-{agentName}-constraints.md
    //   - .opencode/constraints/agents/{agentName}.md
    //   - 等等
  })
  constraints.push(...agentConstraints)

  // 第 4 步：发现细粒度约束
  const specificConstraints = discoverConstraints({
    type: 'specific',
    domain: domain,
    agent: agentName,
    // 自动查找：
    //   - .opencode/constraints/{domain}/{agentName}.md
    //   - domain-{domain}-agent-{agentName}.md
    //   - .opencode/domains/{domain}/constraints/{agentName}.md
    //   - 等等
  })
  constraints.push(...specificConstraints)

  return mergeAndDedup(constraints)
}

function discoverConstraints(criteria) {
  const found = []

  // 扫描约定位置
  const searchPaths = generateSearchPaths(criteria)

  for (const path of searchPaths) {
    if (fs.existsSync(path)) {
      // 读取文件
      const content = fs.readFileSync(path, 'utf-8')

      // 解析内容
      if (path.endsWith('.md')) {
        // Markdown 解析：提取 ## 标题下的内容作为约束
        found.push(...parseMarkdown(content))
      } else if (path.endsWith('.yaml') || path.endsWith('.yml')) {
        // YAML 解析：按照约定格式读取
        found.push(...parseYaml(content))
      } else if (isDirectory(path)) {
        // 目录：递归读取所有 MD/YAML 文件
        found.push(...discoverFromDirectory(path))
      }
    }
  }

  return found
}

function generateSearchPaths(criteria) {
  // 根据 criteria 生成搜索路径列表
  // 返回的路径按优先级排序（后者覆盖前者）

  const paths = []

  if (criteria.type === 'global') {
    paths.push(
      '.opencode/constraints/global.md',
      '.opencode/constraints/global.yaml',
      '.opencode/global-constraints.md',
      '.opencode/global-constraints.yaml',
      'global-constraints.md'
    )
  } else if (criteria.type === 'domain') {
    paths.push(
      `.opencode/constraints/${criteria.domain}/domain.md`,
      `.opencode/constraints/${criteria.domain}.md`,
      `.opencode/domains/${criteria.domain}/constraints/`,
      `domain-${criteria.domain}-constraints.md`,
      `.opencode/domains/${criteria.domain}/constraints.md`
    )
  } else if (criteria.type === 'agent') {
    paths.push(
      `.opencode/constraints/${criteria.domain}/${criteria.agent}.md`,
      `.opencode/constraints/agents/${criteria.agent}.md`,
      `.opencode/agents/${criteria.agent}.md`,
      `agent-${criteria.agent}-constraints.md`,
      `.opencode/agents/${criteria.agent}/constraints.md`
    )
  } else if (criteria.type === 'specific') {
    paths.push(
      `.opencode/constraints/${criteria.domain}/${criteria.agent}.md`,
      `.opencode/domains/${criteria.domain}/constraints/${criteria.agent}.md`,
      `domain-${criteria.domain}-agent-${criteria.agent}.md`,
      `.opencode/constraints/${criteria.domain}-${criteria.agent}.md`
    )
  }

  return paths
}
```

---

## 📝 约束内容格式

### Markdown 格式（最灵活）

```markdown
# 资产管理域约束

## 资产完整性

提取的 5 份资产必须完整，缺一不可：
- Service/API 接口定义
- DataModel/数据结构定义
- UIComponent/前端组件
- Provider/依赖提供者
- Utility/工具函数库

## 版本控制

所有资产必须版本化：
- 每个资产都必须有 version 字段
- 版本遵循 Semantic Versioning
- 版本历史必须完整保存

## 一致性验证

资产间必须通过一致性验证...

# gongbu 代码实现约束

## 完整实现

每个方法体必须完整实现...

## 类型明确

所有类型都必须明确...
```

Plugin 解析：
```typescript
function parseMarkdown(content) {
  // 提取所有 ## 二级标题下的内容
  // 每个二级标题就是一个约束
  // 内容是该约束的详细说明

  const constraints = []
  const sections = content.split(/^## /m)

  for (const section of sections.slice(1)) {
    const lines = section.split('\n')
    const name = lines[0]
    const content = lines.slice(1).join('\n').trim()

    constraints.push({
      name: name,
      content: content,
      source: 'markdown'
    })
  }

  return constraints
}
```

### YAML 格式（结构化）

```yaml
# .opencode/constraints/asset-management.yaml

constraints:
  - name: "资产完整性"
    description: "提取的 5 份资产必须完整"
    content: |
      提取的 5 份资产必须完整，缺一不可：
      - Service/API 接口定义
      - DataModel/数据结构定义
      - UIComponent/前端组件
      - Provider/依赖提供者
      - Utility/工具函数库
    priority: "high"

  - name: "版本控制"
    description: "所有资产必须版本化"
    content: |
      所有资产必须版本化：
      - 每个资产都必须有 version 字段
      - ...
    priority: "high"
```

### Skill 格式（结合工作流）

```markdown
# .opencode/domains/asset-management/skills/scan/CONSTRAINTS.md

## 扫描完整性

代码扫描必须完整：
- 必须扫描所有代码文件
- 包括所有编程语言
- 递归扫描所有目录

## 资产识别

必须准确识别以下资产：
- Service/API：class/interface 以 Service 命名
- DataModel：class/interface 以 Model 命名
- UIComponent：class 以 Component 命名
- Provider：以 Provider 命名
- Utility：以 Util/Helper 命名
```

---

## 🔄 实际的加载流程示例

### 场景：gongbu Agent 在 asset-management 域中被调用

```
Plugin 收到：
  agent: gongbu
  domain: asset-management

自动发现和加载约束：

1️⃣ 发现全局约束
   查找：
   ✅ .opencode/constraints/global.md
   ✅ .opencode/global-constraints.md
   ✅ global-constraints.yaml

   加载内容：
   - 禁止省略输出
   - 失败处理：只重试一次
   - 代码质量
   - 落盘要求
   - ...

2️⃣ 发现域约束（asset-management）
   查找：
   ✅ .opencode/constraints/asset-management.md
   ✅ .opencode/domains/asset-management/constraints/
   ✅ domain-asset-management-constraints.md

   加载内容：
   - 资产完整性
   - 版本控制
   - 一致性验证
   - 提取精度 >= 95%

3️⃣ 发现 Agent 约束（gongbu）
   查找：
   ✅ .opencode/constraints/agents/gongbu.md
   ✅ agent-gongbu-constraints.md
   ✅ .opencode/agents/gongbu/constraints.md

   加载内容：
   - 完整实现
   - 无省略分支
   - 类型明确
   - 编译验证

4️⃣ 发现细粒度约束（asset-management + gongbu）
   查找：
   ✅ .opencode/constraints/asset-management/gongbu.md
   ✅ domain-asset-management-agent-gongbu.md
   ✅ .opencode/domains/asset-management/constraints/gongbu.md

   加载内容：
   - （该域该 Agent 的特定约束）

✅ 最终 system prompt 包含：
   所有 4 层约束的并集（自动去重）
```

---

## 💻 Plugin 实现框架

```typescript
// src/plugin.ts

"experimental.chat.system.transform": async (
  _input: Record<string, unknown>,
  output: { system: string[] }
) => {
  try {
    const root = findRoot()
    const registry = readRegistry(root)
    const agentName = _input.agent_name || 'unknown'
    const agentType = getAgentType(agentName)
    const domain = registry.active_domain

    // 使用自动发现机制加载约束
    const constraints = discoverAndLoadConstraints({
      agentName,
      agentType,
      domain,
      projectRoot: root
    })

    // 注入到 system prompt
    if (constraints.length > 0) {
      output.system.push(
        "## 约束（根据 Agent 和域自动加载）",
        ...constraints.map(c => `- ${c.name}: ${c.content.split('\n')[0]}`)
      )
    }

  } catch (error) {
    // 日志：记录发现了哪些约束
  }
}

function discoverAndLoadConstraints(criteria) {
  const constraints = []
  const loaded = new Set() // 去重

  // 按顺序发现约束（后者覆盖前者）
  const sources = ['global', 'domain', 'agent', 'specific']

  for (const source of sources) {
    const discovered = discoverConstraints({
      ...criteria,
      type: source
    })

    for (const constraint of discovered) {
      const key = `${constraint.name}-${source}`
      if (!loaded.has(key)) {
        constraints.push(constraint)
        loaded.add(key)
      }
    }
  }

  return constraints
}
```

---

## 🎯 用户的使用方式

用户完全自由决定如何组织约束：

### 方案 1：简单的全局约束

```
.opencode/
└── global-constraints.md  (一个文件，所有约束)
```

### 方案 2：按域分类

```
.opencode/constraints/
├── global.md
├── asset-management.md
├── cr-processing.md
└── video.md
```

### 方案 3：按域 + Agent 分类

```
.opencode/constraints/
├── global.md
├── asset-management/
│   ├── domain.md
│   ├── yibu.md
│   ├── gongbu.md
│   └── kubu.md
├── cr-processing/
│   ├── domain.md
│   ├── menxia.md
│   └── ...
└── video/
    ├── domain.md
    └── gongbu.md
```

### 方案 4：直接放在 skill 里

```
.opencode/domains/asset-management/
└── skills/scan/
    └── CONSTRAINTS.md  (该 skill 的约束)
```

### 方案 5：混合方式（完全自由）

```
.opencode/
├── constraints/
│   ├── global.yaml
│   ├── asset-management.md
│   └── agents/
│       └── gongbu.md
└── domains/
    └── asset-management/
        └── constraints/
            ├── extraction.md
            └── verification.md
```

---

## ✅ 优势

```
✅ 完全灵活
   用户可以用任意方式组织约束

✅ 自动发现
   Plugin 自动找到并加载约束

✅ 无强制约束
   没有预定义的层级

✅ 易于扩展
   新增域或 Agent 时，只需新增文件

✅ 易于维护
   约束和对应的代码在一起

✅ 易于复用
   约束可以共享给其他项目
```

---

## 📋 实现检查清单

- [ ] 实现 `discoverConstraints()` 函数
- [ ] 实现 `generateSearchPaths()` 函数
- [ ] 实现 Markdown 约束解析
- [ ] 实现 YAML 约束解析
- [ ] 实现约束去重合并
- [ ] 集成到 `experimental.chat.system.transform` 钩子
- [ ] 添加调试日志（显示发现了哪些约束）
- [ ] 支持热加载（约束文件变更时自动重新加载）

---

## 🎓 总结

这个方案的核心是：

**Plugin 提供一个通用的自动发现机制，用户完全自由决定如何定义和组织约束。**

- Plugin 知道**去哪里查找**（约定的位置）
- Plugin 知道**怎么解析**（MD、YAML、Skill 格式）
- Plugin 知道**怎么合并**（按优先级，后者覆盖前者）
- 但 Plugin 不强制**怎么组织**（用户完全自由）

这样既提供了便利（自动发现加载），又保留了灵活性（用户决定组织方式）。
