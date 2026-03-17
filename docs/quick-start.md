# OpenCode Plugin 快速开始

## 🚀 5 分钟快速开始

### 1. 查看结构

```bash
cd /Users/jianlaide/Documents/ai/opencode_plugin/claude_sansheng-liubu
ls -la
```

### 2. 核心文件

```
.opencode/
├── plugins/sansheng-liubu.ts          ⭐ 主 Plugin（OmO 核心）
├── agents/                             ⭐ 11 个 Agent（三省六部）
└── domains/                            ⭐ 4 个业务域

opencode.json                           ⭐ 配置文件
registry.json                           ⭐ 运行时状态
```

### 3. 快速验证

使用 OpenCode CLI 验证：
```bash
# 假设在 UATAgent 项目目录
/list-domains              # 应显示所有域
/switch-domain cr-processing
/status                   # 应显示 4 步 CR 流水线
```

---

## 📚 文件导航

### Plugin 核心

| 文件 | 行数 | 内容 |
|------|------|------|
| `sansheng-liubu.ts` | ~1000 | Plugin 主文件，包含：<br/>- 8 个工具定义<br/>- 3 个中间件<br/>- 完整的 OmO Phase 1 & 2 实现 |

### Agent 系统（11 个）

| Agent | 文件 | 职责 |
|-------|------|------|
| 皇帝 | `huangdi.md` | 战略决策、全局掌控 |
| 中书省 | `zhongshu.md` | 任务规划、计划制定 |
| 门下省 | `menxia.md` | 质量审核、验收把关 |
| 尚书省 | `shangshu.md` | 执行调度、驱动六部 |
| 吏部 | `yibu.md` | 档案采集、代码扫描 |
| 户部 | `hubu.md` | 外部资源、全球审计 |
| 礼部 | `libu.md` | 工作流协调、技能调度 |
| 兵部 | `bingbu.md` | 战术执行、系统测试 |
| 工部 | `gongbu.md` | 代码实现、基础设施 |
| 刑部 | `xingbu.md` | 代码审查、质量把关 |
| 库部 | `kubu.md` | OpenSpec 规范化 |

### Domain 系统（4 个）

| 域 | 目录 | 步骤 | 说明 |
|----|------|------|------|
| asset-management | `domains/asset-management/` | 7 | 从旧代码提取五份资产 |
| cr-processing | `domains/cr-processing/` | 4 | 变更请求处理（新增） |
| reverse-engineering | `domains/reverse-engineering/` | 6 | 逆向工程和代码理解 |
| video | `domains/video/` | 3 | 视频处理（可选） |

---

## 🛠️ 工具参考

### 工部工具（OmO Phase 1）

```typescript
// Hash-Anchored Edit 验证
verify_edit_context({
  file_path: "src/index.ts",
  old_string: "...",
  context_lines: 3
})
```

### 刑部工具（OmO Phase 1）

```typescript
// AST 语义审查
semantic_grep({
  pattern: "async function",
  path: "src/",
  mode: "cross_reference",
  max_results: 20
})
```

### 库部工具（OmO Phase 2）

```typescript
// OpenSpec 资产管理
openspec_write({
  asset_type: "service",
  asset_name: "user-service",
  operation: "init",
  proposal: "# 用户服务...",
  specification: "# API 规格..."
})

openspec_validate()
```

### 领域管理工具

```typescript
list_domains()
switch_domain("cr-processing")
pipeline_status()
set_variables({ asset_type: "service", asset_name: "auth" })
verify_step("cr-proposal")
```

---

## 📖 使用场景

### 场景 1：资产提取

```bash
/switch-domain asset-management
set_variables({ module_name: "payment" })
/start 提取 payment 模块的所有资产
```

流程：
```
皇帝 → 中书省规划 → 门下省审核 → 尚书省调度
                              [down]
             六部并行执行（scan → extract → mapping → behavior → detect → verify → persist）
```

### 场景 2：变更请求处理

```bash
/cr-start asset_type=service asset_name=user-service description="支持OAuth2认证"
```

流程：
```
cr-proposal → cr-specification → cr-implementation → cr-persist
  [分析]         [规格]            [实现]           [归档]
```

---

## [chart] 关键数据

| 指标 | 数值 |
|------|------|
| Plugin 文件大小 | ~1000 行 TypeScript |
| Agent 总数 | 11 个 |
| Domain 总数 | 4 个 |
| Skill 总数 | 30+ 个 |
| 工具总数 | 8 个（Plugin）+ N 个（Skill） |
| OmO 对标度 | 9/10 ⭐ |

---

## [sparkles] 特色功能

### 1. Hash-Anchored Edit
编辑前自动验证 `old_string` 唯一性，成功率 99%+

### 2. AST 语义审查
自动检测 Dead Code、资源泄漏、类型逃逸

### 3. OpenSpec 规范化
版本可追踪、兼容性明确、变更历史完整

### 4. CR 流程自动化
提议 → 规格 → 实现 → 归档，全自动管理

### 5. 并行执行
同一步骤的多个代理并行执行，串行验收

### 6. 自动化验收
Plugin 自动执行 contract.yaml 验收，失败则阻断

---

## 🔍 排查指南

### 问题 1：无法切换域

```bash
# 检查 domain.yaml 是否存在
ls -la .opencode/domains/cr-processing/domain.yaml

# 查看日志
/list-domains
```

### 问题 2：变量未设置

```bash
# 确保设置了所有必需变量
set_variables({
  asset_type: "service",
  asset_name: "user-service",
  cr_description: "..."
})

# 验证
pipeline_status  # 应显示当前变量
```

### 问题 3：步骤验收失败

```bash
# 手动验收
verify_step("cr-proposal")

# 查看错误详情（结合 contract.yaml）
```

---

## 📞 获取帮助

| 需求 | 查阅文件 |
|------|---------|
| 完整使用指南 | README.md |
| Agent 详细说明 | AGENTS.md |
| 工作流示例 | 三省六部制工作流程详解.md |
| 迁移详情 | MIGRATION_SUMMARY.md |
| Plugin 源码 | .opencode/plugins/sansheng-liubu.ts |

---

**准备好了吗？开始使用吧！** 🚀

