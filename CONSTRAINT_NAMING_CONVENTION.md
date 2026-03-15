# 约束命名约定 - 轻量级设计

**设计原则**：最少化约束，最大化效率
**文件扫描**：只扫描约定的位置和命名，不扫描整个项目
**用户体验**：简单直观，一眼就懂

---

## 🎯 核心约定

### 只需遵循 2 个规则

```
规则 1：约束文件放在约定目录
规则 2：文件名遵循约定格式
```

---

## 📁 约定的目录结构

```
项目根目录/
└── .opencode/
    └── constraints/              ← 所有约束放这里
        ├── global.md
        ├── assets.md
        ├── video.md
        ├── agents/
        │   ├── gongbu.md
        │   └── xingbu.md
        └── domains/
            └── asset-management/
                ├── yibu.md
                └── kubu.md
```

**优点**：
- ✅ Plugin 只扫描 `.opencode/constraints/` 目录
- ✅ 不扫描整个项目
- ✅ 高效快速

---

## 📋 文件命名约定

### Level 1: 全局约束

```
文件名：global.md 或 global.yaml

放置位置：
  .opencode/constraints/global.md

内容示例：
  ## 禁止省略输出
  ...
  ## 失败处理
  ...
```

### Level 2: 域约束

```
文件名：{domain-name}.md 或 {domain-name}.yaml

放置位置：
  .opencode/constraints/{domain-name}.md
  或
  .opencode/constraints/domains/{domain-name}.md

例子：
  .opencode/constraints/asset-management.md
  .opencode/constraints/cr-processing.md
  .opencode/constraints/video.md
  .opencode/constraints/general.md

内容示例：
  ## 资产完整性
  ...
  ## 版本控制
  ...
```

### Level 3: Agent 约束

```
文件名：{agent-name}.md 或 {agent-name}.yaml

放置位置：
  .opencode/constraints/agents/{agent-name}.md

例子：
  .opencode/constraints/agents/gongbu.md
  .opencode/constraints/agents/xingbu.md
  .opencode/constraints/agents/bingbu.md
  .opencode/constraints/agents/yibu.md

内容示例：
  ## 代码完整性
  ...
  ## 类型声明
  ...
```

### Level 4: 细粒度约束（可选）

```
文件名：{domain-name}.{agent-name}.md

放置位置：
  .opencode/constraints/domains/{domain-name}/{agent-name}.md

例子：
  .opencode/constraints/domains/asset-management/yibu.md
  .opencode/constraints/domains/asset-management/kubu.md
  .opencode/constraints/domains/video/gongbu.md

内容示例：
  ## 扫描完整性
  ...
  ## 资产识别
  ...
```

---

## 🔍 Plugin 的扫描策略

### 高效的文件发现

```typescript
function discoverConstraints(agentName, domain, projectRoot) {
  const constraints = []
  const constraintsDir = path.join(projectRoot, '.opencode', 'constraints')

  // ✅ 只扫描约定目录，不扫描整个项目
  if (!fs.existsSync(constraintsDir)) {
    return constraints
  }

  // 1️⃣ 加载全局约束
  const globalFile = path.join(constraintsDir, 'global.md')
  if (fs.existsSync(globalFile)) {
    constraints.push(...parseConstraintFile(globalFile))
  }

  // 2️⃣ 加载域约束
  // 优先级：.opencode/constraints/domains/{domain}/ > .opencode/constraints/{domain}.md
  const domainDir = path.join(constraintsDir, 'domains', domain)
  const domainFile = path.join(constraintsDir, `${domain}.md`)

  if (fs.existsSync(domainDir)) {
    // 扫描目录下的所有 .md/.yaml
    const files = fs.readdirSync(domainDir)
      .filter(f => f.endsWith('.md') || f.endsWith('.yaml'))
    for (const file of files) {
      constraints.push(...parseConstraintFile(path.join(domainDir, file)))
    }
  } else if (fs.existsSync(domainFile)) {
    constraints.push(...parseConstraintFile(domainFile))
  }

  // 3️⃣ 加载 Agent 约束
  const agentFile = path.join(constraintsDir, 'agents', `${agentName}.md`)
  if (fs.existsSync(agentFile)) {
    constraints.push(...parseConstraintFile(agentFile))
  }

  // 4️⃣ 加载细粒度约束（可选）
  const specificFile = path.join(constraintsDir, 'domains', domain, `${agentName}.md`)
  if (fs.existsSync(specificFile)) {
    constraints.push(...parseConstraintFile(specificFile))
  }

  return constraints
}

function parseConstraintFile(filePath) {
  // 解析 ## 标题下的内容
  const content = fs.readFileSync(filePath, 'utf-8')
  const constraints = []

  const sections = content.split(/^## /m)
  for (const section of sections.slice(1)) {
    const lines = section.split('\n')
    const name = lines[0].trim()
    const body = lines.slice(1).join('\n').trim()

    constraints.push({
      name: name,
      content: body
    })
  }

  return constraints
}
```

**性能：**
- ✅ 不扫描整个项目
- ✅ 只检查约定位置的文件
- ✅ O(n) 复杂度，n 很小
- ✅ 极快

---

## 📊 具体例子

### 小项目

```
.opencode/constraints/
├── global.md          ← 所有规则
└── (其他文件，或者直接用全局)
```

### 中等项目

```
.opencode/constraints/
├── global.md
├── asset-management.md
├── video.md
└── agents/
    ├── gongbu.md
    └── xingbu.md
```

### 大项目

```
.opencode/constraints/
├── global.md
├── domains/
│   ├── asset-management/
│   │   ├── domain.md
│   │   ├── yibu.md
│   │   ├── kubu.md
│   │   └── ...
│   ├── cr-processing/
│   │   ├── domain.md
│   │   ├── menxia.md
│   │   └── ...
│   └── video/
│       ├── domain.md
│       └── gongbu.md
└── agents/
    ├── gongbu.md
    ├── xingbu.md
    ├── bingbu.md
    └── ...
```

---

## 🔄 加载流程示例

### 场景：Agent=gongbu, Domain=asset-management

```
Plugin 执行：

1️⃣ 检查全局约束
   查找：.opencode/constraints/global.md
   找到？✅ 加载

2️⃣ 检查域约束
   查找：.opencode/constraints/domains/asset-management/
        .opencode/constraints/asset-management.md
   找到？✅ 加载

3️⃣ 检查 Agent 约束
   查找：.opencode/constraints/agents/gongbu.md
   找到？✅ 加载

4️⃣ 检查细粒度约束
   查找：.opencode/constraints/domains/asset-management/gongbu.md
   找到？✅ 加载

✅ 最终注入所有发现的约束
```

---

## 📝 文件格式

### Markdown 格式（推荐）

```markdown
# 资产管理约束

## 资产完整性

提取的 5 份资产必须完整，缺一不可：
- Service/API
- DataModel
- UIComponent
- Provider
- Utility

## 版本控制

所有资产必须版本化：
- 每个资产都有 version 字段
- 遵循 Semantic Versioning
- 保存版本历史

## 一致性验证

资产间必须通过一致性验证...
```

### YAML 格式（结构化）

```yaml
# 可选的元数据
priority: high
version: 1.0

# 约束列表
constraints:
  - name: "资产完整性"
    content: |
      提取的 5 份资产必须完整...

  - name: "版本控制"
    content: |
      所有资产必须版本化...
```

**Plugin 支持两种格式**，自动检测解析。

---

## ✅ 设计特点

### 1. 最小化约束

```
只需两个约束：
  ✅ 放在 .opencode/constraints/ 目录
  ✅ 文件名遵循约定格式

其他一切自由
```

### 2. 高效查找

```
Plugin 的查找策略：
  ✅ 只查找约定目录
  ✅ 只查找约定的文件名
  ✅ 不扫描其他位置

结果：快速高效
```

### 3. 易于理解

```
约定很简单：
  global.md          → 全局
  {domain}.md        → 某个域
  agents/{agent}.md  → 某个 Agent
  domains/{d}/{a}.md → 特定组合

一眼就懂，无需文档
```

### 4. 支持目录和文件

```
域约束可以是：
  .opencode/constraints/asset-management.md    ← 单文件
  .opencode/constraints/domains/asset-management/ ← 目录

哪个存在就用哪个，灵活
```

---

## 🎯 对比总结

| 方案 | 效率 | 灵活性 | 复杂度 | 评价 |
|------|------|--------|--------|------|
| 无约束命名（全扫描） | ❌ 差 | ✅ 高 | ❌ 高 | 太浪费 |
| **轻量级约定（推荐）** | ✅ 好 | ✅ 中 | ✅ 低 | 完美平衡 |
| 严格分层约定 | ✅ 好 | ⚠️ 低 | ⚠️ 中 | 太死板 |

---

## 📋 完整的约定规则

### 规则 1：约束文件位置

```
必须放在：.opencode/constraints/ 目录
可以嵌套：.opencode/constraints/domains/{domain}/
可以嵌套：.opencode/constraints/agents/
```

### 规则 2：文件命名

```
全局约束：         global.md / global.yaml
域约束：          {domain-name}.md / {domain-name}.yaml
Agent 约束：       agents/{agent-name}.md / agents/{agent-name}.yaml
细粒度约束：       domains/{domain}/{agent}.md / domains/{domain}/{agent}.yaml
```

### 规则 3：文件格式

```
支持 Markdown：.md 文件，## 标题为约束名
支持 YAML：    .yaml 文件，constraints 字段为约束列表
自动检测：    根据文件扩展名和内容自动识别
```

### 规则 4：加载优先级

```
后者覆盖前者（如果约束名相同）：
  global.md
  → {domain}.md
  → agents/{agent}.md
  → domains/{domain}/{agent}.md
```

---

## 🚀 使用建议

```
第 1 步：创建 .opencode/constraints/ 目录
第 2 步：根据项目规模选择组织方式
第 3 步：按照约定命名文件
第 4 步：Plugin 自动发现加载

完成！
```

---

## ✨ 最后的优势

```
✅ 高效
   只扫描约定位置，不浪费资源

✅ 简单
   命名约定清晰，一眼就懂

✅ 灵活
   目录或文件都支持，可以混合使用

✅ 可靠
   约定的位置，Plugin 一定能找到

✅ 易维护
   新增约束？添加文件就行
   更新约束？编辑文件就行
```

这就是**最优的平衡点**！
