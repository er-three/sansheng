---
name: extract
description: >
  并行资产提取 Skill。同时启动5个 Subagent 提取 UI结构、业务逻辑、基础设施、架构设计、设计规范。
  必须在一个回复中同时调用所有 Subagent，不得分次调用。
---

# 兵部 · 并行资产提取

## ⚠️ 关键：必须并行执行

**在一个回复中同时调用以下 5 个 task，不得分次调用。**

## 调用清单

### task 1 → opencoder-7：提取 UI 结构
```
加载 extract-ui skill，执行以下任务：
- 输入：{module_name} 源码 + openspec/specs/{module_name}/code-index.yaml
- 输出：openspec/specs/{module_name}/{module_name}.ui.yaml
- 约束：框架标签全部抽象化，不得出现 ion-/ng- 等框架前缀，必须行号绑定
- 验收：按 extract-ui contract 块自检通过后，返回文件路径结束
```

### task 2 → opencoder-8：提取业务逻辑
```
加载 extract-logic skill，执行以下任务：
- 输入：{module_name} 源码 + code-index.yaml
- 输出：openspec/specs/{module_name}/{module_name}.logic.ts
- 约束：6层详细驱动格式，无框架代码，每个方法必须有行号
- 验收：按 extract-logic contract 块自检通过后，返回文件路径结束
```

### task 3 → opencoder-9：提取基础设施
```
加载 extract-infrastructure skill，执行以下任务：
- 输入：{module_name} 源码 + code-index.yaml
- 输出：openspec/specs/{module_name}/{module_name}.infrastructure.yaml
- 约束：100% 覆盖所有 HTTP/SQL 调用，使用统一 ID 格式
- 验收：按 extract-infrastructure contract 块自检通过后，返回文件路径结束
```

### task 4 → opencoder-10：提取架构设计
```
加载 extract-architecture skill，执行以下任务：
- 输入：{module_name} 源码 + code-index.yaml
- 输出：openspec/specs/{module_name}/{module_name}.architecture.md
- 约束：包含 Mermaid 流程图，职责划分完整，依赖映射无遗漏
- 验收：按 extract-architecture contract 块自检通过后，返回文件路径结束
```

### task 5 → opencoder-7：提取设计规范（独立 session）
```
执行以下命令提取设计规范：
python3 ui-ux-pro-max/scripts/search.py "<组件关键词>" --design-system --persist -p VFM

- 输出：openspec/specs/{module_name}/design-spec.md
- 验收：文件生成后立即自查，无误后返回文件路径结束
```

## 完成后输出摘要（格式固定）
```json
{
  "status": "PASS",
  "files_created": [
    "openspec/specs/{module_name}/{module_name}.ui.yaml",
    "openspec/specs/{module_name}/{module_name}.logic.ts",
    "openspec/specs/{module_name}/{module_name}.infrastructure.yaml",
    "openspec/specs/{module_name}/{module_name}.architecture.md",
    "openspec/specs/{module_name}/design-spec.md"
  ]
}
```
