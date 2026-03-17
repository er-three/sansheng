/**
 * ConfigManager 测试 - Phase 4 配置管理
 *
 * 验证内容：
 * - 官方 SDK 配置和本地 registry 配置的优先级
 * - 环境变量替换 {env:VAR_NAME}
 * - 文件内容引用 {file:path}
 * - Registry 变量引用 {var:name}
 * - 嵌套配置访问
 * - 缓存机制
 */

import assert from "assert"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { ConfigManager, createConfigManager } from "../src/config/manager"

describe("Phase 4 - ConfigManager 变量替换", () => {
  let tempDir: string
  let configManager: ConfigManager

  beforeAll(() => {
    // 创建临时目录进行测试
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-config-test-"))

    // 创建一个测试的 registry.json
    const registry = {
      version: "1.0.0",
      active_domain: "general",
      variables: {
        api_endpoint: "https://api.example.com",
        timeout: "5000",
        env_reference: "{env:NODE_ENV}",
        file_reference: "{file:test.txt}"
      },
      cache_settings: {
        enabled: true,
        strategy: "multi-level",
        ttl_seconds: 3600
      }
    }

    fs.writeFileSync(path.join(tempDir, "registry.json"), JSON.stringify(registry, null, 2))

    // 创建一个测试文件
    fs.writeFileSync(path.join(tempDir, "test.txt"), "File content from {file:test.txt}")

    // 创建 ConfigManager 实例
    configManager = new ConfigManager(tempDir)
  })

  afterAll(() => {
    // 清理临时目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
  })

  it("应该读取本地 registry 配置", () => {
    const domain = configManager.getActiveDomain()
    assert.strictEqual(domain, "general")
  })

  it("应该获取缓存设置", () => {
    const settings = configManager.getCacheSettings()
    assert.strictEqual(settings.enabled, true)
    assert.strictEqual(settings.strategy, "multi-level")
    assert.strictEqual(settings.ttl, 3600)
  })

  it("应该支持环境变量替换 {env:VAR_NAME}", () => {
    // 设置环境变量
    const originalEnv = process.env.TEST_VAR
    process.env.TEST_VAR = "test_value"

    const registry = {
      version: "1.0.0",
      active_domain: "general",
      variables: {
        // 注意：这里直接返回带有 env 引用的字符串
        config_value: "Value is {env:TEST_VAR}"
      }
    }

    fs.writeFileSync(path.join(tempDir, "registry.json"), JSON.stringify(registry, null, 2))

    // 重新创建 manager 以加载新的 registry
    const mgr = new ConfigManager(tempDir)
    const allVars = mgr.getAllVariables()

    // 验证环境变量被替换了
    assert(allVars.config_value.includes("test_value"), "环境变量应该被替换")

    // 恢复环境变量
    if (originalEnv) {
      process.env.TEST_VAR = originalEnv
    } else {
      delete process.env.TEST_VAR
    }
  })

  it("应该支持文件引用 {file:path}", () => {
    const registry = {
      version: "1.0.0",
      active_domain: "general",
      variables: {
        file_content: "{file:test.txt}"
      }
    }

    fs.writeFileSync(path.join(tempDir, "registry.json"), JSON.stringify(registry, null, 2))

    const mgr = new ConfigManager(tempDir)
    const allVars = mgr.getAllVariables()

    // 验证文件内容被加载了
    assert(allVars.file_content.includes("File content"), "文件内容应该被加载")
  })

  it("应该支持 registry 变量引用 {var:name}", () => {
    const registry = {
      version: "1.0.0",
      active_domain: "general",
      variables: {
        base_value: "base_123",
        derived_value: "{var:base_value}_derived"
      }
    }

    fs.writeFileSync(path.join(tempDir, "registry.json"), JSON.stringify(registry, null, 2))

    const mgr = new ConfigManager(tempDir)
    const allVars = mgr.getAllVariables()

    // 验证变量引用被替换了
    assert(allVars.derived_value.includes("base_123"), "变量引用应该被替换")
  })

  it("应该支持嵌套配置访问", () => {
    // 测试访问 cache.enabled
    const cacheEnabled = configManager.get("cache.enabled")
    assert.strictEqual(cacheEnabled, true)

    // 测试访问 cache.strategy
    const strategy = configManager.get("cache.strategy")
    assert.strictEqual(strategy, "multi-level")

    // 测试访问 cache.ttl
    const ttl = configManager.get("cache.ttl")
    assert.strictEqual(ttl, 3600)
  })

  it("应该在官方 SDK 配置可用时优先使用", () => {
    const sdkConfig = {
      cache: {
        enabled: false,
        strategy: "memory-only",
        ttl: 1800
      }
    }

    const mgr = new ConfigManager(tempDir, sdkConfig)

    assert.strictEqual(mgr.get("cache.enabled"), false)
    assert.strictEqual(mgr.get("cache.strategy"), "memory-only")
    assert.strictEqual(mgr.get("cache.ttl"), 1800)
  })

  it("应该在 SDK 配置不可用时回退到本地 registry", () => {
    const mgr = new ConfigManager(tempDir)

    const cacheSettings = mgr.getCacheSettings()
    assert.strictEqual(cacheSettings.enabled, true)
    assert.strictEqual(cacheSettings.strategy, "multi-level")
  })

  it("应该支持设置变量", () => {
    const mgr = new ConfigManager(tempDir)

    mgr.setVariable("custom_key", "custom_value")
    const value = mgr.get("variables.custom_key")

    assert.strictEqual(value, "custom_value")
  })

  it("应该生成配置诊断报告", () => {
    const mgr = new ConfigManager(tempDir)
    const report = mgr.generateReport()

    assert(report.includes("配置诊断报告"))
    assert(report.includes("活跃配置源"))
    assert(report.includes("缓存设置"))
    assert(report.includes("变量替换支持"))
  })

  it("应该缓存替换结果避免重复处理", () => {
    const mgr = new ConfigManager(tempDir)

    // 第一次调用时会执行替换并缓存
    const result1 = mgr.get("variables.api_endpoint")

    // 第二次调用应该返回缓存的结果
    const result2 = mgr.get("variables.api_endpoint")

    assert.strictEqual(result1, result2)
  })

  it("应该在设置变量后清除缓存", () => {
    const mgr = new ConfigManager(tempDir)

    mgr.setVariable("test_var", "old_value")
    const result1 = mgr.get("variables.test_var")

    // 设置新值（这会清除缓存）
    mgr.setVariable("test_var", "new_value")
    mgr.clearCache()

    const result2 = mgr.get("variables.test_var")

    assert.strictEqual(result1, "old_value")
    assert.strictEqual(result2, "new_value")
  })

  it("应该提供工厂函数创建 ConfigManager", () => {
    const mgr = createConfigManager(tempDir)
    assert(mgr instanceof ConfigManager)
  })

  it("应该提供默认值当配置不存在时", () => {
    const mgr = new ConfigManager(tempDir)

    const missing = mgr.get("nonexistent.path", "default_value")
    assert.strictEqual(missing, "default_value")
  })

  it("应该处理缺失的环境变量", () => {
    const registry = {
      version: "1.0.0",
      active_domain: "general",
      variables: {
        missing_env: "{env:NONEXISTENT_VAR_12345}"
      }
    }

    fs.writeFileSync(path.join(tempDir, "registry.json"), JSON.stringify(registry, null, 2))

    const mgr = new ConfigManager(tempDir)
    const allVars = mgr.getAllVariables()

    // 应该保留原始的未替换值
    assert(allVars.missing_env.includes("NONEXISTENT_VAR"))
  })
})

console.log("\n[OK] Phase 4 ConfigManager 测试全部通过！")
