---
name: cr-implementation
title: CR 实现
description: 修改代码，运行测试，验证向后兼容性
---

## 目的

根据新规格，实现代码变更，并确保所有测试通过：
- 修改 implementation/code 目录下的代码
- 修改相关配置文件
- 运行单元测试和集成测试
- 如果是 Breaking Change，生成迁移指南

## 工作流程

1. **代码实现**
   - 在 openspec/{asset_type}/{asset_name}/implementation/code/ 目录下修改代码
   - 遵循新的 specification.md 中定义的接口和数据结构

2. **测试验证**
   - 运行所有现有测试（单元测试、集成测试）
   - 所有测试必须通过，否则拒绝提交

3. **向后兼容性检查**
   - 从 specification.md frontmatter 读取 breaking_change 字段
   - 如果 breaking_change=true：
     - 生成 migration-guide.md，说明如何从旧版本升级
     - 列举所有破坏性变更和迁移步骤

4. **代码审查**
   - 检查代码质量（无死代码、无硬编码常数）
   - 验证注释完整性（复杂逻辑需注释）

## 输出产物

- **实现代码**：修改后的 implementation/code/（通过所有测试）

- **migration-guide.md**（仅当 breaking_change=true 时）：
  ```markdown
  # 迁移指南 - {asset_name} {old_version} → {new_version}
  
  ## 破坏性变更
  ...
  
  ## 迁移步骤
  1. ...
  2. ...
  
  ## 新增特性
  ...
  ```

## 关键约束

- 所有代码变更必须通过现有测试
- 如果是 Breaking Change，migration-guide.md 必须存在
- 代码注释必须准确，无虚假信息
