# OpenCode Plugin 原理深度解析

## 📚 目录
1. [核心概念](#核心概念)
2. [Plugin 的完整定义](#plugin-的完整定义)
3. [Agent 和 Subagent](#agent-和-subagent)
4. [config Hook 的工作原理](#config-hook-的工作原理)
5. [导出和加载机制](#导出和加载机制)

---

## 核心概念

### 什么是 Plugin？

**Plugin 的官方定义：**
```typescript
// @opencode-ai/plugin
export type Plugin = (input: PluginInput) => Promise<Hooks>
```

这意味着：
- Plugin 是一个**异步函数**，不是对象
- 接收 `PluginInput` 参数
- 返回 `Promise<Hooks>` 对象
- 在 OpenCode 启动时被调用

**Plugin 并不直接提供 Agent**，而是通过 **Hooks 机制**来扩展 OpenCode 的功能。

### PluginInput 包含什么？

```typescript
export type PluginInput = {
    client: ReturnType<typeof createOpencodeClient>  // OpenCode SDK 客户端
    project: Project                                   // 当前项目信息
    directory: string                                  // 工作目录
    worktree: string                                   // Git worktree 路径
    serverUrl: URL                                     // OpenCode 服务器 URL
    $: BunShell                                        // Shell 执行环境
}
```

Plugin 可以通过这些参数访问 OpenCode 的整个生态。

---

## Plugin 的完整定义

### Hooks 接口

**Plugin 返回的 Hooks 对象可以包含以下 Hook：**

```typescript
export interface Hooks {
    // 1. 配置注入 Hook（这是导出 Agent 的关键！）
    config?: (input: Config) => Promise<void>

    // 2. 工具注册 Hook
    tool?: {
        [key: string]: ToolDefinition
    }

    // 3. 认证 Hook
    auth?: AuthHook

    // 4. 事件处理 Hook
    event?: (input: { event: Event }) => Promise<void>

    // 5. Chat 消息 Hook（用于拦截消息）
    "chat.message"?: (input: {...}, output: {...}) => Promise<void>

    // 6. Chat 参数 Hook（修改 LLM 参数）
    "chat.params"?: (input: {...}, output: {...}) => Promise<void>

    // 7. 工具执行前 Hook
    "tool.execute.before"?: (input: {...}, output: {...}) => Promise<void>

    // 8. 工具执行后 Hook
    "tool.execute.after"?: (input: {...}, output: {...}) => Promise<void>

    // 9. 系统提示注入 Hook
    "experimental.chat.system.transform"?: (input: {...}, output: {...}) => Promise<void>

    // 10. Session 压缩 Hook
    "experimental.session.compacting"?: (input: {...}, output: {...}) => Promise<void>

    // ... 还有更多 Hook
}
```

**最关键的 Hook 是：`config` 和 `tool`**

---

## Agent 和 Subagent

### Agent 不是由 Plugin 直接定义的！

**常见的误解：**
> "Plugin 定义 Agent"

**正确的理解：**
> "Plugin 通过 `config` Hook 来**注册** Agent"

### 什么是 Config Hook？

```typescript
async config?(input: Config) => Promise<void>
```

这个 Hook 在 OpenCode 启动时被调用，可以修改 `Config` 对象来注册 Agent。

### Config 对象的结构（简化版）

```typescript
export type Config = {
    // Agent 配置对象 - 这是 Plugin 主要修改的地方
    agent?: {
        [agentName: string]: AgentConfig
    }

    // Provider 配置
    provider?: { ... }

    // Model 配置
    model?: { ... }

    // 其他配置...
}
```

### AgentConfig 的完整定义

```typescript
export type AgentConfig = {
    // 必需字段
    model?: string                      // 使用的 LLM 模型（如 "opencode/big-pickle"）
    temperature?: number                // 温度参数（0.0-2.0）
    prompt?: string                     // 系统提示词

    // Agent 角色
    mode?: "subagent" | "primary" | "all"  // [sparkles] 关键字段

    // Agent 能力
    tools?: {
        [toolName: string]: boolean     // 工具权限（true/false）
    }

    // Agent 描述
    description?: string                // Agent 的用途说明

    // Agent 外观
    color?: string                      // Hex 颜色代码

    // Agent 行为
    maxSteps?: number                   // 最大迭代次数
    top_p?: number                      // Top-P 采样参数

    // 权限控制
    permission?: {
        edit?: "ask" | "allow" | "deny"
        bash?: "ask" | "allow" | "deny"
        webfetch?: "ask" | "allow" | "deny"
        // ...
    }

    // 禁用 Agent
    disable?: boolean
}
```

### Primary Agent vs Subagent

**Primary Agent（主智能体）：**
- `mode: "primary"`
- 用户可以直接 `@` 调用
- 可以协调多个 subagent
- 像"项目经理"的角色

**Subagent（子智能体）：**
- `mode: "subagent"`
- 只能被 primary agent 调用
- 专注于特定的任务
- 像"专家员工"的角色

**代码示例：**
```typescript
// Primary Agent
export function mainAgent(): AgentConfig {
  return {
    model: "opencode/big-pickle",
    mode: "primary",              // ← 关键
    temperature: 0.1,
    description: "Project coordinator",
    prompt: `You are the main agent...`
  }
}

// Subagent
export function analyzerAgent(): AgentConfig {
  return {
    model: "opencode/big-pickle",
    mode: "subagent",             // ← 关键
    temperature: 0.1,
    description: "Code analyzer",
    prompt: `You are the analyzer subagent...`
  }
}
```

---

## config Hook 的工作原理

### 完整流程

```
OpenCode 启动
    [down]
加载 package.json 中声明的 plugins
    [down]
对每个 plugin，调用其导出的 Plugin 函数，传入 PluginInput
    [down]
Plugin 函数返回 Hooks 对象
    [down]
OpenCode 检查 Hooks 中是否有 config Hook
    [down]
如果有，调用 config(config) Hook，传入当前的 Config 对象
    [down]
Plugin 修改 config.agent、config.provider、config.model 等
    [down]
OpenCode 使用修改后的 Config 继续初始化
    [down]
新的 Agent 在 UI 中可用
```

### config Hook 的核心代码模式

```typescript
export const MyPlugin: Plugin = async (_input) => {
  return {
    // ← 这就是 config Hook
    async config(config) {
      // 初始化 agent 对象（如果不存在）
      if (!config.agent) {
        config.agent = {}
      }

      // 注册 Primary Agent
      config.agent["my-primary"] = {
        model: "opencode/big-pickle",
        mode: "primary",
        temperature: 0.1,
        description: "My primary agent",
        tools: { read: true, glob: true, grep: true },
        prompt: "..."
      }

      // 注册 Subagent
      config.agent["my-analyzer"] = {
        model: "opencode/big-pickle",
        mode: "subagent",
        temperature: 0.1,
        description: "My analyzer subagent",
        tools: { read: true, glob: true },
        prompt: "..."
      }
    },

    // ← 可选的 tool Hook
    tool: {
      myTool: tool({
        description: "...",
        args: { /* ... */ },
        execute: async (args) => { /* ... */ }
      })
    }
  }
}
```

### 为什么要用 config Hook？

**[NO] 旧方式（不推荐）：**
- 生成 markdown 文件到 `.opencode/agents/`
- 问题：污染用户项目、难以版本控制、不能动态调整

**[OK] 新方式（推荐）：**
- 用 TypeScript 定义 Agent 配置
- 在 `config` Hook 中注册
- 优点：类型安全、易于版本控制、可以动态条件判断

---

## 导出和加载机制

### Plugin 的标准导出方式

**关键：Plugin 必须是异步函数，可以有两种导出方式**

#### 方式 1：命名导出（推荐）
```typescript
export const MyPlugin: Plugin = async (_input) => {
  return {
    async config(config) { /* ... */ },
    tool: { /* ... */ }
  }
}

// 同时导出 default
export default MyPlugin
```

#### 方式 2：默认导出
```typescript
export default async function myPlugin(_input: PluginInput): Promise<Hooks> {
  return {
    async config(config) { /* ... */ },
    tool: { /* ... */ }
  }
}
```

### Plugin 如何被加载？

1. **声明阶段**：package.json 中声明 Plugin 名称
   ```json
   {
     "name": "my-plugin",
     "main": "dist/index.js"
   }
   ```

2. **注册阶段**：opencode.json 中注册 Plugin
   ```json
   {
     "plugin": ["my-plugin"]
   }
   ```

3. **加载阶段**：OpenCode 启动时
   - 加载 `node_modules/my-plugin/dist/index.js`
   - 调用其导出的 Plugin 函数
   - Plugin 返回 Hooks 对象
   - OpenCode 使用这些 Hooks

4. **执行阶段**：
   - 如果有 `config` Hook，立即执行（在初始化阶段）
   - 如果有 `tool` Hook，注册工具到 OpenCode
   - 如果有其他 Hook（如 `chat.params`），在相应时刻执行

---

## 关键理解

### Plugin = 函数 + Hooks，不是 Agent 的容器

```
Plugin 是一个异步函数，返回 Hooks 对象
    [down]
config Hook 是 Plugin 最重要的部分
    [down]
在 config Hook 中，修改 Config 对象来注册 Agent
    [down]
Agent 本身是 AgentConfig 对象，定义在 config Hook 中
```

### 为什么 test 项目把 Agent 分离为单独函数？

```typescript
// [OK] 好的做法：Agent 配置作为函数
export function primaryAgent(): AgentConfig {
  return { /* ... */ }
}

// [NO] 不好的做法：Agent 配置硬编码在 config Hook 中
async config(config) {
  config.agent["my-agent"] = {
    // ... 冗长的配置代码 ...
  }
}
```

**原因：**
1. **可读性** - 分离代码，易于理解
2. **可维护性** - 修改 Agent 时，只需改一个地方
3. **可复用性** - 同一个 Agent 可以在多个地方使用
4. **可测试性** - Agent 配置可以独立测试

---

## 总结

### 三层结构理解

```
Layer 1: Plugin（函数）
  [down] 返回
Layer 2: Hooks（对象）
  ├─ config Hook（function）
  │    [down] 修改
  └─→ Layer 3: Config（object）
         ├─ agent（AgentConfig[]）← Agent 就在这里
         ├─ provider（ProviderConfig[]）
         └─ model（ModelConfig[]）
```

### 核心概念梳理

| 概念 | 定义 | 用途 |
|------|------|------|
| **Plugin** | 异步函数 | 扩展 OpenCode 功能 |
| **Hooks** | 对象 | 提供回调接口 |
| **config Hook** | 函数 | 注册 Agent、Provider、Model |
| **AgentConfig** | 对象 | 定义单个 Agent 的配置 |
| **Agent** | AgentConfig 实例 | OpenCode 中的工作者 |
| **Primary Agent** | mode="primary" | 可被用户直接调用 |
| **Subagent** | mode="subagent" | 只能被其他 Agent 调用 |

---

## 实际应用举例

### 对于 @deep-flux/liubu 的启示

三省六部制有 **2 + 6 = 8 个角色**：
1. 皇帝（战略）→ Primary Agent（项目协调者）
2. 三省（规划、审核、执行）→ 3 个 Subagent
3. 六部（具体实现）→ 6 个 Subagent（可选，可以合并）

**应该这样导出：**
```typescript
// src/agents/huangdi.ts
export function huangdiAgent(): AgentConfig {
  return { mode: "primary", ... }
}

// src/agents/zhongshu.ts
export function zhongshuAgent(): AgentConfig {
  return { mode: "subagent", ... }
}

// ... 其他 Agent ...

// src/index.ts
export const SanshengLiubuPlugin: Plugin = async (_input) => {
  return {
    async config(config) {
      if (!config.agent) config.agent = {}
      config.agent["huangdi"] = huangdiAgent()
      config.agent["zhongshu"] = zhongshuAgent()
      // ... 注册其他 Agent ...
    }
  }
}
```

---

## 进一步阅读

- **官方 Plugin 类型定义**：`@opencode-ai/plugin/dist/index.d.ts`
- **官方 Agent 类型定义**：`@opencode-ai/sdk/dist/gen/types.gen.d.ts`
- **参考实现**：`/Users/jianlaide/Documents/ai/opencode_plugin/test/`
- **架构指南**：`/Users/jianlaide/Documents/ai/opencode_plugin/test/PLUGIN_ARCHITECTURE.md`
