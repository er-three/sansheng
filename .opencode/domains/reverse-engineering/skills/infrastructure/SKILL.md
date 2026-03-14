---
name: libu
description: >
  基础设施搭建 Skill。当需要为 Ionic 8 模块生成 Service、Provider 和数据模型接口时使用。
  对应 TDD 流程 Phase 1（Infrastructure）。
---

# 吏部 · 基础设施

## 输入
```
specs/{module_name}/{module_name}.infrastructure.yaml
```

## 输出
- `src/app/services/*.service.ts`
- `src/app/providers/*.provider.ts`
- 数据模型接口定义

## 执行规则
1. 优先 `awesome-ionic-mcp` → `ionic_generate`
2. MCP 失败 → 降级 `ionic generate` CLI
3. CLI 也失败 → **立即终止并报告，严禁手动创建文件**

## 完成后输出（格式固定）
```json
{
  "status": "PASS",
  "files_created": ["src/app/services/xxx.service.ts"]
}
```
