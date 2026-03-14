---
name: libu2
description: >
  Ionic 8 UI 生成 Skill。当需要生成页面 HTML 模板和 SCSS 样式时使用。
  确保数据绑定、事件绑定正确，Ionic 组件使用 Standalone 方式导入。
---

# 礼部 · UI 生成

## 输入
```
specs/{module_name}/{module_name}.ui.yaml
specs/{module_name}/{module_name}.ui.mapping.yaml
specs/design-spec.md
```

## 输出
- `{page_name}.page.html`（数据绑定 + 事件绑定）
- `{page_name}.page.scss`（符合 design-spec.md）
- `{page_name}.page.ts`（更新 imports 数组）

## 执行规则
- Ionic 组件必须使用 Standalone 方式导入
- 数据绑定名称与 behavior.md 中一致
- 样式严格遵循 design-spec.md，不得自创变量

## 完成后输出（格式固定）
```json
{
  "status": "PASS",
  "files_updated": ["{page_name}.page.html", "{page_name}.page.scss"]
}
```
