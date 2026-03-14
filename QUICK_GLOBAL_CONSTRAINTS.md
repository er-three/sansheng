# 全局约束系统 - 5 分钟快速开始

> 通过 Plugin 钩子，一次定义全局约束，自动注入所有 Agent

---

## 🚀 立即体验（3 步）

### 1️⃣ 查看全局约束配置

```bash
cat .opencode/global-constraints.yaml
```

你会看到按分类组织的所有约束：
- ✅ universal（所有 Agent 都要遵守）
- ✅ agent_implementation（代码实现 Agent）
- ✅ agent_code_review（代码审查 Agent）
- ✅ agent_verification（测试验证 Agent）
- ✅ skill_definition（Skill 定义）
- ✅ parallel_execution（并行执行）
- ✅ file_operations（文件操作）
- ✅ security（安全）
- ✅ documentation（文档）

### 2️⃣ 启用约束注入（修改 Plugin）

在 `sansheng-liubu.ts` 中找到 `experimental.chat.system.transform` 钩子，添加全局约束注入逻辑：

```typescript
"experimental.chat.system.transform": async (_input, output) => {
  try {
    const registry = readRegistry(ROOT)
    const domain = readDomain(ROOT, registry.active_domain)
    if (!domain) return

    // ← 在这里插入全局约束注入代码（见下文）

    // 原有逻辑继续...
  } catch {
    // 错误处理
  }
}
```

### 3️⃣ 立即生效

下次调用任何 Agent 时，Plugin 会自动：
1. 读取 `global-constraints.yaml`
2. 提取相关约束
3. 注入到 Agent 的 system prompt

✅ **完成！** Agent 自动获得所有全局约束

---

## 📝 常见操作

### 添加新约束

```yaml
# 编辑 .opencode/global-constraints.yaml
universal:
  - name: "新约束名称"
    description: "简短说明"
    content: "详细内容和要求"
    priority: "high"
```

**下次调用时自动生效**（无需修改 Agent 文件）

### 修改现有约束

直接编辑 `content` 字段，保存后自动生效

### 暂时禁用约束

```yaml
- name: "约束名称"
  enabled: false  # 添加这行
```

### 查看哪些约束会被注入

```bash
# 显示所有约束（JSON 格式）
node -e "
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.load(fs.readFileSync('.opencode/global-constraints.yaml', 'utf-8'));
console.log(JSON.stringify(config, null, 2));
" | head -50
```

---

## 💡 使用场景

### 场景 1：添加新的安全要求

```yaml
security:
  - name: "API 超时"
    content: "所有外部 API 调用必须设置 30 秒超时"
    priority: "high"
```

✅ 所有 Agent 下次调用时自动遵守

### 场景 2：放松某个约束

比如测试环境不需要所有测试都通过：

```yaml
# 编辑 global-constraints.yaml
agent_verification:
  - name: "测试必过"
    enabled: false  # 在测试环境中禁用
```

### 场景 3：为新 Agent 类型添加约束

```yaml
agent_api_design:  # 新的 Agent 类型
  - name: "API 版本控制"
    content: "所有 API 都需要版本号（/v1, /v2）"
    priority: "high"
```

Plugin 会在对应 Agent 被调用时自动注入

---

## 📊 收益

| 方面 | 改进 |
|------|------|
| **维护成本** | ⬇️ 从修改 6 个文件 → 修改 1 个文件 |
| **一致性** | ⬆️ 从手工维护 → 自动同步 |
| **扩展性** | ⬆️ 新 Agent 自动获得所有约束 |
| **代码行数** | ⬇️ Agent 文件减少 60% |
| **生效速度** | ⬇️ 从需要发版 → 立即生效 |

---

## 🔍 技术细节

### 约束注入流程

```
用户调用 Agent
    ↓
Plugin 的 experimental.chat.system.transform 被触发
    ↓
readGlobalConstraints() 读取 global-constraints.yaml
    ↓
根据当前 Agent 类型，选择相关约束
    ↓
将约束追加到 system prompt
    ↓
Agent 看到约束并遵守
```

### 支持的约束分类

```
universal                   ← 所有 Agent
├─ agent_implementation     ← gongbu（代码实现）
├─ agent_code_review        ← xingbu（代码审查）
├─ agent_verification       ← bingbu（测试验证）
├─ skill_definition         ← 所有 Skill
├─ parallel_execution       ← 并行任务时
├─ file_operations          ← 文件操作时
├─ security                 ← 安全相关
└─ documentation            ← 文档相关
```

每个分类的约束会在对应情景下注入

### 优先级机制

- `high`：必须遵守（强制）
- `medium`：应该遵守（推荐）
- `low`：可选参考

AI 会重点关注 `high` 优先级的约束

---

## ❓ 常见问题

**Q: 约束何时生效？**
A: 下次任何 Agent 被调用时生效。不需要重启系统。

**Q: 老的 Agent 文件中的约束怎么办？**
A: 可以逐步删除。全局约束会自动替代它们。

**Q: 能否为某个 Agent 禁用某个约束？**
A: 目前系统级别不支持，但可以：
1. 在全局约束中禁用（`enabled: false`）
2. 或在 Agent 文件中声明对该约束的例外处理

**Q: 如何验证约束是否被注入？**
A: 查看 AI 生成的 system prompt 日志（Plugin 会记录）

**Q: 约束冲突了怎么办？**
A: 按优先级排序，同级按定义顺序

---

## ✅ 检查清单

- [ ] 查看 `.opencode/global-constraints.yaml`
- [ ] 理解各分类的约束内容
- [ ] 修改 Plugin hook 以支持注入（或提交给我们）
- [ ] 测试：调用一个 Agent，检查约束是否生效
- [ ] （可选）简化现有 Agent 文件，删除重复的约束
- [ ] （可选）根据项目需要调整约束内容

---

## 🎯 下一步

### 立即可做
1. ✅ 查看 global-constraints.yaml 了解约束结构
2. ✅ 根据项目需要调整约束优先级
3. ✅ 添加项目特有的约束

### 需要工程师协助
1. ⏳ 修改 Plugin hook 以完整支持约束注入
2. ⏳ 实现约束版本管理（v1.0, v2.0）
3. ⏳ 添加约束遵守度统计

### 后续优化
1. ⏳ 约束继承系统（基础 → 域特定 → 场景特定）
2. ⏳ 约束冲突检测工具
3. ⏳ 约束可视化和报告

---

## 📞 获取帮助

- **设计文档**：查看 `GLOBAL_CONSTRAINTS_INJECTION.md`
- **约束详解**：查看 `.opencode/global-constraints.yaml` 注释
- **Plugin 代码**：查看 `.opencode/plugins/sansheng-liubu.ts` 的 `experimental.chat.system.transform` 部分

---

**提示**：这个系统完全向后兼容。即使 Plugin 还没有实现约束注入，Agent 仍然可以继续工作。约束文件只是在 Plugin 支持时自动生效。
