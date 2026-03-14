# 📦 npm 发布指南

## 改造完成状态

✅ **已完成 npm 即插即用包改造**

```
编译状态:  ✅ 成功
打包验证:  ✅ 通过
文件数:    ✅ 63 个文件
包大小:    ✅ 59.4 KB (压缩) / 191.1 KB (解压)
```

---

## 📊 包统计信息

### 编译输出
```
dist/
├── index.js          (5.5 kB)
├── index.js.map      (2.7 kB)
├── index.d.ts        (2.6 kB)
└── index.d.ts.map    (509 B)
```

### 打包内容
```
总文件: 63 个
├── 11 个 agents
├── 4 个 domains (含 15+ skills)
├── 1 个 plugin (1047 行)
├── 编译输出 (dist/)
├── 文档 (5 个)
└── 配置文件 (package.json, tsconfig.json, .gitignore, LICENSE)
```

### 包大小对比
| 指标 | 数值 |
|------|------|
| 压缩大小 | 59.4 KB |
| 解压大小 | 191.1 KB |
| 总文件数 | 63 |
| Node 最小版本 | 16.0.0 |

---

## 🚀 发布前检查清单

### 1. 信息完整性 ✅
- [x] package.json 配置完整
  - [x] name: @sansheng/liubu
  - [x] version: 1.0.0
  - [x] description 详细
  - [x] main: dist/index.js
  - [x] types: dist/index.d.ts
  - [x] files 列表正确
  - [x] keywords 包含搜索词

- [x] TypeScript 配置完整
  - [x] tsconfig.json 设置正确
  - [x] 编译输出包含 .d.ts 类型定义
  - [x] Source maps 生成成功

### 2. 文件完整性 ✅
- [x] dist/ 编译输出正确
- [x] .opencode/ 目录完整
  - [x] agents/ (11 个)
  - [x] domains/ (4 个)
  - [x] plugins/ (1047 行)

- [x] 文档完整
  - [x] README.md (1100+ 行)
  - [x] NPM_README.md (npm 官网展示)
  - [x] QUICK_START.md
  - [x] AGENTS.md
  - [x] 三省六部制工作流程详解.md

- [x] 许可证和配置
  - [x] LICENSE (MIT)
  - [x] .gitignore
  - [x] PACKAGE_STRUCTURE.md

### 3. npm 兼容性 ✅
- [x] Node >= 16.0.0
- [x] 无 native dependencies
- [x] 无 binary 文件
- [x] peerDependencies 正确声明

### 4. 打包验证 ✅
```bash
npm pack --dry-run
# ✅ 所有文件正确打包
# ✅ 大小合理 (59.4 KB)
# ✅ 文件完整 (63 个)
```

---

## 📝 发布步骤

### 步骤 1: 准备 npm 账号

```bash
# 确认已登录 npm
npm whoami

# 如果未登录，执行：
npm login

# 输入：
# - Username: your_npm_username
# - Password: your_npm_password
# - Email: your_email@example.com
```

### 步骤 2: 验证包信息（可选）

```bash
# 查看会被发布的文件
npm pack --dry-run

# 验证 package.json
npm pkg get

# 验证版本号
npm pkg get version
```

### 步骤 3: 发布

```bash
# 发布到 npm 官方仓库
npm publish --access public

# 输出应该显示：
# npm notice Publishing to https://registry.npmjs.org/
# npm notice Uploading sansheng-liubu-1.0.0.tgz
# npm notice Published @sansheng/liubu@1.0.0 to public registry
```

### 步骤 4: 验证发布成功

```bash
# 查看包信息（需要等待 5-10 分钟同步）
npm info @sansheng/liubu

# 搜索包
npm search sansheng-liubu

# 查看具体版本
npm view @sansheng/liubu@1.0.0
```

---

## 🔄 更新和版本控制

### 更新流程

```bash
# 1. 修改代码
# 2. 更新 version 在 package.json
npm version patch    # 1.0.0 → 1.0.1 (bug fix)
npm version minor    # 1.0.0 → 1.1.0 (新功能)
npm version major    # 1.0.0 → 2.0.0 (breaking change)

# 3. 编译
npm run build

# 4. 发布
npm publish

# 5. 创建 git tag
git tag -a v1.0.1 -m "Release 1.0.1"
git push origin v1.0.1
```

### 版本号规范 (Semver)

```
1.0.0
│ │ │
│ │ └─ patch: bug fixes (1.0.1, 1.0.2, ...)
│ └─── minor: new features (1.1.0, 1.2.0, ...)
└───── major: breaking changes (2.0.0, 3.0.0, ...)
```

---

## 📥 用户安装使用

### 安装

```bash
# 安装最新版本
npm install @sansheng/liubu

# 安装指定版本
npm install @sansheng/liubu@1.0.0

# 保存为 dev 依赖
npm install --save-dev @sansheng/liubu

# 全局安装
npm install -g @sansheng/liubu
```

### 配置 opencode.json

```json
{
  "model": "anthropic/claude-opus-4-6",
  "small_model": "anthropic/claude-haiku-4-5",
  "default_agent": "huangdi",

  "plugin": [
    "@sansheng/liubu"
  ],

  "permission": {
    "skill": { "*": "allow" }
  }
}
```

### 使用命令

```bash
# 切换工作域
opencode /switch-domain asset-management

# 查看状态
opencode /status

# 启动任务
opencode /start 从旧代码提取资产

# CR 流程
opencode /cr-start asset_type=service asset_name=user-service cr_description="添加新功能"
```

---

## 🔧 故障排查

### 发布失败 - 名称已被占用

```
Error: You don't have permission to publish "@sansheng/liubu"

解决方案：
1. 使用 npm search 查找是否已被占用
2. 更改包名：
   - @yourscope/liubu
   - @yourorg/sansheng-liubu
   - sansheng-liubu-advanced
```

### 发布失败 - 未登录

```
Error: 401 Unauthorized

解决方案：
npm login
# 输入 npm 账号信息

# 验证是否登录
npm whoami
```

### 发布失败 - 版本已存在

```
Error: version already published

解决方案：
1. 更新 package.json 中的 version
npm version patch
2. 重新发布
npm publish
```

### 本地测试

```bash
# 在本地测试包而不发布到 npm
npm pack

# 安装本地包
npm install ./sansheng-liubu-1.0.0.tgz

# 验证是否正确安装
npm list @sansheng/liubu
```

---

## 📊 发布后监控

### 查看下载统计

```bash
# 查看周下载数
npm view @sansheng/liubu downloads

# 使用 npm 网站查看详细统计
# https://www.npmjs.com/package/@sansheng/liubu

# 使用 npm trends 对比
# https://www.npmtrends.com/@sansheng/liubu
```

### 维护清单

- [ ] 监听 GitHub Issues
- [ ] 响应用户反馈
- [ ] 定期更新依赖
- [ ] 修复 bug 并发布 patch
- [ ] 添加新功能并发布 minor
- [ ] 管理 breaking changes 并发布 major

---

## ✨ 下一步

### 推荐操作顺序

1. **验证本地测试** (可选)
   ```bash
   npm pack
   npm install ./sansheng-liubu-1.0.0.tgz
   ```

2. **创建 GitHub 仓库**（如果还没有）
   ```bash
   git init
   git add .
   git commit -m "feat: Initial npm package release"
   git remote add origin https://github.com/yourname/sansheng-liubu
   git push -u origin main
   ```

3. **创建发布 Tag**
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0: Initial npm package"
   git push origin v1.0.0
   ```

4. **发布到 npm**
   ```bash
   npm login
   npm publish --access public
   ```

5. **宣传和分享**
   - 更新项目描述
   - 分享到社区
   - 创建讨论/示例
   - 收集用户反馈

---

## 📚 参考资源

- [npm 官方文档](https://docs.npmjs.com/)
- [npm 包发布指南](https://docs.npmjs.com/packages-and-modules/publishing-a-package)
- [Semantic Versioning](https://semver.org/)
- [TypeScript 发布指南](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)
- [OpenCode Plugin 文档](https://opencode.ai/docs/plugins/)

---

**🎉 恭喜！你的 npm 包已准备就绪！**

现在可以执行 `npm publish --access public` 发布到 npm 官方仓库。
