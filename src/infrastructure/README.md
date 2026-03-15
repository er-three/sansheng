# Infrastructure - 通用基础设施

## 概述

此目录包含所有系统 **通用的工具、配置、验证和日志** 功能，供其他模块使用。

## 目录结构

```
infrastructure/
├── cache/
│   ├── memory-cache.ts              # 内存缓存（≈ 120 行）
│   ├── file-cache.ts                # 文件缓存（≈ 100 行）
│   └── cache-manager.ts             # 缓存管理器（≈ 150 行）
│
├── config/
│   ├── config-manager.ts            # 配置管理（≈ 120 行）
│   ├── environment.ts               # 环境变量（≈ 80 行）
│   └── config-types.ts              # 类型定义（≈ 100 行）
│
├── validation/
│   ├── input-validator.ts           # 输入验证（≈ 120 行）
│   ├── schema-validator.ts          # Schema 验证（≈ 100 行）
│   └── validator-types.ts           # 类型定义（≈ 80 行）
│
├── logging/
│   ├── logger.ts                    # 日志系统（≈ 150 行）
│   ├── log-formatter.ts             # 日志格式化（≈ 100 行）
│   └── log-levels.ts                # 日志级别定义（≈ 50 行）
│
├── utils.ts                         # 通用工具函数（≈ 200 行）
├── infrastructure-types.ts          # 通用类型（≈ 100 行）
└── README.md                        # 本文件
```

## 模块详解

### Cache 模块

#### memory-cache.ts (≈ 120 行)

**用途**：快速的内存缓存，用于热数据。

**接口**：
```typescript
/**
 * 设置缓存值
 */
export function set(key: string, value: any, ttlMs?: number): void

/**
 * 获取缓存值
 */
export function get(key: string): any | null

/**
 * 检查是否存在
 */
export function has(key: string): boolean

/**
 * 删除缓存
 */
export function delete(key: string): boolean

/**
 * 清空所有缓存
 */
export function clear(): void

/**
 * 获取缓存大小
 */
export function size(): number
```

**使用场景**：
- Agent 任务缓存（避免重复计算）
- Recipe 元数据缓存
- 配置文件缓存

#### file-cache.ts (≈ 100 行)

**用途**：文件级别的持久化缓存。

**存储位置**：
```
.opencode/
└── cache/
    ├── {hash1}.cache
    ├── {hash2}.cache
    └── cache-index.json
```

**接口**：
```typescript
/**
 * 设置文件缓存
 */
export function setCacheFile(
  key: string,
  content: string,
  root: string
): void

/**
 * 获取文件缓存
 */
export function getCacheFile(
  key: string,
  root: string
): string | null

/**
 * 缓存是否过期
 */
export function isCacheExpired(
  key: string,
  maxAgeMs: number = 86400000  // 默认 1 天
): boolean

/**
 * 清理过期缓存
 */
export function cleanupExpiredCache(root: string): void
```

#### cache-manager.ts (≈ 150 行)

**用途**：统一管理内存和文件缓存。

**策略**：
1. **L1 缓存**（内存）：快速访问，容量小
2. **L2 缓存**（文件）：容量大，速度较慢
3. **过期策略**：LRU（最近最少使用）
4. **回源策略**：缓存失败时调用 callback 重新计算

---

### Config 模块

#### config-manager.ts (≈ 120 行)

**用途**：集中管理所有配置。

**配置来源（优先级从高到低）**：
1. 环境变量（`LIUBU_*`）
2. `opencode.json` 中的 liubu 配置
3. `.env` 文件
4. 程序内默认值

**接口**：
```typescript
/**
 * 获取配置值
 */
export function getConfig(key: string): any

/**
 * 设置配置值
 */
export function setConfig(key: string, value: any): void

/**
 * 获取整个配置对象
 */
export function getAllConfig(): Record<string, any>

/**
 * 加载配置文件
 */
export function loadConfig(configPath: string): void

/**
 * 验证必需的配置
 */
export function validateRequiredConfig(): ValidationResult
```

**配置键示例**：
```
liubu.agent.timeout = 5000
liubu.execution.maxRetries = 3
liubu.cache.enabled = true
liubu.cache.ttl = 3600
liubu.audit.path = ".opencode/audit"
liubu.session.expirationHours = 24
```

#### environment.ts (≈ 80 行)

**用途**：加载和管理环境变量。

**支持的环境变量**：
```
LIUBU_AGENT_TIMEOUT = 5000
LIUBU_EXECUTION_MAX_RETRIES = 3
LIUBU_CACHE_ENABLED = true
LIUBU_LOG_LEVEL = info
LIUBU_DEBUG = false
```

---

### Validation 模块

#### input-validator.ts (≈ 120 行)

**用途**：验证用户输入和 API 参数。

**接口**：
```typescript
/**
 * 验证工作流定义
 */
export function validateWorkflowInput(input: any): ValidationResult

/**
 * 验证 Recipe
 */
export function validateRecipeInput(recipe: any): ValidationResult

/**
 * 验证 Agent 参数
 */
export function validateAgentInput(
  agentName: string,
  input: any
): ValidationResult

/**
 * 通用验证
 */
export function validate(
  input: any,
  rules: ValidationRule[]
): ValidationResult
```

**验证规则**：
```typescript
interface ValidationRule {
  field: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  enum?: any[]
  custom?: (value: any) => boolean
}
```

#### schema-validator.ts (≈ 100 行)

**用途**：使用 Schema 进行结构验证（支持 JSON Schema）。

**接口**：
```typescript
/**
 * 使用 Schema 验证对象
 */
export function validateAgainstSchema(
  object: any,
  schema: JSONSchema
): ValidationResult

/**
 * 预注册常用 Schema
 */
export function registerSchema(name: string, schema: JSONSchema): void

/**
 * 获取已注册的 Schema
 */
export function getSchema(name: string): JSONSchema | null
```

---

### Logging 模块

#### logger.ts (≈ 150 行)

**用途**：统一的日志系统，支持多日志级别和多目标。

**日志级别**：
```
ERROR   - 错误信息（必须处理）
WARN    - 警告信息（应该注意）
INFO    - 信息日志（正常运行）
DEBUG   - 调试信息（开发时使用）
TRACE   - 详细跟踪（深度调试）
```

**接口**：
```typescript
/**
 * 记录日志（根据级别）
 */
export function log(
  level: LogLevel,
  module: string,
  message: string,
  data?: Record<string, any>
): void

// 便捷函数
export function error(module: string, message: string, data?: any): void
export function warn(module: string, message: string, data?: any): void
export function info(module: string, message: string, data?: any): void
export function debug(module: string, message: string, data?: any): void
export function trace(module: string, message: string, data?: any): void

/**
 * 设置日志级别
 */
export function setLogLevel(level: LogLevel): void

/**
 * 获取日志记录
 */
export function getLogsForSession(sessionId: string): LogEntry[]

/**
 * 清空日志
 */
export function clearLogs(): void
```

**日志输出**：
- **控制台**：实时输出
- **文件**：`.opencode/logs/{date}.log`
- **内存**：保留最近 1000 条记录（用于快速查询）

#### log-formatter.ts (≈ 100 行)

**用途**：格式化日志输出。

**支持的格式**：
```
[LEVEL] [时间] [模块] 消息 {数据}

例如：
[ERROR] 2026-03-16T10:30:45.123Z [ExecutionLayer] Task execution failed {"taskId": "task-1", "error": "..."}
```

---

### Utils 模块 (≈ 200 行)

**通用工具函数**：

```typescript
/**
 * 文件 I/O
 */
export function readFile(path: string): string | null
export function writeFile(path: string, content: string): void
export function fileExists(path: string): boolean
export function deleteFile(path: string): void

/**
 * 路径处理
 */
export function findRoot(startPath?: string): string
export function normalizePath(path: string): string
export function ensureDirExists(path: string): void

/**
 * JSON 操作
 */
export function safeJsonParse(
  content: string,
  fallback?: any
): any

export function safeJsonStringify(
  obj: any,
  indent?: number
): string | null

/**
 * 字符串操作
 */
export function generateId(prefix?: string): string
export function generateHash(content: string): string
export function delay(ms: number): Promise<void>

/**
 * 数组操作
 */
export function deduplicate<T>(items: T[]): T[]
export function chunk<T>(items: T[], size: number): T[][]
```

---

### infrastructure-types.ts (≈ 100 行)

**内容**：
```typescript
// 缓存配置
export interface CacheConfig {
  enabled: boolean
  ttl: number                        // 生存时间（毫秒）
  maxSize: number                    // 最大条目数
  evictionPolicy: 'lru' | 'lfu'      // 驱逐策略
}

// 日志条目
export interface LogEntry {
  timestamp: number
  level: LogLevel
  module: string
  message: string
  data?: Record<string, any>
  sessionId?: string
}

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE'

// 验证结果
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  data?: any                         // 验证通过时的数据
}

// 验证规则
export interface ValidationRule {
  field: string
  type: string
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  enum?: any[]
  custom?: (value: any) => boolean
}
```

---

## 使用示例

```typescript
// 日志
import { logger } from './logging/logger.js'
logger.info('MyModule', 'Starting workflow', { workflowId })

// 缓存
import { CacheManager } from './cache/cache-manager.js'
const cache = new CacheManager()
cache.set('key-1', value)
const cached = cache.get('key-1')

// 配置
import { getConfig } from './config/config-manager.js'
const timeout = getConfig('liubu.agent.timeout')

// 验证
import { validateWorkflowInput } from './validation/input-validator.js'
const validation = validateWorkflowInput(userInput)
if (!validation.valid) {
  throw new Error(validation.errors.join(', '))
}

// 工具
import { generateId, delay, findRoot } from './utils.js'
const id = generateId('task')
await delay(1000)
const root = findRoot()
```

---

## 扩展指南

### 添加新的工具函数

1. 在 `utils.ts` 或对应子模块中添加函数
2. 添加 JSDoc 注释
3. 编写单元测试
4. 更新此 README

### 添加新的日志级别

1. 在 `log-levels.ts` 中定义
2. 在 `logger.ts` 中实现处理
3. 在 `log-formatter.ts` 中支持格式化

---

## 相关文档

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - 总体架构
