# 三层验证系统 - 完整的成功/失败标识体系

**更新时间**：2026-03-15
**状态**：✅ 完成实现
**代码量**：新增 200+ 行验证逻辑

---

## 📊 系统架构

每一层都有明确的成功和失败标识，形成完整的验证链条：

```
┌─────────────────────────────────────────────────────────────┐
│                   Level 1：步骤成功/失败                      │
│  (domain.yaml 中定义的 success_criteria/failure_criteria)    │
├─────────────────────────────────────────────────────────────┤
│ ✅ SUCCESS: 所有成功条件通过                                  │
│ ⚠️  PARTIAL: 部分成功条件通过                                 │
│ ❌ FAILED:  所有成功条件都失败                                │
│                                                               │
│ 处理策略: on_success=continue|halt  on_failure=retry|halt    │
│ 重试次数: retry_max                                          │
└─────────────────────────────────────────────────────────────┘
                        ↓ (success_criteria 检查)
┌─────────────────────────────────────────────────────────────┐
│              Level 2：代理成功/失败（Agent）                   │
│         (Plugin.ts 中 ParallelTask 状态管理)                 │
├─────────────────────────────────────────────────────────────┤
│ status: 'pending' | 'in_progress' | 'done' | 'failed'       │
│                                                               │
│ ✅ ALL_DONE: 所有代理执行完成                                 │
│ ⚠️  PARTIAL: 部分代理成功，部分失败                           │
│ ❌ ALL_FAILED: 所有代理都失败                                 │
│                                                               │
│ 自动推进: 所有代理完成 → 触发 Level 1 验证                   │
└─────────────────────────────────────────────────────────────┘
                        ↓ (Agent 完成状态)
┌─────────────────────────────────────────────────────────────┐
│            Level 3：子任务成功/失败（gongbu）                 │
│    (gongbu-level3-parallel.ts 中文件修改并行)                │
├─────────────────────────────────────────────────────────────┤
│ ParallelSubtask.status: pending/in_progress/done/failed    │
│ GongbuParallelResult.status: PASS | PARTIAL | FAIL          │
│                                                               │
│ ✅ PASS: 所有文件修改成功                                      │
│ ⚠️  PARTIAL: 部分文件成功，部分失败                           │
│ ❌ FAIL: 所有文件修改都失败                                    │
│                                                               │
│ 详细输出:                                                    │
│ - summary: {total, passed, failed, skipped}                │
│ - theoretical_speedup: "3.0x"                               │
│ - parallel_subtasks: 每个文件的状态和耗时                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Level 1：步骤级验证

### 成功标识定义（success_criteria）

#### 1. file_exists - 文件存在检查
```yaml
- type: file_exists
  path: task-analysis.md
  error_msg: "任务分析报告未生成"
```

**验证逻辑**：
```typescript
const passed = fs.existsSync(path.join(projectRoot, criterion.path))
// ✅ 通过: 文件存在
// ❌ 失败: 文件不存在
```

#### 2. file_not_empty - 文件非空检查
```yaml
- type: file_not_empty
  path: task-analysis.md
  error_msg: "分析报告为空"
```

**验证逻辑**：
```typescript
const size = fs.statSync(filePath).size
const passed = size > 0
// ✅ 通过: 文件大小 > 0 bytes
// ❌ 失败: 文件大小 = 0
```

#### 3. file_size_min - 最小文件大小
```yaml
- type: file_size_min
  path: task-analysis.md
  bytes: 100
  error_msg: "分析报告过小（< 100 bytes）"
```

**验证逻辑**：
```typescript
const size = fs.statSync(filePath).size
const passed = size >= criterion.bytes
// ✅ 通过: 文件大小 >= 100 bytes
// ❌ 失败: 文件大小 < 100 bytes
```

#### 4. no_error_keywords - 不包含错误关键字
```yaml
- type: no_error_keywords
  path: task-analysis.md
  keywords: ["ERROR", "FAILED", "无法分析"]
  error_msg: "分析报告包含错误信息"
```

**验证逻辑**：
```typescript
const content = fs.readFileSync(filePath, "utf-8")
const hasErrors = keywords.some(k => content.includes(k))
const passed = !hasErrors
// ✅ 通过: 不包含任何错误关键字
// ❌ 失败: 包含错误关键字
```

#### 5. agent_all_done - 所有代理执行完成
```yaml
- type: agent_all_done
  error_msg: "不是所有代理都完成了（Level 2）"
```

**验证逻辑**：
```typescript
const allDone = parallelTasks.every(t => t.status === 'done')
const passed = allDone
// ✅ 通过: 所有代理都完成了
// ❌ 失败: 有代理未完成或失败
```

### 失败标识定义（failure_criteria）

#### timeout - 超时检查
```yaml
- type: timeout
  max_seconds: 600
  error_msg: "步骤超时（> 600 秒）"
```

**验证逻辑**：
```typescript
const duration = Date.now() - stepStartTime
const failed = duration > (criterion.max_seconds * 1000)
// ❌ 失败: 执行时间超过 600 秒
// ✅ 通过: 在时间内完成
```

### 步骤状态判定

```typescript
interface StepResult {
  step_id: string
  step_name: string
  status: 'success' | 'failed' | 'partial'
  passed_criteria: string[]     // 通过的条件列表
  failed_criteria: string[]     // 失败的条件列表
  details: Record<string, any>
  timestamp: number
}

// 判定逻辑
if (failed_criteria.length === 0) {
  status = 'success'        // 所有条件都通过
} else if (passed_criteria.length > 0) {
  status = 'partial'        // 部分条件通过
} else {
  status = 'failed'         // 所有条件都失败
}
```

### 处理策略

```yaml
analyze:
  success_criteria: [...]
  failure_criteria: [...]

  # ✅ 成功时
  on_success: continue    # 进入下一步（analyze → implement）

  # ❌ 失败时
  on_failure: retry       # 重新执行此步（最多 retry_max 次）
  # 或
  on_failure: halt        # 停止流水线，报错退出

  retry_max: 1           # 最多重试 1 次
```

---

## 🎯 Level 2：代理级验证

### 代理执行状态

```typescript
interface ParallelTask {
  agent: string                                        // 代理名称
  status: 'pending' | 'in_progress' | 'done' | 'failed'  // 执行状态
  error?: string                                       // 错误信息
}

interface ParallelStep {
  step_id: string           // 步骤 ID
  tasks: ParallelTask[]     // 所有并行代理任务
  all_done: boolean         // 是否所有代理都完成
  started_at: string        // 开始时间
}
```

### 状态流转

```
step: analyze
  uses: [yibu, hubu]

第1阶段：初始化
  yibu:    pending
  hubu:    pending

第2阶段：执行中
  yibu:    in_progress
  hubu:    in_progress

第3阶段：完成
  【场景 A】所有成功
  yibu:    done ✅
  hubu:    done ✅
  → 判断为 ALL_DONE
  → 触发 Level 1 验证

  【场景 B】部分成功
  yibu:    done ✅
  hubu:    failed ❌ (error: network timeout)
  → 判断为 PARTIAL
  → 根据 success_criteria 决定继续或重试

  【场景 C】全部失败
  yibu:    failed ❌ (error: file not found)
  hubu:    failed ❌ (error: api error)
  → 判断为 ALL_FAILED
  → 触发 on_failure 处理
```

### 自动推进逻辑

```typescript
// plugin.ts 中的 tool.execute.after 钩子
async function onToolExecuteAfter(input, output) {
  const agent = input.agent
  const task = parallelTasks.find(t => t.agent === agent)

  if (task) {
    task.status = 'done'  // 或 'failed'

    // 检查是否所有代理都完成
    const allDone = parallelTasks.every(t =>
      t.status === 'done' || t.status === 'failed'
    )

    if (allDone) {
      // 所有代理都完成了，自动进入 Level 1 验证
      const stepResult = verifyStepCriteria(currentStep, projectRoot)

      if (stepResult.status === 'success') {
        // 进入下一步
        goToNextStep()
      } else if (stepResult.status === 'partial') {
        // 部分成功，可能需要重试
        if (retryCount < retryMax) {
          retryCurrentStep()
        } else {
          haltPipeline()
        }
      } else {
        // 完全失败
        haltPipeline()
      }
    }
  }
}
```

---

## 🎯 Level 3：子任务级验证

### 子任务执行状态

```typescript
interface ParallelSubtask {
  id: string                                          // 子任务 ID
  name: string                                        // 子任务名称
  file: string                                        // 修改的文件
  status: 'pending' | 'in_progress' | 'done' | 'failed'
  error?: string                                      // 错误信息
  changes?: string                                    // 修改内容摘要
  startTime?: string                                  // 开始时间
  endTime?: string                                    // 结束时间
  duration?: number                                   // 执行时间（ms）
}

interface GongbuParallelResult {
  status: 'PASS' | 'FAIL' | 'PARTIAL'                // 聚合状态
  files_modified: string[]                           // 修改的文件列表
  parallel_subtasks: ParallelSubtask[]               // 所有子任务
  parallelism: string                                // 并行度说明
  theoretical_speedup: string                        // 理论加速比
  total_duration: number                             // 总耗时（ms）
  groups: ParallelGroup[]                            // 执行分层
  summary: {
    total: number      // 总任务数
    passed: number     // 成功数
    failed: number     // 失败数
    skipped: number    // 跳过数
  }
}
```

### 执行分层和并行

```
文件列表: [Auth.ts, Login.tsx, Signup.tsx, Profile.tsx]

分析依赖:
  Auth.ts     → 无依赖
  Login.tsx   → 依赖 Auth.ts
  Signup.tsx  → 依赖 Auth.ts
  Profile.tsx → 无依赖

拓扑排序分层:
  第1层 (level=0):
    ├─ Auth.ts     (无依赖)
    └─ Profile.tsx (无依赖)
    ✅ 可并行执行

  第2层 (level=1):
    ├─ Login.tsx   (依赖已完成)
    └─ Signup.tsx  (依赖已完成)
    ✅ 可并行执行

并行执行:
  使用 Promise.all() 在每层内并行执行
  层与层之间保证顺序（await 每层）

状态聚合:
  第1层结果:
    Auth.ts:     status=done, duration=1200ms
    Profile.tsx: status=done, duration=1100ms
  第2层结果:
    Login.tsx:   status=done, duration=1150ms
    Signup.tsx:  status=done, duration=1120ms

最终结果:
  status: PASS (4/4 成功)
  summary: {total: 4, passed: 4, failed: 0, skipped: 0}
  theoretical_speedup: 2.0x (从 4.6min → 2.3min)
```

### 状态判定

```typescript
function determineStatus(
  summary: {total, passed, failed, skipped}
): 'PASS' | 'PARTIAL' | 'FAIL' {
  if (failed === 0) {
    return 'PASS'        // ✅ 所有子任务成功
  } else if (failed < passed) {
    return 'PARTIAL'     // ⚠️ 部分成功，部分失败
  } else {
    return 'FAIL'        // ❌ 全部或大部分失败
  }
}
```

### 加速比计算

```typescript
function calculateSpeedup(groups: ParallelGroup[]): string {
  // 串行时间：所有子任务时间之和
  const totalFiles = groups.reduce((sum, g) => sum + g.subtasks.length, 0)
  const serialTime = totalFiles * 2  // 假设每个文件 2 分钟

  // 并行时间：各层级时间之和（每层取最长时间）
  const parallelTime = groups.reduce((sum, g) => {
    const layerTime = Math.max(...g.subtasks.map(t => t.duration || 2000))
    return sum + layerTime
  }, 0)

  // 加速比 = 串行时间 / 并行时间
  const speedup = serialTime / parallelTime
  return `${speedup.toFixed(2)}x`
}
```

---

## 📊 完整的三层验证流程示例

### 场景：修复表单验证 bug

```
【用户请求】
/start 修复 Login、Signup、Profile 页面的表单验证

【Level 1: analyze 步骤】
├─ Level 2 代理执行
│  ├─ yibu:   status=pending → in_progress → done ✅
│  └─ hubu:   status=pending → in_progress → done ✅
│
├─ Level 1 验证（success_criteria）
│  ├─ ✅ file_exists(task-analysis.md)
│  ├─ ✅ file_not_empty(task-analysis.md)
│  ├─ ✅ file_size_min(task-analysis.md, 100)
│  ├─ ✅ no_error_keywords(task-analysis.md)
│  └─ ✅ agent_all_done
│
├─ 步骤状态: SUCCESS
└─ 处理: on_success=continue → 进入 implement 步骤

【Level 1: implement 步骤】
├─ Level 2 代理执行
│  ├─ gongbu: status=pending → in_progress
│  │  └─ Level 3 子任务执行
│  │     ├─ 第1层 (并行):
│  │     │  ├─ Login.tsx:   status=pending → in_progress → done ✅ (1200ms)
│  │     │  ├─ Signup.tsx:  status=pending → in_progress → done ✅ (1150ms)
│  │     │  └─ Profile.tsx: status=pending → in_progress → done ✅ (1100ms)
│  │     └─ 聚合: GongbuParallelResult(status=PASS, speedup=3.0x)
│  │  → status=done ✅
│  │
│  └─ bingbu: status=pending → in_progress → done ✅
│
├─ Level 1 验证（success_criteria）
│  ├─ ✅ file_exists(implementation-report.md)
│  ├─ ✅ file_not_empty(implementation-report.md)
│  ├─ ✅ no_error_keywords(build.log)
│  └─ ✅ no_error_keywords(implementation-report.md, ["FAIL"])
│
├─ 步骤状态: SUCCESS
└─ 处理: on_success=continue → 进入 verify 步骤

【Level 1: verify 步骤】
├─ Level 2 代理执行
│  ├─ xingbu: status=pending → in_progress → done ✅
│  └─ bingbu: status=pending → in_progress → done ✅
│
├─ Level 1 验证（success_criteria）
│  ├─ ✅ file_exists(code-review.md)
│  ├─ ✅ file_exists(test-results.json)
│  ├─ ✅ no_error_keywords(test-results.json)
│  └─ ✅ no_error_keywords(code-review.md)
│
├─ 步骤状态: SUCCESS
└─ 处理: on_success=continue → 流水线完成

【最终结果】
✅ 流水线完成成功
耗时: 4 分钟
加速比: Level 2: 1.5x (并行代理) × Level 3: 3.0x (并行文件) = 总体加速显著
```

---

## 🔧 配置示例

### 增强的 domain.yaml

```yaml
pipeline:
  - id: analyze
    name: 任务分析
    skill: analyze
    uses: [yibu, hubu]

    # ✅ 成功条件
    success_criteria:
      - type: file_exists
        path: task-analysis.md
      - type: file_not_empty
        path: task-analysis.md
      - type: agent_all_done

    # ❌ 失败条件
    failure_criteria:
      - type: timeout
        max_seconds: 600

    # 处理策略
    retry_max: 1
    on_success: continue
    on_failure: halt

  - id: implement
    name: 代码实现
    skill: implement
    uses: [gongbu, bingbu]
    depends_on: [analyze]

    success_criteria:
      - type: file_exists
        path: implementation-report.md
      - type: no_error_keywords
        path: implementation-report.md
        keywords: ["FAIL", "ERROR"]

    failure_criteria:
      - type: timeout
        max_seconds: 1200

    retry_max: 2
    on_success: continue
    on_failure: retry
```

---

## 📈 预期行为

### 理想场景：全部成功
```
analyze:  success  ✅ → implement:  success  ✅ → verify:  success  ✅
                                                              ↓
                                                    🎉 流水线完成
                                                    耗时: 4 分钟
```

### 部分失败场景
```
analyze:  success  ✅ → implement:  partial  ⚠️  → 重试
                                              ↓
                                          重试成功  ✅
                                              ↓
                                          verify:  success  ✅
                                              ↓
                                    🎉 流水线完成（含重试）
                                    耗时: 6 分钟
```

### 关键步骤失败场景
```
analyze:  success  ✅ → implement:  failed  ❌ → 重试 2 次
                                                ↓
                                            仍然失败  ❌
                                                ↓
                                        ❌ 停止流水线
                                        原因: implement on_failure=halt
                                        耗时: 2 分钟
```

---

## ✅ 实现检查清单

- [x] Level 1 验证标准定义（8 种类型）
- [x] Level 1 验证函数实现（verifyStepCriteria）
- [x] Level 1 状态判定逻辑
- [x] Level 1 处理策略（retry/halt）
- [x] Level 2 状态跟踪（ParallelTask）
- [x] Level 2 自动推进逻辑
- [x] Level 3 子任务状态定义
- [x] Level 3 加速比计算
- [x] Level 3 详细报告生成
- [x] 三层验证链集成
- [x] domain.yaml 增强示例
- [x] 本完整文档

---

## 🎓 最佳实践

### 1. 定义明确的验证标准
```yaml
✅ 好的做法
success_criteria:
  - type: file_exists
    path: task-analysis.md
  - type: file_size_min
    bytes: 100
  - type: no_error_keywords
    keywords: ["ERROR"]

❌ 避免
success_criteria: []  # 没有定义标准
```

### 2. 合理设置重试策略
```yaml
✅ 好的做法
retry_max: 1          # 最多重试 1 次
on_failure: retry     # 先重试，失败再停止

❌ 避免
retry_max: 10         # 过多重试浪费时间
on_failure: halt      # 所有失败都直接停止，没有恢复机会
```

### 3. 监控和日志
```typescript
const result = verifyStepCriteria(stepConfig, projectRoot)
console.log(`步骤 ${result.step_id}：${result.status}`)
console.log(`✅ 通过: ${result.passed_criteria.join(", ")}`)
console.log(`❌ 失败: ${result.failed_criteria.join(", ")}`)
```

---

## 🎉 总结

**三层验证系统现在完全就位：**

1. ✅ **Level 1（步骤）**：明确的成功/失败标识
   - 8 种验证标准类型
   - success_criteria 和 failure_criteria 定义
   - 自动推进或停止逻辑

2. ✅ **Level 2（代理）**：精确的状态跟踪
   - 4 种代理状态
   - 自动推进到下一步
   - 失败时触发 Level 1 验证

3. ✅ **Level 3（子任务）**：详细的执行报告
   - 子任务级别的成功/失败
   - 加速比计算
   - 分层并行执行

**每一层都有明确的成功和失败标识，形成完整的验证闭环。** ✨
