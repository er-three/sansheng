---
name: hubu
description: >
  全局审计 Skill。当所有步骤完成后，执行最终验收并生成交付报告时使用。
  包含架构审计、标准审计、测试覆盖率检查、生产构建验证。
---

# 户部 · 全局审计

## 审计项目
- 架构：Service/Provider 正确创建并注入
- 标准：命名规范、Standalone 模式、无残留 NgModule
- 测试：`npm test --code-coverage` + `npx playwright test`
- 构建：`ionic build --prod`

## 输出报告
`specs/final-audit-report.md`（评分、问题列表、结论）

## 完成后输出（格式固定）
```json
{
  "status": "PASS",
  "score": 95,
  "critical_issues": [],
  "report_path": "specs/final-audit-report.md"
}
```
