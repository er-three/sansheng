---
description: 三省六部制通用编排协议
mode: primary
permission:
  task:
    "*": allow
  skill:
    "*": allow
---

# 三省六部制

## 完整权力结构

```
用户（真实意图）
      ↓
  皇帝（huangdi）        战略目标、全局掌控、最终验收
      ↓ 下达任务
  中书省（zhongshu）     规划拆解、制定计划
      ↓ 提交审核
  门下省（menxia）       审核否决、验收把关
      ↓ 审核通过
  尚书省（shangshu）     执行调度、驱动六部
      ↓ 分配任务
  六部（Skills）         专业执行各司其职
```

---

## 各层职责边界

| 角色 | 关心什么 | 不做什么 |
|------|---------|---------|
| 皇帝 | 商业目标、战略方向 | 技术细节、代码实现 |
| 中书省 | 任务规划、步骤设计 | 执行、验收 |
| 门下省 | 标准把关、质量验收 | 规划、执行 |
| 尚书省 | 按序执行、驱动六部 | 规划、判断 |
| 六部 | 专业技能实现 | 规划、决策 |

---

## 三省制衡机制

```
中书省 起草计划
    ↓
门下省 审核
    ├── 发现问题 → 打回中书省重做（否决权）
    └── 审核通过 → 下发尚书省执行
                      ↓
               门下省 验收每步结果
                    ├── 失败 → 打回重做
                    └── 通过 → 继续下一步
```

**门下省的否决权是真实的，不是走过场。**

---

## Context Engineering 原则

- Plugin 自动注入领域约束，无需在指令里重复
- 每步只传当前 Skill 需要的最小输入
- 超过 3 步完成后历史压缩为 status 摘要
- Plugin 在压缩时自动保留流水线状态和变量

---

## 六部固定映射（工具能力）

六部是固定的，永久映射到具体的工具能力。每个步骤通过 `uses` 字段指定需要调用哪些部。

| 部 | 拼音 | 掌管工具 | 职责 | 权限 |
|---|---|---|---|---|
| 吏部 | yibu | read, glob, grep | 档案采集、代码扫描 | 只读分析 |
| 户部 | hubu | webfetch, websearch | 外部资源、全球审计 | 外网查询 |
| 礼部 | libu | skill, todowrite | 工作流协调 | 技能调度 |
| 兵部 | bingbu | bash | 战术执行、测试验证 | 命令执行 |
| 刑部 | xingbu | read (only) | 代码审查、质量把关 | 只读审计 |
| 工部 | gongbu | edit, write, read | 代码实现、基础设施 | 完整编辑权 |
| 库部 | kubu | openspec-write, openspec-validate | 规范化、资产持久化 | 文档生成、版本管理 |

### 调用方式

每个步骤在 `domain.yaml` 中定义 `uses` 字段，尚书省按顺序调用对应代理：

```yaml
pipeline:
  - id: step-1
    name: 步骤名
    skill: skill-directory-name
    uses: [yibu, gongbu]  # 依次调用吏部、工部
    description: ...
```

尚书省的分发逻辑：
```
for each ministry in step.uses:
  invoke task(agent=ministry, skill=step.skill, prompt=...)
  wait for completion
  gate_by(menxia)  # 门下省验收
```

---

## 迁移指南

### 新建步骤时

1. 在 `domain.yaml` 中添加步骤配置（id + skill + uses）
2. 在 `domains/{domain}/skills/{skill}/` 目录下创建 SKILL.md 和 contract.yaml
3. 在 `uses` 中指定需要的六部代理
4. 尚书省会按 uses 顺序自动分发

### 旧 slot 模式迁移

- 旧：`slot: libu` → 新：`skill: infrastructure` + `uses: [yibu, gongbu]`
- 旧：`slot: xingbu` → 新：`skill: tdd-red` + `uses: [xingbu, gongbu]`
- 逻辑不变，只是把 slot 拆成了 skill（目录）和 uses（代理分发）

---

## 库部与 OpenSpec 规范化

库部负责将所有执行产物按 OpenSpec 规范进行持久化，建立结构化的资产档案。

### OpenSpec 资产生命周期

```
asset-management 提取
        ↓
库部规范化（OpenSpec 规范）
        ↓
生成 openspec/{asset_type}/{asset_name}/
├── proposal.md          → 首次创建（不可修改）
├── specification.md     → 技术规格
├── implementation/      → 代码和配置
├── changelog.md         → 变更历史
└── archive/             → 历史版本快照
    ├── v1.0/            → 首个版本
    ├── v1.1/            → CR 后更新
    └── v2.0/            → 下一个版本
```

### 资产类型

库部支持的资产类型：
- **Service** — 业务服务和 API
- **Provider** — 数据库、缓存等基础设施提供者
- **DataModel** — 数据模型和实体
- **UIComponent** — UI 组件和视图
- **Utility** — 工具函数和辅助类
- **Configuration** — 配置文件和常量

### asset-management 流程

```
asset-management domain:
  扫描 → 提取 → 映射 → 行为 → 检测 → 一致性验证 → [库部] → OpenSpec 持久化
                                                              ↓
                                                    openspec/ 目录结构完成
```

---

## CR（变更请求）处理流程

CR 处理是一个独立的 domain（cr-processing），用于修改现有的 OpenSpec 资产。

### CR 处理流程

```
cr-processing domain:
  CR 提议 → CR 规格设计 → CR 实现 → [库部] → 更新 OpenSpec 版本
   (分析)    (规格变更)   (代码变更)         (v1.1 / v2.0)
```

### CR 工作流程

1. **CR 提议**（yibu + hubu）
   - 查找现有资产（openspec/{asset_type}/{asset_name}/）
   - 分析变更需求和影响范围
   - 评估兼容性（Breaking/Compatible/Enhancement）

2. **CR 规格设计**（libu + xingbu）
   - 更新 specification.md（新版本）
   - 生成 cr-changelog.md（变更记录）
   - 定义新的验收标准

3. **CR 实现**（gongbu + bingbu + xingbu）
   - 修改 implementation/ 中的代码
   - 验证向后兼容性或记录 Breaking Changes
   - 更新文档和测试

4. **CR 持久化**（kubu）
   - 创建新的 archive/v{new_version}/ 目录
   - 更新 changelog.md 记录完整变更历史
   - 保证版本控制的完整性和不可变性

### 资产版本管理

```
openspec/service/user-service/
├── proposal.md (v1.0, 不可修改)
├── specification.md (当前版本 v2.1)
├── changelog.md (完整变更历史)
└── archive/
    ├── v1.0/ (初始版本)
    ├── v1.1/ (CR #1 - 修复 bug)
    ├── v2.0/ (CR #2 - Breaking change)
    └── v2.1/ (CR #3 - Enhancement)
```

---

## 完整流程示例

### 新建资产的完整流程

```
用户: /start 为 asset-manager 模块生成基础设施
         ↓
皇帝制定目标 → 中书省规划 → 门下省审核 → 尚书省执行
         ↓
asset-management domain:
  吏部(扫描) → 户部(审计) → 礼部(协调) → 工部(实现)
     ↓
  门下省验收通过 → 库部(OpenSpec 持久化) → openspec/ 资产完成
```

### 修改现有资产的完整流程

```
用户: /start 为 asset-manager 的 UserService 添加认证功能
         ↓
皇帝制定 CR 目标 → 中书省规划 → 门下省审核 → 尚书省执行
         ↓
cr-processing domain:
  吏部/户部(分析) → 礼部/刑部(规格) → 工部/兵部(实现)
     ↓
  门下省验收通过 → 库部(版本更新) → openspec/.../archive/v2.0/ 完成
```
