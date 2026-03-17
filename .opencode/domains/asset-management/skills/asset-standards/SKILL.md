---
name: asset-standards
title: 资产标准化定义
description: 五类资产标准定义、命名规范、输出格式约束
---

## 资产定义

### 1. Service（服务）
- **特征**：独立部署、有明确边界的业务功能单元
- **命名**：{domain}-{function}-service 或 {domain}-service
- **示例**：user-auth-service, payment-service
- **输出**：
  - specification.md：API 接口、数据模型、错误码
  - implementation/code：服务实现代码
  - config：配置文件、环境变量

### 2. Provider（数据提供者）
- **特征**：不拥有业务逻辑，负责数据获取、存储、转换
- **命名**：{source}-provider 或 {data-type}-provider
- **示例**：database-provider, cache-provider, api-gateway-provider
- **输出**：
  - specification.md：数据结构、接口契约、性能指标
  - implementation/code：驱动程序、连接池、转换层

### 3. DataModel（数据模型）
- **特征**：定义核心数据结构，无业务处理逻辑
- **命名**：{entity}-model 或 {domain}-data-model
- **示例**：user-model, order-model, product-data-model
- **输出**：
  - specification.md：字段定义、约束条件、版本演进
  - docs：ER 图、字段说明、示例数据

### 4. UIComponent（UI 组件）
- **特征**：可复用的前端组件，包括样式和交互逻辑
- **命名**：{function}-component 或 {function}-{variation}-component
- **示例**：date-picker-component, modal-component, card-component
- **输出**：
  - specification.md：属性、事件、样式变量、无障碍要求
  - implementation/code：组件代码（React/Vue/Web Components）
  - docs：使用示例、截图、交互说明

### 5. Utility（工具函数）
- **特征**：可复用的算法或工具，无副作用或依赖全局状态
- **命名**：{purpose}-util 或 {function}-helper
- **示例**：date-formatter-util, string-validator-util, math-helper
- **输出**：
  - specification.md：函数签名、参数、返回值、使用场景
  - implementation/code：纯函数实现

## 输出格式约束

### 1. 行号绑定（Line-Anchored）
- 每个代码片段必须明确给出文件路径和行号范围
- 格式：`file_path.ext:line_start-line_end`
- 示例：`implementation/code/user-service.ts:42-67`
- **零幻觉保证**：不得超出实际文件范围

### 2. 完整性
- 接口定义：必须列举所有公开方法/API 端点
- 数据结构：必须定义所有字段、类型、约束
- 依赖项：必须列举所有外部依赖、内部引用

### 3. 版本约束
- 所有资产必须包含版本号（frontmatter：`version: X.Y`）
- Breaking Change 必须明确标注
- 弃用字段/方法必须注明移除时间

## 命名规范

### 通用规则
- 使用 kebab-case（小写 + 连字符），不用 snake_case 或 camelCase
- 不超过 50 字符，避免过长或过短
- 尽量使用业界标准术语

### 类型后缀约定
| 类型 | 后缀 | 示例 |
|------|------|------|
| Service | -service | payment-service |
| Provider | -provider | redis-provider |
| DataModel | -model | customer-model |
| UIComponent | -component | dropdown-component |
| Utility | -util / -helper | string-validator-util |

## 禁止事项

[NO] **禁止混入框架代码**
- 不得包含框架初始化代码、依赖注入容器
- 资产定义必须框架无关（至少理论上可移植）

[NO] **禁止模糊词汇**
- 禁用：data, helper, manager, util（无修饰）
- 改用：user-profile-data, date-formatter-helper, state-manager

[NO] **禁止省略关键信息**
- 不得省略参数说明、返回值类型
- 不得省略版本号、兼容性声明
- 不得用伪代码替代实现

[NO] **禁止多职责混入**
- 一个资产原则上只对应一个业务职责
- 如需跨域功能，通过 composition 而非单体设计

## 验收标准

- [OK] 命名规范（kebab-case，有意义的后缀）
- [OK] 版本明确（frontmatter 有 version 字段）
- [OK] 接口/字段完整列举（无省略）
- [OK] 行号绑定准确（可直接跳转）
- [OK] Breaking Change 有标注
- [OK] 无框架耦合（理论可移植）
