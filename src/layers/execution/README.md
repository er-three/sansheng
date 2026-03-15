# ExecutionLayer - 执行引擎层

## 概述

执行引擎层负责**任务调度、Recipe 解析、依赖管理和执行协调**。这是 WorkflowManager 的核心。

## 核心职责

```
用户工作流输入
      ↓
[RecipeResolver] 解析 Recipe → 任务图
      ↓
[DependencyManager] 验证依赖 → 拓扑排序
      ↓
[TaskQueue] 排队管理 → 优先级调度
      ↓
[ExecutionCoordinator] 协调执行 → 按顺序调用 Agent
      ↓
执行结果 + 错误 → 送到 ResiliencyLayer
```

## 模块详解

### recipe-resolver.ts (新增，≈ 250 行)

**用途**：解析工作流 Recipe 并生成任务图。

**关键概念**：
- **Recipe**：工作流定义，包含步骤、依赖、条件
- **Task Graph**：Recipe 解析后的任务有向无环图（DAG）
- **Variable Interpolation**：变量替换（如 `$module_name`）

**接口**：
```typescript
/**
 * 解析 Recipe，生成任务图
 * @param recipe - 工作流定义
 * @param variables - 执行时变量
 * @returns 任务列表（已排序）
 */
export function resolveRecipe(
  recipe: WorkflowRecipe,
  variables: Record<string, any>
): Task[]

/**
 * 验证 Recipe 结构是否有效
 */
export function validateRecipe(recipe: WorkflowRecipe): ValidationResult
```

**注释示例**：
```typescript
/**
 * 递归解析 Recipe 中的嵌套步骤
 *
 * 处理场景：
 *   1. 平坦的步骤列表
 *   2. 嵌套的步骤组（支持 parallel/sequential 标记）
 *   3. 条件步骤（if/else）
 *   4. 循环步骤（each/for）
 *
 * 时间复杂度：O(n)，其中 n = 步骤总数
 * 空间复杂度：O(d)，其中 d = 嵌套深度
 */
function resolveNestedSteps(steps: RecipeStep[]): Task[] {
  // 实现
}
```

---

### dependency-manager.ts (优化版，≈ 150 行)

**用途**：检测循环依赖，验证依赖关系，生成拓扑排序。

**关键功能**：
1. **循环检测**：使用 DFS 算法检测循环依赖
2. **可达性分析**：检测孤立任务（无法到达）
3. **拓扑排序**：生成任务执行顺序

**接口**：
```typescript
/**
 * 验证依赖关系的有效性
 * @returns { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateDependencies(sessionId: string): ValidationResult

/**
 * 获取拓扑排序的任务执行顺序
 * @returns 任务 ID 列表，按执行顺序
 */
export function getTopologicalOrder(sessionId: string): string[]
```

**设计说明**：
- 避免重复实现：如果 `dependency-validator.ts` 存在，在此复用
- 与 TaskQueue 配合：TaskQueue 使用拓扑排序来调度任务

---

### task-queue.ts (优化版，≈ 200 行)

**用途**：管理任务队列、优先级、调度。

**关键功能**：
1. **FIFO 队列**：基础任务排队
2. **优先级管理**：根据依赖调整优先级
3. **任务查询**：按 ID、状态查询任务
4. **持久化接口**：通过 SessionManager 持久化

**接口**：
```typescript
/**
 * 添加任务到队列
 */
export function enqueueTask(task: Task): void

/**
 * 获取下一个可执行的任务（已满足依赖）
 */
export function dequeueTask(): Task | null

/**
 * 标记任务完成
 */
export function completeTask(taskId: string, result: any): void

/**
 * 获取队列中的所有任务
 */
export function getTasks(): Task[]
```

---

### execution-coordinator.ts (新增，≈ 180 行)

**用途**：协调执行，按顺序调用 Agent，处理分支和错误。

**关键职责**：
1. **顺序执行**：按拓扑排序执行任务
2. **Agent 调用**：通过 CommunicationLayer 通知 Agent
3. **结果收集**：汇总任务返回值
4. **分支处理**：支持 if/else 条件
5. **错误委托**：失败转发到 ResiliencyLayer

**接口**：
```typescript
/**
 * 执行工作流
 * @param workflow - 工作流定义
 * @returns 执行结果
 */
export async function executeWorkflow(
  workflow: WorkflowDefinition
): Promise<ExecutionResult>

/**
 * 执行单个任务
 */
export async function executeTask(
  task: Task,
  context: ExecutionContext
): Promise<TaskResult>
```

**执行流程**：
```typescript
for (const task of topologicalOrder) {
  try {
    // 1. 准备执行上下文
    const context = prepareContext(task)

    // 2. 通知 Agent
    const result = await notifyAgent(task.agent, task)

    // 3. 记录到 ObservabilityLayer
    recordTaskCompletion(task.id, result)

    // 4. 更新执行上下文
    updateContext(context, result)

  } catch (error) {
    // 5. 委托给 ResiliencyLayer 处理
    const strategy = determineRecoveryStrategy(error)
    await executeRecovery(strategy)
  }
}
```

---

### execution-types.ts (≈ 150 行)

**内容**：
```typescript
// Task 接口
export interface Task {
  id: string
  name: string
  agent: AgentName
  dependencies: string[]      // 依赖的任务 ID
  parallel?: boolean          // 是否可与其他任务并行
  retryable?: boolean         // 是否可重试
  timeout?: number            // 超时时间（毫秒）
  input?: Record<string, any>
}

// 执行结果
export interface ExecutionResult {
  success: boolean
  output: Record<string, any>
  errors: string[]
  duration: number            // 执行时间（毫秒）
  tasks: TaskResult[]         // 各任务的执行结果
}

// TaskResult
export interface TaskResult {
  taskId: string
  status: 'completed' | 'failed' | 'skipped' | 'retried'
  output: any
  error?: string
  duration: number
  retryCount: number
}
```

---

## 关键设计决策

### 1. Recipe 到 Task 的映射

Recipe 是高级工作流定义，Task 是低级执行单位。

**示例**：
```yaml
# Recipe (高级)
steps:
  - name: analyze
    agent: huangdi
  - name: plan
    agent: zhongshu
    dependsOn: [analyze]
```

转换为：
```typescript
// Tasks (低级)
[
  { id: "1", name: "analyze", agent: "huangdi", dependencies: [] },
  { id: "2", name: "plan", agent: "zhongshu", dependencies: ["1"] }
]
```

### 2. 依赖冲突处理

如果依赖冲突：
- **循环依赖**：拒绝，返回错误
- **缺少依赖**：检查是否为外部输入
- **重复依赖**：自动去重

### 3. 并行执行限制

虽然支持 `parallel: true`，但实际执行由以下因素限制：
- Agent 的可用性（可能正在处理其他任务）
- 资源限制
- 当前未实现真正的并发（Phase 5 特性）

---

## 集成示例

```typescript
import {
  resolveRecipe,
  validateDependencies,
  executeWorkflow
} from './execution/index.js'

// 1. 验证 Recipe
const validation = validateRecipe(recipe)
if (!validation.valid) {
  throw new Error('Invalid recipe')
}

// 2. 解析为任务
const tasks = resolveRecipe(recipe, variables)

// 3. 验证依赖
const depValidation = validateDependencies(sessionId)
if (!depValidation.valid) {
  throw new Error('Circular dependencies detected')
}

// 4. 执行工作流
const result = await executeWorkflow({
  sessionId,
  recipe,
  variables
})
```

---

## 测试覆盖

- `recipe-resolver.test.ts` - Recipe 解析（20+ 测试）
- `dependency-manager.test.ts` - 依赖验证（15+ 测试）
- `task-queue.test.ts` - 队列操作（15+ 测试）
- `execution-coordinator.test.ts` - 执行协调（20+ 测试）

---

## 性能优化

1. **缓存拓扑排序结果**（Recipe 不变时）
2. **批量任务处理**（减少函数调用）
3. **异步 I/O**（不阻塞执行）
4. **内存池**（避免频繁分配）

---

## 相关文档

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - 总体架构
- [API.md](../../docs/API.md) - ExecutionLayer API
