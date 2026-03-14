/**
 * 三省六部制 · OpenCode Plugin
 *
 * 职责分工：
 *   中书省 → experimental.chat.system.transform  （动态注入领域约束 + 流水线状态）
 *   门下省 → tool.execute.after                   （验收每步输出，不通过则拦截）
 *   尚书省 → 由 AGENTS.md + Agent 文件定义，Plugin 提供工具支撑
 *   六部   → domains/<name>/skills/<slot>/        （SKILL.md + contract.yaml）
 *
 * OmO融合第一阶段：
 *   工部新增 verify_edit_context 工具 （Hash-Anchored Edit 验证）
 *   刑部新增 semantic_grep 工具      （AST风格语义分析）
 */

import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import * as path from "path"
import * as fs from "fs"

// ─────────────────── 类型定义 ───────────────────

interface Registry {
  version: string
  active_domain: string
  variables: Record<string, string>
  pipeline_state?: PipelineState
}

interface PipelineState {
  completed: string[]
  current: string | null
  failed: string | null
  started_at: string
}

interface DomainConfig {
  name: string
  description: string
  version: string
  constraints: string[]
  init_skills?: string[]   // 启动时自动注入内容的 Skill 列表
  pipeline: Array<{
    id: string
    name: string
    description: string
    skill: string           // 技能目录名
    uses: string[]          // 调用的六部代理列表
    slot?: string           // 向后兼容，优先使用 id
  }>
  variables: Array<{ name: string; description: string; required: boolean }>
}

interface Contract {
  slot: string
  name: string
  verify: Array<{
    type: "command" | "file_exists"
    run?: string
    path?: string
    expect?: "exit_code_0" | "contains"
    value?: string
    error_msg: string
  }>
  retry_max: number
  depends_on: string[]
}

interface BlockInfo {
  type: string
  name: string
  start: number
  end: number
}

// ─────────────────── 파일 읽기 유틸 ───────────────────

function findRoot(worktree: string): string {
  // 从 worktree 向上找 registry.json
  let current = worktree
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, "registry.json"))) return current
    current = path.dirname(current)
  }
  return worktree
}

function readRegistry(root: string): Registry {
  const p = path.join(root, "registry.json")
  return JSON.parse(fs.readFileSync(p, "utf-8"))
}

function writeRegistry(root: string, registry: Registry): void {
  fs.writeFileSync(
    path.join(root, "registry.json"),
    JSON.stringify(registry, null, 2),
    "utf-8"
  )
}

function readDomain(root: string, domainName: string): DomainConfig | null {
  const p = path.join(root, "domains", domainName, "domain.yaml")
  if (!fs.existsSync(p)) return null
  // 简单 YAML 解析（避免外部依赖）
  const content = fs.readFileSync(p, "utf-8")
  return parseSimpleYaml(content) as DomainConfig
}

function readContract(root: string, domainName: string, skill: string): Contract | null {
  const p = path.join(root, "domains", domainName, "skills", skill, "contract.yaml")
  if (!fs.existsSync(p)) return null
  return parseSimpleYaml(fs.readFileSync(p, "utf-8")) as Contract
}

function listDomains(root: string): string[] {
  const domainsDir = path.join(root, "domains")
  if (!fs.existsSync(domainsDir)) return []
  return fs.readdirSync(domainsDir).filter(d =>
    fs.statSync(path.join(domainsDir, d)).isDirectory()
  )
}

/** 极简 YAML 解析器（只支持 string/array/object，够用即可） */
function parseSimpleYaml(content: string): Record<string, any> {
  const lines = content.split("\n")
  const result: Record<string, any> = {}
  let currentKey = ""
  let currentArray: any[] | null = null
  let inObject: Record<string, any> | null = null

  for (const line of lines) {
    if (line.startsWith("---") || line.trim() === "") continue
    const indent = line.length - line.trimStart().length

    if (indent === 0 && line.includes(":")) {
      const [k, ...rest] = line.split(":")
      currentKey = k.trim()
      const val = rest.join(":").trim()
      currentArray = null
      inObject = null
      if (val === "" || val === ">") {
        result[currentKey] = null
      } else {
        result[currentKey] = val.replace(/^["']|["']$/g, "")
      }
    } else if (indent === 2 && line.trimStart().startsWith("- ")) {
      if (!Array.isArray(result[currentKey])) result[currentKey] = []
      const item = line.trimStart().slice(2).trim()
      if (item.includes(":")) {
        // inline object in array
        const obj: Record<string, any> = {}
        const parts = item.split(/\s+/)
        for (const part of parts) {
          if (part.includes(":")) {
            const [pk, pv] = part.split(":")
            obj[pk] = pv?.replace(/^["']|["']$/g, "") ?? true
          }
        }
        result[currentKey].push(obj)
      } else {
        result[currentKey].push(item.replace(/^["']|["']$/g, ""))
      }
    } else if (indent === 2 && line.includes(":")) {
      const [k, ...rest] = line.trimStart().split(":")
      const val = rest.join(":").trim()
      if (Array.isArray(result[currentKey])) {
        // nested object inside array (last item)
        const last = result[currentKey][result[currentKey].length - 1]
        if (last && typeof last === "object") {
          last[k.trim()] = val.replace(/^["']|["']$/g, "")
        }
      }
    }
  }
  return result
}

// ─────────────────── OmO 融合第一阶段：辅助函数 ───────────────────

function matchesPattern(filePath: string, pattern?: string): boolean {
  if (!pattern) return true
  const name = filePath.split("/").pop() ?? filePath
  if (pattern.startsWith("*.")) return name.endsWith(pattern.slice(1))
  if (pattern.includes("**/*.")) return name.endsWith(pattern.split("**/").pop()!.slice(1))
  return filePath.includes(pattern.replace(/\*/g, ""))
}

function collectFiles(searchPath: string, filePattern?: string, maxFiles = 200): string[] {
  const results: string[] = []
  const BINARY_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".wasm", ".bin", ".ico", ".pdf"])
  if (!fs.existsSync(searchPath)) return results
  const stat = fs.statSync(searchPath)
  if (stat.isFile()) {
    const ext = "." + searchPath.split(".").pop()
    return !BINARY_EXTS.has(ext) && matchesPattern(searchPath, filePattern) ? [searchPath] : []
  }
  function walk(dir: string) {
    if (results.length >= maxFiles) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (results.length >= maxFiles) break
      const fullPath = `${dir}/${entry.name}`
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        walk(fullPath)
      } else if (entry.isFile()) {
        const ext = "." + entry.name.split(".").pop()
        if (!BINARY_EXTS.has(ext) && matchesPattern(entry.name, filePattern)) results.push(fullPath)
      }
    }
  }
  walk(searchPath)
  return results
}

function extractContainingBlock(lines: string[], matchLine: number): BlockInfo {
  const PATTERNS = [
    { re: /^\s*(export\s+)?(async\s+)?function\s+(\w+)/, type: "function", nameIdx: 3 },
    { re: /^\s*(export\s+)?(abstract\s+)?class\s+(\w+)/, type: "class", nameIdx: 3 },
    { re: /^\s*(public|private|protected|static)?\s*(async\s+)?(\w+)\s*\(/, type: "method", nameIdx: 3 },
    { re: /^\s*(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(/, type: "arrow_function", nameIdx: 2 },
  ]
  let defStart = matchLine,
    blockType = "unknown",
    blockName = ""
  for (let i = matchLine; i >= Math.max(0, matchLine - 50); i--) {
    for (const p of PATTERNS) {
      const m = lines[i].match(p.re)
      if (m) {
        defStart = i
        blockType = p.type
        blockName = m[p.nameIdx] ?? ""
        break
      }
    }
    if (blockName) break
  }
  let depth = 0,
    blockEnd = defStart + 1,
    started = false
  for (let i = defStart; i < Math.min(lines.length, defStart + 200); i++) {
    for (const ch of lines[i]) {
      if (ch === "{") {
        depth++
        started = true
      }
      if (ch === "}") depth--
    }
    if (started && depth === 0) {
      blockEnd = i + 1
      break
    }
  }
  return { type: blockType, name: blockName, start: defStart, end: blockEnd }
}

// ─────────────────── Plugin 主体 ───────────────────

export const SanShengLiuBuPlugin: Plugin = async ({ worktree, $ }) => {

  const ROOT = findRoot(worktree)

  return {

    // ═══════════════════════════════════════════════
    // 中书省：动态注入领域约束 + init_skills 内容 + 流水线状态
    // ═══════════════════════════════════════════════
    "experimental.chat.system.transform": async (_input, output) => {
      try {
        const registry = readRegistry(ROOT)
        const domain = readDomain(ROOT, registry.active_domain)
        if (!domain) return

        const state = registry.pipeline_state
        const completed = state?.completed ?? []
        const current = state?.current ?? domain.pipeline[0]?.id
        const variables = registry.variables

        // 1. 注入 init_skills 的完整内容（如 project-standards 的 Section 2A）
        const initSkillsContent: string[] = []
        for (const skillName of domain.init_skills ?? []) {
          const skillPath = path.join(
            ROOT, "domains", registry.active_domain, "skills", skillName, "SKILL.md"
          )
          if (fs.existsSync(skillPath)) {
            const raw = fs.readFileSync(skillPath, "utf-8")
            // 去掉 frontmatter（--- ... ---）
            const content = raw.replace(/^---[\s\S]*?---\n/, "").trim()
            initSkillsContent.push(content)
          }
        }

        if (initSkillsContent.length > 0) {
          output.system.push(initSkillsContent.join("\n\n---\n\n"))
        }

        // 2. 注入领域约束 + 流水线状态（最小高信号）
        const injection = [
          `## 当前领域：${domain.name}`,
          `描述：${domain.description}`,
          "",
          "### 全局约束（必须遵守）",
          ...domain.constraints.map(c => `- ${c}`),
          "",
          "### 流水线状态",
          ...domain.pipeline.map(step => {
            const stepId = step.id || step.slot
            const done = completed.includes(stepId)
            const active = stepId === current
            const icon = done ? "✅" : active ? "▶" : "⬜"
            const uses = step.uses ? ` [${step.uses.join(", ")}]` : ""
            return `${icon} ${step.name}（${stepId}）${uses}：${step.description}`
          }),
          "",
          "### 当前变量",
          ...Object.entries(variables)
            .filter(([, v]) => v)
            .map(([k, v]) => `- ${k}: ${v}`),
        ].join("\n")

        output.system.push(injection)
      } catch {
        // 配置不存在时静默跳过
      }
    },

    // ═══════════════════════════════════════════════
    // 门下省：拦截 skill 工具执行后的结果，运行 contract 验收
    // ═══════════════════════════════════════════════
    "tool.execute.after": async (input, output) => {
      if (input.tool !== "skill") return

      try {
        const registry = readRegistry(ROOT)
        const domain = readDomain(ROOT, registry.active_domain)
        if (!domain) return

        // 从 skill 调用参数中提取 skill 名称
        // OpenCode skill tool 调用时 args 里有 name 字段
        const skillName = (input as any).args?.name as string | undefined
        if (!skillName) return

        const contract = readContract(ROOT, registry.active_domain, skillName)
        if (!contract) return

        // 运行验收命令
        const variables = registry.variables
        const failures: string[] = []

        for (const check of contract.verify ?? []) {
          if (check.type === "command" && check.run) {
            const cmd = check.run.replace(
              /\{(\w+)\}/g,
              (_, k) => variables[k] ?? ""
            )
            const result = await $`bash -c ${cmd}`.nothrow()

            if (check.expect === "exit_code_0" && result.exitCode !== 0) {
              failures.push(check.error_msg)
            } else if (check.expect === "contains" && check.value) {
              const out = result.stdout.toString() + result.stderr.toString()
              if (!out.includes(check.value)) {
                failures.push(check.error_msg)
              }
            }
          } else if (check.type === "file_exists" && check.path) {
            const filePath = check.path.replace(
              /\{(\w+)\}/g,
              (_, k) => variables[k] ?? ""
            )
            if (!fs.existsSync(path.join(ROOT, filePath))) {
              failures.push(check.error_msg)
            }
          }
        }

        if (failures.length > 0) {
          // 门下省驳回：在结果里追加失败信息，AI 会看到并重做
          output.output += [
            "",
            "---",
            "## ❌ 门下省验收失败",
            ...failures.map(f => `- ${f}`),
            "",
            "请修复以上问题后重新执行此步骤，不得进入下一步。",
          ].join("\n")
        } else {
          // 门下省通过：更新流水线状态
          const state = registry.pipeline_state ?? {
            completed: [],
            current: null,
            failed: null,
            started_at: new Date().toISOString(),
          }

          // 找到对应的步骤 id（使用 skill 名称匹配）
          const pipeline = domain.pipeline
          const completedStepId = pipeline.find(s => s.skill === skillName)?.id ||
                                   pipeline.find(s => s.slot === skillName)?.id ||
                                   skillName

          if (!state.completed.includes(completedStepId)) {
            state.completed.push(completedStepId)
          }

          // 找下一步
          const currentIdx = pipeline.findIndex(s =>
            (s.id === completedStepId) || (s.skill === skillName) || (s.slot === skillName)
          )
          state.current = pipeline[currentIdx + 1]?.id ?? null

          registry.pipeline_state = state
          writeRegistry(ROOT, registry)

          output.output += [
            "",
            "---",
            `## ✅ 门下省验收通过：${contract.name}`,
            `进度：${state.completed.length}/${pipeline.length} 步完成`,
            state.current
              ? `下一步：${pipeline[currentIdx + 1]?.name}（${state.current}）`
              : "🎉 全部完成！",
          ].join("\n")
        }
      } catch {
        // 静默跳过，不影响正常使用
      }
    },

    // ═══════════════════════════════════════════════
    // Context Engineering：压缩时保留流水线状态
    // ═══════════════════════════════════════════════
    "experimental.session.compacting": async (_input, output) => {
      try {
        const registry = readRegistry(ROOT)
        const domain = readDomain(ROOT, registry.active_domain)
        const state = registry.pipeline_state

        if (domain && state) {
          output.context.push([
            `当前领域：${domain.name}`,
            `已完成步骤：${state.completed.join(", ") || "无"}`,
            `当前步骤：${state.current ?? "全部完成"}`,
            `当前变量：${JSON.stringify(registry.variables)}`,
            "以上是三省六部制流水线的关键状态，必须保留。",
          ].join("\n"))
        }
      } catch {}
    },

    // ═══════════════════════════════════════════════
    // 六部工具：OmO 融合 + 领域管理
    // ═══════════════════════════════════════════════
    tool: {

      // ─────────────────── OmO 融合第一阶段工具 ───────────────────

      /** 工部：编辑前验证 old_string 唯一性 */
      verify_edit_context: tool({
        description:
          "工部编辑前必须调用。验证 old_string 在目标文件中是否唯一存在，避免编辑定位错误。",
        args: {
          file_path: tool.schema.string().describe("要编辑的文件绝对路径或相对于项目根的路径"),
          old_string: tool.schema.string().describe("edit 工具将使用的 old_string，用于定位编辑位置"),
          context_lines: tool.schema.number().optional().describe("返回匹配周围的上下文行数，默认3"),
        },
        async execute(args: { file_path: string; old_string: string; context_lines?: number }, ctx) {
          const root = findRoot(ctx.worktree)
          const filePath = path.isAbsolute(args.file_path) ? args.file_path : path.join(root, args.file_path)
          if (!fs.existsSync(filePath)) {
            return JSON.stringify({
              status: "ERROR",
              error: `文件不存在：${filePath}`,
              action: "请先用 read 确认文件路径",
            })
          }
          const stat = fs.statSync(filePath)
          if (stat.size > 1024 * 1024) {
            return JSON.stringify({
              status: "ERROR",
              error: "文件超过1MB，跳过验证",
              action: "对大文件请手动确认 old_string 唯一性",
            })
          }
          const content = fs.readFileSync(filePath, "utf-8")
          const lines = content.split("\n")
          const ctxLines = args.context_lines ?? 3
          const occurrences: number[] = []
          let from = 0
          while (true) {
            const idx = content.indexOf(args.old_string, from)
            if (idx === -1) break
            occurrences.push(idx)
            from = idx + 1
          }
          if (occurrences.length === 0) {
            const firstToken = args.old_string.split("\n")[0].trim().slice(0, 30)
            const near = lines
              .map((l, i) => ({ line: l, num: i + 1 }))
              .filter(({ line }) => line.includes(firstToken))
              .slice(0, 3)
            return JSON.stringify({ status: "NOT_FOUND", action: "重新 read 文件获取准确内容", near_matches: near })
          }
          if (occurrences.length > 1) {
            const matches = occurrences.map((idx) => {
              const lineNum = content.slice(0, idx).split("\n").length
              const start = Math.max(0, lineNum - 1 - ctxLines)
              const end = Math.min(lines.length, lineNum + args.old_string.split("\n").length + ctxLines)
              return { line_number: lineNum, context: lines.slice(start, end).join("\n") }
            })
            return JSON.stringify({
              status: "AMBIGUOUS",
              count: occurrences.length,
              matches,
              action: "扩展 old_string 加入前后各2-3行上下文使其唯一",
            })
          }
          const lineNum = content.slice(0, occurrences[0]).split("\n").length
          const start = Math.max(0, lineNum - 1 - ctxLines)
          const end = Math.min(lines.length, lineNum + args.old_string.split("\n").length + ctxLines)
          return JSON.stringify({
            status: "UNIQUE",
            message: "验证通过，可安全执行 edit",
            line_number: lineNum,
            context: lines.slice(start, end).join("\n"),
          })
        },
      }),

      /** 刑部：AST风格的结构感知代码搜索 */
      semantic_grep: tool({
        description:
          "AST 风格的结构感知代码搜索，刑部审查专用。支持提取完整代码块（函数体、类体）和交叉引用分析。",
        args: {
          pattern: tool.schema.string().describe("正则表达式搜索模式"),
          path: tool.schema.string().describe("搜索路径（文件或目录）"),
          mode: tool.schema
            .enum(["definition", "usage", "structure", "cross_reference"])
            .optional()
            .describe("definition=找定义, usage=找调用, structure=提取完整代码块, cross_reference=定义+使用汇总"),
          file_pattern: tool.schema.string().optional().describe("文件过滤，如 '*.ts' 或 '*.py'"),
          context_lines: tool.schema.number().optional().describe("结果周围上下文行数，默认5"),
          max_results: tool.schema.number().optional().describe("最大结果数，默认20"),
        },
        async execute(args: {
          pattern: string
          path: string
          mode?: string
          file_pattern?: string
          context_lines?: number
          max_results?: number
        }, ctx) {
          const root = findRoot(ctx.worktree)
          const searchPath = path.isAbsolute(args.path) ? args.path : path.join(root, args.path)
          const mode = args.mode ?? "cross_reference"
          const ctxLines = args.context_lines ?? 5
          const maxResults = args.max_results ?? 20
          const files = collectFiles(searchPath, args.file_pattern)
          if (files.length === 0) return JSON.stringify({ status: "NO_FILES", path: searchPath })
          const regex = new RegExp(args.pattern, "gm")
          const results: object[] = []
          for (const filePath of files) {
            if (results.length >= maxResults) break
            const content = fs.readFileSync(filePath, "utf-8")
            const lines = content.split("\n")
            let match: RegExpExecArray | null
            regex.lastIndex = 0
            while ((match = regex.exec(content)) !== null && results.length < maxResults) {
              const lineNum = content.slice(0, match.index).split("\n").length
              if (mode === "structure" || mode === "cross_reference") {
                const block = extractContainingBlock(lines, lineNum - 1)
                results.push({
                  file: filePath,
                  line: lineNum,
                  match: match[0],
                  block_type: block.type,
                  block_name: block.name,
                  snippet: lines.slice(block.start, Math.min(block.end, block.start + 30)).join("\n"),
                })
              } else {
                const s = Math.max(0, lineNum - 1 - ctxLines)
                const e = Math.min(lines.length, lineNum + ctxLines)
                results.push({
                  file: filePath,
                  line: lineNum,
                  match: match[0],
                  snippet: lines.slice(s, e).join("\n"),
                })
              }
            }
          }
          const summary =
            mode === "cross_reference"
              ? results.reduce((acc: Record<string, number>, r: any) => {
                  const k = r.block_name || r.match
                  acc[k] = (acc[k] ?? 0) + 1
                  return acc
                }, {})
              : undefined
          return JSON.stringify({
            status: "OK",
            mode,
            total: results.length,
            ...(summary ? { usage_summary: summary } : {}),
            results,
          })
        },
      }),

      // ─────────────────── 原始三省六部制工具 ───────────────────

      /** 吏部：列出所有可用领域 */
      list_domains: tool({
        description: "列出所有可用的六部技能领域",
        args: {},
        async execute(_args, ctx) {
          const root = findRoot(ctx.worktree)
          const domains = listDomains(root)
          const registry = readRegistry(root)

          const lines = domains.map(d => {
            const domain = readDomain(root, d)
            const active = d === registry.active_domain ? "（当前）" : ""
            return `- ${d}${active}：${domain?.description ?? ""}`
          })

          return ["可用领域：", ...lines].join("\n")
        },
      }),

      /** 吏部：切换领域 */
      switch_domain: tool({
        description: "切换六部技能领域，切换后自动更新 .opencode/skills 软链接",
        args: {
          domain: tool.schema.string().describe("目标领域名称，如 reverse-engineering 或 video"),
        },
        async execute(args, ctx) {
          const root = findRoot(ctx.worktree)
          const domains = listDomains(root)

          if (!domains.includes(args.domain)) {
            return `❌ 领域 "${args.domain}" 不存在。可用领域：${domains.join(", ")}`
          }

          // 更新 registry
          const registry = readRegistry(root)
          const oldDomain = registry.active_domain
          registry.active_domain = args.domain
          registry.pipeline_state = {
            completed: [],
            current: null,
            failed: null,
            started_at: new Date().toISOString(),
          }
          writeRegistry(root, registry)

          // 重建 .opencode/skills 软链接
          const skillsDir = path.join(root, ".opencode", "skills")
          if (fs.existsSync(skillsDir)) {
            fs.rmSync(skillsDir, { recursive: true })
          }
          fs.mkdirSync(skillsDir, { recursive: true })

          const domainSkillsDir = path.join(root, "domains", args.domain, "skills")
          if (fs.existsSync(domainSkillsDir)) {
            for (const skill of fs.readdirSync(domainSkillsDir)) {
              const src = path.join(domainSkillsDir, skill)
              const dst = path.join(skillsDir, skill)
              if (fs.statSync(src).isDirectory()) {
                fs.symlinkSync(src, dst)
              }
            }
          }

          const domain = readDomain(root, args.domain)
          const steps = domain?.pipeline.map(s => {
            const stepId = s.id || s.slot
            const uses = s.uses ? ` [${s.uses.join(", ")}]` : ""
            return `${s.name}（${stepId}）${uses}`
          }).join(" → ") ?? ""

          return [
            `✅ 已切换：${oldDomain} → ${args.domain}`,
            `描述：${domain?.description ?? ""}`,
            `流水线：${steps}`,
            "",
            "Skills 软链接已更新，可以开始执行任务。",
          ].join("\n")
        },
      }),

      /** 户部：查看流水线状态 */
      pipeline_status: tool({
        description: "查看当前六部流水线的执行状态",
        args: {},
        async execute(_args, ctx) {
          const root = findRoot(ctx.worktree)
          const registry = readRegistry(root)
          const domain = readDomain(root, registry.active_domain)
          const state = registry.pipeline_state

          if (!domain) return `❌ 领域配置不存在：${registry.active_domain}`

          const lines = [
            `领域：${domain.name}`,
            `变量：${JSON.stringify(registry.variables)}`,
            "",
            "流水线：",
          ]

          for (const step of domain.pipeline) {
            const stepId = step.id || step.slot
            const done = state?.completed.includes(stepId) ?? false
            const active = state?.current === stepId
            const icon = done ? "✅" : active ? "▶" : "⬜"
            const uses = step.uses ? ` [${step.uses.join(", ")}]` : ""
            lines.push(`  ${icon} ${step.name}（${stepId}）${uses}`)
          }

          const total = domain.pipeline.length
          const done = state?.completed.length ?? 0
          lines.push("", `进度：${done}/${total}`)

          return lines.join("\n")
        },
      }),

      // ─────────────────── OmO 融合第一阶段库部工具 ───────────────────

      /** 库部：OpenSpec 规范化创建与更新 */
      openspec_write: tool({
        description:
          "库部专用工具，创建/更新 openspec/ 目录结构。支持三种操作：init（初始化新资产）、update（更新规格）、archive（版本归档）。",
        args: {
          asset_type: tool.schema
            .enum(["service", "provider", "data-model", "ui-component", "utility"])
            .describe("资产类型"),
          asset_name: tool.schema.string().describe("资产名称，如 user-service"),
          operation: tool.schema
            .enum(["init", "update", "archive"])
            .describe("操作类型：init=初始化，update=更新规格，archive=版本归档"),
          proposal: tool.schema
            .string()
            .optional()
            .describe("init 时必填：资产提议说明（Markdown），描述背景、目标、边界"),
          specification: tool.schema
            .string()
            .optional()
            .describe("规格内容（Markdown），包含接口定义、数据结构、验收标准"),
          changelog_entry: tool.schema
            .string()
            .optional()
            .describe("update/archive 时的变更日志条目，格式：## v{version} - {date} \n{description}"),
          version: tool.schema
            .string()
            .optional()
            .describe("archive 时必填：版本号，如 1.0、1.1 等"),
        },
        async execute(args: {
          asset_type: string
          asset_name: string
          operation: string
          proposal?: string
          specification?: string
          changelog_entry?: string
          version?: string
        }, ctx) {
          const root = findRoot(ctx.worktree)
          const baseDir = path.join(root, "openspec", args.asset_type, args.asset_name)
          const errors: string[] = []

          try {
            if (args.operation === "init") {
              if (!args.proposal) {
                return JSON.stringify({
                  status: "ERROR",
                  error: "init 操作必须提供 proposal 参数",
                })
              }

              // 创建目录结构
              fs.mkdirSync(path.join(baseDir, "implementation", "code"), { recursive: true })
              fs.mkdirSync(path.join(baseDir, "config"), { recursive: true })
              fs.mkdirSync(path.join(baseDir, "docs"), { recursive: true })
              fs.mkdirSync(path.join(baseDir, "archive", "v1.0"), { recursive: true })

              // 写入 proposal.md（不可覆盖）
              const proposalPath = path.join(baseDir, "proposal.md")
              if (!fs.existsSync(proposalPath)) {
                fs.writeFileSync(
                  proposalPath,
                  `---\nname: ${args.asset_name}\ntype: ${args.asset_type}\nstatus: proposed\ndate: ${new Date().toISOString()}\n---\n\n${args.proposal}`,
                  "utf-8"
                )
              }

              // 初始化 changelog.md
              fs.writeFileSync(
                path.join(baseDir, "changelog.md"),
                `# Changelog - ${args.asset_name}\n\n## v1.0 - ${new Date().toISOString().split("T")[0]}\n- 初始版本\n`,
                "utf-8"
              )

              // 初始化 specification.md（如果提供）
              if (args.specification) {
                fs.writeFileSync(
                  path.join(baseDir, "specification.md"),
                  `---\nversion: 1.0\ndate: ${new Date().toISOString()}\n---\n\n${args.specification}`,
                  "utf-8"
                )
              }

              return JSON.stringify({
                status: "SUCCESS",
                message: `已创建 OpenSpec 资产：${args.asset_type}/${args.asset_name}`,
                structure: {
                  proposal: "proposal.md（历史记录，不可修改）",
                  specification: "specification.md（当前版本规格）",
                  changelog: "changelog.md（变更历史）",
                  implementation: "implementation/code/（代码实现）",
                  archive: "archive/v1.0/（版本归档）",
                },
              })
            } else if (args.operation === "update") {
              if (!fs.existsSync(baseDir)) {
                return JSON.stringify({
                  status: "ERROR",
                  error: `资产目录不存在：${baseDir}`,
                  action: "请先执行 init 操作创建资产",
                })
              }

              if (args.specification) {
                const specPath = path.join(baseDir, "specification.md")
                fs.writeFileSync(
                  specPath,
                  `---\nversion: ${args.version || "1.1"}\ndate: ${new Date().toISOString()}\n---\n\n${args.specification}`,
                  "utf-8"
                )
              }

              if (args.changelog_entry) {
                const changelogPath = path.join(baseDir, "changelog.md")
                const existing = fs.readFileSync(changelogPath, "utf-8")
                fs.writeFileSync(changelogPath, existing + "\n" + args.changelog_entry + "\n", "utf-8")
              }

              return JSON.stringify({
                status: "SUCCESS",
                message: `已更新 OpenSpec 资产：${args.asset_type}/${args.asset_name}`,
              })
            } else if (args.operation === "archive") {
              if (!args.version) {
                return JSON.stringify({
                  status: "ERROR",
                  error: "archive 操作必须提供 version 参数",
                })
              }

              if (!fs.existsSync(baseDir)) {
                return JSON.stringify({
                  status: "ERROR",
                  error: `资产目录不存在：${baseDir}`,
                })
              }

              const archiveVersionDir = path.join(baseDir, "archive", `v${args.version}`)
              fs.mkdirSync(archiveVersionDir, { recursive: true })

              const specPath = path.join(baseDir, "specification.md")
              if (fs.existsSync(specPath)) {
                fs.copyFileSync(specPath, path.join(archiveVersionDir, "specification.md"))
              }

              if (args.changelog_entry) {
                const changelogPath = path.join(baseDir, "changelog.md")
                const existing = fs.readFileSync(changelogPath, "utf-8")
                fs.writeFileSync(changelogPath, existing + "\n" + args.changelog_entry + "\n", "utf-8")
              }

              return JSON.stringify({
                status: "SUCCESS",
                message: `已归档 OpenSpec 版本：${args.asset_type}/${args.asset_name} → v${args.version}`,
              })
            }

            return JSON.stringify({ status: "ERROR", error: "未知操作类型" })
          } catch (err) {
            return JSON.stringify({
              status: "ERROR",
              error: String(err),
            })
          }
        },
      }),

      /** 库部：OpenSpec 资产格式验证 */
      openspec_validate: tool({
        description:
          "库部验证工具，检查 openspec/ 目录结构的完整性和格式正确性。支持验证所有资产或特定资产。",
        args: {
          asset_type: tool.schema
            .enum(["service", "provider", "data-model", "ui-component", "utility"])
            .optional()
            .describe("可选，资产类型过滤"),
          asset_name: tool.schema.string().optional().describe("可选，资产名称过滤"),
        },
        async execute(args: { asset_type?: string; asset_name?: string }, ctx) {
          const root = findRoot(ctx.worktree)
          const openspecDir = path.join(root, "openspec")

          if (!fs.existsSync(openspecDir)) {
            return JSON.stringify({
              status: "PASS",
              total_errors: 0,
              message: "openspec 目录不存在（初始状态）",
              errors: [],
            })
          }

          const errors: string[] = []
          const types = args.asset_type ? [args.asset_type] : fs.readdirSync(openspecDir)

          for (const type of types) {
            const typeDir = path.join(openspecDir, type)
            if (!fs.statSync(typeDir).isDirectory()) continue

            const names = args.asset_name ? [args.asset_name] : fs.readdirSync(typeDir)
            for (const name of names) {
              const assetDir = path.join(typeDir, name)
              if (!fs.statSync(assetDir).isDirectory()) continue

              // 检查必需文件
              const proposal = path.join(assetDir, "proposal.md")
              const specification = path.join(assetDir, "specification.md")
              const changelog = path.join(assetDir, "changelog.md")
              const archive = path.join(assetDir, "archive")

              if (!fs.existsSync(proposal)) {
                errors.push(`缺失 proposal.md：${type}/${name}`)
              }
              if (!fs.existsSync(changelog)) {
                errors.push(`缺失 changelog.md：${type}/${name}`)
              }
              if (fs.existsSync(archive)) {
                const versions = fs.readdirSync(archive)
                if (versions.length === 0) {
                  errors.push(`archive 目录为空：${type}/${name}`)
                }
              }
            }
          }

          return JSON.stringify({
            status: errors.length === 0 ? "PASS" : "FAIL",
            total_errors: errors.length,
            errors,
          })
        },
      }),

      /** 中书省：设置任务变量 */
      set_variables: tool({
        description: "设置当前任务的变量（如 module_name、page_name 等）",
        args: {
          variables: tool.schema
            .record(tool.schema.string())
            .describe("键值对，如 { module_name: 'asset-manager', page_name: 'asset-manager' }"),
        },
        async execute(args, ctx) {
          const root = findRoot(ctx.worktree)
          const registry = readRegistry(root)
          Object.assign(registry.variables, args.variables)
          writeRegistry(root, registry)

          return [
            "✅ 变量已更新：",
            ...Object.entries(registry.variables)
              .filter(([, v]) => v)
              .map(([k, v]) => `  ${k}: ${v}`),
          ].join("\n")
        },
      }),

      /** 刑部：手动触发某步骤的验收 */
      verify_step: tool({
        description: "对指定步骤运行 contract.yaml 中定义的验收检查",
        args: {
          step: tool.schema.string().describe("步骤 ID 或 Skill 名称，如 infrastructure、tdd-red、scan"),
        },
        async execute(args, ctx) {
          const root = findRoot(ctx.worktree)
          const registry = readRegistry(root)
          const domain = readDomain(root, registry.active_domain)

          // 支持使用步骤 ID 或 Skill 名称
          const skillOrStep = args.step
          let skillName = skillOrStep
          if (domain) {
            const step = domain.pipeline.find(s => s.id === skillOrStep || s.skill === skillOrStep)
            if (step) {
              skillName = step.skill
            }
          }

          const contract = readContract(root, registry.active_domain, skillName)

          if (!contract) {
            return `❌ 找不到 contract.yaml：domains/${registry.active_domain}/skills/${skillName}/`
          }

          const variables = registry.variables
          const results: string[] = []
          let allPassed = true

          for (const check of contract.verify ?? []) {
            if (check.type === "command" && check.run) {
              const cmd = check.run.replace(/\{(\w+)\}/g, (_, k) => variables[k] ?? "")
              const result = await $`bash -c ${cmd}`.nothrow()

              if (check.expect === "exit_code_0") {
                const pass = result.exitCode === 0
                results.push(`${pass ? "✅" : "❌"} ${check.error_msg || cmd}`)
                if (!pass) allPassed = false
              } else if (check.expect === "contains" && check.value) {
                const out = result.stdout.toString() + result.stderr.toString()
                const pass = out.includes(check.value)
                results.push(`${pass ? "✅" : "❌"} ${check.error_msg || cmd}`)
                if (!pass) allPassed = false
              }
            } else if (check.type === "file_exists" && check.path) {
              const filePath = check.path.replace(/\{(\w+)\}/g, (_, k) => variables[k] ?? "")
              const exists = fs.existsSync(path.join(root, filePath))
              results.push(`${exists ? "✅" : "❌"} ${check.error_msg || filePath}`)
              if (!exists) allPassed = false
            }
          }

          return [
            `${allPassed ? "✅ 门下省验收通过" : "❌ 门下省验收失败"}：${contract.name}`,
            ...results,
          ].join("\n")
        },
      }),

    },
  }
}

export default SanShengLiuBuPlugin
