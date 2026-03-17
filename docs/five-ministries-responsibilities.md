# 五部职责定义规范

> 清晰定义六部系统中五个部门的职责、能力边界和验收标准
>
> 最后更新：2026-03-17

## 概述

五部系统的核心原则：
- **单一职责**：每个部门只做自己的专业工作
- **清晰边界**：不同部门的职责不交叉
- **验收标准明确**：门下省有明确的检查清单

---

## [1] 吏部(yibu) - 信息官

**核心职责**：代码扫描、静态分析、信息采集

### 基本信息

| 维度 | 定义 |
|------|------|
| **输入** | 源代码路径、配置文件、扫描规则 |
| **输出** | 扫描报告（JSON格式） |
| **工具** | `read`, `glob`, `grep` |
| **权限** | 只读权限 |
| **能做的** | 分析、扫描、提取信息 |
| **不能做的** | 修改代码、执行命令、网络访问 |

### 具体能力清单

#### 1. 代码质量扫描
```json
{
  "name": "代码质量扫描",
  "input": "源代码路径",
  "output_file": "quality_report.json",
  "checks": [
    "语法错误",
    "类型检查（TS）",
    "代码风格",
    "复杂度分析",
    "不良实践检测"
  ],
  "output_format": {
    "issues": [
      {
        "file": "path/to/file.ts",
        "line": 42,
        "column": 10,
        "severity": "error|warning|info",
        "rule": "rule-name",
        "message": "问题描述"
      }
    ],
    "summary": {
      "total_issues": 15,
      "critical": 0,
      "warnings": 10,
      "info": 5,
      "files_scanned": 42
    }
  }
}
```

#### 2. 依赖关系分析
```json
{
  "name": "依赖关系分析",
  "input": "package.json 或 requirements.txt",
  "output_file": "dependency_report.json",
  "checks": [
    "已过期的依赖",
    "安全漏洞",
    "版本冲突",
    "未使用的依赖"
  ],
  "output_format": {
    "dependencies": [
      {
        "name": "package-name",
        "current_version": "1.0.0",
        "latest_version": "1.2.0",
        "risk_level": "critical|high|medium|low",
        "reason": "已发现安全漏洞"
      }
    ],
    "summary": {
      "total_deps": 25,
      "outdated": 3,
      "vulnerabilities": 1
    }
  }
}
```

#### 3. 文件结构映射
```json
{
  "name": "文件结构映射",
  "input": "项目根目录",
  "output_file": "structure.json",
  "output_format": {
    "root": "src/",
    "files": [
      {
        "path": "src/agents/yibuAgent.ts",
        "type": "file",
        "size_bytes": 2048,
        "lines": 80,
        "language": "typescript"
      },
      {
        "path": "src/agents/",
        "type": "directory",
        "file_count": 8
      }
    ]
  }
}
```

#### 4. 内容搜索
```json
{
  "name": "正则搜索",
  "input": {
    "pattern": "搜索正则表达式",
    "file_glob": "**/*.ts",
    "exclude": "node_modules/**"
  },
  "output_file": "search_results.json",
  "output_format": {
    "matches": [
      {
        "file": "src/agents/yibuAgent.ts",
        "line": 42,
        "column": 10,
        "content": "匹配的代码行"
      }
    ],
    "summary": {
      "total_matches": 5,
      "files_with_matches": 2
    }
  }
}
```

### 验收标准（门下省检查清单）

- [OK] 输出必须是有效的JSON格式
- [OK] 不能包含null值或undefined
- [OK] 所有路径必须使用相对路径（从项目根目录）
- [OK] 必须包含summary信息
- [OK] 报告可重现性：相同输入→相同输出
- [OK] 必须包含严重程度分级（error/warning/info）
- [OK] 错误信息必须清晰准确

---

## [2] 户部(hubu) - 资源官

**核心职责**：外部资源研究、网络查询、文档获取

### 基本信息

| 维度 | 定义 |
|------|------|
| **输入** | 查询关键词、URL、API端点 |
| **输出** | 研究报告、文档、资源列表 |
| **工具** | `webfetch`, `websearch` |
| **权限** | 网络访问权限 |
| **能做的** | 查询、获取、总结外部信息 |
| **不能做的** | 修改代码、访问私有系统、本地文件修改 |

### 具体能力清单

#### 1. 网络搜索
```json
{
  "name": "网络搜索",
  "input": {
    "query": "搜索关键词",
    "result_limit": 10
  },
  "output_file": "search_results.json",
  "output_format": {
    "query": "搜索关键词",
    "results": [
      {
        "rank": 1,
        "title": "网页标题",
        "url": "https://example.com",
        "snippet": "摘要文本",
        "relevance_score": 0.95
      }
    ],
    "summary": {
      "total_results": 5,
      "top_3_relevant": true
    }
  }
}
```

#### 2. API文档获取
```json
{
  "name": "API文档获取",
  "input": {
    "api_url": "https://api.example.com",
    "or_api_name": "axios|lodash|react"
  },
  "output_file": "api_documentation.md",
  "output_format": "Markdown文档",
  "must_include": [
    "基础URL和认证方式",
    "所有端点列表（GET/POST/PUT等）",
    "请求参数说明",
    "响应格式示例",
    "错误处理说明",
    "使用示例代码"
  ]
}
```

#### 3. 框架版本查询
```json
{
  "name": "框架版本查询",
  "input": {
    "framework_name": "Node.js|TypeScript|React"
  },
  "output_file": "version_info.json",
  "output_format": {
    "framework": "Node.js",
    "latest_version": "20.10.0",
    "stable_version": "20.9.0",
    "lts_version": "18.18.0",
    "breaking_changes": [
      "v20: Removed deprecated util.isArray()"
    ],
    "download_url": "https://nodejs.org/",
    "release_date": "2023-10-24"
  }
}
```

#### 4. 标准库查询
```json
{
  "name": "标准库查询",
  "input": {
    "library_name": "lodash|axios",
    "or_function": "Array.map|Promise.all"
  },
  "output_file": "library_info.md",
  "must_include": [
    "函数签名",
    "参数说明",
    "返回值",
    "使用示例",
    "常见错误和注意事项",
    "性能提示"
  ]
}
```

### 验收标准（门下省检查清单）

- [OK] 所有信息来源可追踪（必须提供URL）
- [OK] 搜索结果相关性高（top 3都要相关）
- [OK] API文档格式完整（不能缺少端点、参数、返回值）
- [OK] 版本信息必须来自官方源
- [OK] 没有过期信息（超过1年的内容要标注日期）
- [OK] 代码示例必须能正常运行
- [OK] URL必须有效且可访问

---

## [3] 工部(gongbu) - 工程官

**核心职责**：代码实现、文件修改、构建部署

### 基本信息

| 维度 | 定义 |
|------|------|
| **输入** | 规范文档、需求说明、参考代码 |
| **输出** | 实现代码、新增/修改的文件 |
| **工具** | `read`, `edit`, `write`, `glob`, `grep` |
| **权限** | 代码修改权限 |
| **能做的** | 编写代码、修改文件、遵循规范 |
| **不能做的** | 执行命令、改变架构设计、跳过验证 |

### 具体能力清单

#### 1. 代码实现
```json
{
  "name": "代码实现",
  "input": {
    "spec": "implementation_spec.md",
    "requirements": "功能需求列表",
    "references": "参考代码路径"
  },
  "output_file": "implemented_code.ts",
  "acceptance_criteria": {
    "syntax": {
      "must": "TypeScript编译通过",
      "no": "语法错误"
    },
    "typing": {
      "must": "所有变量都有明确类型",
      "no": "any类型"
    },
    "style": {
      "must": "遵循项目代码风格",
      "reference": ".eslintrc.js"
    },
    "completeness": {
      "must": "没有TODO或stub",
      "must_have": "所有导入都能正确解析"
    }
  }
}
```

#### 2. 文件修改
```json
{
  "name": "文件修改",
  "input": {
    "file_path": "src/agents/yibuAgent.ts",
    "modification_spec": "详细的修改说明",
    "change_scope": "只修改指定部分"
  },
  "output_file": "modified_file.ts",
  "acceptance_criteria": {
    "precision": "只改指定部分，不额外修改",
    "no_regression": "不破坏现有功能",
    "format": "保持缩进和风格一致",
    "imports": "所有导入都有效"
  }
}
```

#### 3. 新文件创建
```json
{
  "name": "新文件创建",
  "input": {
    "file_path": "src/new-module/new-file.ts",
    "content_spec": "文件内容规范"
  },
  "output_file": "new_file.ts",
  "acceptance_criteria": {
    "no_overwrite": "不覆盖现有文件",
    "path_correct": "路径符合项目结构",
    "completeness": "完整可用，不是骨架代码",
    "dependencies": "所有依赖都已定义"
  }
}
```

#### 4. 构建和编译
```json
{
  "name": "构建和编译",
  "input": {
    "source_files": "修改的代码文件"
  },
  "output": "编译结果|编译报告",
  "acceptance_criteria": {
    "no_errors": "零TypeScript错误",
    "no_warnings": "最多少量warning",
    "artifacts": "生成的构建产物"
  }
}
```

### 验收标准（门下省检查清单）

- [OK] 代码必须能编译通过（`tsc`零错误）
- [OK] 没有`any`类型或`unknown`类型
- [OK] 没有`console.log`或调试代码
- [OK] 遵循文件中现有的代码风格（缩进、命名、导入顺序）
- [OK] 所有导入都能正确解析
- [OK] 没有未使用的导入或变量
- [OK] 函数必须有JSDoc注释（至少包含参数和返回值）
- [OK] 必须处理所有可能的错误路径

---

## [4] 兵部(bingbu) - 验证官

**核心职责**：性能测试、功能验证、质量检查

### 基本信息

| 维度 | 定义 |
|------|------|
| **输入** | 待测试的代码、测试用例、测试规则 |
| **输出** | 测试报告、性能指标 |
| **工具** | `read`, `glob`, `grep`, `bash`（只读） |
| **权限** | 测试执行权限，不能修改代码 |
| **能做的** | 运行测试、性能分析、数据验证 |
| **不能做的** | 修改代码、修改测试用例、执行非测试命令 |

### 具体能力清单

#### 1. 单元测试执行
```json
{
  "name": "单元测试执行",
  "input": {
    "test_files": "*.test.ts",
    "modified_code": "待测试的代码"
  },
  "output_file": "test_report.json",
  "output_format": {
    "summary": {
      "passed": 45,
      "failed": 0,
      "skipped": 2,
      "duration_ms": 3200
    },
    "coverage": {
      "line_coverage": 92,
      "branch_coverage": 85,
      "function_coverage": 95
    },
    "details": [
      {
        "test_name": "should parse valid input",
        "file": "src/parser.test.ts",
        "status": "pass|fail",
        "duration_ms": 45,
        "error": "错误信息（如果失败）"
      }
    ]
  }
}
```

#### 2. 集成测试
```json
{
  "name": "集成测试",
  "input": {
    "code_changes": "完整的code change",
    "integration_scope": "e2e测试范围"
  },
  "output_file": "integration_report.json",
  "output_format": {
    "e2e_tests": {
      "passed": 20,
      "failed": 0,
      "duration_ms": 5600
    },
    "modules_integrated": [
      "auth-module",
      "api-module",
      "database-module"
    ],
    "cross_module_interactions": [
      {
        "from": "auth-module",
        "to": "api-module",
        "status": "working"
      }
    ]
  }
}
```

#### 3. 性能基准测试
```json
{
  "name": "性能基准测试",
  "input": {
    "module": "待测试的模块"
  },
  "output_file": "performance_report.json",
  "output_format": {
    "metrics": {
      "execution_time_ms": 150,
      "memory_mb": 45,
      "cpu_usage_percent": 25
    },
    "comparison_to_baseline": {
      "execution_time_change": "-5%",
      "memory_change": "+2%",
      "acceptable": true
    },
    "bottlenecks": [
      {
        "function": "processLargeArray",
        "time_ms": 120,
        "optimization": "建议使用并行处理"
      }
    ]
  }
}
```

#### 4. 代码覆盖率检查
```json
{
  "name": "代码覆盖率检查",
  "input": {
    "modified_code": "修改的代码"
  },
  "output_file": "coverage_report.json",
  "output_format": {
    "overall": {
      "line_coverage": 92,
      "branch_coverage": 85,
      "function_coverage": 95
    },
    "files": [
      {
        "file": "src/agents/yibuAgent.ts",
        "line_coverage": 88,
        "uncovered_lines": [45, 67]
      }
    ]
  }
}
```

### 验收标准（门下省检查清单）

- [OK] 单元测试通过率必须 100%
- [OK] 代码覆盖率必须 ≥ 80%（关键模块≥90%）
- [OK] 集成测试全部通过
- [OK] 性能不下降超过 5%（与baseline对比）
- [OK] 测试报告必须包含详细的失败信息
- [OK] 必须包含性能对比数据
- [OK] 覆盖率报告必须指出未覆盖的行号

---

## [5] 刑部(xingbu) - 调试官

**核心职责**：错误处理、问题诊断、数据修复

### 基本信息

| 维度 | 定义 |
|------|------|
| **输入** | 错误日志、失败的Step、问题描述 |
| **输出** | 诊断报告、修复方案 |
| **工具** | `read`, `glob`, `grep`, `bash`（诊断用） |
| **权限** | 诊断和分析权限 |
| **能做的** | 分析问题、提出修复建议、数据修复 |
| **不能做的** | 未经授权修改代码、执行任意命令 |

### 具体能力清单

#### 1. 错误诊断
```json
{
  "name": "错误诊断",
  "input": {
    "error_log": "错误日志或stack trace",
    "context": "错误发生的上下文"
  },
  "output_file": "diagnosis_report.json",
  "output_format": {
    "error_summary": {
      "type": "compilation|runtime|logic|timeout",
      "message": "错误信息",
      "severity": "critical|high|medium|low"
    },
    "root_cause_analysis": {
      "root_cause": "问题根源",
      "contributing_factors": ["因素1", "因素2"],
      "affected_components": ["module1", "module2"]
    },
    "remediation": {
      "immediate_fix": "立即解决方案",
      "long_term_solution": "长期解决方案",
      "effort_estimate": "修复工作量估计"
    }
  }
}
```

#### 2. 数据验证和修复
```json
{
  "name": "数据验证和修复",
  "input": {
    "data_source": "数据文件或数据库",
    "validation_rules": "验证规则"
  },
  "output_file": "data_report.json",
  "output_format": {
    "validation_results": {
      "total_records": 1000,
      "valid_records": 950,
      "invalid_records": 50
    },
    "invalid_data_analysis": [
      {
        "record_id": "123",
        "issue": "缺失必需字段",
        "value": "...",
        "fixable": true,
        "suggested_fix": "..."
      }
    ],
    "repair_summary": {
      "attempted_repairs": 40,
      "successful_repairs": 38,
      "failed_repairs": 2,
      "unfixable": [
        {
          "record_id": "456",
          "reason": "数据冲突，无法自动修复"
        }
      ]
    }
  }
}
```

#### 3. 依赖问题诊断
```json
{
  "name": "依赖问题诊断",
  "input": {
    "build_error": "构建错误或导入错误"
  },
  "output_file": "dependency_diagnosis.json",
  "output_format": {
    "issue_type": "missing_package|version_conflict|path_error",
    "issue": {
      "package": "package-name",
      "version": "要求的版本",
      "installed_version": "已安装版本"
    },
    "solution": [
      {
        "step": 1,
        "action": "npm install package@version",
        "reason": "..."
      }
    ]
  }
}
```

#### 4. 回归测试诊断
```json
{
  "name": "回归测试诊断",
  "input": {
    "failing_tests": "新增失败的测试列表"
  },
  "output_file": "regression_report.json",
  "output_format": {
    "regression_analysis": [
      {
        "test_name": "should handle edge case",
        "file": "src/parser.test.ts",
        "previous_status": "pass",
        "current_status": "fail",
        "likely_cause": "修改了核心逻辑，没有考虑边界情况",
        "affected_by_changes": ["src/parser.ts line 45-67"]
      }
    ],
    "impact_assessment": {
      "affected_features": ["feature1", "feature2"],
      "severity": "high"
    }
  }
}
```

### 验收标准（门下省检查清单）

- [OK] 诊断必须指出具体的根本原因（不能笼统）
- [OK] 修复方案必须可行且完整
- [OK] 数据修复必须 100% 验证（提供修复前后的对比）
- [OK] 报告必须包含具体的改进建议和执行步骤
- [OK] 如果问题无法解决，必须明确说明为什么
- [OK] 必须提供参考资源或文档链接

---

## 六部工作流协调

### 执行时的通信格式

所有六部的输出都应该遵循这个基本格式：

```json
{
  "ministry": "yibu|hubu|gongbu|bingbu|xingbu",
  "task_id": "唯一的task ID",
  "status": "success|failure|partial_failure",
  "timestamp": "2026-03-17T10:30:00Z",
  "duration_ms": 1234,
  "output": {
    // 部门特定的输出
  },
  "error": {
    "code": "错误代码",
    "message": "错误描述",
    "details": "详细信息"
  },
  "metadata": {
    "input_size": "输入数据大小",
    "output_size": "输出数据大小",
    "resources_used": {
      "cpu_percent": 45,
      "memory_mb": 256
    }
  }
}
```

### 六部之间的依赖

```
吏部 ────────────┐
                 ├──→ 门下省验证 ──→ 工部 ──→ 兵部 ──→ 刑部
户部 ────────────┘
```

- **吏部和户部**通常并行执行（都是信息收集）
- **工部**依赖吏部和户部的输出（了解需求和现状）
- **兵部**依赖工部的输出（验证实现）
- **刑部**全局诊断（可以在任何时点调用）

---

## 总结表格

| 部门 | 职责 | 输入 | 输出 | 工具 | 权限 |
|------|------|------|------|------|------|
| **吏** | 扫描分析 | 源代码 | 质量报告 | read/glob/grep | 只读 |
| **户** | 资源研究 | 关键词/URL | 文档报告 | webfetch/search | 网络 |
| **工** | 代码实现 | 需求说明 | 代码文件 | read/edit/write | 修改 |
| **兵** | 质量验证 | 代码 | 测试报告 | bash(readonly) | 测试 |
| **刑** | 问题诊断 | 日志/错误 | 诊断报告 | read/glob/grep | 诊断 |

---

## 相关文档

- 📄 [三省决策权定义](three-provinces-authority.md)
- 📄 [完整治理系统规范](governance-system.md)
- 📄 [工作流执行规范](workflow-execution.md)
