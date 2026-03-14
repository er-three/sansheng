---
name: mapping
description: >
  UI 框架映射 Skill。将 ui.yaml 中的抽象组件映射到具体 Ionic 框架组件，生成 ui.mapping.yaml。
  依赖 extract 步骤完成后的 ui.yaml。
---

# 礼部 · UI 框架映射

## 调用方
`opencoder-7`（顺序执行，依赖 Phase 1 的 ui.yaml）

## 输入
```
openspec/specs/{module_name}/{module_name}.ui.yaml（已生成）
{module_name} 原始 HTML 源码
```

## 输出
```
openspec/specs/{module_name}/{module_name}.ui.mapping.yaml
```

## 执行规则
- 映射表必须覆盖 ui.yaml 中**所有**抽象组件
- 每个抽象组件对应具体的 Ionic 8 组件
- 使用 `abstract:` 字段标记抽象名，`ionic:` 字段标记具体组件

## 完成后输出摘要（格式固定）
```json
{
  "status": "PASS",
  "output_file": "openspec/specs/{module_name}/{module_name}.ui.mapping.yaml",
  "mapping_count": 0
}
```
