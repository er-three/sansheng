#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const command = process.argv[2] || "install";

// 获取当前项目根目录
const projectRoot = process.cwd();
const opencodeDir = path.join(projectRoot, ".opencode");
const opencodeConfigFile = path.join(opencodeDir, "opencode.json");

// Helper function to strip JSONC comments
function stripJsonComments(str) {
  return str
    .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
    .replace(/\/\/.*$/gm, ""); // Remove single-line comments
}

// 显示帮助信息
function showHelp() {
  console.log(`
📦 Sansheng Liubu Plugin - 三省六部制 OpenCode Plugin

Usage: npx @deep-flux/liubu [command]

Commands:
  install    Install and configure the plugin (default)
  help       Show this help message

Agent Architecture:
  The plugin implements a 10-agent hierarchical governance system:
  - 皇帝 (Emperor) - Primary strategist agent
  - 三省 (Three Departments) - Planning, Review, Execution subagents
  - 六部 (Six Ministries) - Implementation specialist subagents

Agent configuration is injected at runtime via the Hooks.config hook.
No markdown files are generated.

Examples:
  npx @deep-flux/liubu
  npx @deep-flux/liubu install
  npx @deep-flux/liubu help
`);
}

// 执行安装
function install() {
  console.log("🚀 Sansheng Liubu Plugin Installer\n");
  console.log(`📁 Project root: ${projectRoot}`);

  // 创建 .opencode 目录
  if (!fs.existsSync(opencodeDir)) {
    fs.mkdirSync(opencodeDir, { recursive: true });
    console.log(`📁 Created directory: ${opencodeDir}`);
  }

  // ===== 第一步：修改 opencode.json =====
  console.log("📝 Configuring opencode.json...");

  let opencodeConfig = {};
  if (fs.existsSync(opencodeConfigFile)) {
    try {
      const content = fs.readFileSync(opencodeConfigFile, "utf-8");
      const cleanContent = stripJsonComments(content);
      opencodeConfig = JSON.parse(cleanContent);
    } catch (e) {
      console.warn("⚠️  Warning: Could not parse existing opencode.json");
      const backupFile = opencodeConfigFile + ".backup." + Date.now();
      try {
        fs.copyFileSync(opencodeConfigFile, backupFile);
        console.log(`📦 Backup created: ${backupFile}`);
      } catch (backupError) {
        console.warn(`Could not create backup: ${backupError.message}`);
      }
      opencodeConfig = {};
    }
  }

  // Add plugin to plugin array
  if (!opencodeConfig.plugin) {
    opencodeConfig.plugin = [];
  }
  if (!opencodeConfig.plugin.includes("@deep-flux/liubu")) {
    opencodeConfig.plugin.push("@deep-flux/liubu");
  }

  // Write updated opencode.json
  try {
    fs.writeFileSync(opencodeConfigFile, JSON.stringify(opencodeConfig, null, 2));
    console.log(`✅ Updated: ${opencodeConfigFile}`);
  } catch (e) {
    console.error("❌ Error writing opencode.json:", e.message);
    process.exit(1);
  }


  // ===== 完成 =====
  console.log("\n✅ Installation successful!");
  console.log("\n📌 Configured (project-level):");
  console.log(`   ✨ ${opencodeConfigFile}`);
  console.log(`      - plugin: @deep-flux/liubu`);
  console.log("\n📝 Agent Configuration:");
  console.log(`   10 agents will be injected at runtime via Hooks.config`);
  console.log(`   - huangdi (emperor) - Primary agent`);
  console.log(`   - zhongshu, menxia, shangshu - Three departments`);
  console.log(`   - libu, hubu, libu, bingbu, xingbu, gongbu - Six ministries`);
  console.log("\n🚀 Restart OpenCode to apply changes");
}

// Main
switch (command) {
  case "install":
    install();
    break;
  case "help":
  case "-h":
  case "--help":
    showHelp();
    break;
  default:
    console.error(`❌ Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
