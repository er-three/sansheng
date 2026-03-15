/**
 * Agent 系统优化与特化 - Phase 5 P3-2
 *
 * Agent 级别的深度优化：
 * - Agent 特化约束加载
 * - 智能缓存预热
 * - 并行执行协调
 * - 负载均衡
 *
 * 目标：额外节省 5-10% token，提升执行效率
 */

import { log } from "../utils.js"

/**
 * Agent 类型定义
 */
export enum AgentType {
  COORDINATOR = "coordinator", // 皇帝 (huangdi) - 协调者
  PROVINCE_GOVERNOR = "province_governor", // 三省 - 省级官员
  DEPARTMENT_HEAD = "department_head", // 六部 - 部门主管
  SPECIALIST = "specialist", // 专家级
  EXECUTOR = "executor", // 执行器
}

/**
 * Agent 信息
 */
export interface AgentInfo {
  name: string
  type: AgentType
  domain: string
  specialties: string[] // 专长领域
  cache_affinity: number // 缓存亲和度 (0-100)
  parallelizable: boolean // 是否可并行
  typical_load: number // 典型负载 (tokens)
}

/**
 * Agent 优化配置
 */
export interface AgentOptimizationConfig {
  enable_constraint_specialization: boolean
  enable_cache_preheating: boolean
  enable_parallel_coordination: boolean
  preload_patterns?: string[] // 预加载模式
  cache_priority?: number
  max_parallel_tasks?: number
}

/**
 * 缓存预热方案
 */
export interface CacheWarmupPlan {
  agent_name: string
  items: Array<{
    type: "constraint" | "plan" | "step_result"
    key: string
    data: any
    priority: "high" | "medium" | "low"
  }>
  estimated_size: number
  estimated_savings: number
}

/**
 * 并行任务组
 */
export interface ParallelTaskGroup {
  group_id: string
  tasks: Array<{
    task_id: string
    agent: string
    dependencies: string[]
    estimated_time: number
  }>
  critical_path: string[]
  parallelism_degree: number
}

/**
 * Agent 优化器
 */
export class AgentOptimizer {
  private agents: Map<string, AgentInfo> = new Map()
  private configs: Map<string, AgentOptimizationConfig> = new Map()
  private warmup_plans: Map<string, CacheWarmupPlan> = new Map()

  /**
   * 注册 Agent
   */
  registerAgent(info: AgentInfo): void {
    this.agents.set(info.name, info)

    // 自动生成优化配置
    const config: AgentOptimizationConfig = {
      enable_constraint_specialization: true,
      enable_cache_preheating: info.cache_affinity > 60,
      enable_parallel_coordination: info.parallelizable,
      cache_priority: Math.ceil(info.cache_affinity / 10),
      max_parallel_tasks: info.type === AgentType.COORDINATOR ? 1 : 5,
    }

    this.configs.set(info.name, config)
    log("AgentOptimizer", `Registered Agent ${info.name} (${info.type})`)
  }

  /**
   * 获取 Agent 信息
   */
  getAgent(name: string): AgentInfo | undefined {
    return this.agents.get(name)
  }

  /**
   * 生成约束特化配置
   */
  generateConstraintSpecialization(agent_name: string): string[] {
    const agent = this.agents.get(agent_name)
    if (!agent) return []

    const specialization: string[] = []

    // 根据 Agent 类型和专长确定约束
    switch (agent.type) {
      case AgentType.COORDINATOR:
        specialization.push("流程尊重", "原样汇报", "完整输出")
        break
      case AgentType.PROVINCE_GOVERNOR:
        specialization.push("流程尊重", "完整输出", "代码质量")
        break
      case AgentType.DEPARTMENT_HEAD:
        specialization.push("完整输出", "代码质量", "落盘要求")
        break
      case AgentType.SPECIALIST:
        specialization.push("代码质量", "完整输出", "失败处理")
        break
      case AgentType.EXECUTOR:
        specialization.push("代码质量", "失败处理", "落盘要求")
        break
    }

    // 添加特殊约束
    for (const specialty of agent.specialties) {
      if (specialty.includes("code")) {
        specialization.push("代码质量")
      }
      if (specialty.includes("review")) {
        specialization.push("原样汇报")
      }
      if (specialty.includes("parallel")) {
        specialization.push("流程尊重")
      }
    }

    return [...new Set(specialization)] // 去重
  }

  /**
   * 生成缓存预热方案
   */
  generateCacheWarmupPlan(
    agent_name: string,
    available_data: Map<string, { key: string; size: number; priority: number }>
  ): CacheWarmupPlan {
    const agent = this.agents.get(agent_name)
    if (!agent) {
      return {
        agent_name,
        items: [],
        estimated_size: 0,
        estimated_savings: 0,
      }
    }

    const config = this.configs.get(agent_name)!
    if (!config.enable_cache_preheating) {
      return {
        agent_name,
        items: [],
        estimated_size: 0,
        estimated_savings: 0,
      }
    }

    const items: CacheWarmupPlan["items"] = []
    let totalSize = 0
    let totalSavings = 0

    // 根据优先级和 Agent 亲和度选择数据
    const sorted = Array.from(available_data.entries())
      .sort((a, b) => b[1].priority - a[1].priority)
      .slice(0, config.cache_priority ? config.cache_priority * 5 : 10)

    for (const [type, data] of sorted) {
      let itemType: "constraint" | "plan" | "step_result" = "constraint"
      if (type.includes("plan")) itemType = "plan"
      else if (type.includes("step")) itemType = "step_result"

      items.push({
        type: itemType,
        key: data.key,
        data: null, // 实际数据在使用时加载
        priority: data.priority > 70 ? "high" : data.priority > 40 ? "medium" : "low",
      })

      totalSize += data.size
      totalSavings += data.size * 0.7 // 估计 70% 的节省
    }

    this.warmup_plans.set(agent_name, {
      agent_name,
      items,
      estimated_size: totalSize,
      estimated_savings: totalSavings,
    })

    return this.warmup_plans.get(agent_name)!
  }

  /**
   * 获取 Agent 的缓存预热方案
   */
  getWarmupPlan(agent_name: string): CacheWarmupPlan | undefined {
    return this.warmup_plans.get(agent_name)
  }

  /**
   * 获取所有已注册的 Agent
   */
  getAllAgents(): AgentInfo[] {
    return Array.from(this.agents.values())
  }

  /**
   * 获取优化配置
   */
  getConfig(agent_name: string): AgentOptimizationConfig | undefined {
    return this.configs.get(agent_name)
  }

  /**
   * 生成优化报告
   */
  generateOptimizationReport(): string {
    const lines = [
      "## Agent 系统优化报告",
      "",
      "### 注册的 Agent",
      ...Array.from(this.agents.values()).map((a) => `- ${a.name} (${a.type})`),
      "",
      "### 约束特化",
      ...Array.from(this.agents.keys())
        .map((name) => {
          const constraints = this.generateConstraintSpecialization(name)
          return `#### ${name}\n- ${constraints.join(", ")}`
        }),
      "",
      "### 缓存预热方案",
      ...Array.from(this.warmup_plans.values()).map(
        (plan) =>
          `#### ${plan.agent_name}\n- 项目数：${plan.items.length}\n- 估计大小：${(plan.estimated_size / 1024).toFixed(2)} KB\n- 估计节省：${(plan.estimated_savings / 1024).toFixed(2)} KB`
      ),
      "",
    ]

    return lines.join("\n")
  }
}

/**
 * 并行执行协调器
 */
export class ParallelCoordinator {
  private task_groups: Map<string, ParallelTaskGroup> = new Map()
  private execution_order: string[][] = [] // 执行阶段

  /**
   * 分析并行机会
   */
  analyzeTasks(tasks: Array<{ id: string; agent: string; deps: string[] }>): ParallelTaskGroup {
    const group_id = `group-${Date.now()}`

    // 构建依赖图
    const depMap = new Map<string, string[]>()
    const reverseDeps = new Map<string, string[]>()

    for (const task of tasks) {
      depMap.set(task.id, task.deps)
      for (const dep of task.deps) {
        if (!reverseDeps.has(dep)) {
          reverseDeps.set(dep, [])
        }
        reverseDeps.get(dep)!.push(task.id)
      }
    }

    // 找到关键路径（使用拓扑排序）
    const critical_path: string[] = []
    const visited = new Set<string>()
    const in_degree = new Map<string, number>()

    for (const task of tasks) {
      in_degree.set(task.id, task.deps.length)
    }

    // 拓扑排序以找到执行顺序
    const queue: string[] = tasks.filter((t) => t.deps.length === 0).map((t) => t.id)
    let max_length = 0
    let longest_path: string[] = []

    while (queue.length > 0) {
      const current = queue.shift()!
      const path = [current]

      // 简单的路径追踪
      for (const dep of depMap.get(current) || []) {
        if (path.length > max_length) {
          max_length = path.length
          longest_path = [...path]
        }
      }

      for (const dependent of reverseDeps.get(current) || []) {
        const new_in_degree = (in_degree.get(dependent) || 0) - 1
        in_degree.set(dependent, new_in_degree)
        if (new_in_degree === 0) {
          queue.push(dependent)
        }
      }
    }

    // 计算并行度（最多可同时执行的任务数）
    const parallelism_degree = Math.min(
      tasks.length,
      Math.max(1, Math.ceil(tasks.length / (longest_path.length || 1)))
    )

    const group: ParallelTaskGroup = {
      group_id,
      tasks: tasks.map((t) => ({
        task_id: t.id,
        agent: t.agent,
        dependencies: t.deps,
        estimated_time: 1000, // 默认估计
      })),
      critical_path: longest_path,
      parallelism_degree,
    }

    this.task_groups.set(group_id, group)
    log("ParallelCoordinator", `Analyzed ${tasks.length} tasks, parallelism degree: ${parallelism_degree}`)

    return group
  }

  /**
   * 生成执行计划
   */
  generateExecutionPlan(group_id: string): string[][] {
    const group = this.task_groups.get(group_id)
    if (!group) return []

    // 按依赖关系分组
    const levels: Map<number, string[]> = new Map()
    const taskLevels = new Map<string, number>()

    // 拓扑排序分配层级
    const in_degree = new Map<string, number>()
    for (const task of group.tasks) {
      in_degree.set(task.task_id, task.dependencies.length)
    }

    let level = 0
    while (true) {
      const current_level = group.tasks
        .filter((t) => in_degree.get(t.task_id) === 0)
        .map((t) => t.task_id)

      if (current_level.length === 0) break

      levels.set(level, current_level)
      for (const task_id of current_level) {
        taskLevels.set(task_id, level)
        in_degree.delete(task_id)

        // 更新依赖的任务的入度
        for (const task of group.tasks) {
          if (task.dependencies.includes(task_id)) {
            in_degree.set(task.task_id, (in_degree.get(task.task_id) || 0) - 1)
          }
        }
      }

      level++
    }

    this.execution_order = Array.from(levels.values())
    return this.execution_order
  }

  /**
   * 获取执行计划
   */
  getExecutionOrder(group_id: string): string[][] {
    if (this.execution_order.length === 0) {
      this.generateExecutionPlan(group_id)
    }
    return this.execution_order
  }

  /**
   * 获取任务组
   */
  getTaskGroup(group_id: string): ParallelTaskGroup | undefined {
    return this.task_groups.get(group_id)
  }

  /**
   * 生成协调报告
   */
  generateCoordinationReport(group_id: string): string {
    const group = this.task_groups.get(group_id)
    if (!group) return "No task group found"

    const execution_plan = this.getExecutionOrder(group_id)

    const lines = [
      `## 并行执行协调报告 - ${group_id}`,
      "",
      `**任务总数**：${group.tasks.length}`,
      `**并行度**：${group.parallelism_degree}`,
      `**关键路径长度**：${group.critical_path.length}`,
      `**执行阶段**：${execution_plan.length}`,
      "",
      "### 执行计划",
      ...execution_plan.map(
        (phase, idx) => `**阶段 ${idx + 1}**: ${phase.join(", ")} (${phase.length} 个任务并行)`
      ),
      "",
      "### 关键路径",
      group.critical_path.join(" → "),
      "",
      "### 潜在加速比",
      `理论加速比：${(group.tasks.length / (group.critical_path.length || 1)).toFixed(2)}x`,
      `实际加速比：${group.parallelism_degree}x`,
      "",
    ]

    return lines.join("\n")
  }
}

/**
 * 负载均衡器
 */
export class LoadBalancer {
  private agent_loads: Map<string, number> = new Map()
  private task_queue: Array<{
    id: string
    preferred_agent?: string
    estimated_load: number
  }> = []

  /**
   * 设置 Agent 负载
   */
  setAgentLoad(agent_name: string, load: number): void {
    this.agent_loads.set(agent_name, load)
  }

  /**
   * 获取 Agent 负载
   */
  getAgentLoad(agent_name: string): number {
    return this.agent_loads.get(agent_name) || 0
  }

  /**
   * 分配任务到最轻载的 Agent
   */
  assignTask(
    task_id: string,
    estimated_load: number,
    preferred_agent?: string
  ): { assigned_to: string; load_after: number } {
    let best_agent = preferred_agent
    let best_load = preferred_agent ? this.getAgentLoad(preferred_agent) : Infinity

    // 如果没有偏好或偏好 Agent 过载，寻找最轻载的 Agent
    if (!best_agent || best_load > 50) {
      for (const [agent, load] of this.agent_loads.entries()) {
        if (load < best_load) {
          best_agent = agent
          best_load = load
        }
      }
    }

    if (!best_agent) {
      best_agent = "default"
      best_load = 0
    }

    const new_load = best_load + estimated_load
    this.agent_loads.set(best_agent, new_load)

    log("LoadBalancer", `Assigned ${task_id} to ${best_agent} (load: ${new_load})`)

    return { assigned_to: best_agent, load_after: new_load }
  }

  /**
   * 获取负载分布
   */
  getLoadDistribution(): Map<string, number> {
    return new Map(this.agent_loads)
  }

  /**
   * 检查是否需要负载均衡
   */
  needsRebalancing(): boolean {
    if (this.agent_loads.size < 2) return false

    const loads = Array.from(this.agent_loads.values())
    const avg = loads.reduce((a, b) => a + b, 0) / loads.length
    const max_deviation = Math.max(...loads.map((l) => Math.abs(l - avg)))

    return max_deviation > avg * 0.3 // 超过平均值 30% 时需要均衡
  }

  /**
   * 生成负载报告
   */
  generateLoadReport(): string {
    const loads = this.getLoadDistribution()
    const loads_array = Array.from(loads.values())
    const total_load = loads_array.reduce((a, b) => a + b, 0)
    const avg_load = total_load / loads_array.length

    const lines = [
      "## 负载均衡报告",
      `- 总负载：${total_load}`,
      `- 平均负载：${avg_load.toFixed(2)}`,
      `- 最大负载：${Math.max(...loads_array)}`,
      `- 最小负载：${Math.min(...loads_array)}`,
      `- 需要重新均衡：${this.needsRebalancing() ? "是" : "否"}`,
      "",
      "### Agent 负载分布",
      ...Array.from(loads.entries()).map(([agent, load]) => {
        const percentage = ((load / total_load) * 100).toFixed(1)
        return `- ${agent}：${load} (${percentage}%)`
      }),
      "",
    ]

    return lines.join("\n")
  }
}
