---
name: behavior
description: >
  行为场景提取 Skill。从源码和 logic.ts 中提取所有用户行为场景，生成 Gherkin 格式的 behavior.md。
  每个 Scenario 必须有 logic_ref 绑定，100% 覆盖所有方法。
---

# 刑部 · 行为场景提取

## 调用方
`opencoder-8`（顺序执行，依赖 Phase 1 的 logic.ts）

## 输入
```
{module_name} 源码
openspec/specs/{module_name}/{module_name}.logic.ts（用于 logic_ref 映射）
```

## 输出
```
openspec/specs/{module_name}/{module_name}.behavior.md
```

## 执行规则
- 100% 覆盖 logic.ts 中所有方法的场景
- 每个 Scenario 必须有 `logic_ref` 指向 logic.ts 中的对应方法
- 使用 Gherkin 格式（Given/When/Then）
- 包含正常流程和异常流程

## 完成后输出摘要（格式固定）
```json
{
  "status": "PASS",
  "output_file": "openspec/specs/{module_name}/{module_name}.behavior.md",
  "scenario_count": 0
}
```
