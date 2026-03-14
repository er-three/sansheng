---
name: cr-persist
title: CR 版本归档
description: 创建新版本 archive，更新 changelog，持久化完整变更历史
---

## 目的

将经过验证的 CR 变更持久化到 openspec 资产中：
- 使用 openspec_write 工具创建新版本的归档
- 更新 changelog.md，记录版本历史
- 确保版本号递增且格式正确

## 工作流程

1. **读取新规格**
   - 从 specification.md frontmatter 提取新版本号
   - 确保版本号递增（Major.Minor 格式）

2. **调用库部工具**
   - 使用 `openspec_write` 工具，operation=archive
   - 传递 version、changelog_entry 参数

3. **生成变更日志条目**
   ```
   ## v{new_version} - {today}
   - Breaking Change: {true/false}
   - Modified: {specification.md, implementation/code/}
   - Impacted Modules: {list}
   ```

4. **验证归档**
   - 使用 `openspec_validate` 工具检查格式
   - 确保新版本在 archive/{version}/ 目录

## 输出产物

- **archive/{version}/**：版本归档目录
  - specification.md（历史版本）
  - （可选）migration-guide.md（如果是 Breaking Change）

- **changelog.md**（更新）：版本历史记录
  ```markdown
  # Changelog - {asset_name}
  
  ## v{new_version} - {date}
  - Breaking Change: {true/false}
  - Modified: specification.md, implementation/
  - Impacted: {modules}
  
  ## v{old_version} - {old_date}
  - ...
  ```

## 关键约束

- 必须调用 openspec_write 工具完成归档
- changelog.md 必须有 ## {version} 记录
- archive 目录必须存在且包含版本子目录
- 版本号必须递增
