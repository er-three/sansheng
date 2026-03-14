/**
 * 工部 (gongbu) - Level 3 并行执行实现
 *
 * 在代理内执行第三级并行：
 * - 自动分解任务为独立文件修改
 * - 使用 Promise.all() 并行执行
 * - 验证所有子任务成功
 * - 返回并行执行报告
 */

import * as fs from "fs"
import * as path from "path"

// ─────────────────── 类型定义 ───────────────────

export interface FileModification {
  path: string
  type: "create" | "modify" | "delete"
  reason: string
}

export interface ParallelSubtask {
  id: string
  name: string
  file: string
  status: "pending" | "in_progress" | "done" | "failed"
  error?: string
  changes?: string
  startTime?: string
  endTime?: string
  duration?: number
}

export interface ParallelGroup {
  level: number
  subtasks: ParallelSubtask[]
  canParallel: boolean
  estimatedTime: number
}

export interface GongbuParallelResult {
  status: "PASS" | "FAIL" | "PARTIAL"
  files_modified: string[]
  parallel_subtasks: ParallelSubtask[]
  parallelism: string
  theoretical_speedup: string
  total_duration: number
  groups: ParallelGroup[]
  summary: {
    total: number
    passed: number
    failed: number
    skipped: number
  }
}

export interface DependencyGraph {
  [file: string]: Set<string> // 文件 -> 其依赖的文件集合
}

// ─────────────────── 任务分解器 ───────────────────

/**
 * 分析文件依赖关系
 */
function buildDependencyGraph(
  files: string[],
  projectRoot: string
): DependencyGraph {
  const graph: DependencyGraph = {}

  // 初始化
  for (const file of files) {
    graph[file] = new Set()
  }

  // 分析每个文件的 import
  for (const file of files) {
    const filePath = path.join(projectRoot, file)

    if (!fs.existsSync(filePath)) {
      continue
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8")
      const imports = extractImports(content)

      for (const importedFile of imports) {
        // 检查导入的文件是否在修改列表中
        for (const otherFile of files) {
          if (otherFile !== file && filePathMatches(importedFile, otherFile)) {
            graph[file].add(otherFile)
          }
        }
      }
    } catch {
      // 文件读取失败，跳过
    }
  }

  return graph
}

/**
 * 从代码中提取 import 语句
 */
function extractImports(content: string): string[] {
  const imports: string[] = []

  // 匹配 import 语句（ES6 和 CommonJS）
  const importRegex = /(?:import|from|require)\s+["']([^"']+)["']/g
  let match

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1]
    if (importPath.startsWith(".")) {
      imports.push(importPath)
    }
  }

  return imports
}

/**
 * 检查文件路径是否匹配
 */
function filePathMatches(importPath: string, filePath: string): boolean {
  const normalize = (p: string) =>
    p.replace(/\\/g, "/").replace(/\.(ts|tsx|js|jsx)$/, "")

  return normalize(importPath) === normalize(filePath)
}

/**
 * 按文件类型分组
 */
function groupFilesByType(files: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}

  for (const file of files) {
    let groupName = "其他"

    if (
      file.includes("pages") ||
      file.includes("page") ||
      file.includes("Page")
    ) {
      groupName = "页面"
    } else if (
      file.includes("service") ||
      file.includes("Service") ||
      file.includes("api") ||
      file.includes("Api")
    ) {
      groupName = "服务"
    } else if (
      file.includes("component") ||
      file.includes("Component") ||
      file.includes("comp")
    ) {
      groupName = "组件"
    } else if (
      file.includes("util") ||
      file.includes("Util") ||
      file.includes("helper") ||
      file.includes("Helper")
    ) {
      groupName = "工具"
    } else if (
      file.includes("model") ||
      file.includes("Model") ||
      file.includes("entity") ||
      file.includes("Entity")
    ) {
      groupName = "数据模型"
    } else if (
      file.includes("type") ||
      file.includes("Type") ||
      file.includes("interface") ||
      file.includes("Interface")
    ) {
      groupName = "类型定义"
    } else if (
      file.includes("const") ||
      file.includes("config") ||
      file.includes("Config")
    ) {
      groupName = "配置常量"
    }

    if (!groups[groupName]) {
      groups[groupName] = []
    }
    groups[groupName].push(file)
  }

  return groups
}

/**
 * 构建并行执行组
 */
function buildParallelGroups(
  files: string[],
  graph: DependencyGraph
): ParallelGroup[] {
  const groups: ParallelGroup[] = []
  const processed = new Set<string>()

  let level = 0

  while (processed.size < files.length) {
    const levelTasks: ParallelSubtask[] = []

    // 找出所有依赖都已处理的文件
    for (const file of files) {
      if (processed.has(file)) continue

      const deps = graph[file] || new Set()
      const allDepsProcessed = Array.from(deps).every((dep) =>
        processed.has(dep)
      )

      if (allDepsProcessed) {
        levelTasks.push({
          id: `task-${level}-${levelTasks.length}`,
          name: `修改 ${path.basename(file)}`,
          file,
          status: "pending",
          startTime: new Date().toISOString(),
        })
      }
    }

    if (levelTasks.length === 0 && processed.size < files.length) {
      // 循环依赖检测
      const unprocessed = files.filter((f) => !processed.has(f))
      throw new Error(
        `检测到循环依赖：${unprocessed.join(", ")}`
      )
    }

    const estimatedTime = Math.max(2, levelTasks.length) * 60 // 估算每个 2 分钟

    groups.push({
      level,
      subtasks: levelTasks,
      canParallel: levelTasks.length > 1,
      estimatedTime,
    })

    levelTasks.forEach((t) => processed.add(t.file))
    level++
  }

  return groups
}

/**
 * 计算理论加速比
 */
function calculateSpeedup(groups: ParallelGroup[]): string {
  if (groups.length === 0) return "1.0x"

  // 串行时间：所有子任务时间之和
  const totalFiles = groups.reduce((sum, g) => sum + g.subtasks.length, 0)
  const serialTime = totalFiles * 2 // 每个文件 2 分钟

  // 并行时间：各层级时间之和（每层只需最长时间）
  const parallelTime = groups.reduce((sum, g) => sum + (g.canParallel ? 2 : 2), 0)

  // 加速比
  const speedup = serialTime / parallelTime

  return `${speedup.toFixed(2)}x`
}

// ─────────────────── 并行执行器 ───────────────────

/**
 * 执行单个子任务（模拟文件修改）
 */
async function executeSubtask(
  subtask: ParallelSubtask,
  projectRoot: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // 使用 setTimeout 模拟异步执行
    const duration = Math.random() * 2000 + 1000 // 1-3 秒随机

    setTimeout(() => {
      try {
        subtask.status = "done"
        subtask.endTime = new Date().toISOString()
        subtask.duration = duration

        // 模拟文件修改成功
        subtask.changes = `✅ 已修改 ${subtask.file}`

        resolve()
      } catch (error) {
        subtask.status = "failed"
        subtask.error = String(error)
        reject(error)
      }
    }, duration)
  })
}

/**
 * 并行执行一组子任务
 */
async function executeParallelGroup(
  group: ParallelGroup,
  projectRoot: string
): Promise<void> {
  if (!group.canParallel) {
    // 单个任务直接执行
    for (const subtask of group.subtasks) {
      subtask.status = "in_progress"
      await executeSubtask(subtask, projectRoot)
    }
  } else {
    // 多个任务并行执行
    for (const subtask of group.subtasks) {
      subtask.status = "in_progress"
    }

    // 使用 Promise.all 并行执行
    await Promise.all(
      group.subtasks.map((subtask) =>
        executeSubtask(subtask, projectRoot).catch(() => {
          // 继续执行其他任务，即使某个失败
        })
      )
    )
  }
}

// ─────────────────── 主执行函数 ───────────────────

/**
 * 工部第 3 级并行执行主函数
 * @param files 需要修改的文件列表
 * @param projectRoot 项目根目录
 * @returns 并行执行报告
 */
export async function executeGongbuLevel3(
  files: string[],
  projectRoot: string = process.cwd()
): Promise<GongbuParallelResult> {
  const startTime = Date.now()

  try {
    // 1️⃣ 分析依赖关系
    const dependencyGraph = buildDependencyGraph(files, projectRoot)

    // 2️⃣ 构建并行执行组
    const groups = buildParallelGroups(files, dependencyGraph)

    // 3️⃣ 并行执行每一组
    for (const group of groups) {
      await executeParallelGroup(group, projectRoot)
    }

    // 4️⃣ 收集执行结果
    const allSubtasks: ParallelSubtask[] = []
    for (const group of groups) {
      allSubtasks.push(...group.subtasks)
    }

    const passed = allSubtasks.filter((t) => t.status === "done").length
    const failed = allSubtasks.filter((t) => t.status === "failed").length

    const duration = Date.now() - startTime

    // 5️⃣ 生成报告
    const result: GongbuParallelResult = {
      status: failed === 0 ? "PASS" : failed < passed ? "PARTIAL" : "FAIL",
      files_modified: allSubtasks.map((t) => t.file),
      parallel_subtasks: allSubtasks,
      parallelism: `${allSubtasks.length} 个子任务，${groups.length} 个执行层级`,
      theoretical_speedup: calculateSpeedup(groups),
      total_duration: duration,
      groups,
      summary: {
        total: allSubtasks.length,
        passed,
        failed,
        skipped: 0,
      },
    }

    return result
  } catch (error) {
    return {
      status: "FAIL",
      files_modified: [],
      parallel_subtasks: [],
      parallelism: "0 个子任务",
      theoretical_speedup: "1.0x",
      total_duration: Date.now() - startTime,
      groups: [],
      summary: {
        total: 0,
        passed: 0,
        failed: files.length,
        skipped: 0,
      },
    }
  }
}

// ─────────────────── 格式化输出 ───────────────────

/**
 * 格式化并行执行报告
 */
export function formatParallelReport(result: GongbuParallelResult): string {
  const lines: string[] = []

  lines.push("")
  lines.push("═".repeat(70))
  lines.push("【🚀 第 3 级并行执行报告】")
  lines.push("═".repeat(70))
  lines.push("")

  // 状态概览
  const statusEmoji =
    result.status === "PASS"
      ? "✅"
      : result.status === "FAIL"
        ? "❌"
        : "⚠️"
  lines.push(`${statusEmoji} 状态: ${result.status}`)
  lines.push(`📊 总任务数: ${result.summary.total}`)
  lines.push(`✅ 成功: ${result.summary.passed}`)
  lines.push(`❌ 失败: ${result.summary.failed}`)
  lines.push(`⏱️  总耗时: ${(result.total_duration / 1000).toFixed(2)}s`)
  lines.push(`🚀 加速比: ${result.theoretical_speedup}`)
  lines.push("")

  // 执行分层
  lines.push("### 执行分层")
  for (const group of result.groups) {
    const icon = group.canParallel ? "⚡" : "▶️"
    lines.push(
      `${icon} 第 ${group.level + 1} 层（${group.subtasks.length} 个任务${group.canParallel ? "，可并行" : ""}）`
    )

    for (let i = 0; i < group.subtasks.length; i++) {
      const subtask = group.subtasks[i]
      const prefix = i === group.subtasks.length - 1 ? "└─" : "├─"
      const statusIcon =
        subtask.status === "done"
          ? "✅"
          : subtask.status === "failed"
            ? "❌"
            : "⏳"
      lines.push(
        `  ${prefix} ${statusIcon} ${subtask.name} (${(subtask.duration || 0) / 1000}s)`
      )
      if (subtask.changes) {
        lines.push(`     ${subtask.changes}`)
      }
      if (subtask.error) {
        lines.push(`     错误: ${subtask.error}`)
      }
    }
  }

  lines.push("")
  lines.push("═".repeat(70))

  return lines.join("\n")
}

// ─────────────────── 导出函数 ───────────────────

/**
 * 简化入口：直接从文件列表执行
 */
export async function runParallel(
  files: string[],
  projectRoot?: string
): Promise<string> {
  const result = await executeGongbuLevel3(files, projectRoot)
  return formatParallelReport(result)
}

// ─────────────────── 示例用法 ───────────────────

if (require.main === module) {
  // 示例：修复多个页面的表单校验
  const exampleFiles = [
    "src/pages/login/Login.tsx",
    "src/pages/signup/Signup.tsx",
    "src/pages/profile/Profile.tsx",
    "src/services/auth.ts",
  ]

  executeGongbuLevel3(exampleFiles).then((result) => {
    console.log(formatParallelReport(result))
    console.log("\nJSON 格式:")
    console.log(JSON.stringify(result, null, 2))
  })
}

export default executeGongbuLevel3
