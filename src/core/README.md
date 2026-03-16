# Core - WorkflowManager 核心系统

## 概述

此目录包含 **WorkflowManager** 和相关的核心工作流管理系统。

## 目录结构

```
core/
├── workflow-manager.ts          # WorkflowManager 主类（≈ 300-400行）
├── workflow-registry.ts         # 工作流注册表（≈ 150行）
├── execution-context.ts         # 执行上下文（≈ 120行）
├── core-types.ts               # 核心类型定义（≈ 200行）
└── index.ts                    # 导出接口
```

## 文件说明

### workflow-manager.ts

**职责**：
- 初始化所有四个功能层（执行、可观测、弹性、通信）
- 提供统一的工作流提交接口
- 管理工作流生命周期
- 提供状态查询 API
- 资源清理和生命周期管理

**关键类和方法**：
```typescript
export class WorkflowManager {
  // 初始化
  initialize(config: WorkflowManagerConfig): Promise<void>

  // 工作流提交
  submitWorkflow(workflow: WorkflowDefinition): Promise<WorkflowId>

  // 状态查询
  getWorkflowStatus(workflowId: WorkflowId): WorkflowStatus

  // 资源清理
  dispose(): Promise<void>
}
```

### workflow-registry.ts

**职责**：
- 注册工作流处理器
- 管理工作流元数据
- 版本控制
- 快速查询工作流定义

### execution-context.ts

**职责**：
- 管理当前执行环境数据
- 变量作用域管理
- 上下文继承链
- 变量生命周期

### core-types.ts

**内容**：
- WorkflowManager 接口定义
- 工作流相关的枚举和类型
- 全局配置接口

## 使用示例

```typescript
import { WorkflowManager } from './core/index.js'

// 创建管理器
const manager = new WorkflowManager(config)

// 初始化
await manager.initialize()

// 提交工作流
const workflowId = await manager.submitWorkflow({
  sessionId: 'session-1',
  intent: 'extract assets',
  domain: 'asset-management'
})

// 获取状态
const status = manager.getWorkflowStatus(workflowId)

// 清理资源
await manager.dispose()
```

## 集成点

- **输入**：OpenCode `sessionUpdatedHook` → 传入工作流定义
- **输出**：调用各个功能层的接口
- **状态存储**：通过 SessionManager 持久化

## 设计原则

1. **单一职责**：仅负责工作流协调和生命周期
2. **分层隔离**：不直接处理具体的任务执行逻辑
3. **可扩展性**：新的功能层通过标准接口集成

## 相关文档

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - 整体架构
- [API.md](../../docs/API.md) - WorkflowManager API 详解
