# Agent 间输入输出契约

**版本**: 1.0
**维护**: 任何 Agent 的输出格式变更必须更新本文档

---

## 概述

三省六部制 Agent 系统中，每个 Agent 都是独立模块。为了防止 schema 漂移导致下游解析失败，本文档定义了所有 Agent 间的标准化 I/O 格式。

**原则**：
- 所有 Agent 间通信使用 JSON 格式
- 输出中必须包含 `status` 字段表示执行结果
- 输出中必须包含足够的上下文，使下游 Agent 无需额外信息即可理解结果

---

## 中书省 → 门下省（计划审核）

### 输入（由中书省生成）
```json
{
  "domain": "领域名",
  "pipeline_source": "domain.yaml",
  "variables": { "module_name": "example" },
  "steps": [
    {
      "id": "step-1",
      "name": "步骤名称",
      "skill": "skill-name",
      "uses": ["yibu"],
      "input": "执行指令"
    }
  ]
}
```

### 输出（由门下省生成）

**通过时**：
```json
{
  "status": "APPROVED",
  "plan_id": "中书省提交的计划的某个标识",
  "checked_items": ["Pipeline顺序验证: PASS", "输入文件检查: PASS"],
  "notes": "计划逻辑清晰，可以执行"
}
```

**拒绝时**：
```json
{
  "status": "REJECTED",
  "plan_id": "xxx",
  "failed_checks": [
    {
      "item": "Pipeline顺序验证",
      "reason": "步骤3顺序与domain.yaml不符"
    }
  ],
  "action": "请中书省修正后重新提交"
}
```

---

## 门下省 → 尚书省（计划执行授权）

### 输入（来自门下省的审核通过结果）
```json
{
  "status": "APPROVED",
  "plan_id": "xxx"
}
```

尚书省收到此消息后，才能开始执行对应的计划。

---

## 尚书省 → 六部（步骤执行）

### 输入（由尚书省生成）
```json
{
  "step_id": "step-1",
  "step_name": "步骤名称",
  "skill": "skill-name",
  "input": "具体执行指令"
}
```

尚书省通过 `task(agent="yibu", skill="skill-name", prompt="...")`调用时，prompt 中包含上述信息。

---

## 六部 → 尚书省（执行完成汇报）

### 输出（六部执行完后汇报）
```json
{
  "step_id": "step-1",
  "status": "success|failure",
  "output": "执行产物摘要",
  "error": "如果失败，错误信息"
}
```

---

## 尚书省 → 御史台（验收请求）

### 输入（由尚书省生成）
```json
{
  "step_id": "step-1",
  "step_name": "步骤名称",
  "execution_result": {
    "status": "success",
    "output": "执行产物摘要"
  }
}
```

尚书省通过 `task(agent="yushitai", skill="verify_step", prompt="...")` 调用时，prompt 中包含上述信息。

---

## 御史台 → 尚书省（验收结果）

### 输出（由御史台生成）

**通过时**：
```json
{
  "step_id": "step-1",
  "verification_status": "PASS",
  "checks_passed": 5,
  "checks_total": 5,
  "details": "所有验收检查通过，可以继续下一步"
}
```

**失败时**：
```json
{
  "step_id": "step-1",
  "verification_status": "FAIL",
  "checks_passed": 3,
  "checks_total": 5,
  "failed_checks": [
    {
      "check_name": "输出文件存在性验证",
      "reason": "预期输出文件不存在"
    }
  ],
  "action": "请原六部代理重做该步骤"
}
```

---

## 尚书省 → 皇帝（执行汇报）

### 输出（由尚书省生成）

**所有步骤完成**：
```json
{
  "execution_status": "SUCCESS",
  "total_steps": 10,
  "completed_steps": 10,
  "failed_steps": [],
  "timestamp": "2026-03-16T12:00:00Z",
  "next_action": "所有步骤已完成，请皇帝进行最终验收"
}
```

**步骤失败（两次验收均失败）**：
```json
{
  "execution_status": "BLOCKED",
  "current_step": "step-5",
  "retry_count": 2,
  "failure_reason": "两次验收均失败，具体原因：...",
  "next_action": "等待皇帝裁决"
}
```

---

## Schema 变更流程

1. **修改** 任何 Agent 的输出格式
2. **立即更新** 本文档对应的契约
3. **通知** 所有依赖该输出的下游 Agent 的维护者
4. **同步修改** 下游 Agent 的输入解析逻辑
5. **测试** 完整的 E2E 流程

---

## 维护检查清单

每次更新本文档时，确认：
- [ ] JSON schema 合法（可用 JSON Schema Validator 验证）
- [ ] 所有 Agent 输出都包含 `status` 字段
- [ ] 所有 Agent 输出都包含足够的上下文信息
- [ ] 没有循环依赖（A 等 B，B 等 C，C 等 A）
- [ ] 所有文档中的示例都与实际实现一致
