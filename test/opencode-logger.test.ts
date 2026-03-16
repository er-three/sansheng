/**
 * OpenCode Logger 测试
 * 验证日志是否正确路由到 OpenCode 控制台
 */

import {
  setOpencodeLogClient,
  getOpencodeLogClient,
  isOpencodeClientAvailable,
  logToOpencode,
  logToOpencodeSync,
  diagnoseLoggerStatus,
} from "../src/opencode-logger.js"

describe("OpenCode Logger - 日志系统测试", () => {
  // ─────────────────── Client 初始化测试 ───────────────────

  describe("Client 初始化", () => {
    beforeEach(() => {
      // 每个测试前重置 client
      setOpencodeLogClient(null as any)
    })

    afterEach(() => {
      // 每个测试后也重置
      setOpencodeLogClient(null as any)
    })

    test("初始状态：client 未注册", () => {
      expect(getOpencodeLogClient()).toBeNull()
      expect(isOpencodeClientAvailable()).toBe(false)
    })

    test("注册 client 后应该可以获取", () => {
      const mockClient = { app: { log: jest.fn() } }
      setOpencodeLogClient(mockClient)

      expect(getOpencodeLogClient()).toBe(mockClient)
      expect(isOpencodeClientAvailable()).toBe(true)
    })

    test("注册 null 应该清除 client", () => {
      const mockClient = { app: { log: jest.fn() } }
      setOpencodeLogClient(mockClient)
      setOpencodeLogClient(null)

      expect(getOpencodeLogClient()).toBeNull()
      expect(isOpencodeClientAvailable()).toBe(false)
    })

    test("client 缺少 app.log 时应该标记不可用", () => {
      const brokenClient = { app: {} } // 缺少 log 方法
      setOpencodeLogClient(brokenClient)

      expect(isOpencodeClientAvailable()).toBe(false)
    })

    test("client 缺少 app 属性时应该标记不可用", () => {
      const brokenClient = {} // 缺少 app 属性
      setOpencodeLogClient(brokenClient)

      expect(isOpencodeClientAvailable()).toBe(false)
    })
  })

  // ─────────────────── 日志发送测试 ───────────────────

  describe("日志发送到 OpenCode", () => {
    let mockLog: jest.Mock

    beforeEach(() => {
      setOpencodeLogClient(null as any)
      mockLog = jest.fn().mockResolvedValue(undefined)
      const mockClient = { app: { log: mockLog } }
      setOpencodeLogClient(mockClient)
    })

    afterEach(() => {
      setOpencodeLogClient(null as any)
    })

    test("成功发送 info 日志到 OpenCode", async () => {
      const result = await logToOpencode("TestCategory", "Test message", "info")

      expect(result).toBe(true)
      expect(mockLog).toHaveBeenCalledTimes(1)
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          service: "@deep-flux/liubu",
          level: "info",
          message: "[TestCategory] Test message",
          extra: expect.objectContaining({
            category: "TestCategory",
          }),
        })
      )
    })

    test("成功发送 warn 日志到 OpenCode", async () => {
      const result = await logToOpencode("TestCategory", "Warning", "warn")

      expect(result).toBe(true)
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "warn",
        })
      )
    })

    test("成功发送 error 日志到 OpenCode", async () => {
      const result = await logToOpencode("TestCategory", "Error", "error")

      expect(result).toBe(true)
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
        })
      )
    })

    test("成功发送 debug 日志到 OpenCode", async () => {
      const result = await logToOpencode("TestCategory", "Debug", "debug")

      expect(result).toBe(true)
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "debug",
        })
      )
    })

    test("默认日志级别应该是 info", async () => {
      await logToOpencode("TestCategory", "Default level")

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "info",
        })
      )
    })

    test("日志应该包含时间戳", async () => {
      await logToOpencode("TestCategory", "Message")

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          extra: expect.objectContaining({
            timestamp: expect.stringMatching(/\d{4}-\d{2}-\d{2}T/)
          }),
        })
      )
    })
  })

  // ─────────────────── 日志发送失败的降级测试 ───────────────────

  describe("日志发送失败时的降级", () => {
    test("client.app.log 失败时应该返回 false", async () => {
      const mockLog = jest.fn().mockRejectedValueOnce(new Error("API failed"))
      const mockClient = { app: { log: mockLog } }
      setOpencodeLogClient(mockClient)

      const result = await logToOpencode("TestCategory", "Message")

      expect(result).toBe(false)
    })

    test("client 不可用时应该返回 false", async () => {
      setOpencodeLogClient(null)

      const result = await logToOpencode("TestCategory", "Message")

      expect(result).toBe(false)
    })

    test("降级时应该使用 console 输出", async () => {
      setOpencodeLogClient(null)
      const consoleSpy = jest.spyOn(console, "log").mockImplementation()

      try {
        await logToOpencode("TestCategory", "Message", "info")

        expect(consoleSpy).toHaveBeenCalled()
        const callArg = consoleSpy.mock.calls[0][0]
        expect(callArg).toContain("TestCategory")
        expect(callArg).toContain("Message")
      } finally {
        consoleSpy.mockRestore()
      }
    })
  })

  // ─────────────────── 同步日志函数测试 ───────────────────

  describe("同步日志函数", () => {
    test("logToOpencodeSync 应该返回 Promise", () => {
      const mockClient = { app: { log: jest.fn() } }
      setOpencodeLogClient(mockClient)

      const result = logToOpencodeSync("TestCategory", "Message")

      expect(result).toBeInstanceOf(Promise)
    })

    test("logToOpencodeSync 应该不阻塞调用者", () => {
      const mockClient = { app: { log: jest.fn() } }
      setOpencodeLogClient(mockClient)

      const startTime = Date.now()
      logToOpencodeSync("TestCategory", "Message")
      const elapsed = Date.now() - startTime

      // 应该立即返回（< 10ms）
      expect(elapsed).toBeLessThan(10)
    })
  })

  // ─────────────────── 诊断工具测试 ───────────────────

  describe("诊断工具", () => {
    beforeEach(() => {
      setOpencodeLogClient(null as any)
    })

    afterEach(() => {
      setOpencodeLogClient(null as any)
    })

    test("client 不可用时诊断状态应该是 unavailable", () => {
      const status = diagnoseLoggerStatus()

      expect(status).toEqual(
        expect.objectContaining({
          clientAvailable: false,
          status: "unavailable",
        })
      )
    })

    test("client 可用时诊断状态应该是 ready", () => {
      const mockClient = { app: { log: jest.fn() } }
      setOpencodeLogClient(mockClient)

      const status = diagnoseLoggerStatus()

      expect(status).toEqual(
        expect.objectContaining({
          clientAvailable: true,
          hasAppLog: true,
          status: "ready",
        })
      )
    })

    test("client 缺少 app.log 时诊断状态应该是 degraded", () => {
      const mockClient = { app: {} }
      setOpencodeLogClient(mockClient)

      const status = diagnoseLoggerStatus()

      expect(status).toEqual(
        expect.objectContaining({
          clientAvailable: true,
          hasAppLog: false,
          status: "degraded",
        })
      )
    })

    test("诊断信息应该包含 client 类型", () => {
      const mockClient = { app: { log: jest.fn() } }
      setOpencodeLogClient(mockClient)

      const status = diagnoseLoggerStatus()

      expect(status.clientType).toBe("object")
    })
  })

  // ─────────────────── 集成场景测试 ───────────────────

  describe("集成场景", () => {
    beforeEach(() => {
      setOpencodeLogClient(null as any)
    })

    afterEach(() => {
      setOpencodeLogClient(null as any)
    })

    test("完整的日志生命周期：初始化 -> 发送 -> 诊断", async () => {
      // 1. 诊断初始状态
      let status = diagnoseLoggerStatus()
      expect(status.status).toBe("unavailable")

      // 2. 注册 client
      const mockLog = jest.fn().mockResolvedValue(undefined)
      const mockClient = { app: { log: mockLog } }
      setOpencodeLogClient(mockClient)

      // 3. 验证 client 已注册
      status = diagnoseLoggerStatus()
      expect(status.status).toBe("ready")

      // 4. 发送日志
      const result = await logToOpencode("TestApp", "Hello world")
      expect(result).toBe(true)
      expect(mockLog).toHaveBeenCalledTimes(1)

      // 5. 验证日志内容
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "[TestApp] Hello world",
        })
      )
    })

    test("多个日志调用应该都被正确发送", async () => {
      const mockLog = jest
        .fn()
        .mockResolvedValue(undefined)
      const mockClient = { app: { log: mockLog } }
      setOpencodeLogClient(mockClient)

      // 发送多个日志
      const results = await Promise.all([
        logToOpencode("App1", "Message 1"),
        logToOpencode("App2", "Message 2"),
        logToOpencode("App3", "Message 3"),
      ])

      // 所有日志都应该被成功发送
      expect(results).toEqual([true, true, true])
      expect(mockLog).toHaveBeenCalledTimes(3)
    })
  })

  // ─────────────────── 日志级别映射测试 ───────────────────

  describe("日志级别映射", () => {
    beforeEach(() => {
      setOpencodeLogClient(null as any)
    })

    afterEach(() => {
      setOpencodeLogClient(null as any)
    })

    test("所有日志级别都应该被正确映射", async () => {
      const levels = ["debug", "info", "warn", "error"] as const

      for (const level of levels) {
        const mockLog = jest.fn().mockResolvedValue(undefined)
        setOpencodeLogClient({ app: { log: mockLog } })

        await logToOpencode("TestCategory", "Message", level)

        expect(mockLog).toHaveBeenCalledWith(
          expect.objectContaining({
            level: level,
          })
        )
      }
    })
  })
})
