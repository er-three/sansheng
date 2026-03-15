# 三省六部制 Agent 边界优化增强计划

**创建时间**: 2026-03-16 19:30 UTC
**基于**: BOUNDARY_OPTIMIZATION_DESIGN.md 的深化分析
**状态**: 🔵 规划中，待实施

---

## 📋 总体增强思路

在 BOUNDARY_OPTIMIZATION_DESIGN.md 的基础上，深化以下几个方向：

1. **失败处理智能化** — 从"统一重试一次"到"按类型分类处理"
2. **依赖管理显式化** — 从"读 domain.yaml"到"自动检测变更"
3. **权限体系完善化** — 从"零散的权限声明"到"统一权限矩阵"
4. **接口定义标准化** — 从"模糊的输入输出"到"清晰的 JSON Schema"
5. **测试体系完整化** — 从"无测试"到"全覆盖边界测试"

---

## 🎯 增强计划详情

### 1️⃣ 失败处理智能化

#### 背景
当前方案：验收失败 → 六部重做一次 → 还是失败 → 上报皇帝

**问题**：重试策略太粗糙，某些错误类型不适合重试

#### 改进方案

**步骤 1：失败原因分类**

```typescript
// 在御史台的输出中补充详细的失败分类
interface VerificationResult {
  status: "PASS" | "FAIL"
  failureCategory?: "LOGIC" | "DATA" | "TIMEOUT" | "PERMISSION" | "UNKNOWN"
  failureDetails: {
    message: string
    checks: {
      checkName: string
      passed: boolean
      details?: string
    }[]
  }
  recommendations?: string  // 建议的修复方向
}

// 失败分类说明
type FailureCategory = {
  LOGIC: {
    description: "六部的算法/逻辑错误"
    retryable: true
    action: "通知六部修改代码后重试"
    escalateAfter: 2  // 2 次失败后升级
  },
  DATA: {
    description: "输入数据不符合要求"
    retryable: false
    action: "立即上报皇帝，需要用户调整输入"
    escalateAfter: 1  // 立即升级
  },
  TIMEOUT: {
    description: "步骤执行超时"
    retryable: true
    action: "重试（可能是资源临时不足）"
    escalateAfter: 2
  },
  PERMISSION: {
    description: "权限不足，六部无法执行"
    retryable: false
    action: "立即上报皇帝"
    escalateAfter: 1
  },
  UNKNOWN: {
    description: "未知错误"
    retryable: true
    action: "保守重试一次"
    escalateAfter: 2
  }
}
```

**步骤 2：尚书省的重试逻辑**

```typescript
// 在尚书省中实现智能重试
async function handleVerificationFailure(
  stepId: string,
  result: VerificationResult
): Promise<void> {
  const category = result.failureCategory
  const retryPolicy = FAILURE_POLICIES[category]

  if (!retryPolicy.retryable) {
    // 不可重试，立即升级
    await reportToEmperor(stepId, result, "立即升级", category)
    return
  }

  // 可重试，先重试
  const retryResult = await retryStep(stepId)

  if (retryResult.status === "PASS") {
    log("尚书省", `${stepId} 重试成功`)
    return
  }

  // 重试仍失败，检查是否超过重试次数
  const retryCount = getRetryCount(stepId)
  if (retryCount >= retryPolicy.escalateAfter) {
    await reportToEmperor(stepId, result, "重试失败", category)
  } else {
    // 继续重试（如果策略允许）
    await scheduleRetry(stepId, retryPolicy.delay || 1000)
  }
}
```

**步骤 3：上报皇帝的内容增强**

```typescript
interface EscalationReport {
  stepId: string
  failureCategory: FailureCategory
  retryAttempts: number
  originalResult: VerificationResult
  latestResult: VerificationResult
  recommendations: {
    forEmperor: string  // 给皇帝的建议
    forDept: string     // 给六部的建议
  }
  timeline: {
    firstAttempt: timestamp
    lastAttempt: timestamp
    totalDuration: ms
  }
}

// 示例上报
{
  stepId: "write-config",
  failureCategory: "DATA",
  retryAttempts: 0,  // 不可重试，0 次尝试
  recommendations: {
    forEmperor: "输入的 config.json 格式不符合 domain 要求，需要用户修正",
    forDept: "检查输入数据验证逻辑"
  }
}
```

#### 工作量估算
- 新增接口定义：2-3 小时
- 修改御史台的输出：1-2 小时
- 修改尚书省的重试逻辑：2-3 小时
- **总计**：5-8 小时

---

### 2️⃣ 依赖管理显式化

#### 背景
当前方案：中书省读取 domain.yaml → 获取 pipeline 顺序

**增强**：自动检测 domain 变更，防止规划与 domain 不同步

#### 改进方案

**步骤 1：Pipeline Hash 机制**

```typescript
// 在中书省的输出中加入 domain 指纹
interface PlanOutput {
  plan: Step[]
  metadata: {
    domain: string
    pipelineHash: string  // domain.yaml 的 SHA256
    pipelineVersion: string  // domain.yaml 的 version 字段
    timestamp: ISO8601
    source: "domain.yaml:path"
  }
  validation: {
    pipelineValid: boolean
    hasCircularDeps: boolean
    missingSteps: string[]
    warnings: string[]
  }
}

// 生成 pipeline hash 的逻辑
function generatePipelineHash(domainYaml: string): string {
  // 提取 pipeline 部分，计算 SHA256
  const pipeline = extractPipeline(domainYaml)
  return sha256(JSON.stringify(pipeline))
}
```

**步骤 2：执行时验证 Domain 未变更**

```typescript
// 在尚书省执行每一步前检查
async function executeStep(step: Step, plan: PlanOutput): Promise<void> {
  // 检查 domain 是否变更
  const currentDomain = readDomainYaml(plan.metadata.domain)
  const currentHash = generatePipelineHash(currentDomain)

  if (currentHash !== plan.metadata.pipelineHash) {
    const diff = findDifferences(
      plan.metadata.pipelineHash,
      currentHash
    )

    throw new Error(
      `Domain 已变更，无法继续执行\n` +
      `变更内容：${JSON.stringify(diff)}\n` +
      `建议：请重新运行中书省生成新计划`
    )
  }

  // Domain 验证通过，继续执行
  await executeStepLogic(step)
}
```

**步骤 3：中书省的验证逻辑增强**

```typescript
// 在中书省生成计划时加入验证
interface PipelineValidation {
  isValid: boolean
  hasCircularDependencies: boolean
  orphanedSteps: string[]  // 没有依赖者的步骤
  unreachableSteps: string[]  // 无法从开始步骤到达的步骤
  warnings: string[]
}

async function validatePipeline(
  domainYaml: DomainConfig
): Promise<PipelineValidation> {
  const errors: string[] = []

  // 检查 1：循环依赖
  if (hasCycleInDependencies(domainYaml.pipeline)) {
    errors.push("Pipeline 中存在循环依赖")
  }

  // 检查 2：孤立步骤
  const orphaned = findOrphanedSteps(domainYaml.pipeline)
  if (orphaned.length > 0) {
    errors.push(`孤立步骤: ${orphaned.join(", ")}`)
  }

  // 检查 3：不可达步骤
  const unreachable = findUnreachableSteps(domainYaml.pipeline)
  if (unreachable.length > 0) {
    errors.push(`不可达步骤: ${unreachable.join(", ")}`)
  }

  return {
    isValid: errors.length === 0,
    hasCircularDependencies: ...,
    orphanedSteps: orphaned,
    unreachableSteps: unreachable,
    warnings: errors
  }
}
```

#### 工作量估算
- Pipeline hash 机制：1-2 小时
- Domain 变更检测：1-2 小时
- Pipeline 验证逻辑：2-3 小时
- **总计**：4-7 小时

---

### 3️⃣ 权限体系完善化

#### 改进方案

**权限矩阵**

```markdown
| Agent | read | glob | write | edit | bash | verify | dispatch | notes |
|-------|------|------|-------|------|------|--------|----------|-------|
| 皇帝  | Yes  | Yes  | Yes   | Yes  | No   | Yes    | Yes      | 最高权限 |
| 中书省| Yes  | Yes  | Yes   | No   | No   | No     | No       | 可读 domain，可写计划 |
| 门下省| Yes  | No   | No    | No   | No   | No     | No       | 只读 |
| 尚书省| Yes  | No   | No    | No   | No   | No     | Yes      | 可调度六部 |
| 六部* | Yes  | Yes  | Yes   | Yes  | Yes  | No     | No       | 最大执行权限 |
| 御史台| Yes  | No   | No    | No   | No   | Yes    | No       | 验证权限 |
| 礼部  | Yes  | Yes  | No    | No   | No   | No     | No       | 提供工具定义 |

* 六部的权限受 domain.yaml 中的 permission 限制
```

**权限定义 Schema**

```yaml
# 在 Agent 定义文件中明确权限声明
权限级别定义:
  read:     # 可读取文件系统、配置、日志
    paths: [".opencode/**", "dist/**"]  # 允许的路径模式

  glob:     # 可进行文件查询
    enabled: true

  write:    # 可写入文件（创建、修改）
    paths: [".opencode/audit/**", ".opencode/workflows/**"]

  edit:     # 可编辑源代码
    paths: ["src/**"]  # 通常六部才有

  bash:     # 可执行 bash 命令
    allowedCommands: ["npm", "docker", "curl"]  # 白名单
    blockedCommands: ["rm", "git", "kill"]      # 黑名单

  verify:   # 可调用 verify_step
    enabled: true

  dispatch: # 可调度其他 agent
    allowedAgents: ["六部"]  # 只能调度六部
```

**Agent 定义文件补充**

```markdown
# .opencode/agents/menxia.md

## 权限声明

read:
  - .opencode/workflows/*/plan.json
  - .opencode/domains/**/*.yaml

glob: false

write: false

edit: false

bash: false

verify: false

dispatch: false
```

#### 工作量估算
- 定义权限 schema：1-2 小时
- 更新所有 agent 定义文件：2-3 小时
- **总计**：3-5 小时

---

### 4️⃣ 接口定义标准化

#### 改进方案

**统一的 JSON Schema 定义**

```typescript
// 创建文件：.opencode/schemas/agent-interfaces.json

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {

    // 皇帝的输入
    "EmperorGoal": {
      "type": "object",
      "properties": {
        "objective": { "type": "string", "description": "目标" },
        "domain": { "type": "string", "description": "使用的 domain" },
        "constraints": {
          "type": "object",
          "description": "约束条件"
        }
      },
      "required": ["objective", "domain"]
    },

    // 中书省的输出
    "ExecutionPlan": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "timestamp": { "type": "string", "format": "date-time" },
        "steps": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "skill": { "type": "string" },
              "inputs": { "type": "object" },
              "dependencies": { "type": "array", "items": { "type": "string" } },
              "expectedOutput": { "type": "object" }
            },
            "required": ["id", "skill"]
          }
        },
        "metadata": {
          "type": "object",
          "properties": {
            "domain": { "type": "string" },
            "pipelineHash": { "type": "string" },
            "source": { "type": "string" }
          }
        },
        "validation": {
          "type": "object",
          "properties": {
            "isValid": { "type": "boolean" },
            "warnings": { "type": "array", "items": { "type": "string" } }
          }
        }
      },
      "required": ["id", "steps", "metadata"]
    },

    // 门下省的输出
    "PlanAuditResult": {
      "type": "object",
      "properties": {
        "status": { "enum": ["APPROVED", "REJECTED"] },
        "issues": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "stepId": { "type": "string" },
              "severity": { "enum": ["ERROR", "WARNING"] },
              "message": { "type": "string" }
            }
          }
        },
        "timestamp": { "type": "string", "format": "date-time" }
      },
      "required": ["status"]
    },

    // 御史台的输出
    "VerificationResult": {
      "type": "object",
      "properties": {
        "stepId": { "type": "string" },
        "status": { "enum": ["PASS", "FAIL"] },
        "failureCategory": {
          "enum": ["LOGIC", "DATA", "TIMEOUT", "PERMISSION", "UNKNOWN"]
        },
        "failureDetails": {
          "type": "object",
          "properties": {
            "message": { "type": "string" },
            "checks": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "checkName": { "type": "string" },
                  "passed": { "type": "boolean" },
                  "details": { "type": "string" }
                }
              }
            }
          }
        },
        "recommendations": { "type": "string" },
        "timestamp": { "type": "string", "format": "date-time" }
      },
      "required": ["stepId", "status"]
    }
  }
}
```

**使用示例**

```typescript
// 在各 agent 中验证输入输出
import Ajv from "ajv"
import schemas from ".opencode/schemas/agent-interfaces.json"

const ajv = new Ajv()

// 验证中书省的输出
function validatePlanOutput(plan: any): void {
  const valid = ajv.validate(schemas.definitions.ExecutionPlan, plan)
  if (!valid) {
    throw new Error(`Plan 不符合 schema: ${ajv.errorsText()}`)
  }
}

// 验证御史台的输出
function validateVerificationResult(result: any): void {
  const valid = ajv.validate(schemas.definitions.VerificationResult, result)
  if (!valid) {
    throw new Error(`Verification result 不符合 schema: ${ajv.errorsText()}`)
  }
}
```

#### 工作量估算
- 定义所有 schema：3-4 小时
- 集成验证逻辑：2-3 小时
- **总计**：5-7 小时

---

### 5️⃣ 测试体系完整化

#### 改进方案

**边界测试用例集**

```typescript
// test/agents/menxia.test.ts - 门下省测试

describe("门下省 - 计划审核", () => {

  describe("正常场景", () => {
    it("应该批准有效计划", () => {
      const validPlan = {
        steps: [
          { id: "s1", skill: "read", dependencies: [] },
          { id: "s2", skill: "write", dependencies: ["s1"] }
        ],
        metadata: { domain: "general", pipelineHash: "abc123" }
      }
      const result = auditPlan(validPlan)
      expect(result.status).toBe("APPROVED")
      expect(result.issues).toHaveLength(0)
    })
  })

  describe("边界案例", () => {
    it("应该检测循环依赖", () => {
      const planWithCycle = {
        steps: [
          { id: "s1", dependencies: ["s2"] },
          { id: "s2", dependencies: ["s1"] }
        ]
      }
      const result = auditPlan(planWithCycle)
      expect(result.status).toBe("REJECTED")
      expect(result.issues.some(i => i.message.includes("循环"))).toBe(true)
    })

    it("应该检测缺失依赖", () => {
      const planWithMissingDep = {
        steps: [
          { id: "s1", dependencies: ["nonexistent"] }
        ]
      }
      const result = auditPlan(planWithMissingDep)
      expect(result.status).toBe("REJECTED")
    })

    it("应该检测重复 ID", () => {
      const planWithDuplicates = {
        steps: [
          { id: "s1", dependencies: [] },
          { id: "s1", dependencies: [] }  // 重复
        ]
      }
      const result = auditPlan(planWithDuplicates)
      expect(result.status).toBe("REJECTED")
    })
  })
})

// test/agents/yushitai.test.ts - 御史台测试

describe("御史台 - 执行验证", () => {

  describe("失败分类", () => {
    it("应该正确分类逻辑错误", () => {
      const logicError = {
        passed: false,
        message: "Output format mismatch"
      }
      const result = classifyFailure(logicError)
      expect(result.category).toBe("LOGIC")
      expect(result.retryable).toBe(true)
    })

    it("应该正确分类数据错误", () => {
      const dataError = {
        passed: false,
        message: "Input validation failed: missing required field"
      }
      const result = classifyFailure(dataError)
      expect(result.category).toBe("DATA")
      expect(result.retryable).toBe(false)
    })

    it("应该正确分类权限错误", () => {
      const permError = {
        passed: false,
        message: "Permission denied: cannot write to /root"
      }
      const result = classifyFailure(permError)
      expect(result.category).toBe("PERMISSION")
      expect(result.retryable).toBe(false)
    })
  })

  describe("验证结果格式", () => {
    it("应该输出有效的 VerificationResult schema", () => {
      const result = verifyStep("step-1", { /* ... */ })
      expect(() => validateSchema(result, "VerificationResult")).not.toThrow()
    })
  })
})
```

#### 工作量估算
- 编写测试用例：3-4 小时
- 建立 CI 集成：1-2 小时
- **总计**：4-6 小时

---

## 📅 实施路线图

### Phase 1：基础（第 1 周）
- [ ] 实施门下省一分为二 + 御史台（来自原设计）
- [ ] 定义权限矩阵
- [ ] 补充接口 schema（基础版本）

**工作量**: 8-12 小时
**产出**: 清晰的边界划分 + 权限声明

### Phase 2：智能化（第 2 周）
- [ ] 失败原因分类机制
- [ ] 尚书省重试逻辑
- [ ] Pipeline hash 机制
- [ ] Domain 变更检测

**工作量**: 10-18 小时
**产出**: 自动恢复能力 + 依赖管理

### Phase 3：测试与验证（第 3 周）
- [ ] 完整的测试体系
- [ ] 集成 CI 验证
- [ ] 文档完善

**工作量**: 8-12 小时
**产出**: 高可靠性 + 可维护性提升

---

## 🎯 优先级排序

| # | 增强项 | 优先级 | 工作量 | 收益 | 依赖 |
|---|--------|--------|--------|------|------|
| 1 | 门下省一分为二 + 御史台 | 🔴 高 | 中等 | 核心架构修复 | 无 |
| 2 | 权限矩阵 | 🔴 高 | 低 | 边界清晰化 | 1 |
| 3 | 失败分类 + 智能重试 | 🟡 中 | 高 | 自动恢复 | 1 |
| 4 | Pipeline hash | 🟡 中 | 低 | 依赖显式化 | 1 |
| 5 | 接口 schema | 🟡 中 | 中等 | 类型安全 | 1 |
| 6 | 测试体系 | 🟢 低 | 中等 | 质量保证 | 1-5 |

---

## 📊 预期收益

### 架构清晰度
- **前**: 职责混淆、隐性依赖、流程缺口
- **后**: 每个 agent 单一职责、显式依赖、完整流程

### 可靠性
- **前**: 失败靠人工介入
- **后**: 自动分类 + 智能重试，只有真正无法恢复时才升级

### 可维护性
- **前**: Domain 变更无法检测
- **后**: Pipeline hash + 自动检测变更

### 可测试性
- **前**: 边界不清，难以测试
- **后**: 清晰的 schema + 完整测试用例

---

## ✅ 验收标准

每个增强项完成时应满足：

1. **边界合格** — 单一职责、输出自闭合、可独立测试
2. **文档完整** — schema、权限、测试用例都已编写
3. **测试覆盖** — 正常场景 + 边界场景都有测试
4. **向后兼容** — 不破坏现有流程

---

**创建人**: Claude Code 架构分析系统
**审核状态**: 待技术评审
**相关文件**: BOUNDARY_OPTIMIZATION_DESIGN.md

