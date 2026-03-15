# 需求分析快速指南

## 一句话说明

**在选择工作流之前，让系统自动分析你的需求，推荐最合适的配方。**

---

## 快速开始（3步）

### 1️⃣ 描述需求

```
用户：我要修复一个认证模块的 bug

系统：@analyzeRequirement
```

### 2️⃣ 查看分析结果

```
[分析结果]
[推荐配方] general/standard
[复杂度] medium
[风险等级] 中-高
[成本预测] ~120K token, 10分钟
```

### 3️⃣ 启动工作流

```
@initGeneralWorkflow
选择配方：standard
```

---

## 常见场景速查

### Bug 修复

| 场景 | 推荐配方 | 成本 | 耗时 |
|------|---------|------|------|
| 简单样式 bug | quick_fix | ~70K | 5min |
| 跨模块认证 bug | standard | ~120K | 10min |
| 关键系统 bug | comprehensive | ~180K | 15min |

**关键词：** 修复、bug、问题

---

### 应用迁移

| 场景 | 推荐配方 | 成本 | 耗时 |
|------|---------|------|------|
| 静态页面迁移 | frontend_only | ~90K | 5min |
| 有测试覆盖 | migration | ~110K | 10min |
| 标准应用迁移 | standard | ~135K | 12min |
| 复杂系统迁移 | full_stack | ~200K | 20min |

**关键词：** 迁移、转换、Ionic、Angular、React、Vue

---

### 资产提取

| 场景 | 推荐配方 | 成本 | 耗时 |
|------|---------|------|------|
| 简单项目 | quick | ~55K | 5min |
| 中等项目 | standard | ~125K | 15min |
| 复杂项目 | complete | ~175K | 25min |

**关键词：** 提取、资产、索引、映射

---

### 变更请求

| 场景 | 推荐配方 | 成本 | 耗时 |
|------|---------|------|------|
| 线上 hotfix | hotfix | ~90K | 5min |
| 普通 CR | standard | ~140K | 12min |
| 重大升级 | complete | ~200K | 20min |

**关键词：** CR、变更、升级、更新、兼容性

---

## 域快速识别

```
关键词识别（优先级顺序）

1. CR / 变更 / 升级 / 更新
   → cr-processing 域

2. 迁移 / 逆向 / Ionic / Angular / Vue / React
   → reverse-engineering 域

3. 提取 / 资产 / 索引 / 映射
   → asset-management 域

4. 都不是
   → general 域（通用编程）
```

---

## 复杂度速判

```
指标                 → 评分影响
─────────────────────────────
修复、小              -2     simple
多模块、跨文件        +2     medium
重构、架构、全局      +3     complex
删除、权限、数据库    +3     high_risk

规则：
 分数 ≤ -1 → simple
 分数 0-1  → medium
 分数 2-3  → complex
 分数 ≥ 4  → high_risk
```

---

## 风险等级速判

```
风险因素 (加分)           → 风险等级
────────────────────────────────
无                        → 低 (0)
跨模块/API 变更           → 中 (1)
认证/授权/依赖升级        → 中-高 (2)
支付/医疗/删除/权限/数据库 → 高 (3+)
```

---

## 工具使用

### 显示帮助信息

```
@analyzeRequirement
```

### 执行分析（自动）

```
说：我要修复一个 bug，涉及认证模块
系统：自动分析用户输入
```

---

## 成本对比

### 同一个任务，不同配方

**示例：修复认证系统的跨模块 bug**

| 配方 | Token | 耗时 | 差异 |
|------|-------|------|------|
| quick_fix | ~70K | 5min | ❌ 可能不够 |
| standard | ~120K | 10min | ✅ 推荐 |
| comprehensive | ~180K | 15min | 💰 成本高 |

**节省 43% Token，推荐使用 standard**

---

## 调整推荐的方法

### 你觉得太简单？

```
推荐：quick_fix
你的决定：选择 standard
```

### 你觉得太复杂？

```
推荐：comprehensive
你的决定：选择 standard
```

### 你觉得风险低估了？

```
风险等级：低
你的决定：按中-高风险处理
```

---

## 关键要点

✅ **分析是辅助，不是命令**
- 你可以接受、修改或拒绝建议

✅ **提供更多信息 = 更准确分析**
- "修复 bug" < "修复用户认证超时的 bug"

✅ **多用几次就理解规律了**
- 简单修复 → quick_fix/quick
- 跨模块改造 → standard
- 系统级重构 → comprehensive/complete

✅ **成本是线性的**
- quick_fix: 5 min, ~70K
- standard: 10 min, ~120K (+71%)
- comprehensive: 15 min, ~180K (+150%)

✅ **风险不是只有高低**
- 低 → 中 → 中-高 → 高
- 选择配方时要考虑风险

---

## 完整示例

### 用户：我要迁移一个 Ionic 应用到 React，项目中等规模，已有测试

**分析过程：**
1. 关键词："迁移" + "Ionic" + "React" → reverse-engineering 域 ✓
2. 范围："中等规模" → medium 复杂度 ✓
3. 风险："已有测试" → 风险较低 ✓

**推荐：**
```
[推荐配方] reverse-engineering/standard
[复杂度] medium
[风险等级] 低
[成本预测] ~135K token, 12分钟
```

**执行：**
```
@initReverseEngineeringWorkflow
选择配方：standard
```

---

## 下一步

- 📖 详细指南：见 `REQUIREMENT_ANALYSIS_GUIDE.md`
- 🔗 工作流指南：见 `DOMAIN_WORKFLOW_GUIDE.md`
- 📊 完整参考：见 `WORKFLOW_GUIDE.md`

**现在开始：** 描述你的需求，让系统帮你分析！🚀
