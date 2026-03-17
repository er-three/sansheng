---
name: detect
description: >
  框架代码全局检测 Skill。对所有提取资产执行 bash 脚本检测，确保无框架代码污染。
  由 Orchestrator 直接执行 bash，不依赖 Subagent 报告。
---

# 工部 · 框架代码全局检测

## 执行方式
**由 Orchestrator 直接执行 bash 脚本，不调用 Subagent。**

## 执行命令
```bash
bash scripts/detect-framework-code.sh openspec/specs/{module_name}/{module_name}.ui.yaml
bash scripts/detect-framework-code.sh openspec/specs/{module_name}/{module_name}.logic.ts
```

## 判断标准
- 全部返回 0 → [OK] 通过，进入下一步
- 任何项有返回 → [NO] 停止，定位问题资产，回退对应步骤重新提取

## 不通过时的处理
- `ui.yaml` 检测失败 → 回退兵部（extract），重新执行 extract-ui
- `logic.ts` 检测失败 → 回退兵部（extract），重新执行 extract-logic

## 完成后输出摘要（格式固定）
```json
{
  "status": "PASS",
  "ui_yaml_clean": true,
  "logic_ts_clean": true
}
```
