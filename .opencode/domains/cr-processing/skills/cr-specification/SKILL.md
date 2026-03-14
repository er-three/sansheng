---
name: cr-specification
title: CR 规格设计
description: 更新 specification.md，定义新版本规格和验收标准
---

## 目的

基于 cr-analysis.md 的分析结果，设计新版本的规格说明：
- 定义新增或修改的接口、数据结构
- 更新版本号和兼容性说明
- 明确验收标准

## 工作流程

1. **读取分析报告**
   - 从 cr-analysis.md 提取：current_version、breaking_change、estimated_complexity

2. **计算新版本号**
   - breaking_change=true → Major 升级（如 1.0 → 2.0）
   - breaking_change=false → Minor 升级（如 1.0 → 1.1）

3. **编写新规格**
   - 基于 cr_description，编写新的 specification.md
   - 包含 frontmatter（version, date, breaking_change）
   - 列举新增/修改的接口、数据结构、验收标准

4. **生成差异文档**
   - 输出 `cr-specification-diff.md`，对比旧版和新版的关键变更
   - 如果 breaking_change=true，标注所有破坏性变更

## 输出产物

- **specification.md**（更新）：新版规格
  ```markdown
  ---
  version: {new_version}
  date: {today}
  breaking_change: {true/false}
  ---
  
  ## 接口定义
  ...
  
  ## 数据结构
  ...
  
  ## 验收标准
  ...
  ```

- **cr-specification-diff.md**：变更对比
  ```markdown
  # 规格变更对比
  
  旧版本：{old_version}
  新版本：{new_version}
  
  ## 新增接口
  ...
  
  ## 修改接口
  ...
  
  ## 破坏性变更
  ...
  ```

## 关键约束

- 版本号格式必须是 Major.Minor（如 1.0、1.1、2.0）
- specification.md frontmatter 必须包含 version, date, breaking_change
- cr-specification-diff.md 必须存在
