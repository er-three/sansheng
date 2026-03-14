# 三层验证系统 - 快速指南

**完成时间**：2026-03-15
**状态**：✅ 完全实现
**应用场景**：所有流水线和工作流

---

## 🎯 5 分钟快速理解

### 之前（❌ 无验证标识）
```
步骤执行完成 → "完成" → 进入下一步
（不知道是否真的成功了）
```

### 现在（✅ 三层明确标识）
```
Level 1: 步骤成功/失败
  ↓ 基于 success_criteria 检查
  ├─ ✅ SUCCESS：所有验证通过
  ├─ ⚠️  PARTIAL：部分验证通过
  └─ ❌ FAILED：所有验证失败

Level 2: 代理成功/失败
  ↓ 基于 Agent 执行状态
  ├─ ✅ ALL_DONE：所有代理完成
  ├─ ⚠️  PARTIAL：部分代理成功
  └─ ❌ ALL_FAILED：所有代理失败

Level 3: 子任务成功/失败
  ↓ 基于文件修改状态
  ├─ ✅ PASS：所有文件成功
  ├─ ⚠️  PARTIAL：部分文件成功
  └─ ❌ FAIL：所有文件失败
```

---

## 📋 三层验证对照表

| 层级 | 内容 | 成功标识 | 失败标识 | 定义位置 |
|------|------|---------|---------|---------|
| **Level 1** | 步骤验证 | SUCCESS | FAILED | `domain.yaml` |
| **Level 2** | 代理执行 | ALL_DONE | ALL_FAILED | `plugin.ts` 自动 |
| **Level 3** | 文件修改 | PASS | FAIL | `gongbu-level3-parallel.ts` |

---

## 🔍 Level 1：步骤验证

### 定义方式

在 `domain.yaml` 中：

```yaml
pipeline:
  - id: analyze
    name: 任务分析
    uses: [yibu, hubu]

    # ✅ 什么时候算成功
    success_criteria:
      - type: file_exists
        path: task-analysis.md
      - type: file_not_empty
        path: task-analysis.md

    # ❌ 什么时候算失败
    failure_criteria:
      - type: timeout
        max_seconds: 600

    # 失败时怎么办
    on_failure: retry        # 重试
    retry_max: 1
```

### 8 种验证标准

```
1️⃣ file_exists
   ✅ 验证：文件存在

2️⃣ file_not_empty
   ✅ 验证：文件非空（size > 0）

3️⃣ file_size_min
   ✅ 验证：文件大小 >= N bytes

4️⃣ no_error_keywords
   ✅ 验证：文件不包含错误关键字（ERROR、FAILED 等）

5️⃣ agent_all_done
   ✅ 验证：所有 Level 2 代理完成

6️⃣ timeout
   ❌ 验证：执行时间 < max_seconds

7️⃣ custom（预留）
   ✅ 验证：自定义逻辑

8️⃣ build_success（预留）
   ✅ 验证：编译成功
```

### 判定方式

```typescript
// 伪代码
passedCount = 满足条件的个数
failedCount = 不满足条件的个数

if (failedCount === 0) {
  status = SUCCESS        // 所有条件都通过
} else if (passedCount > 0) {
  status = PARTIAL        // 部分通过
} else {
  status = FAILED         // 全部不通过
}
```

---

## 🔍 Level 2：代理验证

### 自动工作原理

```typescript
// plugin.ts 自动执行

step: analyze
  uses: [yibu, hubu]

执行流程：
  1. yibu 开始执行  → status: in_progress
  2. hubu 开始执行  → status: in_progress

  3. yibu 执行完   → status: done    ✅
  4. hubu 执行完   → status: done    ✅

  5. Plugin 检测到：所有代理都完成了
  6. 自动触发 Level 1 验证
```

### 四种状态

```
pending      → 等待执行
             ↓
in_progress  → 执行中
             ↓
done ✅      → 执行成功
failed ❌    → 执行失败
```

### 自动推进

```
ALL_DONE (所有代理成功)
  ↓
触发 Level 1 验证
  ↓
└─ SUCCESS → 进入下一步
└─ PARTIAL → 决定重试或停止
└─ FAILED → 根据 on_failure 策略
```

---

## 🔍 Level 3：子任务验证

### 自动工作原理

```typescript
// gongbu-level3-parallel.ts 自动执行

files: [Login.tsx, Signup.tsx, Profile.tsx]

执行流程：
  1. 分析依赖关系：三个文件独立 ✅
  2. 拓扑排序：全部在第1层 ✅
  3. 使用 Promise.all() 并行修改
  4. 跟踪每个文件的状态

  结果：
    Login.tsx:   done ✅ (1200ms)
    Signup.tsx:  done ✅ (1150ms)
    Profile.tsx: done ✅ (1100ms)

  聚合状态：PASS (3/3 成功)
  加速比：3.0x (从 6min → 2min)
```

### 三种聚合状态

```
PASS       ✅ 所有文件都成功
PARTIAL    ⚠️  部分成功，部分失败
FAIL       ❌ 全部或大部分失败
```

### 详细报告

```typescript
GongbuParallelResult {
  status: "PASS"                          // 聚合状态
  files_modified: [Login.tsx, ...]        // 修改的文件
  parallel_subtasks: [
    {
      id: "task-0-0"
      file: "Login.tsx"
      status: "done"
      duration: 1200  // ms
      changes: "✅ 已修改 Login.tsx"
    },
    ...
  ]
  theoretical_speedup: "3.0x"             // 加速比
  summary: {
    total: 3                              // 总数
    passed: 3                             // 成功数
    failed: 0                             // 失败数
    skipped: 0                            // 跳过数
  }
}
```

---

## 🎯 三层完整链接示例

### 场景：修复表单验证

```
【Level 1: analyze】
success_criteria:
  - file_exists: task-analysis.md
  - file_not_empty: task-analysis.md
  - agent_all_done ← 检查 Level 2

  ↓ Level 2 执行
  yibu:  done ✅
  hubu:  done ✅

  ↓ 所有 success_criteria 通过
  Status: SUCCESS ✅
  处理: on_success=continue

【Level 1: implement】
success_criteria:
  - file_exists: implementation-report.md
  - no_error_keywords: implementation-report.md

  ↓ Level 2 执行
  gongbu:
    ↓ Level 3 执行
    Login.tsx:   done ✅ (1200ms)
    Signup.tsx:  done ✅ (1150ms)
    Profile.tsx: done ✅ (1100ms)
    Status: PASS ✅ (加速比 3.0x) ← 返回给 Level 1
  → status: done ✅

  bingbu: done ✅

  ↓ 所有 success_criteria 通过
  Status: SUCCESS ✅
  处理: on_success=continue

【Level 1: verify】
success_criteria:
  - file_exists: code-review.md
  - file_exists: test-results.json
  - no_error_keywords: test-results.json

  ↓ Level 2 执行
  xingbu: done ✅
  bingbu: done ✅

  ↓ 所有 success_criteria 通过
  Status: SUCCESS ✅

【最终结果】
✅ 流水线完成
耗时: 4 分钟（vs 12 分钟无并行）
加速比：Level 2: 1.5x × Level 3: 3.0x = 综合显著
```

---

## 💻 使用方式

### 方式 1：编写 domain.yaml（推荐）

```yaml
name: general
pipeline:
  - id: analyze
    name: 任务分析
    uses: [yibu, hubu]

    success_criteria:
      - type: file_exists
        path: task-analysis.md
      - type: file_not_empty
        path: task-analysis.md
      - type: agent_all_done

    failure_criteria:
      - type: timeout
        max_seconds: 600

    retry_max: 1
    on_success: continue
    on_failure: halt
```

### 方式 2：读取现成的示例

```bash
# 查看完整的 domain.yaml 示例
cat .opencode/domains/general/domain-with-verification.yaml

# 查看完整的验证系统文档
cat THREE_LEVEL_VERIFICATION_SYSTEM.md
```

### 方式 3：程序级别的验证

```typescript
import { verifyStepCriteria } from '@deep-flux/liubu'

const stepConfig = {
  id: 'analyze',
  success_criteria: [
    { type: 'file_exists', path: 'task-analysis.md' },
    { type: 'file_not_empty', path: 'task-analysis.md' }
  ]
}

const result = verifyStepCriteria(stepConfig, projectRoot)

console.log(result.status)              // 'success' | 'failed' | 'partial'
console.log(result.passed_criteria)     // ['✅ 文件存在: ...', '✅ 文件非空: ...']
console.log(result.failed_criteria)     // []
```

---

## 📊 常见场景

### 场景 1：简单的存在检查
```yaml
success_criteria:
  - type: file_exists
    path: output.md
```

### 场景 2：编译验证
```yaml
success_criteria:
  - type: no_error_keywords
    path: build.log
    keywords: ["error", "failed"]
  - type: file_exists
    path: dist/
```

### 场景 3：测试通过
```yaml
success_criteria:
  - type: file_exists
    path: test-results.json
  - type: no_error_keywords
    path: test-results.json
    keywords: ["FAIL", "ERROR"]
```

### 场景 4：多个条件（全部必须通过）
```yaml
success_criteria:
  - type: file_exists
    path: analysis.md
  - type: file_size_min
    path: analysis.md
    bytes: 500
  - type: no_error_keywords
    path: analysis.md
    keywords: ["ERROR", "无法完成"]
  - type: agent_all_done

# 所有条件都通过 → SUCCESS
# 部分条件通过 → PARTIAL
# 无条件通过 → FAILED
```

---

## ⚠️ 故障排除

### 问题：步骤状态一直是 PARTIAL

**原因**：有些验证标准未通过

**解决**：
```bash
# 查看详细的验证结果
console.log(result.passed_criteria)   // 哪些通过了
console.log(result.failed_criteria)   // 哪些失败了
console.log(result.details)           // 详细的失败原因
```

### 问题：流水线卡在某个步骤

**原因**：
1. 等待重试（retry_max 还未用完）
2. 超时（timeout 触发了）
3. 有异常（exception 被捕获了）

**解决**：
```yaml
# 查看当前步骤配置
retry_max: 2              # 检查重试次数
on_failure: retry         # 检查失败处理策略
failure_criteria: [...]   # 检查是否触发了失败条件
```

### 问题：Level 3 子任务失败

**原因**：
1. 文件有循环依赖
2. 文件权限问题
3. 内容冲突

**解决**：
```
查看 implementation-report.md 中的:
- parallel_subtasks 状态
- 每个文件的 error 信息
- 是否有 FAIL 标记
```

---

## 📚 更多资源

- **完整文档**：`THREE_LEVEL_VERIFICATION_SYSTEM.md`
- **示例配置**：`.opencode/domains/general/domain-with-verification.yaml`
- **代码实现**：`src/plugin.ts` 中的 `verifyStepCriteria` 函数
- **三级并行指南**：`LEVEL3_INTEGRATION_GUIDE.md`

---

## ✅ 检查清单

- [x] 每个步骤都有成功标识（success_criteria）
- [x] 每个步骤都有失败标识（failure_criteria）
- [x] Level 2 代理状态自动跟踪
- [x] Level 3 子任务状态自动聚合
- [x] 三层验证完全集成
- [x] 文档完整详细
- [x] 示例配置可用

---

## 🎉 现状

**三层验证系统现已完全就位！**

从此，流水线的每一步都有明确的：
- ✅ 成功标识（success_criteria）
- ❌ 失败标识（failure_criteria）
- ⚠️  处理策略（retry/halt）
- 📊 详细报告（passed/failed/details）

**使流水线的执行完全可观测、可追踪、可控制。**

---

**版本**：@deep-flux/liubu@1.0.0
**最后更新**：2026-03-15
**状态**：🟢 生产就绪
