---
name: scan
description: >
  代码扫描 Skill。扫描指定模块源码，生成 code-index.yaml 作为后续所有资产提取的统一数据源。
  必须在任何并行提取开始前完成。
---

# 吏部 · 代码扫描

## 调用方
`opencoder-7`（单 Subagent，顺序执行）

## 输入
```
src/{module_name}/（模块源码目录）
```

## 输出
```
openspec/specs/{module_name}/code-index.yaml
```

## 执行规则
- 扫描所有 `.ts`、`.html`、`.scss` 文件
- 记录每个文件的路径、行数、主要导出内容
- 遇到错误只重试一次，失败则报错退出，**禁止跳过**
- 生成后立即落盘，返回文件路径后结束

## 完成后输出摘要（格式固定）
```json
{
  "status": "PASS",
  "output_file": "openspec/specs/{module_name}/code-index.yaml",
  "files_scanned": 0
}
```
