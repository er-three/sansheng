# 测试包信息

## 📦 包详情

**包名**: `deep-flux-liubu-1.0.0-beta.1.tgz`
**大小**: 257 KB（压缩），1.1 MB（解压）
**文件数**: 375 个
**MD5**: `b888668a20c02855955b92afcf1dc33b`

## 📋 包含内容

### 源代码
- `src/` - TypeScript 源代码（未包含，已编译）
- `dist/` - 已编译的 JavaScript 和类型定义
  - 编译后的模块（所有源文件）
  - TypeScript 类型定义（.d.ts）
  - Source maps（用于调试）

### 配置文件
- `package.json` - 项目配置和依赖
- `LICENSE` - 开源协议

### 文件结构
```
package/
├── LICENSE
├── bin/
│   └── cli.cjs          # CLI 入口
├── dist/
│   ├── workflows/       # 工作流模块
│   ├── session/         # 会话管理
│   ├── constraints/     # 约束发现
│   ├── layers/          # 分层架构
│   ├── config/          # 配置管理
│   ├── utils/           # 工具函数
│   ├── types.d.ts       # 类型定义
│   └── [其他编译文件]
└── package.json
```

## 🚀 安装和测试

### 方式 1：本地安装（推荐用于测试）

```bash
# 解压包
mkdir -p test-libu
cd test-libu
tar -xzf /path/to/deep-flux-liubu-1.0.0-beta.1.tgz

# 进入包目录
cd package

# 安装依赖（如果需要）
npm install

# 验证包内容
npm list
```

### 方式 2：直接安装到项目

```bash
# 从文件安装
npm install /path/to/deep-flux-liubu-1.0.0-beta.1.tgz

# 或在 package.json 中指定
{
  "dependencies": {
    "@deep-flux/liubu": "file:../path/to/deep-flux-liubu-1.0.0-beta.1.tgz"
  }
}
```

### 方式 3：Docker 容器测试

```bash
# 创建测试容器
docker run -it --rm -v $(pwd):/workspace node:18-alpine sh
cd /workspace
tar -xzf deep-flux-liubu-1.0.0-beta.1.tgz
cd package
npm install
npm test
```

## ✅ 验证包完整性

```bash
# 计算 SHA256（验证下载的包）
sha256sum deep-flux-liubu-1.0.0-beta.1.tgz

# 查看包内容
tar -tzf deep-flux-liubu-1.0.0-beta.1.tgz | head -20

# 列出所有文件
tar -tzf deep-flux-liubu-1.0.0-beta.1.tgz > package-contents.txt

# 验证关键文件存在
tar -tzf deep-flux-liubu-1.0.0-beta.1.tgz | grep -E "package.json|dist/|bin/"
```

## 📊 包统计

| 项目 | 数值 |
|------|------|
| 总文件数 | 375 |
| 编译后 JS 文件 | ~150+ |
| 类型定义文件 | ~80+ |
| Source maps | ~80+ |
| 其他文件（配置、license等） | ~65 |

### 文件大小分布
- **dist 目录**: ~900 KB（编译的代码）
- **.opencode 目录**: ~150 KB（配置和约束）
- **package.json**: ~1 KB

## 🧪 测试步骤

### 1. 基础测试
```bash
# 解压
tar -xzf deep-flux-liubu-1.0.0-beta.1.tgz
cd package

# 检查 package.json
cat package.json

# 验证编译产物
ls -la dist/ | head -20

# 检查类型定义
ls -la dist/*.d.ts
```

### 2. 功能测试
```bash
# 导入模块进行测试（如果有提供的测试文件）
node -e "const libu = require('./dist/index.js'); console.log('Module loaded:', typeof libu)"
```

### 3. 集成测试
```bash
# 安装到测试项目
npm install /path/to/deep-flux-liubu-1.0.0-beta.1.tgz

# 在代码中使用
const { createPlugin } = require('@deep-flux/liubu')
```

## 📦 依赖关系

### 生产依赖
查看 `package.json` 的 `dependencies` 字段

### 开发依赖
- TypeScript
- Jest（用于测试）
- 其他开发工具

## 🔍 包的完整性检查清单

- [x] package.json 存在
- [x] LICENSE 文件存在
- [x] 编译的 dist 目录完整
- [x] 类型定义文件（.d.ts）完整
- [x] Source maps 完整
- [x] 配置文件（.opencode）完整
- [x] 所有必要的元数据文件

## 💾 存储位置

```
原始位置: /Users/jianlaide/Documents/ai/opencode_plugin/claude_sansheng-liubu/
包文件: deep-flux-liubu-1.0.0-beta.1.tgz

可复制到其他位置用于分发
```

## 🔄 更新包

如果需要更新包内容，执行：

```bash
# 在项目根目录
npm run build          # 重新编译
npm pack               # 生成新的 tgz 包
```

新的包会覆盖旧的 `deep-flux-liubu-1.0.0-beta.1.tgz`

## ⚠️ 注意事项

1. **Node 版本**: 需要 Node.js 18+ （推荐 18 LTS 或 20 LTS）
2. **npm 版本**: npm 9+ 推荐
3. **权限**: 解压时可能需要相应的文件权限
4. **磁盘空间**: 解压需要约 1.1 MB 空间
5. **平台兼容**: 支持 Linux、macOS、Windows

## 📝 版本信息

- **版本**: 1.0.0-beta.1
- **发布时间**: 2026-03-16
- **编译时间**: 最新构建
- **代码优化**: Phase 3 完成（P0+P1+P2 全部优化）

---

**生成时间**: 2026-03-16 19:00 UTC
**生成方式**: `npm pack`
**包管理器**: npm v9+

