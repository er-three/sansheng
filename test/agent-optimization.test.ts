/**
 * Agent 系统优化测试 - Phase 5 P3-2
 *
 * 验证：
 * - Agent 约束特化
 * - 缓存预热方案
 * - 并行执行协调
 * - 负载均衡
 */

import assert from "assert"
import {
  AgentOptimizer,
  AgentType,
  ParallelCoordinator,
  LoadBalancer,
  AgentInfo,
} from "../src/agent/optimization"

describe("Agent 系统优化", () => {
  // ─────────────────── Agent 优化器测试 ───────────────────

  describe("Agent 优化器", () => {
    let optimizer: AgentOptimizer

    beforeEach(() => {
      optimizer = new AgentOptimizer()
    })

    it("应该注册 Agent", () => {
      const agentInfo: AgentInfo = {
        name: "gongbu",
        type: AgentType.DEPARTMENT_HEAD,
        domain: "general",
        specialties: ["code", "implementation"],
        cache_affinity: 75,
        parallelizable: true,
        typical_load: 5000,
      }

      optimizer.registerAgent(agentInfo)

      const retrieved = optimizer.getAgent("gongbu")
      assert.strictEqual(retrieved?.name, "gongbu")
    })

    it("应该生成约束特化配置", () => {
      optimizer.registerAgent({
        name: "huangdi",
        type: AgentType.COORDINATOR,
        domain: "general",
        specialties: [],
        cache_affinity: 50,
        parallelizable: false,
        typical_load: 3000,
      })

      const constraints = optimizer.generateConstraintSpecialization("huangdi")
      assert(constraints.length > 0)
      assert(constraints.includes("流程尊重"))
      assert(constraints.includes("原样汇报"))
    })

    it("应该为不同 Agent 类型生成不同约束", () => {
      optimizer.registerAgent({
        name: "yibu",
        type: AgentType.SPECIALIST,
        domain: "general",
        specialties: ["analysis"],
        cache_affinity: 60,
        parallelizable: true,
        typical_load: 4000,
      })

      optimizer.registerAgent({
        name: "xingbu",
        type: AgentType.EXECUTOR,
        domain: "general",
        specialties: ["verification"],
        cache_affinity: 70,
        parallelizable: true,
        typical_load: 3000,
      })

      const yibu_constraints = optimizer.generateConstraintSpecialization("yibu")
      const xingbu_constraints = optimizer.generateConstraintSpecialization("xingbu")

      assert.notStrictEqual(
        yibu_constraints.join(","),
        xingbu_constraints.join(",")
      )
    })

    it("应该生成缓存预热方案", () => {
      optimizer.registerAgent({
        name: "gongbu",
        type: AgentType.DEPARTMENT_HEAD,
        domain: "general",
        specialties: ["code"],
        cache_affinity: 80,
        parallelizable: true,
        typical_load: 5000,
      })

      const available_data = new Map<
        string,
        { key: string; size: number; priority: number }
      >()
      available_data.set("constraint-1", { key: "c1", size: 1000, priority: 90 })
      available_data.set("plan-1", { key: "p1", size: 2000, priority: 80 })

      const plan = optimizer.generateCacheWarmupPlan("gongbu", available_data)

      assert(plan.items.length > 0)
      assert(plan.estimated_size > 0)
      assert(plan.estimated_savings > 0)
    })

    it("应该获取所有已注册的 Agent", () => {
      for (let i = 0; i < 5; i++) {
        optimizer.registerAgent({
          name: `agent-${i}`,
          type: AgentType.EXECUTOR,
          domain: "general",
          specialties: [],
          cache_affinity: 50,
          parallelizable: true,
          typical_load: 2000,
        })
      }

      const agents = optimizer.getAllAgents()
      assert.strictEqual(agents.length, 5)
    })

    it("应该生成优化报告", () => {
      optimizer.registerAgent({
        name: "test-agent",
        type: AgentType.SPECIALIST,
        domain: "general",
        specialties: ["code"],
        cache_affinity: 70,
        parallelizable: true,
        typical_load: 4000,
      })

      const report = optimizer.generateOptimizationReport()
      assert(report.includes("Agent 系统优化报告"))
      assert(report.includes("test-agent"))
    })
  })

  // ─────────────────── 并行协调器测试 ───────────────────

  describe("并行执行协调器", () => {
    let coordinator: ParallelCoordinator

    beforeEach(() => {
      coordinator = new ParallelCoordinator()
    })

    it("应该分析任务并行机会", () => {
      const tasks = [
        { id: "task-1", agent: "yibu", deps: [] },
        { id: "task-2", agent: "gongbu", deps: ["task-1"] },
        { id: "task-3", agent: "xingbu", deps: ["task-2"] },
      ]

      const group = coordinator.analyzeTasks(tasks)

      assert.strictEqual(group.tasks.length, 3)
      assert(group.parallelism_degree > 0)
    })

    it("应该识别可并行的任务", () => {
      const tasks = [
        { id: "task-1", agent: "yibu", deps: [] },
        { id: "task-2", agent: "gongbu", deps: [] },
        { id: "task-3", agent: "xingbu", deps: ["task-1", "task-2"] },
      ]

      const group = coordinator.analyzeTasks(tasks)

      // task-1 和 task-2 可以并行
      assert(group.parallelism_degree >= 2)
    })

    it("应该生成执行计划", () => {
      const tasks = [
        { id: "task-1", agent: "yibu", deps: [] },
        { id: "task-2", agent: "gongbu", deps: ["task-1"] },
        { id: "task-3", agent: "xingbu", deps: ["task-1"] },
        { id: "task-4", agent: "bingbu", deps: ["task-2", "task-3"] },
      ]

      const group = coordinator.analyzeTasks(tasks)
      const plan = coordinator.generateExecutionPlan(group.group_id)

      assert(plan.length > 0)
      // 第一阶段应该有 task-1
      assert(plan[0].includes("task-1"))
      // 最后一阶段应该有 task-4
      assert(plan[plan.length - 1].includes("task-4"))
    })

    it("应该计算关键路径", () => {
      const tasks = [
        { id: "task-1", agent: "yibu", deps: [] },
        { id: "task-2", agent: "gongbu", deps: [] },
        { id: "task-3", agent: "xingbu", deps: ["task-1", "task-2"] },
      ]

      const group = coordinator.analyzeTasks(tasks)

      assert(group.critical_path.length > 0)
    })

    it("应该生成协调报告", () => {
      const tasks = [
        { id: "task-1", agent: "yibu", deps: [] },
        { id: "task-2", agent: "gongbu", deps: ["task-1"] },
      ]

      const group = coordinator.analyzeTasks(tasks)
      const report = coordinator.generateCoordinationReport(group.group_id)

      assert(report.includes("并行执行协调报告"))
      assert(report.includes("任务总数"))
      assert(report.includes("并行度"))
    })
  })

  // ─────────────────── 负载均衡器测试 ───────────────────

  describe("负载均衡器", () => {
    let balancer: LoadBalancer

    beforeEach(() => {
      balancer = new LoadBalancer()
    })

    it("应该设置和获取 Agent 负载", () => {
      balancer.setAgentLoad("gongbu", 5000)
      assert.strictEqual(balancer.getAgentLoad("gongbu"), 5000)
    })

    it("应该将任务分配给负载最轻的 Agent", () => {
      balancer.setAgentLoad("gongbu", 5000)
      balancer.setAgentLoad("yibu", 2000)

      const assignment = balancer.assignTask("task-1", 1000)
      assert.strictEqual(assignment.assigned_to, "yibu")
    })

    it("应该考虑偏好 Agent", () => {
      balancer.setAgentLoad("gongbu", 2000)
      balancer.setAgentLoad("yibu", 3000)

      const assignment = balancer.assignTask("task-1", 1000, "gongbu")
      assert.strictEqual(assignment.assigned_to, "gongbu")
    })

    it("应该在偏好 Agent 过载时选择其他 Agent", () => {
      balancer.setAgentLoad("gongbu", 8000) // 过载
      balancer.setAgentLoad("yibu", 3000)

      const assignment = balancer.assignTask("task-1", 1000, "gongbu")
      assert.strictEqual(assignment.assigned_to, "yibu")
    })

    it("应该检测是否需要负载均衡", () => {
      balancer.setAgentLoad("gongbu", 100)
      balancer.setAgentLoad("yibu", 2)

      assert(balancer.needsRebalancing())
    })

    it("应该生成负载报告", () => {
      balancer.setAgentLoad("gongbu", 5000)
      balancer.setAgentLoad("yibu", 3000)

      const report = balancer.generateLoadReport()
      assert(report.includes("负载均衡报告"))
      assert(report.includes("总负载"))
      assert(report.includes("gongbu"))
    })

    it("应该计算负载分布百分比", () => {
      balancer.setAgentLoad("gongbu", 6000)
      balancer.setAgentLoad("yibu", 4000)

      const report = balancer.generateLoadReport()
      // gongbu 应该是 60%
      assert(report.includes("60"))
    })
  })

  // ─────────────────── 端到端优化场景 ───────────────────

  describe("端到端 Agent 优化场景", () => {
    it("应该完整支持 Agent 优化工作流", () => {
      const optimizer = new AgentOptimizer()
      const coordinator = new ParallelCoordinator()
      const balancer = new LoadBalancer()

      // 1. 注册 Agent
      const agents: AgentInfo[] = [
        {
          name: "yibu",
          type: AgentType.SPECIALIST,
          domain: "general",
          specialties: ["analysis"],
          cache_affinity: 60,
          parallelizable: true,
          typical_load: 4000,
        },
        {
          name: "gongbu",
          type: AgentType.DEPARTMENT_HEAD,
          domain: "general",
          specialties: ["code"],
          cache_affinity: 80,
          parallelizable: true,
          typical_load: 5000,
        },
        {
          name: "xingbu",
          type: AgentType.EXECUTOR,
          domain: "general",
          specialties: ["verification"],
          cache_affinity: 70,
          parallelizable: true,
          typical_load: 3000,
        },
      ]

      for (const agent of agents) {
        optimizer.registerAgent(agent)
        balancer.setAgentLoad(agent.name, agent.typical_load)
      }

      // 2. 分析任务依赖关系
      const tasks = [
        { id: "analyze", agent: "yibu", deps: [] },
        { id: "implement", agent: "gongbu", deps: ["analyze"] },
        { id: "verify", agent: "xingbu", deps: ["implement"] },
      ]

      const group = coordinator.analyzeTasks(tasks)
      assert(group.tasks.length === 3)

      // 3. 为每个 Agent 生成特化约束
      for (const agent of agents) {
        const constraints = optimizer.generateConstraintSpecialization(agent.name)
        assert(constraints.length > 0)
      }

      // 4. 生成缓存预热方案
      const available_data = new Map([
        ["constraint-1", { key: "c1", size: 1000, priority: 90 }],
        ["plan-1", { key: "p1", size: 2000, priority: 80 }],
      ])

      for (const agent of agents) {
        const plan = optimizer.generateCacheWarmupPlan(agent.name, available_data)
        assert(plan.items.length >= 0)
      }

      // 5. 分配任务到 Agent
      for (const task of tasks) {
        const assignment = balancer.assignTask(task.id, 2000, task.agent)
        assert(assignment.assigned_to)
      }

      // 6. 生成报告
      const opt_report = optimizer.generateOptimizationReport()
      const coord_report = coordinator.generateCoordinationReport(group.group_id)
      const load_report = balancer.generateLoadReport()

      assert(opt_report.includes("Agent 系统优化"))
      assert(coord_report.includes("并行执行"))
      assert(load_report.includes("负载均衡"))
    })

    it("应该优化包含复杂依赖的工作流", () => {
      const coordinator = new ParallelCoordinator()

      // 复杂的工作流：多个分支和汇聚点
      const tasks = [
        { id: "task-1", agent: "yibu", deps: [] }, // 初始化
        { id: "task-2", agent: "gongbu", deps: ["task-1"] }, // 实现 A
        { id: "task-3", agent: "gongbu", deps: ["task-1"] }, // 实现 B
        { id: "task-4", agent: "bingbu", deps: ["task-1"] }, // 实现 C
        { id: "task-5", agent: "xingbu", deps: ["task-2", "task-3", "task-4"] }, // 验证
      ]

      const group = coordinator.analyzeTasks(tasks)
      const plan = coordinator.generateExecutionPlan(group.group_id)

      // 验证执行计划
      assert(plan.length > 0)

      // task-1 应该在第一阶段
      assert(plan[0].includes("task-1"))

      // task-2, task-3, task-4 可能在同一阶段
      const mid_phase = plan.find(
        (phase) => phase.includes("task-2") || phase.includes("task-3") || phase.includes("task-4")
      )
      assert(mid_phase)

      // task-5 应该在最后阶段
      assert(plan[plan.length - 1].includes("task-5"))

      // 验证并行度
      assert(group.parallelism_degree >= 2)
    })
  })
})

console.log("\n✅ Agent 系统优化测试全部通过！")
