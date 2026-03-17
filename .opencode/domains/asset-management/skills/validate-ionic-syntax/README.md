# Ionic 代码校验 Skill - Demo 示例

这是一个完整的自定义校验技能示例，演示如何在 asset-management 流程中集成自定义的代码校验逻辑。

## 文件结构

```
validate-ionic-syntax/
├── SKILL.md                         # 校验逻辑的具体定义
├── contract.yaml                    # 验收标准（Plugin 自动执行）
├── example-validation-report.json   # 示例输出报告
└── README.md                        # 本文件
```

## 工作流程

### 1. 在 domain.yaml 中定义步骤

```yaml
pipeline:
  - id: validate-ionic-code
    name: Ionic 代码校验（Demo）
    skill: validate-ionic-syntax      # ← 调用本 Skill
    uses: [yibu, xingbu]              # ← 吏部和刑部执行
    depends_on: [generate-infrastructure]

    # 可选：为六部传入定制参数
    ministry_params:
      yibu:
        max_files: 200
        file_pattern: "*.ts,*.html"
```

### 2. 六部执行校验

**吏部（yibu）**：
- 扫描生成的代码文件
- 按 file_pattern 过滤
- 建立文件清单

**刑部（xingbu）**：
- 进行深度语义分析
- 检查代码结构完整性
- 验证引用关系

### 3. Plugin 自动验收

Plugin 读取 `contract.yaml`，执行 7 个验收检查：

```yaml
verify:
  - type: file_exists
    path: "validation-report.json"     # 检查 1：报告文件存在

  - type: command
    run: "jq -r '.status' validation-report.json"
    expect: contains
    value: "PASS"                      # 检查 2：status = PASS

  - type: command
    run: "jq '.errors | length' validation-report.json"
    expect: contains
    value: "0"                         # 检查 3：无错误

  # ... 检查 4-7：目录和文件检查
```

**结果**：
- [OK] 所有检查通过 → 流程继续
- [NO] 任何检查失败 → 流程停止，返回给工部重新生成

## 校验报告格式

### 成功的报告（PASS）

```json
{
  "status": "PASS",
  "total_files": 12,
  "passed_files": 12,
  "failed_files": 0,
  "errors": [],
  "warnings": [
    {
      "file": "src/app/components/xxx.ts",
      "line": 42,
      "rule": "missing-unsubscribe",
      "severity": "warning",
      "message": "..."
    }
  ],
  "summary": {
    "total_components": 5,
    "valid_components": 5,
    "total_checks": 45,
    "passed_checks": 43,
    "failed_checks": 0
  }
}
```

### 失败的报告（FAIL）

```json
{
  "status": "FAIL",
  "total_files": 12,
  "passed_files": 10,
  "failed_files": 2,
  "errors": [
    {
      "file": "src/app/services/user.service.ts",
      "line": 15,
      "rule": "missing-injectable-decorator",
      "severity": "error",
      "message": "@Injectable 装饰器缺失"
    }
  ]
}
```

## 如何使用这个 Demo

### 方案 1：直接运行（需要实现执行器）

```bash
# 假设实现了执行器
python runner.py asset-management validate-ionic-code

# 期望输出：
# [OK] 门下省验收通过：Ionic 代码校验
# 进度：8/8 步完成
```

### 方案 2：理解设计

1. 查看 `SKILL.md` - 了解校验逻辑的完整流程
2. 查看 `contract.yaml` - 了解验收标准定义
3. 查看 `example-validation-report.json` - 了解输出格式
4. 查看 `domain.yaml` 中的新步骤 - 了解如何集成

### 方案 3：基于此创建其他校验

复制这个目录结构，创建其他校验技能：

```bash
# 复制模板
cp -r validate-ionic-syntax validate-react-syntax
cd validate-react-syntax

# 修改内容
# SKILL.md: 改为 React 校验规则
# contract.yaml: 改为 React 特定的验收标准
```

## 关键特性

[OK] **灵活的验收标准**
- 支持文件存在检查
- 支持命令输出检查
- 支持 JSON 值检查

[OK] **结构化的错误报告**
- 明确的错误位置（文件:行号）
- 分类的严重程度（error/warning）
- 可追踪的规则名称

[OK] **与六部的集成**
- 通过 `ministry_params` 传入定制参数
- 吏部处理文件扫描
- 刑部处理深度分析

[OK] **自动化验收**
- Plugin 自动执行 contract.yaml
- 验收失败自动阻止下一步
- 完整的流程控制

## 扩展建议

如果要创建其他类型的校验技能，可以参考以下模板：

### 1. API 端点校验
```
validate-api-contracts/
├─ SKILL.md (验证 OpenAPI 规范)
├─ contract.yaml (验证端点可访问性)
```

### 2. 数据库模式校验
```
validate-db-schema/
├─ SKILL.md (验证迁移脚本)
├─ contract.yaml (验证表和字段)
```

### 3. 性能指标校验
```
validate-performance/
├─ SKILL.md (运行基准测试)
├─ contract.yaml (验证性能指标)
```

## 总结

这个 Demo 展示了：
- [OK] 如何定义自定义的 Skill
- [OK] 如何在 domain.yaml 中使用它
- [OK] 如何定义验收标准（contract.yaml）
- [OK] 如何与六部系统集成
- [OK] 如何通过参数定制六部行为
- [OK] 如何生成结构化的校验报告

**这就是你想要的架构！** [TARGET]
