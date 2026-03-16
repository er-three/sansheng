# TODO: OpenCode Client 日志打印问题调查

**创建时间**: 2026-03-16
**优先级**: 🟡 中
**状态**: ⏳ 待调查（明天）
**预计工作量**: 2-4小时

---

## 📋 问题描述

### 当前状态
- OpenCode client的日志直接打印在终端
- 没有日志输出控制和重定向机制
- 无法灵活地管理日志的输出位置、格式、级别

### 问题影响
- ❌ 终端输出混乱，用户信息和debug信息混在一起
- ❌ 无法持久化日志到文件
- ❌ 无法按级别过滤日志（error/warn/info/debug）
- ❌ 无法关闭日志输出（例如生产环境）
- ❌ 无法自定义日志格式
- ❌ 无法为不同的模块设置不同的日志级别

---

## 🔍 调查清单（明天）

### 第1步：定位问题
- [ ] 找出OpenCode client中所有的console.log/console.error调用位置
- [ ] 检查是否有统一的日志系统或都是零散的直接打印
- [ ] 确认日志来自哪些模块（plugin、agent、workflow等）

### 第2步：分析影响范围
- [ ] 统计有多少个地方在打印日志
- [ ] 分类日志的类型（debug、info、warn、error）
- [ ] 确认用户反馈中哪些是日志相关的问题

### 第3步：了解需求
- [ ] 日志是否需要输出到文件？
- [ ] 需要支持什么级别的过滤？
- [ ] 生产环境和开发环境的日志需求是否不同？
- [ ] 是否需要日志的时间戳和来源模块标识？

### 第4步：方案设计
- [ ] 是否引入日志库（winston, pino, bunyan等）？
- [ ] 还是自建简单的日志系统？
- [ ] 日志配置放在哪里（环境变量、配置文件还是代码）？

---

## 💡 可能的解决方案（待明天确认）

### 方案A：引入专业日志库（推荐）
```typescript
// 使用 winston 或 pino
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    new ConsoleTransport(),
    new FileTransport({ filename: '.opencode/logs/app.log' })
  ]
})

logger.info('Message')
logger.error('Error')
logger.debug('Debug')
```

**优点**：功能完整，易于使用，生态成熟
**缺点**：增加依赖，学习曲线

### 方案B：自建简单日志系统
```typescript
// 简单的日志包装
class Logger {
  log(level: 'debug'|'info'|'warn'|'error', message: string) {
    if (this.shouldLog(level)) {
      console.log(`[${level.toUpperCase()}] ${message}`)
    }
  }
}
```

**优点**：轻量级，无额外依赖
**缺点**：功能有限

### 方案C：环境变量控制
```bash
# 完全关闭日志
OPENCODE_LOG_LEVEL=off

# 只显示错误
OPENCODE_LOG_LEVEL=error

# 显示所有
OPENCODE_LOG_LEVEL=debug

# 输出到文件
OPENCODE_LOG_FILE=.opencode/logs/app.log
```

---

## 📌 关键问题（明天需要理清）

1. **日志库选择** - 用专业库还是自建？
2. **输出位置** - 只输出到终端，还是也要输出到文件？
3. **日志级别** - 需要支持多少级别的日志？
4. **配置方式** - 通过环境变量、配置文件还是代码？
5. **性能** - 日志系统是否会对性能造成影响？
6. **兼容性** - 是否需要向后兼容现有的日志输出？

---

## 📅 明天的调查流程

```
上午：
  1. 搜索codebase中所有的console.* 调用
  2. 分类统计日志来源
  3. 查看现有代码中是否有日志相关的尝试

中午：
  4. 研究几个流行的日志库
  5. 评估引入的成本和收益
  6. 与用户反馈结合，确定优先级

下午：
  7. 设计推荐方案
  8. 估算实施工作量
  9. 记录详细的实施计划
```

---

## 📝 后续跟进

完成调查后，创建详细的实施方案文档：
- 具体的代码改动清单
- 迁移策略（如何从现有的console.log迁移）
- 测试方案
- 文档和示例

---

## 🏷️ 标签

`logging` `client` `maintenance` `infrastructure` `tomorrow`

