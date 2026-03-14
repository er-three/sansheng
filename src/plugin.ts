/**
 * 三省六部制 OpenCode Plugin - 执行层实现
 *
 * 功能：
 * 1. Level 2 并行执行 - 步骤内代理并行
 * 2. Level 3 并行执行 - 代理内子任务并行
 * 3. 全局约束注入 - 自动注入到 system prompt
 * 4. 流水线状态管理 - 跟踪并行执行进度
 */

import * as fs from "fs"
import * as path from "path"

// 动态导入以处理 SDK 兼容性
let tool: any
try {
  const sdk = require("@opencode-ai/sdk")
  tool = sdk.tool
} catch {
  try {
    const plugin = require("@opencode-ai/plugin")
    tool = plugin.tool
  } catch {
    // 降级：提供最小实现
    tool = (config: any) => config
  }
}

// ─────────────────── 类型定义 ───────────────────

interface ParallelTask {
  agent: string
  status: "pending" | "done" | "failed"
  error?: string
}

interface ParallelStep {
  step_id: string
  tasks: ParallelTask[]
  all_done: boolean
  started_at: string
}

interface PipelineState {
  completed: string[]
  current: string | null
  failed: string | null
  started_at: string
  parallel_execution?: ParallelStep | null
}

interface Registry {
  version: string
  active_domain: string
  variables: Record<string, string>
  pipeline_state?: PipelineState
}

interface DomainConfig {
  name: string
  description: string
  constraints: string[]
  pipeline: Array<{
    id: string
    name: string
    skill: string
    uses: string[]
  }>
}

interface GlobalConstraints {
  universal?: Array<{ name: string; content: string; priority: string }>
  agent_implementation?: Array<{ name: string; content: string; priority: string }>
  agent_code_review?: Array<{ name: string; content: string; priority: string }>
  agent_verification?: Array<{ name: string; content: string; priority: string }>
  parallel_execution?: Array<{ name: string; content: string; priority: string }>
  [key: string]: any
}

// ─────────────────── 辅助函数 ───────────────────

/**
 * 查找项目根目录
 */
function findRoot(worktree?: string): string {
  const cwd = worktree || process.cwd()
  const opencodePath = path.join(cwd, ".opencode")
  if (fs.existsSync(opencodePath)) {
    return cwd
  }
  // 向上查找
  const parent = path.dirname(cwd)
  if (parent === cwd) return cwd
  return findRoot(parent)
}

/**
 * 读取 registry.json
 */
function readRegistry(root: string): Registry {
  const registryPath = path.join(root, "registry.json")
  if (fs.existsSync(registryPath)) {
    const content = fs.readFileSync(registryPath, "utf-8")
    return JSON.parse(content)
  }
  return {
    version: "1.0.0",
    active_domain: "general",
    variables: {},
    pipeline_state: undefined,
  }
}

/**
 * 写入 registry.json
 */
function writeRegistry(root: string, registry: Registry): void {
  const registryPath = path.join(root, "registry.json")
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2))
}

/**
 * 读取 domain.yaml
 */
function readDomain(root: string, domainName: string): DomainConfig | null {
  const domainPath = path.join(root, ".opencode", "domains", domainName, "domain.yaml")
  if (!fs.existsSync(domainPath)) return null

  // 简化：直接返回配置对象（实际应解析 YAML）
  try {
    const yaml = require("js-yaml")
    const content = fs.readFileSync(domainPath, "utf-8")
    return yaml.load(content) as DomainConfig
  } catch {
    return null
  }
}

/**
 * 读取全局约束配置
 */
function readGlobalConstraints(root: string): GlobalConstraints | null {
  const constraintsPath = path.join(root, ".opencode", "global-constraints.yaml")
  if (!fs.existsSync(constraintsPath)) return null

  try {
    const yaml = require("js-yaml")
    const content = fs.readFileSync(constraintsPath, "utf-8")
    return yaml.load(content) as GlobalConstraints
  } catch {
    return null
  }
}

/**
 * 生成流水线状态显示
 */
function generatePipelineStatus(
  domain: DomainConfig | null,
  state: PipelineState | undefined,
  variables: Record<string, string>
): string {
  if (!domain) return ""

  const completed = state?.completed ?? []
  const current = state?.current
  const parallelExec = state?.parallel_execution
  const total = domain.pipeline.length
  const done = completed.length

  const lines: string[] = []

  lines.push("═".repeat(60))
  lines.push("【⏱️  流水线实时状态】")
  lines.push("═".repeat(60))
  lines.push(`领域: ${domain.name}`)
  lines.push(`进度: ${done}/${total} 步完成`)

  const barLength = 40
  const filledLength = Math.round((done / total) * barLength)
  const bar = "█".repeat(filledLength) + "░".repeat(barLength - filledLength)
  lines.push(`[${bar}] ${Math.round((done / total) * 100)}%`)
  lines.push("")

  // 步骤详情
  for (let i = 0; i < domain.pipeline.length; i++) {
    const step = domain.pipeline[i]
    const isDone = completed.includes(step.id)
    const isActive = step.id === current
    const isParallel = parallelExec?.step_id === step.id

    let icon = "⬜"
    if (isDone) icon = "✅"
    else if (isActive || isParallel) icon = "▶️"

    const uses = step.uses.join(", ")
    const status = isParallel
      ? `[${parallelExec.tasks.map((t) => `${t.agent}=${t.status[0]}`).join(",")}]`
      : ""

    lines.push(`${icon} ${i + 1}. ${step.name} (${step.id})`)
    if (uses) lines.push(`   用: ${uses} ${status}`)
  }

  lines.push("═".repeat(60))

  return lines.join("\n")
}

// ─────────────────── Plugin 定义 ───────────────────

export const sanshengLiubuPlugin: any = {
  name: "@sansheng/liubu",
  version: "1.0.0",

  hooks: {
    /**
     * 中书省 - 动态注入领域约束和流水线状态
     */
    "experimental.chat.system.transform": async (
      _input: Record<string, unknown>,
      output: { system: string[] }
    ) => {
      try {
        // 获取 root 目录
        const root = findRoot()

        // 读取配置
        const registry = readRegistry(root)
        const domain = readDomain(root, registry.active_domain)
        if (!domain) return

        // ━━━ 1. 注入领域约束（domain.yaml 中的 constraints） ━━━
        const domainConstraints = [
          `## 【${domain.name}】领域特定约束`,
          "",
          ...domain.constraints.map((c) => `- ${c}`),
          "",
        ].join("\n")
        output.system.push(domainConstraints)

        // ━━━ 2. 注入全局约束（global-constraints.yaml） ━━━
        const globalConstraints = readGlobalConstraints(root)
        if (globalConstraints) {
          // 2.1 通用约束
          const universal = globalConstraints.universal || []
          if (universal.length > 0) {
            const universalText = [
              "## 全局通用约束（必须遵守）",
              "",
              ...universal.map((c) => `**${c.name}**：${c.content}`),
              "",
            ].join("\n")
            output.system.push(universalText)
          }

          // 2.2 根据 agent_type 注入专用约束
          const agentType = (_input as any).agent_type || "unknown"
          let typeSpecificConstraints: Array<{ name: string; content: string }> = []

          if (
            agentType === "gongbu" ||
            agentType === "implementation"
          ) {
            typeSpecificConstraints = globalConstraints.agent_implementation || []
          } else if (
            agentType === "xingbu" ||
            agentType === "review"
          ) {
            typeSpecificConstraints = globalConstraints.agent_code_review || []
          } else if (
            agentType === "bingbu" ||
            agentType === "verification"
          ) {
            typeSpecificConstraints = globalConstraints.agent_verification || []
          }

          if (typeSpecificConstraints.length > 0) {
            const typeText = [
              `## ${agentType} 专用约束`,
              "",
              ...typeSpecificConstraints.map((c) => `- ${c.content}`),
              "",
            ].join("\n")
            output.system.push(typeText)
          }

          // 2.3 并行执行约束
          if (registry.pipeline_state?.parallel_execution) {
            const parallelConstraints = globalConstraints.parallel_execution || []
            if (parallelConstraints.length > 0) {
              const parallelText = [
                "## 并行执行约束（当前步骤并行执行中）",
                "",
                ...parallelConstraints.map((c) => `- ${c.content}`),
                "",
              ].join("\n")
              output.system.push(parallelText)
            }
          }
        }

        // ━━━ 3. 自动注入实时流水线状态 ━━━
        const pipelineStatus = generatePipelineStatus(
          domain,
          registry.pipeline_state,
          registry.variables
        )
        output.system.push(pipelineStatus)
      } catch (error) {
        // 配置不存在时静默跳过
      }
    },

    /**
     * 门下省 - 跟踪并行任务状态，自动验收
     */
    "tool.execute.after": async (
      input: Record<string, unknown>,
      output: { output: string }
    ) => {
      try {
        const root = findRoot()
        const registry = readRegistry(root)
        const domain = readDomain(root, registry.active_domain)
        if (!domain) return

        // 获取当前步骤信息
        const skillName = (input as any).args?.skill_name || (input as any).args?.name
        if (!skillName) return

        // 找对应的步骤
        const step = domain.pipeline.find(
          (s) => s.skill === skillName || s.id === skillName
        )
        if (!step) return

        const stepId = step.id
        const state = registry.pipeline_state || {
          completed: [],
          current: null,
          failed: null,
          started_at: new Date().toISOString(),
        }

        // ━━━ 检查是否在并行任务中 ━━━
        if (
          state.parallel_execution &&
          state.parallel_execution.step_id === stepId
        ) {
          const parallelExec = state.parallel_execution
          const agent = (input as any).args?.agent || "unknown"
          const task = parallelExec.tasks.find((t) => t.agent === agent)

          if (task) {
            task.status = "done"
          }

          // 检查所有并行任务是否完成
          const allDone = parallelExec.tasks.every(
            (t) => t.status === "done" || t.status === "failed"
          )
          const anyFailed = parallelExec.tasks.some((t) => t.status === "failed")

          if (allDone) {
            // 所有并行任务完成
            state.parallel_execution = null

            if (!anyFailed) {
              if (!state.completed.includes(stepId)) {
                state.completed.push(stepId)
              }
              state.current = domain.pipeline[
                domain.pipeline.findIndex((s) => s.id === stepId) + 1
              ]?.id || null
            } else {
              state.failed = stepId
            }

            registry.pipeline_state = state
            writeRegistry(root, registry)

            // 输出状态更新
            output.output += [
              "",
              "---",
              anyFailed
                ? `## ❌ 并行任务失败：${parallelExec.tasks
                    .filter((t) => t.status === "failed")
                    .map((t) => t.agent)
                    .join(", ")}`
                : `## ✅ 并行任务全部完成`,
              `状态: ${parallelExec.tasks.map((t) => `${t.agent}=${t.status}`).join(", ")}`,
              "",
            ].join("\n")
          } else {
            registry.pipeline_state = state
            writeRegistry(root, registry)

            const pendingAgents = parallelExec.tasks
              .filter((t) => t.status === "pending")
              .map((t) => t.agent)
              .join(", ")

            output.output += [
              "",
              "---",
              `## ⏳ 并行任务进行中 (${agent} 完成，等待: ${pendingAgents})`,
              "",
            ].join("\n")
          }
        }
      } catch {
        // 错误时不中断执行
      }
    },
  },

  tools: {
    /**
     * 尚书省 - 初始化并行任务
     */
    init_parallel: tool({
      description:
        "初始化一个步骤的并行任务执行。由尚书省在步骤内有多个 uses 时调用。",
      args: {
        step_id: tool.schema.string().describe("步骤 ID，如 analyze、implement"),
        agents: tool.schema
          .array(tool.schema.string())
          .describe("并行执行的代理列表，如 ['yibu', 'gongbu']"),
      },
      async execute(
        args: { step_id: string; agents: string[] },
        ctx: Record<string, unknown>
      ) {
        const root = findRoot(ctx.worktree as string | undefined)
        const registry = readRegistry(root)

        const state = registry.pipeline_state || {
          completed: [],
          current: null,
          failed: null,
          started_at: new Date().toISOString(),
        }

        // 初始化并行任务
        state.parallel_execution = {
          step_id: args.step_id,
          tasks: args.agents.map((agent) => ({
            agent,
            status: "pending",
          })),
          all_done: false,
          started_at: new Date().toISOString(),
        }

        registry.pipeline_state = state
        writeRegistry(root, registry)

        return JSON.stringify({
          status: "OK",
          message: `✅ 并行任务已初始化：${args.step_id}`,
          agents: args.agents,
          task_count: args.agents.length,
        })
      },
    }),

    /**
     * 中书省 - 获取流水线状态
     */
    pipeline_status: tool({
      description: "获取当前流水线执行状态",
      async execute(_: unknown, ctx: Record<string, unknown>) {
        const root = findRoot(ctx.worktree as string | undefined)
        const registry = readRegistry(root)
        const domain = readDomain(root, registry.active_domain)

        const status = generatePipelineStatus(
          domain,
          registry.pipeline_state,
          registry.variables
        )

        return status
      },
    }),

    /**
     * 中书省 - 设置变量
     */
    set_variables: tool({
      description: "设置任务变量（如 module_name、page_name 等）",
      args: {
        variables: tool.schema
          .record(tool.schema.string())
          .describe("键值对"),
      },
      async execute(
        args: { variables: Record<string, string> },
        ctx: Record<string, unknown>
      ) {
        const root = findRoot(ctx.worktree as string | undefined)
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

    /**
     * 门下省 - 切换域
     */
    switch_domain: tool({
      description: "切换执行域（如 asset-management、cr-processing 等）",
      args: {
        domain: tool.schema.string().describe("目标域名称"),
      },
      async execute(args: { domain: string }, ctx: Record<string, unknown>) {
        const root = findRoot(ctx.worktree as string | undefined)
        const registry = readRegistry(root)

        registry.active_domain = args.domain
        registry.pipeline_state = undefined // 重置流水线状态
        writeRegistry(root, registry)

        return `✅ 已切换到 ${args.domain} 域`
      },
    }),

    /**
     * 门下省 - 获取所有域
     */
    list_domains: tool({
      description: "列出所有可用域",
      async execute(_: unknown, ctx: Record<string, unknown>) {
        const root = findRoot(ctx.worktree as string | undefined)
        const domainsPath = path.join(root, ".opencode", "domains")

        if (!fs.existsSync(domainsPath)) {
          return "❌ 未找到任何域"
        }

        const domains = fs
          .readdirSync(domainsPath)
          .filter((name) => {
            const domainPath = path.join(domainsPath, name)
            return (
              fs.statSync(domainPath).isDirectory() &&
              fs.existsSync(path.join(domainPath, "domain.yaml"))
            )
          })

        return `✅ 可用域列表：\n${domains.map((d) => `  - ${d}`).join("\n")}`
      },
    }),
  },
}

export default sanshengLiubuPlugin
