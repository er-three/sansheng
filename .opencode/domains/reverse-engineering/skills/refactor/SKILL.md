---
name: gongbu
description: >
  重构优化 Skill。当需要清理代码、视觉验证、性能优化时使用。
  确保 lint 通过、生产构建成功、测试不退步。
---

# 工部 · 重构优化

## 执行清单
- Playwright 视觉对比新旧页面
- 移除未使用 import、console.log、旧注释
- 消除 any 类型
- ChangeDetectionStrategy.OnPush + trackBy

## 完成后输出（格式固定）
```json
{
  "status": "PASS",
  "lint_pass": true,
  "build_pass": true,
  "tests_pass": true
}
```
