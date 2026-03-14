# @deep-flux/liubu

🏛️ **三省六部制 OpenCode Plugin** - 分层多智能体协作框架

完整实现了 OpenCode 生态中的多智能体协作，基于古代中国三省六部制度的现代 AI 演绎。

---

## ✨ 核心特性

### 📊 **分层架构**
- **皇帝** - 战略决策者，设定目标、掌控全局、最终验收
- **三省** - 规划/审核/执行三层把关
  - 中书省（规划专家）
  - 门下省（审核官员）
  - 尚书省（执行调度）
- **六部** - 具体实现者
  - 吏部（档案采集）
  - 户部（资源整合）
  - 礼部（工作流协调）
  - 兵部（战术执行）
  - 刑部（代码审查）
  - 工部（代码实现）
  - 库部（资产管理）

### 🚀 **OmO 融合 Phase 1 & 2**
- ✅ **Hash-Anchored Edits** - 精确代码编辑定位（99%+ 精度）
- ✅ **AST 语义分析** - 代码结构感知
- ✅ **OpenSpec 规范系统** - 版本化资产管理和归档
- ✅ **CR 变更请求处理** - 完整的变更流程（提议→规格→实现→持久化）
- ✅ **并行执行协议** - 步骤间串行、步骤内并行调度

### 📦 **开箱即用**
- **零配置**：自动发现 agents, domains, skills
- **即插即用**：只需 npm install + opencode.json 一行配置
- **自动更新**：npm update 自动获取最新版本

---

## 📦 安装

### npm 安装（推荐）
```bash
npm install @deep-flux/liubu
```

### Beta 版本
```bash
npm install @deep-flux/liubu@next
```

### 本地安装
```bash
npm install ./deep-flux-liubu-1.0.0-beta.1.tgz
```

---

## 🚀 快速开始

### 1. 配置 opencode.json

```json
{
  "model": "anthropic/claude-opus-4-6",
  "small_model": "anthropic/claude-haiku-4-5",
  "default_agent": "huangdi",

  "plugin": [
    "@deep-flux/liubu"
  ],

  "permission": {
    "skill": { "*": "allow" }
  }
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

---

## 📚 工作域

### asset-management
从旧代码提取五份资产（Service, Provider, DataModel, UIComponent, Utility），强制并行提取 + bash 独立验证

**Pipeline:**
```
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

**Pipeline:**
```
1. CR 提议与分析 (yibu, hubu) → cr-analysis.md
2. CR 规格设计 (libu, xingbu) → cr-specification-diff.md
3. CR 实现 (gongbu, bingbu, xingbu) → implementation + tests
4. CR 版本归档 (kubu) → archive/{version}/
```

### reverse-engineering
代码反向工程和项目标准化

### video
视频处理相关工作流

---

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

---

## 📊 统计数据

| 指标 | 数值 |
|------|------|
| **Agents** | 11 个 |
| **Domains** | 4 个 |
| **Skills** | 15+ 个 |
| **Tools** | 7 个 |
| **代码总行** | 40,000+ 行 |
| **文件总数** | 63 个 |
| **包大小** | 59.4 KB (压缩) / 191.1 KB (解压) |

---

## 🏗️ 项目结构

```
.opencode/
├── agents/                    # 11 个智能体定义
│   ├── huangdi.md            # 皇帝（战略决策）
│   ├── zhongshu.md           # 中书省（规划）
│   ├── menxia.md             # 门下省（审核）
│   ├── shangshu.md           # 尚书省（执行）
│   ├── yibu.md               # 吏部（档案）
│   ├── hubu.md               # 户部（工商）
│   ├── libu.md               # 礼部（仪式）
│   ├── bingbu.md             # 兵部（战术）
│   ├── xingbu.md             # 刑部（审判）
│   ├── gongbu.md             # 工部（工程）
│   └── kubu.md               # 库部（档案）
│
├── domains/                   # 4 个工作域
│   ├── asset-management/      # 资产提取域
│   ├── cr-processing/         # 变更请求处理域
│   ├── reverse-engineering/   # 反向工程域
│   └── video/                 # 视频处理域
│
└── plugins/
    └── sansheng-liubu.ts      # 主 Plugin 文件（1047 行）

dist/                          # TypeScript 编译输出
├── index.js                   # Plugin 入口
├── index.d.ts                 # 类型定义
├── index.js.map
└── index.d.ts.map

src/
└── index.ts                   # TypeScript 源代码
```

---

## 🔄 工作流程

```
用户目标
   ↓ 皇帝理解并确认
set_variables + switch_domain
   ↓
task(agent="zhongshu", prompt="制定执行计划")
   ↓
task(agent="menxia", prompt="审核计划")
   ↓
task(agent="shangshu", prompt="执行计划")
   ↓
pipeline_status 监控
   ↓
皇帝最终验收
```

---

## 📖 更多文档

- **NPM_README.md** - npm 官网展示
- **NPM_PUBLISH_GUIDE.md** - 发布指南
- **QUICK_START.md** - 5 分钟快速开始
- **AGENTS.md** - 三省六部详解
- **PACKAGE_STRUCTURE.md** - 包结构详解
- **TRANSFORMATION_SUMMARY.md** - npm 包改造总结
- **三省六部制工作流程详解.md** - 工作流程深入解析

---

## 🎯 版本历史

### v1.0.0-beta.1 (2024-03-14)
- ✅ 完整实现 OmO Phase 1 & 2
- ✅ 所有域和技能完成
- ✅ Hash-Anchored Edits 支持
- ✅ OpenSpec 规范系统
- ✅ CR 变更请求处理
- ✅ npm 包改造完成

---

## 🔐 安全性

### 最佳实践
- ✅ TypeScript 类型安全
- ✅ 完整的类型定义（.d.ts）
- ✅ Source Maps 用于调试
- ✅ MIT 许可证

### 权限模型
- 皇帝：全权限
- 三省：受限权限
- 六部：特定权限（按职能）

---

## 📝 使用示例

### 示例 1：资产提取

```bash
/switch-domain asset-management
/start 从旧代码提取五份资产

# 系统会自动：
# 1. 扫描代码生成 code-index.yaml
# 2. 并行提取 5 个资产
# 3. 映射 UI 框架
# 4. 检测框架代码污染
# 5. 验证一致性
# 6. 持久化为 OpenSpec 格式
```

### 示例 2：变更请求处理

```bash
/switch-domain cr-processing
/cr-start asset_type=service asset_name=user-service cr_description="添加 OTP 验证功能"

# 系统会自动：
# 1. 分析变更影响范围
# 2. 设计新规格
# 3. 实现代码变更并运行测试
# 4. 创建版本归档
```

---

## 🤝 贡献指南

欢迎贡献！请按照以下流程：

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

---

## 📞 支持

- **问题报告**：https://github.com/deep-flux/liubu/issues
- **讨论区**：https://github.com/deep-flux/liubu/discussions
- **文档**：查看项目中的 MD 文件

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

---

## 🙏 致谢

感谢所有贡献者和用户的支持！

这个项目以中国古代三省六部制为灵感，展示了如何将历史治理智慧应用到现代 AI 系统设计中。

---

**Made with ❤️ for the AI revolution**

🎉 **现在就用 npm install @deep-flux/liubu 开始吧！**
