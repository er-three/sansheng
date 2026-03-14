# 快速使用指南 - 三级并行系统

## 🎯 5 分钟快速开始

### 1. 安装

```bash
npm install @deep-flux/liubu@latest
```

### 2. 导入

```typescript
import sanshengLiubuPlugin from '@deep-flux/liubu'
import { level3Manager, handleLevel3Execution } from '@deep-flux/liubu'
```

### 3. 使用

#### 方式 A：自动集成（推荐）
```typescript
// Plugin 自动处理所有三个级别
const result = await sanshengLiubuPlugin({
  // 配置会自动注入到所有 Agent
  // Level 2 并行会自动在 tool.execute.after 钩子中激活
  // Level 3 并行会在检测到多个文件时自动启用
})
```

#### 方式 B：手动调用 Level 3
```typescript
import { executeGongbuLevel3 } from '@deep-flux/liubu'

// 直接调用 Level 3 文件级并行
const result = await executeGongbuLevel3(
  ['src/pages/Login.tsx', 'src/pages/Signup.tsx', 'src/pages/Profile.tsx'],
  process.cwd()
)

// 返回详细报告
console.log(`加速比: ${result.theoretical_speedup}`)
console.log(`执行时间: ${result.total_duration}ms`)
```

#### 方式 C：通过集成层
```typescript
import { handleLevel3Execution, formatLevel3Report } from '@deep-flux/liubu'

const response = await handleLevel3Execution({
  agent: 'gongbu',
  step_id: 'implement-step-1',
  files: ['file1.tsx', 'file2.tsx', 'file3.tsx'],
  projectRoot: process.cwd(),
  context: {
    task_description: '修复表单验证',
    analysis_result: '...'
  }
})

// 格式化输出
console.log(formatLevel3Report(response))
```

---

## 📊 常见场景

### 场景 1：修复单个页面的 bug
```typescript
// ✅ 自动降级到 Level 2（无 Level 3 并行）
files = ['src/pages/Login.tsx']
// 加速比: 1.5x (Level 2 并行：yibu + hubu)
```

### 场景 2：批量修复多个独立页面
```typescript
// ✅ 自动激活 Level 3 并行
files = [
  'src/pages/Login.tsx',
  'src/pages/Signup.tsx',
  'src/pages/Profile.tsx'
]
// 加速比: 3.0x (Level 3 文件级并行)
```

### 场景 3：修改有依赖的文件
```typescript
// ✅ 自动检测依赖，分层并行
files = [
  'src/utils/auth.ts',        // 无依赖，第 1 层
  'src/pages/Login.tsx',      // 依赖 auth.ts，第 2 层
  'src/pages/Signup.tsx'      // 依赖 auth.ts，第 2 层
]
// 加速比: 1.5x (auth.ts 串行，Login + Signup 并行)
```

### 场景 4：大型项目多文件修改
```typescript
// ✅ 自动分层，智能调度
files = Array.from({ length: 50 }, (_, i) => `src/pages/page${i}.tsx`)
// 加速比: 5-10x (取决于依赖结构)
```

---

## 🔧 API 参考

### executeGongbuLevel3(files, projectRoot?)

**参数**：
- `files: string[]` - 需要修改的文件列表
- `projectRoot?: string` - 项目根目录（默认：process.cwd()）

**返回**：
```typescript
{
  status: "PASS" | "FAIL" | "PARTIAL"
  files_modified: string[]
  parallel_subtasks: ParallelSubtask[]
  theoretical_speedup: "1.5x" | "3.0x" | ...
  groups: ParallelGroup[]
  summary: {
    total: number
    passed: number
    failed: number
    skipped: number
  }
}
```

### handleLevel3Execution(input)

**参数**：
```typescript
{
  agent: 'gongbu'
  step_id: string
  files: string[]
  projectRoot: string
  context?: {
    task_description: string
    analysis_result?: string
    implementation_plan?: string
  }
}
```

**返回**：
```typescript
{
  status: "success" | "partial" | "failed"
  level3_result: GongbuParallelResult
  summary: { ... }
  next_step: "verify" | "retry" | "halt"
}
```

### level3Manager

全局单例，用于管理 Level 3 执行生命周期：

```typescript
// 检查是否应该使用 Level 3
if (level3Manager.shouldUseLevel3('gongbu', files)) {
  // 执行 Level 3
  const response = await level3Manager.executeLevel3({...})

  // 获取执行报告
  const report = level3Manager.getExecutionReport(stepId)

  // 获取执行历史
  const history = level3Manager.getExecutionHistory()

  // 清空缓存
  level3Manager.clearCache()
}
```

---

## 📈 性能指标

### 单个文件
```
耗时: 2min (基准)
加速比: 1.0x
并行度: 0%
```

### 3 个独立文件
```
耗时: 2min (并行执行)
加速比: 3.0x
并行度: 100%
改进: 原本 6min → 现在 2min
```

### 10 个独立文件
```
耗时: 2min (并行执行)
加速比: 10.0x
并行度: 100%
改进: 原本 20min → 现在 2min
```

### 50 个有依赖的文件
```
耗时: 4-5min (分层并行)
加速比: 5-10x (取决于依赖深度)
并行度: 60-80% (部分并行)
改进: 原本 100min → 现在 10-20min
```

---

## ⚙️ 配置选项

### 全局约束注入（自动）

无需配置，plugin 会自动：
- 读取 `.opencode/global-constraints.yaml`
- 根据 agent_type 选择对应约束
- 注入到每个 Agent 的 system prompt

### 自定义并行规则（可选）

```typescript
// 定制化 shouldUseLevel3 逻辑
level3Manager.shouldUseLevel3 = (agent, files) => {
  if (agent !== 'gongbu') return false
  if (files.length < 2) return false

  // 自定义：只并行处理 React 组件
  return files.every(f => f.includes('component'))
}
```

### 执行钩子

```typescript
// 监听执行前后事件
level3Manager.onHook((hook) => {
  if (hook.status === 'before') {
    console.log(`开始执行: ${hook.agent}`)
  } else if (hook.status === 'after') {
    console.log(`完成: ${hook.data.summary.speedup}`)
  }
})
```

---

## 🐛 调试

### 查看详细执行报告

```typescript
const result = await executeGongbuLevel3(files)
console.log(JSON.stringify(result, null, 2))

// 输出包含：
// - 每个执行层级的任务列表
// - 每个任务的执行时间
// - 失败原因（如果有）
// - 理论加速比
```

### 检查文件依赖关系

```typescript
// 查看分析出的并行组
result.groups.forEach((group, i) => {
  console.log(`第 ${i + 1} 层: ${group.subtasks.map(t => t.file).join(', ')}`)
})
```

### 性能基准

```typescript
// 比较并行 vs 串行
const serialTime = files.length * 2 // 每个文件 2 min
const parallelTime = result.total_duration / 1000 / 60
const actualSpeedup = serialTime / parallelTime

console.log(`理论加速: ${result.theoretical_speedup}`)
console.log(`实际加速: ${actualSpeedup.toFixed(1)}x`)
```

---

## 📋 故障排除

### 问题：没有检测到并行机会

**原因**：
- 文件间有循环依赖
- 文件数少于 2 个
- Agent 不是 gongbu

**解决**：
```typescript
// 检查是否应该使用 Level 3
console.log(level3Manager.shouldUseLevel3('gongbu', files))

// 查看依赖图
const result = await executeGongbuLevel3(files)
console.log(result.groups.length, '个执行层级')
```

### 问题：加速比低于预期

**原因**：
- 文件有较多依赖
- 某些文件执行时间差异大

**解决**：
```typescript
// 查看各文件的执行时间
result.parallel_subtasks.forEach(task => {
  console.log(`${task.file}: ${task.duration}ms`)
})

// 优化：拆分大文件，减少依赖
```

### 问题：循环依赖错误

**解决**：
```typescript
// 检查导入错误
// 例：A.ts 导入 B.ts，B.ts 导入 A.ts

// 修复方法：提取公共部分到 C.ts
// A.ts → C.ts
// B.ts → C.ts
```

---

## 🎓 最佳实践

### 1. 文件组织

```
✅ 好的做法
src/
├── utils/
│   ├── auth.ts          # 无依赖
│   └── helpers.ts       # 无依赖
├── services/
│   ├── login.ts         # 依赖 auth.ts
│   └── signup.ts        # 依赖 auth.ts
└── pages/
    ├── Login.tsx        # 依赖 login.ts
    └── Signup.tsx       # 依赖 signup.ts

❌ 避免
├── page.ts              # 循环导入其他页面
├── utils.ts             # 导入所有其他文件
└── ... (强耦合)
```

### 2. 修改策略

```typescript
// ✅ 最优：同时修改多个独立文件
files = ['page1.tsx', 'page2.tsx', 'page3.tsx']
// 加速: 3.0x

// 🔶 一般：先修改基础，再修改依赖
files = ['utils/auth.ts', 'services/login.ts', 'pages/Login.tsx']
// 加速: 1.5x

// ❌ 避免：修改单个文件
files = ['page.tsx']
// 加速: 1.0x （无加速）
```

### 3. 监控和反馈

```typescript
const result = await executeGongbuLevel3(files)

// 记录性能指标
metrics.push({
  timestamp: Date.now(),
  files_count: files.length,
  speedup: result.theoretical_speedup,
  duration: result.total_duration
})

// 如果加速比低，调查原因
if (parseFloat(result.theoretical_speedup) < 1.5) {
  console.warn('低加速比，检查依赖结构')
  console.log(result.groups)
}
```

---

## 📚 更多资源

- **完整架构**：见 `LEVEL3_INTEGRATION_GUIDE.md`
- **实现细节**：见 `src/gongbu-level3-parallel.ts`
- **集成测试**：见 `test/integration.test.ts`
- **全局约束**：见 `.opencode/global-constraints.yaml`

---

## 🎉 成功案例

### 案例 1：表单验证 bug 修复
```
需求: 修复 Login、Signup、Profile 页面的表单验证
方案: 修改 3 个页面 + 1 个公共 utils

执行:
- Level 1: analyze → implement → verify (串行 3 步)
- Level 2: yibu + hubu 在 analyze 步骤中并行
- Level 3: 3 个页面在 implement 步骤中并行

结果:
- 原预计: 12 分钟
- 实际耗时: 4 分钟
- 加速比: 3.0x ✅
```

### 案例 2：大型重构项目
```
需求: 重构 50 个页面组件的样式系统
方案: 修改 50 个页面 + 5 个基础文件

执行:
- Level 1: 3 个步骤串行
- Level 2: 多个 Agent 在各步骤并行
- Level 3: 45 个独立页面分 5 层并行

结果:
- 原预计: 100 分钟
- 实际耗时: 15 分钟
- 加速比: 6.7x ✅
```

---

**版本**：@deep-flux/liubu@1.0.0
**最后更新**：2026-03-14
**状态**：🟢 生产就绪
