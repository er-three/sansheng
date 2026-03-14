---
name: verify-consistency
description: >
  跨资产一致性核验 Skill。验证所有 7 个资产文件的六条引用链全部闭合，确保零遗漏零幻觉。
  所有资产落盘且框架检测通过后才能执行。
---

# 户部 · 跨资产一致性核验

## 调用方
`opencoder-7`（顺序执行，所有前置步骤完成后）

## 输入
```
openspec/specs/{module_name}/（所有 7 个资产文件）
  ├── code-index.yaml
  ├── {module_name}.ui.yaml
  ├── {module_name}.logic.ts
  ├── {module_name}.infrastructure.yaml
  ├── {module_name}.architecture.md
  ├── {module_name}.ui.mapping.yaml
  └── {module_name}.behavior.md
```

## 六条引用链验证

| 链 | 验证内容 |
|----|---------|
| ui → mapping | ui.yaml 中每个组件在 ui.mapping.yaml 中都有对应映射 |
| logic → behavior | logic.ts 中每个方法在 behavior.md 中都有 logic_ref |
| behavior → ui | behavior.md 中的 UI 操作在 ui.yaml 中有对应元素 |
| infrastructure → logic | infrastructure.yaml 中的调用在 logic.ts 中有引用 |
| ui → code-index | ui.yaml 中的行号在 code-index.yaml 中可追溯 |
| logic → code-index | logic.ts 中的行号在 code-index.yaml 中可追溯 |

## 输出
```
openspec/specs/{module_name}/consistency-report.md
```
包含：通过的引用链、断链位置、修复建议

## 完成后输出摘要（格式固定）
```json
{
  "status": "PASS",
  "chains_verified": 6,
  "chains_passed": 6,
  "broken_chains": [],
  "report_path": "openspec/specs/{module_name}/consistency-report.md"
}
```
