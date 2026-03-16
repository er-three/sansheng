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

### 治理系统（Phase 5）
- **[治理系统完整规范](./governance-system.md)** - 六部三省的完整决策权和工作流规范
  - 权力结构和分配
  - 完整的工作流程（6个阶段）
  - 关键决策流程
  - 常见陷阱和避免方法

#### 详细规范文档
- **[五部职责定义](./five-ministries-responsibilities.md)** - 吏户工兵刑五部的具体职责、能力和验收标准
  - 吏部：代码扫描和信息采集
  - 户部：外部资源研究
  - 工部：代码实现
  - 兵部：质量验证
  - 刑部：问题诊断

- **[三省决策权定义](./three-provinces-authority.md)** - 中书门下尚书的权力边界和工作流程
  - 中书省：规划和决策权（权力⭐⭐⭐⭐⭐）
  - 门下省：审核和执行决策权（权力⭐⭐⭐⭐）
  - 尚书省：调度执行权（权力⭐⭐⭐）

- **[工作流执行规范](./workflow-execution.md)** - 实际执行中的操作规范、数据格式、状态管理
  - 任务执行协议和生命周期
  - 执行循环详解和并行执行
  - 验证流程和错误处理
  - 状态管理和监控指标
  - 并发控制和通信协议

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
| **getting-started.md** | **5分钟快速上手（新增）** |
| governance-system.md | 治理系统完整规范（Phase 5） |
| governance-implementation.md | 治理系统实现指南和API参考 |
| five-ministries-responsibilities.md | 五部职责详细定义 |
| three-provinces-authority.md | 三省决策权详细定义 |
| workflow-execution.md | 工作流执行规范 |
| **testing.md** | **测试指南和最佳实践（新增）** |
| **troubleshooting.md** | **故障排除指南（新增）** |
| phase-3.md | Phase 3实现细节 |
| opencode-logger.md | 日志系统文档 |
| plugin-principles.md | 系统设计原则 |

**新增文档（总计）**：3 个新增文档，完整覆盖使用和测试

---

## 🎯 推荐阅读顺序

### 基础入门
1. **README.md**（根目录） - 项目概览
2. **docs/quick-start.md** - 快速开始
3. **docs/architecture.md** - 理解系统架构
4. **docs/agents.md** - 了解各个智能体

### 治理系统使用（新增）
5. **docs/getting-started.md** - 5分钟快速上手指南
6. **docs/governance-implementation.md** - 完整 API 参考和实现细节
7. **docs/governance-system.md** - 治理系统架构和权力结构
8. **docs/five-ministries-responsibilities.md** - 五部职责详解
9. **docs/three-provinces-authority.md** - 三省决策权详解

### 深入学习
10. **docs/workflow-execution.md** - 工作流执行规范和操作指南
11. **docs/testing.md** - 测试套件和最佳实践
12. **docs/troubleshooting.md** - 故障排除和常见问题

### 进阶功能
13. **docs/phase-3.md** - 代码修改网关和审计系统
14. **docs/opencode-logger.md** - 日志系统
15. **docs/plugin-principles.md** - 系统设计原则

---

**版本**: 3.0.0 | **状态**: ✅ 生产就绪

