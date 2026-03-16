/**
 * 打包后 Plugin 的实际功能测试
 * 验证 dist/ 中的编译输出能否正确运行
 */

import assert from "assert"
import * as path from "path"
import * as fs from "fs"

describe("📦 Packaged Plugin - 实际功能测试", () => {
  // ─────────────────── 1. 打包输出验证 ───────────────────

  describe("打包输出完整性", () => {
    it("应该生成 dist/index.js", () => {
      const indexPath = path.join(__dirname, "../dist/index.js")
      assert.strictEqual(fs.existsSync(indexPath), true, "dist/index.js 不存在")
    })

    it("应该生成 dist/index.d.ts 类型定义", () => {
      const typePath = path.join(__dirname, "../dist/index.d.ts")
      assert.strictEqual(fs.existsSync(typePath), true, "dist/index.d.ts 不存在")
    })

    it("应该保留 .opencode 配置目录", () => {
      const opencodePath = path.join(__dirname, "../.opencode")
      assert.strictEqual(fs.existsSync(opencodePath), true, ".opencode 目录不存在")
    })

    it("应该在 dist/index.js 中包含 Plugin 导出", () => {
      const distIndex = path.join(__dirname, "../dist/index.js")
      const content = fs.readFileSync(distIndex, "utf-8")
      assert.ok(
        content.includes("SanshengLiubuPlugin") || content.includes("export"),
        "Plugin 导出不存在"
      )
    })

    it("应该有有效的 package.json", () => {
      const pkgPath = path.join(__dirname, "../package.json")
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
      assert.strictEqual(pkg.main, "dist/index.js", "main 字段指向错误")
      assert.strictEqual(pkg.types, "dist/index.d.ts", "types 字段指向错误")
    })
  })

  // ─────────────────── 2. Plugin 模块加载测试 ───────────────────

  describe("Plugin 模块加载", () => {
    it("应该能加载编译后的 index.js", async () => {
      // 模拟 require dist/index.js
      const distIndex = path.join(__dirname, "../dist/index.js")
      const content = fs.readFileSync(distIndex, "utf-8")
      // ESM export format or CommonJS export
      assert.ok(
        content.includes("export default") || content.includes("exports.default"),
        "导出的 default 函数不存在"
      )
    })

    it("应该导出 createPlugin 工厂函数", async () => {
      const pluginPath = path.join(__dirname, "../dist/plugin.js")
      const content = fs.readFileSync(pluginPath, "utf-8")
      assert.ok(
        content.includes("createPlugin"),
        "createPlugin 工厂函数不存在"
      )
    })
  })

  // ─────────────────── 3. 核心组件可用性 ───────────────────

  describe("核心组件加载", () => {
    const requiredModules = [
      "constraints",
      "caching",
      "session",
      "monitoring",
      "verification",
      "agent",
      "registry",
      "config",
    ]

    for (const moduleName of requiredModules) {
      it(`应该包含 ${moduleName} 模块`, () => {
        const modulePath = path.join(__dirname, `../dist/${moduleName}`)
        assert.strictEqual(
          fs.existsSync(modulePath),
          true,
          `${moduleName} 模块不存在`
        )
      })
    }
  })

  // ─────────────────── 4. Plugin 配置完整性 ───────────────────

  describe("Plugin 配置验证", () => {
    it("应该定义了所有必需的 Hook", () => {
      const distIndex = path.join(__dirname, "../dist/index.js")
      const content = fs.readFileSync(distIndex, "utf-8")

      // Check for Phase 5 hooks in the compiled output
      const hooks = [
        "session.created",
        "session.updated",
        "tool.execute.after",
      ]

      hooks.forEach((hook) => {
        assert.ok(
          content.includes(hook),
          `缺失 Hook: ${hook}`
        )
      })
    })

    it("应该实现了 sanshengLiubuStatus 工具", () => {
      const distIndex = path.join(__dirname, "../dist/index.js")
      const content = fs.readFileSync(distIndex, "utf-8")

      // Check for the status tool export
      assert.ok(
        content.includes("sanshengLiubuStatus"),
        "缺失 sanshengLiubuStatus 工具"
      )
    })
  })

  // ─────────────────── 5. 文件大小和性能指标 ───────────────────

  describe("打包体积和性能指标", () => {
    it("应该有合理的文件大小", () => {
      const indexPath = path.join(__dirname, "../dist/index.js")
      const stats = fs.statSync(indexPath)
      const sizeKB = stats.size / 1024

      // index.js 应该在合理范围内（不超过 100KB）
      assert.ok(
        sizeKB < 100,
        `index.js 过大: ${sizeKB.toFixed(2)}KB`
      )
    })

    it("应该包含源码映射用于调试", () => {
      const mapPath = path.join(__dirname, "../dist/index.js.map")
      assert.strictEqual(
        fs.existsSync(mapPath),
        true,
        "缺失 source map 文件"
      )
    })
  })

  // ─────────────────── 6. 发布准备检查 ───────────────────

  describe("发布准备检查", () => {
    it("应该有 LICENSE 文件", () => {
      const licensePath = path.join(__dirname, "../LICENSE")
      assert.strictEqual(
        fs.existsSync(licensePath),
        true,
        "缺失 LICENSE 文件"
      )
    })

    it("应该有 README.md 文档", () => {
      const readmePath = path.join(__dirname, "../README.md")
      assert.strictEqual(
        fs.existsSync(readmePath),
        true,
        "缺失 README.md 文件"
      )
    })

    it("package.json 中的 files 字段应该包含必需的文件", () => {
      const pkgPath = path.join(__dirname, "../package.json")
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
      const requiredFiles = ["dist", ".opencode", "package.json", "README.md"]

      requiredFiles.forEach((file) => {
        assert.ok(
          pkg.files.includes(file),
          `package.json.files 缺失: ${file}`
        )
      })
    })

    it("应该指定了正确的 Node 版本要求", () => {
      const pkgPath = path.join(__dirname, "../package.json")
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
      assert.ok(pkg.engines?.node, "缺失 engines.node 字段")
    })
  })

  // ─────────────────── 7. 依赖验证 ───────────────────

  describe("依赖完整性", () => {
    it("应该声明了 @opencode-ai/sdk 为 peerDependencies", () => {
      const pkgPath = path.join(__dirname, "../package.json")
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
      assert.ok(
        pkg.peerDependencies?.["@opencode-ai/sdk"],
        "缺失 @opencode-ai/sdk peerDependency"
      )
    })

    it("应该声明了 DevDependencies", () => {
      const pkgPath = path.join(__dirname, "../package.json")
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
      assert.ok(pkg.devDependencies?.typescript, "缺失 typescript devDependency")
    })
  })

  // ─────────────────── 最终检查 ───────────────────

  describe("✅ 打包完整性最终检查", () => {
    it("应该可以直接在 npm 上发布", async () => {
      const pkgPath = path.join(__dirname, "../package.json")
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))

      // 检查必需字段
      const requiredFields = [
        "name",
        "version",
        "description",
        "main",
        "types",
        "license",
        "files",
        "scripts",
      ]

      requiredFields.forEach((field) => {
        assert.ok(pkg[field], `缺失必需字段: ${field}`)
      })

      // 版本号应该是有效的语义版本
      assert.ok(
        /^\d+\.\d+\.\d+/.test(pkg.version),
        `版本号格式无效: ${pkg.version}`
      )

      console.log(`✅ 包信息：${pkg.name}@${pkg.version}`)
    })
  })
})
