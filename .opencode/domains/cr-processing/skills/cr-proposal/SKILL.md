---
name: cr-proposal
title: CR 提议与分析
description: 分析变更需求，查找现有资产，评估影响范围和兼容性
---

## 目的

在启动 CR 流程前，需要进行充分的分析：
- 确认目标资产的当前版本和规格
- 评估变更的兼容性影响
- 识别相关的代码、配置、文档依赖
- 生成变更分析文档供后续步骤使用

## 工作流程

1. **资产定位**
   - 使用 `semantic_grep` 查找资产相关的文件（implementation/code、specification.md、config 等）
   - 记录当前版本、现有接口、数据结构

2. **兼容性评估**
   - 根据 cr_description，确定变更类型（Breaking / Compatible / Enhancement）
   - 列举可能受影响的客户端、依赖方
   - 标记是否需要提供 migration-guide

3. **影响范围分析**
   - 使用 `semantic_grep` 的 cross_reference 模式追踪使用点
   - 统计代码变更的复杂度（行数、文件数、模块数）

4. **生成分析报告**
   - 输出 `cr-analysis.md`，包含：
     - asset_type / asset_name
     - current_version（来自 specification.md frontmatter）
     - breaking_change（true/false）
     - impacted_modules[]
     - estimated_complexity（low/medium/high）

## 输出产物

- **cr-analysis.md**：变更分析报告
  ```markdown
  # CR 分析报告 - {asset_name}
  
  - **资产类型**：{asset_type}
  - **当前版本**：{version}
  - **Breaking Change**：{true/false}
  - **影响范围**：{list of modules}
  - **复杂度**：{low/medium/high}
  
  ## 变更说明
  {cr_description}
  ```

## 关键约束

- 必须确认 openspec/{asset_type}/{asset_name}/ 存在
- 不修改任何代码或规格文件，仅生成分析
- 分析必须包含 asset_type 和 breaking_change 字段
