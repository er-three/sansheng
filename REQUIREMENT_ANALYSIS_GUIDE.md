# 前置分析功能指南

## 概述

**前置分析** 是在选择工作流之前，系统对用户需求进行的智能评估。帮助用户：

1. ✅ 快速了解需求的复杂度
2. ✅ 选择合适的工作流配方（quick/standard/complete）
3. ✅ 预知成本和风险
4. ✅ 做出更好的决策

---

## 使用方法

### Step 1: 描述你的需求

只需简单描述你要做什么：

```
@analyzeRequirement 我要修复一个认证模块的 bug
@analyzeRequirement 迁移一个 Ionic 应用到 React
@analyzeRequirement 重构整个 Agent 系统
@analyzeRequirement 线上支付模块的紧急修复
```

### Step 2: 系统自动分析

系统会识别：
- **工作域** - 这是什么类型的任务？
- **复杂度** - simple/medium/complex/high_risk
- **风险等级** - 低/中/中-高/高
- **推荐配方** - 最合适的工作流模式
- **成本预测** - Token 消耗和耗时

### Step 3: 执行工作流

根据推荐执行对应的工作流：

```
推荐：general/standard (~120K token, 10分钟)

执行：@initGeneralWorkflow
选择配方：standard
```

---

## 分析示例

### 示例 1：简单 Bug 修复

```
输入：我要修复登录页面的一个样式 bug

分析结果：
[推荐配方] general/quick_fix
[复杂度] simple
[风险等级] 低
[成本预测] ~70K token, 5分钟

分析要点：
• 任务性质：bug 修复
• 用户标注复杂度较低
```

**决策：** 快速修复，用 quick_fix 配方，5 分钟完成

---

### 示例 2：跨模块认证系统修复

```
输入：我要修复一个认证模块的 bug，涉及 login 和 token 处理

分析结果：
[推荐配方] general/standard
[复杂度] medium
[风险等级] 中-高
[成本预测] ~120K token, 10分钟

分析要点：
• 检测到认证系统关键词
• 涉及多个模块 → 中等复杂度
• 认证系统为高风险操作
```

**决策：** 标准流程，用 standard 配方，完整验证

---

### 示例 3：应用迁移

```
输入：迁移一个中等规模的 Ionic 应用到 React

分析结果：
[推荐配方] reverse-engineering/standard
[复杂度] medium
[风险等级] 低
[成本预测] ~135K token, 12分钟

分析要点：
• 检测到迁移/逆向工程关键词
• 涉及应用级改造 → 中等复杂度
```

**决策：** 标准迁移，完整 TDD 流程

---

### 示例 4：关键系统紧急修复

```
输入：线上支付模块的紧急修复，需要快速部署

分析结果：
[推荐配方] general/quick_fix
[复杂度] simple
[风险等级] 高
[成本预测] ~70K token, 5分钟

分析要点：
• 支付系统为高风险操作
• 紧急修复 → 需要快速迭代
```

**决策：** 快速修复，但要特别注意测试验证

---

## 域识别规则

### 1. General（通用编程）

**关键词：** 修复、实现、开发、功能、分析、优化

**应用场景：**
- Bug 修复
- 新功能开发
- 代码优化
- 文件修改

```
"修复 API 响应超时问题" → general
"实现用户登出功能" → general
"优化数据库查询" → general
```

---

### 2. CR-Processing（变更请求）

**关键词：** CR、变更、升级、更新、迁移策略、兼容性

**应用场景：**
- 版本升级
- API 变更
- 依赖更新
- 重大架构调整

```
"升级 Express 版本" → cr-processing
"实现向后兼容的 API 变更" → cr-processing
"更新所有依赖到最新版本" → cr-processing
```

---

### 3. Asset-Management（资产提取）

**关键词：** 提取、资产、索引、映射、提取代码结构

**应用场景：**
- 项目资产提取
- 代码结构分析
- UI 框架识别
- 迁移前评估

```
"提取 Angular 项目的资产结构" → asset-management
"分析项目的代码依赖和组件关系" → asset-management
"为新项目生成代码索引" → asset-management
```

---

### 4. Reverse-Engineering（逆向工程）

**关键词：** 迁移、逆向、框架转换、Ionic、Angular、Vue、React

**应用场景：**
- 应用迁移
- 框架转换
- 遗留代码改造
- 系统现代化

```
"迁移 Ionic 应用到 React" → reverse-engineering
"将 Angular 1.x 升级到 Angular 10" → reverse-engineering
"转换旧 jQuery 项目为 Vue" → reverse-engineering
```

---

## 复杂度评分规则

### Simple（简单）

**特征：**
- 单文件或单模块修改
- Bug 修复
- 小补丁
- 明确范围

**评分：** -2 到 -1

```
"修复一个样式 bug" → simple
"更新某个函数的参数验证" → simple
"添加一个配置项" → simple
```

---

### Medium（中等）

**特征：**
- 多个文件或模块修改
- 跨模块协调
- 中等的复杂度
- 需要完整验证

**评分：** 0 到 1

```
"跨模块重构认证系统" → medium
"迁移一个中等项目" → medium
"添加一个新的微服务" → medium
```

---

### Complex（复杂）

**特征：**
- 系统级改造
- 多部分协调
- 长期维护项目
- 性能优化需求

**评分：** 2 到 3

```
"重构整个 Agent 系统" → complex
"实现分布式缓存系统" → complex
"性能优化和安全加固" → complex
```

---

### High Risk（高风险）

**特征：**
- 关键系统修改
- 金融/医疗等敏感领域
- 删除操作
- 权限变更

**评分：** 4+

```
"修改支付系统的核心逻辑" → high_risk
"变更数据库权限配置" → high_risk
"删除重要的遗留系统" → high_risk
```

---

## 风险等级判断

### 低风险

- 普通 bug 修复
- 文档更新
- 非关键代码修改
- 无特殊权限需求

---

### 中风险

- 跨模块修改
- 新功能开发
- 性能优化
- API 增强

---

### 中-高风险

- 认证/授权系统
- 数据处理流程
- 依赖升级
- 架构调整

---

### 高风险

- 支付/金融系统
- 医疗/法律系统
- 用户数据删除
- 权限变更
- 数据库修改
- 关键系统修改

---

## 配方推荐矩阵

| 复杂度/域 | general | cr-processing | asset-management | reverse-engineering |
|----------|---------|---------------|------------------|-------------------|
| simple | quick_fix | hotfix | quick | frontend_only |
| medium | standard | standard | standard | standard |
| complex | comprehensive | complete | complete | full_stack |
| high_risk | comprehensive | complete | complete | high_risk |

---

## 成本预测表

| 配方 | Token | 耗时 | 适用场景 |
|------|-------|------|--------|
| quick_fix | ~70K | 5min | 简单修复 |
| quick | ~55K | 5min | 快速提取 |
| hotfix | ~90K | 5min | 紧急修复 |
| frontend_only | ~90K | 5min | 前端专用 |
| migration | ~110K | 10min | 快速迁移 |
| standard | ~120-140K | 10-12min | 标准流程 |
| comprehensive | ~180K | 15min | 加强流程 |
| complete | ~200K | 20min | 完整版本 |
| full_stack | ~200K | 20min | 完整系统 |
| high_risk | ~225K | 25min | 高风险系统 |

---

## 最佳实践

### 1. 提供足够的上下文

**❌ 不好：** "修复 bug"
**✅ 好的：** "修复用户登录时 token 过期的认证 bug"

### 2. 描述涉及范围

**❌ 不好：** "重构系统"
**✅ 好的：** "重构 Agent 系统的约束管理部分，涉及 3 个模块"

### 3. 提及风险因素

**❌ 不好：** "升级依赖"
**✅ 好的：** "升级 Express 版本，涉及 API 兼容性检查"

### 4. 给出背景信息

**❌ 不好：** "快速迁移"
**✅ 好的：** "快速迁移 Ionic 应用到 React，已有测试覆盖"

---

## FAQ

### Q: 分析结果和我的预期不同？

**A:** 系统是基于启发式规则进行分析，可能存在判断偏差。
- 如果觉得应该用更简单的配方 → 选择 quick/quick_fix
- 如果觉得应该更谨慎 → 选择更高等级的配方

### Q: 可以手动修改推荐吗？

**A:** 可以！分析只是建议，你可以根据实际情况选择任何配方。

### Q: 为什么认证系统总是高风险？

**A:** 因为认证系统涉及用户安全，即使小修改也需要谨慎对待。

### Q: 怎样才能减少风险等级？

**A:**
- 提供更多上下文信息
- 明确说明修改范围很小
- 提及有充分的测试

---

## 工作流示例

### 完整工作流：从分析到执行

```
Step 1: 用户描述需求
"我要迁移一个 Ionic 应用，有 2000 行代码，已有不错的单元测试覆盖"

Step 2: 系统分析
@analyzeRequirement

结果：
[推荐配方] reverse-engineering/migration
[复杂度] medium
[风险等级] 低
[成本预测] ~110K token, 10分钟

Step 3: 启动工作流
@initReverseEngineeringWorkflow

Step 4: 选择配方
用户：选择 "migration" 配方

Step 5: 开始任务队列
@getTaskQueue

Step 6: 执行任务
...按照任务队列逐步执行...
```

---

## 总结

**前置分析的价值：**

| 方面 | 收益 |
|------|------|
| 决策速度 | ⚡ 快速选择合适配方 |
| 成本控制 | 💰 避免过度设计 |
| 风险管理 | 🛡️ 提前识别风险 |
| 用户体验 | 😊 知道期望的成本和耗时 |

**使用频率：**
- ✅ 每次新的工作开始前
- ✅ 不确定复杂度时
- ✅ 想了解成本预测时

**记住：** 分析是辅助决策，最终决定权在你。🎯
