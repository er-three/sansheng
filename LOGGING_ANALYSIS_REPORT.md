# OpenCode Client 日志系统分析报告

**分析日期**: 2026-03-16
**状态**: 分析完成，优化建议已生成

---

## 📊 当前状态评估

### 好消息 ✅
现有日志系统实际上已经相当完善：

**已实现功能**：
1. **统一的日志接口** - `src/utils.ts` 中的 `log()` 函数
2. **多级日志支持** - debug, info, warn, error 四个级别
3. **时间戳** - 所有日志都带有 ISO 8601 时间戳
4. **分类标签** - 每条日志包含来源分类
5. **OpenCode API 集成** - 尝试使用官方 API，失败时自动降级
6. **错误处理** - 异常情况下的降级方案和错误捕获
7. **异步支持** - 日志记录不阻塞主流程

**代码质量**：
- 日志调用均使用统一 `log()` 函数（除了1个演示文件）
- 无混乱的 console.log 调用
- 实现清晰，易于维护

### 待改进 ⚠️

**缺失功能**：
1. ❌ **日志持久化** - 无文件输出能力
2. ❌ **日志级别配置** - 无环境变量或配置控制
3. ❌ **结构化日志** - 无 JSON 格式支持（用于日志分析）
4. ❌ **日志过滤** - 无按模块/级别动态过滤能力
5. ❌ **日志轮转** - 无日志文件大小管理

---

## 🔍 代码扫描结果

### console 调用统计

| 位置 | 类型 | 行数 | 说明 |
|------|------|------|------|
| src/utils.ts | console.error | 5 | 日志函数的合理使用 |
| src/gongbu-level3-parallel.ts | console.log | 3 | 演示文件，非生产代码 |
| **总计** | - | **8** | 非常少 ✅ |

### 日志函数使用情况

```
find src -name "*.ts" | xargs grep "log(" | wc -l
→ 超过 100+ 处调用

所有调用均使用 log() 函数，无混乱的 console.* 直接调用
```

---

## 💡 优化方案

### 方案 A：增强当前系统（推荐 - 中等工作量）

在现有 `log()` 函数基础上增加功能：

```typescript
// 新增日志配置接口
interface LogConfig {
  level: "debug" | "info" | "warn" | "error"  // 最小输出级别
  fileOutput?: {
    enabled: boolean
    path: string                                // 如 .opencode/logs/app.log
    maxSize?: number                            // 文件最大大小（字节）
  }
  format: "text" | "json"                       // 输出格式
  modules?: Record<string, "debug" | "info" | "warn" | "error">  // 模块级配置
}

// 新增函数
export function configureLogging(config: LogConfig): void
export function getLogLevel(): string
export function setLogLevel(level: string): void
```

**实现步骤**：
1. 在 utils.ts 中添加 LogConfig 接口
2. 实现日志配置管理函数
3. 在 log() 函数中检查日志级别和模块配置
4. 支持环境变量覆盖（如 `OPENCODE_LOG_LEVEL=debug`）
5. 支持文件输出（可选）

**成本**：2-3 小时
**收益**：高（解决大部分用户需求）

### 方案 B：引入专业日志库（完整 - 较多工作量）

使用 winston 或 pino 等成熟库：

```typescript
import { createLogger, format, transports } from "winston"

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: ".opencode/logs/app.log" })
  ]
})
```

**优点**：功能完整，生态成熟，社区支持
**缺点**：引入依赖，迁移成本较高
**成本**：4-6 小时
**收益**：很高（专业级日志系统）

### 方案 C：保持现状（最小成本）

继续使用当前系统，仅进行文档化：

**优点**：无额外工作，系统已足够稳定
**缺点**：无法满足文件输出、级别过滤等需求
**成本**：0.5 小时（文档）
**收益**：低（仅改善可维护性）

---

## 📋 推荐方案：**方案 A** (增强当前系统)

### 理由

1. **基于现有基础** - 无需大规模重构
2. **工作量可控** - 2-3 小时，不影响其他任务
3. **收益明显** - 解决日志级别控制、文件输出等核心需求
4. **易于维护** - 代码统一，无新的外部依赖
5. **易于扩展** - 未来可升级到专业库（如需要）

---

## 🛠️ 实施计划（如选择方案 A）

### 第 1 步：添加日志配置系统（30-45 分钟）

```typescript
// src/utils.ts 新增

export interface LogConfig {
  level: "debug" | "info" | "warn" | "error"
  fileOutput?: {
    enabled: boolean
    path: string
    maxSize?: number
  }
  format: "text" | "json"
  modules?: Record<string, "debug" | "info" | "warn" | "error">
}

const DEFAULT_LOG_CONFIG: LogConfig = {
  level: process.env.OPENCODE_LOG_LEVEL || "info",
  format: "text",
  fileOutput: {
    enabled: process.env.OPENCODE_LOG_FILE ? true : false,
    path: process.env.OPENCODE_LOG_FILE || ".opencode/logs/app.log"
  }
}

let currentLogConfig = { ...DEFAULT_LOG_CONFIG }

export function configureLogging(config: Partial<LogConfig>): void {
  currentLogConfig = { ...currentLogConfig, ...config }
}

export function getLogConfig(): LogConfig {
  return { ...currentLogConfig }
}
```

### 第 2 步：更新 log() 函数以支持配置（45-60 分钟）

```typescript
// 在 logAsync() 中添加级别检查
async function logAsync(
  category: string,
  message: string,
  level: "debug" | "info" | "warn" | "error"
): Promise<void> {
  const config = getLogConfig()

  // 检查是否应该输出此日志
  if (!shouldLog(category, level, config)) {
    return
  }

  // ... 现有的 OpenCode API 调用和降级代码 ...

  // 新增：文件输出支持
  if (config.fileOutput?.enabled) {
    try {
      appendLogToFile(category, message, level, config.format)
    } catch (error) {
      console.error("Failed to write log to file:", error)
    }
  }
}

function shouldLog(
  category: string,
  level: "debug" | "info" | "warn" | "error",
  config: LogConfig
): boolean {
  const logLevelOrder = { debug: 0, info: 1, warn: 2, error: 3 }

  // 检查模块特定级别
  const moduleLevel = config.modules?.[category] || config.level

  return logLevelOrder[level] >= logLevelOrder[moduleLevel]
}

function appendLogToFile(
  category: string,
  message: string,
  level: string,
  format: "text" | "json"
): void {
  const timestamp = new Date().toISOString()

  let output: string
  if (format === "json") {
    output = JSON.stringify({
      timestamp,
      level,
      category,
      message
    })
  } else {
    output = `[${timestamp}] [${category}] [${level.toUpperCase()}] ${message}`
  }

  // 使用 writeFileSync 或异步写入
  // 注意：需要确保目录存在
}
```

### 第 3 步：测试和文档（30-45 分钟）

- 添加单元测试验证日志配置
- 验证文件输出功能
- 更新代码注释和使用文档
- 测试环境变量配置

---

## 🧪 验证清单

实施方案 A 后的验证项：

- [ ] 日志级别过滤生效（DEBUG 级别下输出 debug 日志）
- [ ] 文件输出功能正常（日志文件被创建和更新）
- [ ] 环境变量配置生效（`OPENCODE_LOG_LEVEL=error` 仅输出错误）
- [ ] JSON 格式日志可解析（日志分析工具可读）
- [ ] 向后兼容性（现有代码无需修改）
- [ ] 性能无显著下降（日志不阻塞主流程）

---

## 📚 使用示例

```bash
# 示例 1: 开发环境（详细日志）
OPENCODE_LOG_LEVEL=debug node app.js

# 示例 2: 生产环境（仅错误）
OPENCODE_LOG_LEVEL=error node app.js

# 示例 3: 启用文件输出
OPENCODE_LOG_FILE=./logs/app.log node app.js

# 示例 4: 详细日志 + 文件输出
OPENCODE_LOG_LEVEL=debug OPENCODE_LOG_FILE=./logs/app.log node app.js

# 示例 5: 代码中配置
configureLogging({
  level: "warn",
  format: "json",
  fileOutput: {
    enabled: true,
    path: ".opencode/logs/app.json"
  },
  modules: {
    "ProgrammingAgent": "debug",  // 此模块详细日志
    "SubAgent": "info"            // 此模块信息级别
  }
})
```

---

## 📊 成本-收益分析

| 方案 | 工作量 | 文件输出 | 级别过滤 | 结构化日志 | 引入依赖 | 推荐度 |
|------|--------|---------|---------|-----------|---------|--------|
| A (增强) | 2-3h | ✅ | ✅ | ✅ | ❌ | 🟢 强烈 |
| B (库) | 4-6h | ✅✅ | ✅✅ | ✅✅ | ✅ | 🟡 可选 |
| C (保持) | 0.5h | ❌ | ❌ | ❌ | ❌ | 🔴 不推荐 |

---

## 🎯 结论

**当前状态**：日志系统已相当完善，无紧急问题
**建议优化**：实施方案 A，用 2-3 小时添加日志级别控制和文件输出
**优先级**：🟡 中（改善体验，但不是阻塞性问题）
**下一步**：等待团队评审本报告后确定是否实施方案 A

---

## 🏷️ 相关文件

- src/utils.ts - 当前日志实现（第 170-234 行）
- src/gongbu-level3-parallel.ts - 演示文件（仅有 console.log）
- .opencode/agents/*.md - 各 Agent 提示词中的日志记录说明

---

**报告生成时间**: 2026-03-16
**报告审阅人**: (待分配)
**实施状态**: ⏳ 等待决策
