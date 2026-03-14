---
name: xingbu
description: >
  TDD 测试防护网 Skill。当需要生成 Jasmine 测试用例、Mock 数据和空逻辑存根时使用。
  目标是让项目编译通过但测试失败（TDD Red 状态）。
---

# 刑部 · 测试防护

## 输入
```
specs/{module_name}/{module_name}.behavior.md
```

## 输出
- `src/app/mocks/*.mock.ts`
- `src/app/pages/{page_name}/{page_name}.page.spec.ts`
- `src/app/pages/{page_name}/{page_name}.page.ts`（空逻辑存根）

## 执行规则
- 测试用例覆盖 behavior.md 所有行为描述
- page.ts 只生成存根，**不实现任何业务逻辑**
- 必须保持 Red 状态

## 完成后输出（格式固定）
```json
{
  "status": "PASS",
  "compile_ok": true,
  "tests_failing": true,
  "test_count": 5
}
```
