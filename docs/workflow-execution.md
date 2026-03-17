# 工作流执行规范

> 定义实际执行中的关键操作、数据格式、错误处理和状态管理
>
> 最后更新：2026-03-17

## 概述

本文档定义了三省六部系统实际执行过程中的：
- 任务格式和通信协议
- 状态管理和转移
- 错误处理机制
- 日志和审计

---

## 📋 任务执行协议

### 任务格式 (Task JSON)

所有任务在三省之间传递时，必须使用以下格式：

```json
{
  "task_id": "唯一的task ID (UUID)",
  "created_at": "2026-03-17T10:00:00Z",
  "created_by": "创建者身份 (zhongshu|menxia|shangshu|ministry)",

  "task_type": "plan|review|execute|verify",

  "step_id": "step-1",
  "step_name": "步骤名称",

  "ministry": "yibu|hubu|gongbu|bingbu|xingbu",
  "prompt": "具体的执行指令",

  "input": {
    // 步骤所需的输入数据
  },

  "deadline": "2026-03-17T11:00:00Z (可选)",
  "priority": "high|normal|low",

  "dependencies": [
    {
      "type": "step",
      "id": "step-1",
      "status": "completed"
    }
  ],

  "status": "pending|in_progress|completed|failed",
  "result": {
    // 执行结果
  },

  "error": {
    "code": "错误代码",
    "message": "错误信息",
    "details": "详细信息"
  },

  "metadata": {
    "attempt": 1,
    "start_time": "2026-03-17T10:05:00Z",
    "end_time": "2026-03-17T10:35:00Z",
    "duration_ms": 1800000
  }
}
```

### 任务生命周期

```
pending (待执行)
  [down]
  ├─ [依赖未完成] → 继续等待
  └─ [依赖已完成] → 开始执行
     [down]
in_progress (执行中)
  [down]
  ├─ [成功] → completed
  │          [down]
  │       [验证通过] → 进入下一步
  │       [验证失败] → failed (第1次) → 重做
  │
  └─ [失败] → failed
            [down]
         [第1次失败] → 重做
         [第2次失败] → 上报皇帝
```

### 任务状态转移规则

```
pending → in_progress: 依赖完成且尚书省调度
in_progress → completed: 六部返回成功结果
in_progress → failed: 六部返回失败或超时
completed → (终态): 无法转移
failed → pending: 第1次失败，允许重做
failed → (终态): 第2次失败，无法恢复
```

---

## 🔄 执行循环详解

### 尚书省的执行循环伪代码

```python
def execute_plan(plan):
    """执行完整的计划"""

    completed_steps = set()
    failed_steps = {}  # {step_id: failure_count}
    in_progress = {}   # {task_id: task}

    while len(completed_steps) < len(plan.steps):

        # 1. 找出所有可执行的Step
        ready_steps = [
            step for step in plan.steps
            if step.id not in completed_steps
            and all(dep in completed_steps for dep in step.dependencies)
        ]

        if not ready_steps:
            # 没有可执行的Step但没有完成全部
            # → 可能存在循环依赖或错误
            raise ExecutionError("Cannot find executable steps")

        # 2. 为ready_steps分配task
        new_tasks = []
        for step in ready_steps:
            task = create_task(
                step_id=step.id,
                ministry=step.uses[0],  # 取第一个ministry
                prompt=generate_prompt(step)
            )
            new_tasks.append(task)

        # 3. 并行执行（如果有多个ministry）
        if len(step.uses) > 1:
            # 多个ministry的情况
            for ministry in step.uses[1:]:
                task = create_task(
                    step_id=step.id,
                    ministry=ministry,
                    prompt=generate_prompt(step, ministry)
                )
                new_tasks.append(task)

        # 4. 等待所有task完成
        all_results = wait_for_all(new_tasks)

        # 5. 执行层验证（自己快速检查）
        for task, result in zip(new_tasks, all_results):
            if not validate_format(result):
                # 格式问题，自己修复
                result = fix_format(result)

        # 6. 报告给门下省
        report = {
            "step_id": step.id,
            "status": "completed",
            "results": all_results,
            "duration_ms": calculate_duration()
        }
        menxia_verify(report)

        # 7. 等待门下省的决策
        decision = menxia_decision(report)

        # 8. 根据决策采取行动
        if decision == "PASS":
            completed_steps.add(step.id)

        elif decision == "RETRY":
            failed_steps[step.id] = failed_steps.get(step.id, 0) + 1
            if failed_steps[step.id] > 2:
                # 上报皇帝
                escalate_to_emperor(step.id, failed_steps[step.id])
            else:
                # 清空completed状态，重新执行
                for dep_step in plan.steps:
                    if step.id in dep_step.dependencies:
                        completed_steps.discard(dep_step.id)

        elif decision == "SKIP":
            # 门下省决定跳过这个Step
            completed_steps.add(step.id)

        elif decision == "ESCALATE":
            # 上报皇帝
            escalate_to_emperor(step.id)
            break

    return generate_final_report()
```

### 并行执行示例

```
假设有以下步骤：
  Step 1: 分析(yibu) [deps: none]
  Step 2: 获取文档(hubu) [deps: none]
  Step 3: 实现(gongbu) [deps: step-1, step-2]
  Step 4: 测试(bingbu) [deps: step-3]

执行时间线：

T0:
  ├─ task1 = Task(step-1, yibu)
  └─ task2 = Task(step-2, hubu)
  └─ wait_all([task1, task2])

T1 (假设task1完成用时1000ms，task2用时500ms，所以T1 = T0 + 1000ms):
  ├─ 验证 task1 和 task2 的输出
  ├─ 报告给门下省
  └─ 等待门下省决策

T2 (门下省验证完成，决定继续):
  ├─ task3 = Task(step-3, gongbu)
  └─ wait([task3])

T3 (task3完成，假设用时2000ms):
  ├─ 验证 task3 的输出
  ├─ 报告给门下省
  └─ 等待门下省决策

T4 (门下省验证完成，决定继续):
  ├─ task4 = Task(step-4, bingbu)
  └─ wait([task4])

T5 (task4完成，假设用时500ms):
  ├─ 验证 task4 的输出
  ├─ 报告给门下省
  └─ 等待门下省决策

T6 (门下省最终验证完成):
  └─ 交付皇帝

总耗时：T0 + 1000 + X + 2000 + X + 500 + X (X = 门下省验证时间)
```

---

## [OK] 验证流程

### 门下省的验证流程

```python
def verify_step(step_id, results):
    """验证一个Step的执行结果"""

    step = get_step_definition(step_id)
    criteria = step.acceptance_criteria

    # 1. 格式验证
    for result in results:
        if not is_valid_format(result):
            return VerificationError("Invalid format")

    # 2. 标准验证
    all_pass = True
    for criterion_name, criterion_value in criteria.items():
        actual_value = extract_metric(results, criterion_name)
        if not evaluate_criterion(actual_value, criterion_value):
            all_pass = False
            break

    # 3. 决策
    if all_pass:
        return Decision(status="PASS", action="continue")
    else:
        # 检查这是否是第一次失败
        failure_count = get_failure_count(step_id)
        if failure_count == 0:
            return Decision(status="FAIL", action="retry", attempt=1)
        elif failure_count == 1:
            return Decision(status="FAIL", action="escalate", attempt=2)
        else:
            raise Exception("Too many failures")

def make_decision(verification_result):
    """根据验证结果做决策"""

    if verification_result.status == "PASS":
        # 继续下一步
        return {
            "action": "continue",
            "reason": "验证通过"
        }

    elif verification_result.status == "FAIL":
        if verification_result.attempt == 1:
            # 第1次失败，允许重做
            return {
                "action": "retry",
                "ministry": get_responsible_ministry(step_id),
                "reason": f"验证失败：{verification_result.failures}",
                "instructions": generate_retry_instructions()
            }
        elif verification_result.attempt == 2:
            # 第2次失败，上报皇帝
            return {
                "action": "escalate_to_emperor",
                "reason": f"两次尝试均失败：{verification_result.failures}",
                "report": generate_detailed_report()
            }
```

---

## [NO] 错误处理

### 六部的错误返回格式

```json
{
  "status": "failure",
  "error": {
    "code": "SYNTAX_ERROR|RUNTIME_ERROR|TIMEOUT|NETWORK_ERROR|OTHER",
    "message": "人可读的错误信息",
    "details": {
      "line": 42,
      "file": "src/file.ts",
      "stack": "完整的stack trace"
    }
  },
  "recovery_suggestion": "建议如何解决"
}
```

### 错误分类和处理

| 错误类型 | 代码 | 重试? | 处理方式 |
|---------|------|-------|---------|
| 语法错误 | SYNTAX_ERROR | [OK] | 修改参数或方法重试 |
| 运行时错误 | RUNTIME_ERROR | [OK] | 修改输入或参数重试 |
| 超时 | TIMEOUT | [OK] | 增加超时时间重试 |
| 网络错误 | NETWORK_ERROR | [OK] | 等待后重试 |
| 权限错误 | PERMISSION_ERROR | [NO] | 上报皇帝 |
| 无法处理 | UNSUPPORTED | [NO] | 上报皇帝 |

---

## [chart] 状态管理

### 全局状态追踪

```json
{
  "execution_id": "UUID",
  "plan_id": "UUID",
  "status": "running|completed|failed",

  "timeline": {
    "started_at": "2026-03-17T10:00:00Z",
    "ended_at": "2026-03-17T11:30:00Z",
    "duration_minutes": 90
  },

  "steps_status": {
    "step-1": {
      "status": "completed",
      "attempt": 1,
      "start_time": "2026-03-17T10:00:00Z",
      "end_time": "2026-03-17T10:05:00Z"
    },
    "step-2": {
      "status": "completed",
      "attempt": 2,
      "start_time": "2026-03-17T10:05:00Z",
      "end_time": "2026-03-17T10:15:00Z",
      "failure_reason": "first attempt failed due to timeout"
    },
    "step-3": {
      "status": "failed",
      "attempt": 2,
      "escalated_to_emperor": true,
      "failure_reason": "two consecutive failures"
    }
  },

  "statistics": {
    "total_steps": 5,
    "completed_steps": 2,
    "failed_steps": 1,
    "in_progress_steps": 0,
    "pending_steps": 2,
    "total_attempts": 6,
    "success_rate": "66.7%"
  }
}
```

---

## 🔍 监控和日志

### 执行日志格式

每个Step的执行都应该记录：

```json
{
  "timestamp": "2026-03-17T10:05:00Z",
  "event_type": "step_execution",
  "step_id": "step-1",
  "phase": "started|in_progress|completed|failed",

  "details": {
    "ministry": "yibu",
    "task_id": "UUID",
    "input_size_bytes": 1024,
    "output_size_bytes": 2048,
    "duration_ms": 5000,
    "status": "success|failure",

    "resources": {
      "cpu_percent": 45,
      "memory_mb": 256,
      "disk_mb": 512
    }
  },

  "result_summary": {
    "success": true,
    "key_metrics": {
      "issues_found": 3,
      "coverage": 85
    }
  }
}
```

### 关键监控指标

```
实时监控：
  ├─ 当前在执行的Step数量
  ├─ 平均Step执行时间
  ├─ 失败率和重试率
  ├─ 资源使用（CPU、内存、磁盘）
  └─ 瓶颈识别（哪个Step用时最长）

事后分析：
  ├─ 总执行时间
  ├─ 每个Step的执行时间
  ├─ 重试次数和原因
  ├─ 成功率
  └─ 关键路径分析
```

---

## 🔐 并发控制

### 并行执行的约束

```python
def can_execute_parallel(steps):
    """判断是否可以并行执行"""

    # 规则1：没有依赖关系
    for step in steps:
        if any(dep in [s.id for s in steps] for dep in step.dependencies):
            return False

    # 规则2：不同的ministry
    ministries = [get_ministry(step) for step in steps]
    if len(ministries) != len(set(ministries)):
        # 同一个ministry不能并行处理多个task
        return False

    # 规则3：资源约束
    if estimate_resources(steps) > available_resources():
        return False

    return True
```

### 锁和互斥

```
全局锁：
  - 计划的读/写（只有中书省可写）
  - Step的状态（门下省有写权，尚书省读权）

Step锁：
  - 防止同一个Step被多个ministry并行处理
  - 防止在重做时重复执行

资源锁：
  - 限制并发Step的数量（避免资源耗尽）
  - 优先级队列（高优先级Step优先）
```

---

## 📋 清单和检查

### 执行前的检查清单

```
☐ 中书省的计划是否完整
☐ 所有Step都有明确的uses字段
☐ 所有dependencies都已定义
☐ 没有循环依赖
☐ 所有六部都可用（在线状态）
☐ 资源是否充足（磁盘、内存等）
☐ 网络连接是否正常
```

### 执行中的检查清单

```
☐ 是否有Step超时
☐ 是否有六部返回错误
☐ 资源使用是否过高
☐ 是否有blocked的Step（依赖未完成）
☐ 错误率是否超过阈值
```

### 执行后的检查清单

```
☐ 所有Step都完成了吗
☐ 所有验证都通过了吗
☐ 有没有遗留的未处理问题
☐ 是否生成了最终报告
☐ 是否记录了所有日志
☐ 是否可以重现相同的结果
```

---

## [TARGET] 超时和截止时间

### 超时策略

```json
{
  "step_timeout_seconds": 300,
  "global_timeout_seconds": 3600,
  "retry_timeout_seconds": 600,

  "timeout_behavior": {
    "soft_timeout": {
      "action": "warn",
      "grace_period_seconds": 60
    },
    "hard_timeout": {
      "action": "kill",
      "escalate_to_emperor": true
    }
  }
}
```

### 截止时间处理

```python
def check_deadline(task):
    """检查任务是否超过截止时间"""

    if task.deadline is None:
        return True  # 没有截止时间，继续

    if datetime.now() < task.deadline:
        return True  # 还没有超过截止时间

    if task.status == "pending":
        # 还没开始但已经过期
        return handle_expired_pending(task)

    elif task.status == "in_progress":
        # 正在执行但已经过期
        return kill_task(task)
        # 上报皇帝
```

---

## 📞 通信协议

### 尚书省 → 门下省 的报告格式

```json
{
  "report_type": "step_completion|verification_request|escalation",
  "timestamp": "2026-03-17T10:30:00Z",
  "step_id": "step-1",

  "step_result": {
    "status": "success|failure",
    "ministry_outputs": [
      {
        "ministry": "yibu",
        "output": {...}
      }
    ],
    "duration_ms": 5000
  },

  "verification_request": "请验证这个结果是否符合criteria"
}
```

### 门下省 → 尚书省 的决策格式

```json
{
  "decision": "continue|retry|skip|escalate",
  "timestamp": "2026-03-17T10:35:00Z",
  "step_id": "step-1",

  "reasoning": {
    "verification_status": "pass|fail",
    "issues_found": ["..."],
    "recommendation": "..."
  },

  "next_action": {
    "action": "continue|retry|skip|escalate",
    "target_step": "step-2|step-1|emperor",
    "instructions": "..."
  }
}
```

---

## 总结

关键执行原则：
1. **清晰的状态**：每个task、step都有明确的状态
2. **异步处理**：六部的执行异步进行，尚书省等待结果
3. **格式统一**：所有通信都使用定义的JSON格式
4. **错误隔离**：错误不会扩散，逐级上报
5. **可追踪**：每个决策和执行都有日志和记录

---

## 相关文档

- 📄 [治理系统完整规范](governance-system.md)
- 📄 [五部职责定义](five-ministries-responsibilities.md)
- 📄 [三省决策权定义](three-provinces-authority.md)
