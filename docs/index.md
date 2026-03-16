# 📚 @deep-flux/liubu 文档导航

企业级多智能体协作框架 - 完整文档索引

---

## 🚀 快速开始

- **[快速开始](./quick-start.md)** - 5分钟了解核心概念和使用方式

---

## 📖 核心文档

### 架构设计
- **[系统架构](./architecture.md)** - 11个智能体分层架构详解
  - 战略层（皇帝）
  - 执行层（三省：中书省、门下省、尚书省）
  - 工作层（六部：吏部、户部、礼部、兵部、刑部、工部）
  - 权限矩阵与subagent调用控制

### 智能体
- **[智能体详解](./agents.md)** - 11个智能体职责与权限详细说明

### 功能特性

#### Phase 3 - 系统硬化
- **[Phase 3总结](./phase-3.md)** - 代码修改网关、审计系统、测试强制
  - 4层代码修改网关
  - 持久化审计系统（JSON文件存储）
  - 测试执行强制追踪

#### 日志系统
- **[OpenCode日志修复](./opencode-logger.md)** - 日志路由到OpenCode客户端
  - 专用日志客户端管理
  - 自动降级机制
  - 诊断工具

---

## 🔧 设计原则

- **[插件原则](./plugin-principles.md)** - 系统设计的核心原则
  - 多层验证策略
  - 权限最小化原则
  - 清晰的职责划分

---

## 📊 文档统计

| 文档 | 内容 |
|------|------|
| quick-start.md | 快速上手指南 |
| architecture.md | 系统架构详解 |
| agents.md | 11个智能体说明 |
| phase-3.md | Phase 3实现细节 |
| opencode-logger.md | 日志系统文档 |
| plugin-principles.md | 系统设计原则 |

---

## 🎯 推荐阅读顺序

1. **README.md**（根目录） - 项目概览
2. **docs/quick-start.md** - 快速开始
3. **docs/architecture.md** - 理解系统架构
4. **docs/agents.md** - 了解各个智能体
5. **docs/phase-3.md** - 学习核心功能
6. **docs/opencode-logger.md** - 掌握日志系统

---

**版本**: 3.0.0 | **状态**: ✅ 生产就绪

