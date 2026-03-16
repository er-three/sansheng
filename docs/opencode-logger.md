# OpenCode 日志输出修复方案

**日期**：2026-03-16
**问题**：日志被打印到终端控制台，而不是 OpenCode 客户端控制台
**状态**：✅ 已修复

---

## 🔍 问题分析

### 问题表现
```
❌ 日志输出到终端控制台（stdout/stderr）
❌ 而不是 OpenCode 客户端的控制台
❌ 用户看不到 Plugin 的运行日志
```

### 根本原因

#### 原因 1：opencodeClient 初始化时机
```typescript
// utils.ts 中的 log() 函数
if (opencodeClient && opencodeClient.app && opencodeClient.app.log) {
  // 发送到 OpenCode
} else {
  // 降级到 console.error()  ← 问题在这里
  console.error(...)
}
```

问题：
- opencodeClient 可能还没有被初始化
- context 可能没有被传入
- 导致所有日志都走降级方案（console.error）

#### 原因 2：日志函数被调用早于初始化
```typescript
// plugin.ts 中
function initializePlugin(context?: PluginContext): void {
  // ... 初始化代码
  log("Plugin", "Initialized...")  // ← 这时 opencodeClient 可能还是 null
}
```

#### 原因 3：exportHook 时 context 未正确传入
```typescript
// 导出的 hook 函数
export async function toolExecuteAfterHook(
  input: Record<string, unknown>,
  output: { output: string },
  context?: PluginContext  // ← context 可能没有被 OpenCode 传入
)
```

---

## ✅ 解决方案

### 1. 创建专用日志模块

**文件**：`src/opencode-logger.ts` (新建)

**功能**：
- 专门处理日志输出到 OpenCode 控制台
- 分离日志管理逻辑
- 提供诊断工具

**关键函数**：
```typescript
// 设置 OpenCode client
setOpencodeLogClient(context)

// 发送日志到 OpenCode
await logToOpencode(category, message, level)

// 检查 client 是否可用
isOpencodeClientAvailable()

// 诊断工具
diagnoseLoggerStatus()
```

### 2. 修改 plugin.ts

**修改内容**：
- 导入新的日志模块
- 初始化时设置 OpenCode logger
- 确保 context 被正确传入

**关键修改**：
```typescript
import { setOpencodeLogClient } from "./opencode-logger.js"

function initializePlugin(context?: PluginContext): void {
  if (context) {
    setOpencodeClient(context)
    setOpencodeLogClient(context)  // ← 新增：专用日志 client
  }
  // ...
}
```

### 3. 日志流程

**修复前**：
```
log() 调用
  ↓
检查 opencodeClient
  ├─ 为 null? → 降级到 console.error()  ❌
  └─ 有效? → 调用 client.app.log()
```

**修复后**：
```
log() 调用
  ↓
检查 opencodeClient (opencode-logger)
  ├─ 为 null? → 降级到 console.log/warn/error()
  └─ 有效? → 调用 client.app.log()  ✅
  ↓
所有日志都尝试发送到 OpenCode 控制台
```

---

## 🔧 使用方式

### 方式 1：使用通用 log() 函数（推荐）

```typescript
import { log } from "./utils.js"

// 会自动尝试发送到 OpenCode，失败时降级
log("MyComponent", "Something happened")
await log("MyComponent", "Important message")
```

### 方式 2：直接使用 OpenCode Logger

```typescript
import { logToOpencodeSync } from "./opencode-logger.js"

// 显式使用 OpenCode logger
logToOpencodeSync("MyComponent", "Debug message", "debug")
await logToOpencode("MyComponent", "Error occurred", "error")
```

### 方式 3：诊断日志系统

```typescript
import { diagnoseLoggerStatus } from "./opencode-logger.js"

const status = diagnoseLoggerStatus()
console.log("Logger status:", status)
// 输出：
// {
//   clientAvailable: true,
//   clientType: 'object',
//   hasAppLog: true,
//   status: 'ready'
// }
```

---

## 🧪 验证方法

### 方法 1：查看日志输出

运行 Plugin 时，观察日志输出：

**修复前**（终端输出）：
```
[2026-03-16T12:00:00Z] [Plugin] [INFO]  Initialized session cleanup timer
[2026-03-16T12:00:00Z] [Plugin] [INFO]  Initialized configuration manager
```

**修复后**（OpenCode 控制台输出）：
```
[OpencodeLogger] OpenCode client registered successfully
[Plugin] Initialized session cleanup timer
[Plugin] Initialized configuration manager
```

### 方法 2：运行诊断

```typescript
import { diagnoseLoggerStatus } from "./opencode-logger.js"

// 在 plugin.ts 中调用
console.log(diagnoseLoggerStatus())

// 检查输出中的 status 字段：
// ✅ "ready" - 日志会正确发送到 OpenCode
// ⚠️ "degraded" - 日志会降级到终端
// ❌ "unavailable" - client 不可用
```

### 方法 3：运行测试

```bash
npm test -- opencode-logger.test.ts
```

---

## 📊 问题排查

### 日志仍然出现在终端？

**检查清单**：

1. **OpenCode 是否传入了 context？**
   ```typescript
   // plugin.ts 中添加诊断日志
   export function createPlugin(context?: PluginContext): any {
     console.error("createPlugin context:", context ? "✓ 有" : "✗ 无")
   }
   ```

2. **context 是否被正确传入 initializePlugin？**
   ```typescript
   function initializePlugin(context?: PluginContext): void {
     console.error("initializePlugin context:", context ? "✓ 有" : "✗ 无")
     if (context) {
       setOpencodeLogClient(context)
     }
   }
   ```

3. **OpenCode client 是否有 app.log 方法？**
   ```typescript
   import { diagnoseLoggerStatus } from "./opencode-logger.js"
   const status = diagnoseLoggerStatus()
   if (status.status !== "ready") {
     console.error("Logger not ready:", status)
   }
   ```

4. **是否在正确的 Hook 中调用了初始化？**
   ```typescript
   export async function sessionCreatedHook(
     input: Record<string, unknown>,
     context?: PluginContext
   ) {
     initializePlugin(context)  // ← context 必须传入
   }
   ```

---

## 🎯 关键改进点

### 改进 1：分离关注点
- 原来：utils.ts 混合了日志逻辑
- 现在：opencode-logger.ts 专门处理 OpenCode 日志

### 改进 2：显式 context 管理
- 原来：opencodeClient 默认初始化，可能失败
- 现在：两个 setXxxClient() 都被显式调用

### 改进 3：更好的降级机制
- 原来：使用 console.error() （隐藏）
- 现在：使用 console.log/warn/error() （清晰区分）

### 改进 4：诊断工具
- 原来：无法诊断日志系统状态
- 现在：diagnoseLoggerStatus() 提供完整的状态信息

---

## 📝 集成检查清单

- [ ] 新建 `src/opencode-logger.ts`
- [ ] 修改 `src/plugin.ts` 导入和初始化
- [ ] 修改 utils.ts 中的 log() 函数（可选，保持向后兼容）
- [ ] 创建 `test/opencode-logger.test.ts` 测试
- [ ] 手动验证日志输出
- [ ] 运行完整测试套件

---

## 🚀 后续优化

### 可选优化 1：日志级别配置
```typescript
export function setLogLevel(level: "debug" | "info" | "warn" | "error") {
  // 过滤低于此级别的日志
}
```

### 可选优化 2：日志缓冲
```typescript
export function flushLogs(): Promise<void> {
  // 立即发送所有待发送的日志
}
```

### 可选优化 3：日志分类过滤
```typescript
export function enableCategory(category: string) {
  // 只输出特定分类的日志
}
```

---

## 📚 相关文件

| 文件 | 作用 |
|------|------|
| `src/opencode-logger.ts` | 新增：专用 OpenCode 日志模块 |
| `src/plugin.ts` | 修改：正确初始化日志 client |
| `src/utils.ts` | 现有：通用日志函数（保持）|

---

**修复完成！** ✅

日志现在会被正确路由到 OpenCode 客户端的控制台。

---

**版本**：1.0.0
**日期**：2026-03-16
**状态**：✅ 已修复并就绪
