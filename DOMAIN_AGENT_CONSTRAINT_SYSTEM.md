# 多域多 Agent 约束系统 - 完整设计方案

**设计时间**：2026-03-15
**状态**：✅ 设计完成，待实现
**覆盖范围**：所有域 × 所有 Agent 的约束组合

---

## 📋 当前状态

### ✅ 已实现（基于 Agent 类型）

```
global-constraints.yaml:
  ├─ universal（所有 Agent）
  ├─ agent_implementation（gongbu 等实现类）
  ├─ agent_code_review（xingbu 等审查类）
  ├─ agent_verification（bingbu 等测试类）
  └─ parallel_execution（并行执行约束）
```

### ⚠️ 缺失（基于域的约束）

```
不同的域有不同的需求：

asset-management 域
  ├─ yibu：扫描资产的特定约束
  ├─ hubu：全球审计的特定约束
  └─ kubu：资产持久化的特定约束

cr-processing 域
  ├─ zhongshu：CR 规划的特定约束
  ├─ menxia：CR 审核的特定约束
  └─ shangshu：CR 调度的特定约束

reverse-engineering 域
  └─ （特定约束需要定义）

video 域
  └─ （特定约束需要定义）
```

---

## 🎯 完整的约束继承体系

### 三层约束继承关系

```
Level 1: 通用约束
  ├─ universal（所有 Agent 必须遵守）
  │  └─ 禁止省略输出
  │  └─ 失败处理：只重试一次
  │  └─ 代码质量：必须通过测试
  │  └─ 落盘要求
  │  └─ ...
  │
Level 2: 域约束
  ├─ domain_asset_management（asset-management 域的所有 Agent）
  │  └─ 资产提取的特定要求
  │  └─ 版本控制的特定要求
  │  └─ 一致性验证的特定要求
  │
  ├─ domain_cr_processing（cr-processing 域的所有 Agent）
  │  └─ CR 流程的特定要求
  │  └─ 版本历史的特定要求
  │  └─ 兼容性检查的特定要求
  │
  └─ domain_video（video 域的所有 Agent）
     └─ 视频处理的特定要求
     └─ 格式转换的特定要求
     └─ 性能要求
  │
Level 3: Agent 约束
  ├─ agent_implementation（所有实现类 Agent）
  │  └─ 代码完整性
  │  └─ 类型声明
  │  └─ 编译验证
  │
  ├─ agent_code_review（所有审查类 Agent）
  │  └─ 审查标准
  │  └─ 检查项目
  │  └─ 报告格式
  │
  └─ agent_verification（所有测试类 Agent）
     └─ 测试覆盖
     └─ 报告格式
     └─ 失败处理
```

### 约束加载顺序

```
Agent: gongbu, Domain: asset-management

加载约束的顺序：
1. universal（通用约束）
   ├─ 禁止省略输出
   ├─ 失败处理
   └─ ...

2. domain_asset_management（域约束）
   ├─ 资产提取的特定要求
   └─ ...

3. agent_implementation（Agent 约束）
   ├─ 代码完整性
   ├─ 类型声明
   └─ ...

4. domain_asset_management_agent_implementation（最细粒度）
   ├─ asset-management 域中 gongbu 的特定约束
   └─ ...

最终 system prompt 包含：所有 4 层的约束（去重合并）
```

---

## 🔧 实现方案

### 方案 A：扩展 global-constraints.yaml

```yaml
version: 1.0

# Level 1: 通用约束（所有 Agent）
universal:
  - name: "完整输出"
    content: "禁止省略输出"
    priority: "high"
  - ...

# Level 2: 域约束
domain_asset_management:
  - name: "资产完整性"
    content: "提取的 5 份资产必须完整，缺一不可"
    priority: "high"
  - name: "版本控制"
    content: "所有资产必须版本化"
    priority: "high"

domain_cr_processing:
  - name: "CR 流程"
    content: "必须遵循 CR 提案 → 规范 → 实现 → 持久化 的流程"
    priority: "high"

domain_reverse_engineering:
  - name: "反向工程标准"
    content: "代码分析必须达到 AST 级别，不能只是字符串匹配"
    priority: "high"

domain_video:
  - name: "视频处理标准"
    content: "必须使用标准视频编码格式"
    priority: "high"

# Level 3: Agent 约束（按 Agent 类型）
agent_implementation:
  - name: "完整实现"
    content: "方法体必须完整实现"
    priority: "high"
  - ...

agent_code_review:
  - name: "严格审查"
    content: "逐行检查代码质量"
    priority: "high"
  - ...

# Level 4: 最细粒度约束（域 + Agent）
domain_asset_management_yibu:  # asset-management 域中的 yibu
  - name: "扫描完整性"
    content: "必须扫描所有代码文件，不遗漏"
    priority: "high"

domain_asset_management_kubu:  # asset-management 域中的 kubu
  - name: "持久化完整性"
    content: "所有资产必须完整持久化到 OpenSpec"
    priority: "high"

domain_cr_processing_menxia:   # cr-processing 域中的 menxia
  - name: "CR 审核标准"
    content: "必须检查向后兼容性、性能影响、安全风险"
    priority: "high"

domain_video_gongbu:           # video 域中的 gongbu
  - name: "视频编码标准"
    content: "必须使用 H.264 或 VP9 编码，比特率 2-10 Mbps"
    priority: "high"
```

### 方案 B：Plugin 中的约束加载逻辑

```typescript
// src/plugin.ts

function loadConstraintsForAgent(
  agentName: string,
  agentType: string,
  domain: string,
  globalConstraints: GlobalConstraints
): string[] {
  const constraints: string[] = []

  // Level 1: 通用约束
  if (globalConstraints.universal) {
    constraints.push(
      "## 全局通用约束（必须遵守）",
      ...globalConstraints.universal.map(c => `- ${c.content}`)
    )
  }

  // Level 2: 域约束
  const domainKey = `domain_${domain}` as keyof GlobalConstraints
  if (globalConstraints[domainKey]) {
    constraints.push(
      `## 【${domain}】域约束`,
      ...((globalConstraints[domainKey] as any) || []).map(
        (c: any) => `- ${c.content}`
      )
    )
  }

  // Level 3: Agent 类型约束
  const agentTypeKey = `agent_${agentType}` as keyof GlobalConstraints
  if (globalConstraints[agentTypeKey]) {
    constraints.push(
      `## 【${agentType}】 Agent 约束`,
      ...((globalConstraints[agentTypeKey] as any) || []).map(
        (c: any) => `- ${c.content}`
      )
    )
  }

  // Level 4: 最细粒度约束（域 + Agent 名）
  const specificKey = `domain_${domain}_${agentName}` as keyof GlobalConstraints
  if (globalConstraints[specificKey]) {
    constraints.push(
      `## 【${domain} + ${agentName}】特定约束`,
      ...((globalConstraints[specificKey] as any) || []).map(
        (c: any) => `- ${c.content}`
      )
    )
  }

  return constraints
}

// 在 experimental.chat.system.transform 钩子中使用
"experimental.chat.system.transform": async (
  _input: Record<string, unknown>,
  output: { system: string[] }
) => {
  const root = findRoot()
  const registry = readRegistry(root)
  const domain = readDomain(root, registry.active_domain)
  const globalConstraints = readGlobalConstraints(root)

  const agentName = (_input as any).agent_name || "unknown"
  const agentType = getAgentType(agentName)  // yibu → "scan", gongbu → "implementation"

  const constraints = loadConstraintsForAgent(
    agentName,
    agentType,
    domain.name,
    globalConstraints
  )

  output.system.push(...constraints)
}
```

---

## 🗂️ 完整的目录结构

```
.opencode/
├── global-constraints.yaml
│   ├─ universal（所有 Agent）
│   ├─ domain_asset_management
│   ├─ domain_cr_processing
│   ├─ domain_reverse_engineering
│   ├─ domain_video
│   ├─ agent_implementation
│   ├─ agent_code_review
│   ├─ agent_verification
│   ├─ domain_asset_management_yibu
│   ├─ domain_asset_management_hubu
│   ├─ domain_asset_management_kubu
│   ├─ domain_cr_processing_zhongshu
│   ├─ domain_cr_processing_menxia
│   ├─ domain_cr_processing_shangshu
│   ├─ domain_video_gongbu
│   └─ ...

├── domains/
│   ├── asset-management/
│   │   ├─ domain.yaml
│   │   └─ skills/
│   │       ├─ scan/
│   │       ├─ extract/
│   │       ├─ mapping/
│   │       ├─ behavior/
│   │       ├─ detect/
│   │       ├─ verify-consistency/
│   │       └─ openspec-persist/
│   │
│   ├── cr-processing/
│   │   ├─ domain.yaml
│   │   └─ skills/
│   │       ├─ cr-proposal/
│   │       ├─ cr-specification/
│   │       ├─ cr-implementation/
│   │       └─ cr-persist/
│   │
│   ├── reverse-engineering/
│   │   ├─ domain.yaml
│   │   └─ skills/
│   │       └─ project-standards/
│   │
│   ├── video/
│   │   ├─ domain.yaml
│   │   └─ skills/
│   │       ├─ video-generation/
│   │       ├─ video-processing/
│   │       └─ ...
│   │
│   └── general/
│       ├─ domain.yaml
│       └─ skills/
│           ├─ analyze/
│           ├─ implement/
│           └─ verify/
```

---

## 📊 具体示例

### 场景 1：asset-management 域中的 yibu

```
Agent: yibu
Domain: asset-management
Constraints加载：

1. universal
   - 禁止省略输出
   - 失败处理：只重试一次
   - ...

2. domain_asset_management
   - 资产完整性：提取的 5 份资产必须完整
   - 版本控制：所有资产必须版本化
   - 一致性验证：资产间必须一致
   - ...

3. agent_scan（yibu 的 Agent 类型）
   - 代码扫描的特定约束
   - 性能要求
   - ...

4. domain_asset_management_yibu
   - 扫描完整性：必须扫描所有文件
   - 重点文件检查：Service/Provider/DataModel/UIComponent
   - 关键词提取精度：不低于 95%
   - ...

最终 system prompt：包含以上所有 4 层约束的并集
```

### 场景 2：cr-processing 域中的 menxia

```
Agent: menxia
Domain: cr-processing
Constraints 加载：

1. universal
   - 禁止省略输出
   - 失败处理
   - ...

2. domain_cr_processing
   - CR 流程要求
   - 版本历史维护
   - 兼容性检查
   - ...

3. agent_code_review（menxia 的 Agent 类型）
   - 审查标准
   - 检查项目
   - 报告格式
   - ...

4. domain_cr_processing_menxia
   - 向后兼容性检查
   - 性能影响评估
   - 安全风险识别
   - CR 冲突检测
   - ...

最终 system prompt：包含以上所有约束
```

### 场景 3：video 域中的 gongbu

```
Agent: gongbu
Domain: video
Constraints 加载：

1. universal
   - 禁止省略输出
   - ...

2. domain_video
   - 视频处理标准
   - 格式要求
   - 性能指标
   - ...

3. agent_implementation（gongbu 的 Agent 类型）
   - 代码完整性
   - 类型声明
   - 编译验证
   - ...

4. domain_video_gongbu
   - 视频编码标准：H.264 或 VP9
   - 比特率要求：2-10 Mbps
   - 分辨率要求：1080p 或更高
   - 帧率要求：24/30/60 fps
   - ...

最终 system prompt：包含以上所有约束
```

---

## 🔄 Agent 类型映射

```typescript
// Agent 名 → Agent 类型的映射

const agentTypeMap = {
  // 扫描类
  yibu: 'scan',

  // 外部资源类
  hubu: 'external',

  // 协调类
  libu: 'coordination',

  // 测试类
  bingbu: 'verification',

  // 审查类
  xingbu: 'code_review',

  // 实现类
  gongbu: 'implementation',

  // 资产持久化类
  kubu: 'persistence',

  // 规划类
  zhongshu: 'planning',

  // 审核类
  menxia: 'approval',

  // 调度类
  shangshu: 'orchestration',
}
```

---

## 💻 完整的约束组合矩阵

```
                    yibu    hubu    gongbu  xingbu  bingbu  kubu
asset-mgmt          ✅      ✅      ✅      ✅      ✅      ✅
cr-processing       ✅      ✅      ✅      ✅      ✅      ✅
reverse-eng         ✅      ✅      ✅      ✅      ✅      ✅
video               ✅      ✅      ✅      ✅      ✅      ✅
general             ✅      ✅      ✅      ✅      ✅      ✅

每个交叉点 (Domain × Agent) 都有对应的约束定义
如无特殊约束，则继承 universal + domain + agent_type 三层约束
```

---

## ✅ 实现检查清单

### 第一阶段：扩展 global-constraints.yaml
- [ ] 添加 domain_asset_management 约束
- [ ] 添加 domain_cr_processing 约束
- [ ] 添加 domain_reverse_engineering 约束
- [ ] 添加 domain_video 约束
- [ ] 添加最细粒度约束（domain_X_Y 组合）

### 第二阶段：增强 plugin.ts
- [ ] 实现 loadConstraintsForAgent() 函数
- [ ] 增强 experimental.chat.system.transform 钩子
- [ ] 支持四层约束加载
- [ ] 去重合并约束

### 第三阶段：文档和测试
- [ ] 更新文档
- [ ] 添加示例配置
- [ ] 测试所有域 × Agent 的组合

---

## 🎯 优势

### 当前方案的局限
```
❌ 只支持 Agent 类型约束（gongbu、xingbu 等）
❌ 无法定义不同域的特定约束
❌ 跨域 Agent 使用时无法区分约束
```

### 完整方案的优势
```
✅ 支持域级约束（asset-management、cr-processing 等）
✅ 支持最细粒度的约束（域 + Agent 组合）
✅ 约束层级清晰，易于维护
✅ 每个 Agent 获得精确的约束组合
✅ 可扩展性强，新增域时无需修改代码
```

---

## 📈 约束优先级

```
优先级递增：

1. universal（基础，所有 Agent）
   应用率：100%

2. domain_X（域级，该域所有 Agent）
   应用率：当前域使用

3. agent_type（Agent 类型级）
   应用率：所有同类 Agent

4. domain_X_Y（最细粒度）
   应用率：特定 Agent 在特定域中
```

---

## 🎓 总结

当前实现已经涵盖了基于 **Agent 类型** 的约束注入，但要完全支持 **多域多 Agent** 的场景，需要：

1. **扩展 global-constraints.yaml**
   - 添加 domain_* 约束
   - 添加 domain_*_agent 约束

2. **增强 Plugin 加载逻辑**
   - 四层约束加载
   - 智能合并去重

3. **建立约束矩阵**
   - 每个 Domain × Agent 的明确约束
   - 清晰的继承关系

这样才能确保每个 Agent 在每个域中都获得精确的、完整的约束集合。
