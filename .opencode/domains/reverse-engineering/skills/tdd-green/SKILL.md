---
name: bingbu
description: >
  业务逻辑注入 Skill。当需要实现方法体、注入依赖、让测试从 Red 变为 Green 时使用。
  对应 TDD Green Phase，目标是所有测试通过。
---

# 兵部 · 逻辑注入

## 输入
```
specs/{module_name}/{module_name}.logic.ts
specs/{module_name}/{module_name}.infrastructure.yaml
```

## 输出
- `{page_name}.page.ts`（注入依赖、实现方法体、处理生命周期）

## 执行规则
- 依赖注入严格按 infrastructure.yaml 清单
- 方法体与 logic.ts 一致，不得自行发挥
- **迭代修复直到 100% 测试通过**

## 完成后输出（格式固定）
```json
{
  "status": "PASS",
  "tests_passed": 10,
  "tests_total": 10
}
```
