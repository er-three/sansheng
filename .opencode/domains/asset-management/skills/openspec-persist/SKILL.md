---
name: openspec-persist
description: OpenSpec 规范化和持久化 - 将资产提取结果按 OpenSpec 规范进行持久化
---

## 目的

将 asset-management 流程生成的所有资产（Service、Provider、DataModel、UIComponent 等）按 OpenSpec 规范进行结构化持久化，生成可追溯、可版本控制的资产档案。

## 工作流程

1. **资产分类与识别**
   - 从前置步骤的输出中识别各类资产
   - 分类：Service、Provider、DataModel、UIComponent、Utility 等
   - 为每个资产确定唯一的名称标识

2. **生成 OpenSpec 规范文档**
   对每个资产生成：
   - **proposal.md** — 资产创意和业务价值
   - **specification.md** — 完整的技术规格
   - **implementation/** — 代码、配置、文档

3. **建立初始档案**
   - 创建 archive/v1.0/ 保存首个版本
   - 生成 changelog.md 记录初始创建
   - 保存完整的元数据

4. **链接依赖关系**
   - 识别资产间的依赖关系
   - 在 proposal.md 中记录 related_assets
   - 生成依赖关系图（可选）

## 输出产物

OpenSpec 目录结构（按资产类型和名称组织）：

```
openspec/
├── service/
│   ├── user-service/
│   │   ├── proposal.md
│   │   ├── specification.md
│   │   ├── implementation/
│   │   │   ├── code/
│   │   │   ├── config/
│   │   │   └── docs/
│   │   ├── changelog.md
│   │   └── archive/
│   │       └── v1.0/
│   └── auth-service/
│       ├── proposal.md
│       ├── specification.md
│       └── ...
├── data-model/
│   ├── user/
│   ├── order/
│   └── ...
├── ui-component/
│   ├── user-card/
│   └── ...
└── provider/
    ├── database-provider/
    └── ...
```

## 规范文档模板

### proposal.md
```markdown
---
asset_type: {type}        # Service, DataModel, UIComponent, etc.
module: {module_name}
status: initial
created_at: {timestamp}
version: 1.0
---

# {Asset Name}

## Business Rationale
[Why this asset was created, business value, use cases]

## Summary
[One-paragraph technical overview]

## Key Components
- [Component 1]
- [Component 2]

## Related Assets
- [Dependency 1]
- [Dependency 2]
```

### specification.md
```markdown
---
asset_type: {type}
module: {module_name}
version: 1.0
status: specification
---

# {Asset Name} Specification

## Overview
[Detailed technical description]

## Architecture
[System design, patterns, key decisions]

## API / Interface
- [Method 1]
- [Method 2]

## Data Models
- [Model 1]
- [Model 2]

## Validation & Acceptance
- [Criterion 1]
- [Criterion 2]
```

## 关键约束

- 所有资产必须有唯一的类型和名称
- proposal.md 生成后不可修改（历史记录）
- 所有输出文件必须使用 UTF-8 编码
- 资产间的依赖关系必须完整记录
- 初始版本号必须是 v1.0

## 支持的资产类型

| 类型 | 目录 | 示例 |
|------|------|------|
| Service | service/ | UserService, OrderService |
| Provider | provider/ | DatabaseProvider, CacheProvider |
| DataModel | data-model/ | User, Order, Product |
| UIComponent | ui-component/ | UserCard, LoginForm |
| Utility | utility/ | DateUtils, StringUtils |
| Configuration | config/ | AppConfig, DatabaseConfig |
