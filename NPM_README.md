# @deep-flux/liubu

🏛️ **三省六部制 OpenCode Plugin** - 分层多智能体协作框架

完整实现了 OpenCode 生态中的多智能体协作，基于古代中国三省六部制度的现代 AI 演绎。

## ✨ 特性

### 📊 **分层架构**
- **皇帝** - 战略决策者，设定目标、掌控全局、最终验收
- **三省** - 规划/审核/执行三层把关
- **六部** - 具体实现（档案、工商、仪式、战术、审判、工程）

### 🚀 **OmO 融合 Phase 1 & 2**
- ✅ Hash-Anchored Edits - 精确代码编辑定位（99%+ 精度）
- ✅ AST 语义分析 - 代码结构感知
- ✅ OpenSpec 规范系统 - 版本化资产管理和归档
- ✅ CR 变更请求处理 - 完整的变更流程（提议→规格→实现→持久化）
- ✅ 并行执行协议 - 步骤间串行、步骤内并行调度

### 📦 **开箱即用**
- **零配置**：自动发现 agents, domains, skills
- **即插即用**：只需 npm install + opencode.json 一行配置
- **自动更新**：npm update 自动获取最新版本

## 📦 安装

```bash
npm install @sansheng/liubu
```

## 🚀 快速开始

### 1. 配置 opencode.json

```json
{
  "plugin": [
    "@sansheng/liubu"
  ]
}
```

### 2. 可用命令

```bash
# 切换工作域
/switch-domain asset-management

# 查看流水线状态
/status

# 启动任务
/start 提取模块中的资产

# 启动 CR 流程
/cr-start asset_type=service asset_name=user-service cr_description="添加新的字段验证"
```

## 📚 工作域

### asset-management
从旧代码提取五份资产（Service, Provider, DataModel, UIComponent, Utility），强制并行提取 + bash 独立验证

```
Pipeline:
1. 代码扫描 (yibu) → code-index.yaml
2. 并行资产提取 (bingbu, gongbu) → 五份资产
3. UI 框架映射 (yibu, gongbu) → ui.mapping.yaml
4. 行为场景提取 (yibu, gongbu) → behavior.md
5. 框架代码检测 (yibu, xingbu) → framework-pollution 检查
6. 一致性核验 (yibu, xingbu) → 引用链闭合
7. OpenSpec 持久化 (kubu) → 规范化存储
```

### cr-processing
变更请求处理，修改现有 OpenSpec 资产并维护版本历史

```
Pipeline:
1. CR 提议与分析 (yibu, hubu) → cr-analysis.md
2. CR 规格设计 (libu, xingbu) → cr-specification-diff.md
3. CR 实现 (gongbu, bingbu, xingbu) → implementation + tests
4. CR 版本归档 (kubu) → archive/{version}/
```

### reverse-engineering
代码反向工程和项目标准化

### video
视频处理相关工作流

## 🏛️ 三省六部

| 部门 | 名称 | 职责 | 工具权限 |
|------|------|------|---------|
| 皇帝 | 皇帝 | 战略决策、全局掌控 | 全部 |
| 省 | 中书省 | 制定执行计划 | 思考/规划 |
| 省 | 门下省 | 审核计划和结果 | 验证/否决 |
| 省 | 尚书省 | 执行调度 | 协调分发 |
| 部 | 吏部 | 代码扫描/采集 | read, glob, grep |
| 部 | 户部 | 外部资源整合 | webfetch, websearch |
| 部 | 礼部 | 工作流协调 | skill, todowrite |
| 部 | 兵部 | 战术执行/测试 | bash |
| 部 | 刑部 | 代码审查 | read, semantic_grep |
| 部 | 工部 | 代码实现 | edit, write, verify_edit_context |
| 部 | 库部 | OpenSpec 管理 | openspec_write, openspec_validate |

## 🛠️ Plugin 工具

### openspec_write
库部专用，创建/更新 OpenSpec 目录结构

```typescript
openspec_write({
  asset_type: "service",
  asset_name: "user-service",
  operation: "init",
  proposal: "# 用户服务提议...",
  specification: "# 用户服务规格..."
})
```

### openspec_validate
库部专用，验证 OpenSpec 目录资产格式

```typescript
openspec_validate({
  asset_type: "service",
  asset_name: "user-service"
})
// Returns: { status: "PASS"|"FAIL", total_errors, errors[] }
```

### set_variables
设置任务执行变量

```typescript
set_variables({
  module_name: "asset-manager",
  asset_type: "service",
  asset_name: "user-service"
})
```

### switch_domain
切换工作域

```typescript
switch_domain("asset-management")
```

### pipeline_status
查看当前流水线状态

```typescript
pipeline_status()
```

### verify_step
验收指定步骤

```typescript
verify_step({ step_id: "scan" })
```

## 📖 完整文档

详见项目中的文档：
- **AGENTS.md** - 三省六部详细说明
- **三省六部制工作流程详解.md** - 工作流程深入解析
- **QUICK_START.md** - 5分钟快速开始

## 🔄 版本历史

### v1.0.0 (2024-03-14)
- ✅ 完整实现 OmO Phase 1 & 2
- ✅ 所有域和技能完成
- ✅ Hash-Anchored Edits 支持
- ✅ OpenSpec 规范系统
- ✅ CR 变更请求处理

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

- GitHub: [sansheng-liubu](https://github.com/yourusername/sansheng-liubu)
- Docs: [三省六部制工作流程详解.md](./三省六部制工作流程详解.md)

---

**Made with ❤️ for the AI revolution**
