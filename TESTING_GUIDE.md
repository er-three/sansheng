# 测试包安装指南

## 🎯 快速开始

### 方式 A：简单解压测试（推荐）

```bash
# 1. 创建测试目录
mkdir -p ~/libu-test
cd ~/libu-test

# 2. 解压包
tar -xzf /Users/jianlaide/Documents/ai/opencode_plugin/claude_sansheng-liubu/deep-flux-liubu-1.0.0-beta.1.tgz

# 3. 查看内容
cd package
ls -la
cat package.json

# 4. 检查编译文件
ls -la dist/ | head -20
```

### 方式 B：npm 安装测试

```bash
# 1. 创建测试项目
mkdir -p ~/libu-test-npm
cd ~/libu-test-npm
npm init -y

# 2. 从 tgz 文件安装
npm install /Users/jianlaide/Documents/ai/opencode_plugin/claude_sansheng-liubu/deep-flux-liubu-1.0.0-beta.1.tgz

# 3. 验证安装
npm list @deep-flux/libu
ls -la node_modules/@deep-flux/libu
```

### 方式 C：Docker 容器测试（完全隔离）

```bash
# 1. 启动 Node 容器
docker run -it --rm \
  -v /Users/jianlaide/Documents/ai/opencode_plugin/claude_sansheng-liubu:/pkg \
  node:18-alpine \
  sh

# 2. 在容器中测试
cd /tmp
tar -xzf /pkg/deep-flux-liubu-1.0.0-beta.1.tgz
cd package
npm install
npm test
```

## 📝 包内容检查清单

```bash
#!/bin/bash
PACKAGE_FILE="deep-flux-liubu-1.0.0-beta.1.tgz"

echo "检查包内容..."
echo ""

# 显示包信息
echo "📦 包基本信息："
ls -lh $PACKAGE_FILE
echo ""

# 显示 SHA 校验
echo "🔒 完整性校验："
md5sum $PACKAGE_FILE
sha256sum $PACKAGE_FILE
echo ""

# 解压并检查
echo "📂 解压包内容："
tar -tzf $PACKAGE_FILE | head -30
echo "... (共 $(tar -tzf $PACKAGE_FILE | wc -l) 个文件)"
echo ""

# 统计文件类型
echo "📊 文件类型统计："
echo "  JS 文件: $(tar -tzf $PACKAGE_FILE | grep -c '\.js$') 个"
echo "  TS 定义: $(tar -tzf $PACKAGE_FILE | grep -c '\.d\.ts$') 个"
echo "  Source Map: $(tar -tzf $PACKAGE_FILE | grep -c '\.map$') 个"
echo "  配置文件: $(tar -tzf $PACKAGE_FILE | grep -c '\.json$') 个"
echo "  YAML 文件: $(tar -tzf $PACKAGE_FILE | grep -c '\.yaml$|\.yml$') 个"
echo ""

# 检查关键文件
echo "✅ 关键文件检查："
CRITICAL_FILES=(
  "package/package.json"
  "package/LICENSE"
  "package/bin/cli.cjs"
  "package/dist/index.js"
  "package/dist/plugin.js"
  "package/dist/utils.js"
  "package/dist/types.d.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
  if tar -tzf $PACKAGE_FILE "$file" > /dev/null 2>&1; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (缺失)"
  fi
done
```

## 🔬 功能测试

### 测试 1：模块加载

```javascript
// test-load.js
const libu = require('./package/dist/index.js')
console.log('✅ 模块加载成功')
console.log('导出的模块:', Object.keys(libu))
```

运行：
```bash
tar -xzf deep-flux-liubu-1.0.0-beta.1.tgz
node test-load.js
```

### 测试 2：类型定义检查

```bash
# 查看类型定义文件
ls -la package/dist/*.d.ts
cat package/dist/types.d.ts | head -50
```

### 测试 3：源代码映射验证

```bash
# 确认 source maps 完整
tar -tzf deep-flux-liubu-1.0.0-beta.1.tgz | grep "\.js\.map$" | wc -l
# 应该有 154 个 map 文件
```

## 📦 包与源代码的对应

| 位置 | 说明 |
|------|------|
| `package/dist/plugin.js` | 核心插件实现 |
| `package/dist/utils.js` | 工具函数 |
| `package/dist/types.d.ts` | TypeScript 类型定义 |
| `package/dist/workflows/` | 工作流模块 |
| `package/dist/session/` | 会话管理模块 |
| `package/dist/layers/` | 分层架构模块 |
| `package/bin/cli.cjs` | CLI 工具 |

## 🚀 安装后验证

```bash
# 安装后检查
npm install /path/to/deep-flux-liubu-1.0.0-beta.1.tgz

# 确认依赖安装
npm ls

# 验证包可用性
node -e "
const pkg = require('@deep-flux/libubu');
console.log('✅ 包加载成功');
console.log('版本:', require('@deep-flux/libu/package.json').version);
console.log('主文件:', require('@deep-flux/libu/package.json').main);
"
```

## 🐛 故障排查

### 问题 1：解压失败
```bash
# 检查文件完整性
tar -tzf deep-flux-liubu-1.0.0-beta.1.tgz > /dev/null && echo "✅ 包完整" || echo "❌ 包损坏"

# 使用 gunzip 解压
gunzip -c deep-flux-liubu-1.0.0-beta.1.tgz | tar -xv
```

### 问题 2：npm 安装失败
```bash
# 清理缓存
npm cache clean --force

# 重新安装
npm install --verbose /path/to/deep-flux-liubu-1.0.0-beta.1.tgz
```

### 问题 3：模块加载失败
```bash
# 检查 package.json 的 main 字段
cat package/package.json | grep -A 2 '"main"'

# 检查 dist 目录结构
ls -la package/dist/
```

## 📋 测试结果报告模板

```markdown
# 测试报告 - deep-flux-liubu-1.0.0-beta.1

## 环境信息
- Node.js 版本: $(node --version)
- npm 版本: $(npm --version)
- 操作系统: $(uname -s)
- 处理器: $(uname -m)

## 包验证
- [x] 包文件存在
- [x] 包完整性 OK
- [x] 文件数量正确 (375 个)
- [x] 关键文件都存在

## 功能测试
- [x] 解压成功
- [x] 模块加载成功
- [x] 类型定义完整
- [x] npm 安装成功
- [x] 依赖解析正确

## 其他
- Node 版本: 
- 测试日期:
- 测试人员:
- 备注:
```

## ✅ 最终验收清单

- [ ] 包大小正确 (257 KB)
- [ ] 文件数量正确 (375 个)
- [ ] MD5 校验通过 (b888668a20c02855955b92afcf1dc33b)
- [ ] 能正常解压
- [ ] npm 能正常安装
- [ ] 关键文件都存在
- [ ] 可以 require() 加载
- [ ] TypeScript 类型可用
- [ ] 源代码映射完整
- [ ] 配置文件完整

---

**包位置**: `/Users/jianlaide/Documents/ai/opencode_plugin/claude_sansheng-liubu/deep-flux-liubu-1.0.0-beta.1.tgz`

**生成时间**: 2026-03-16 19:00 UTC

