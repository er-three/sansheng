# 📋 npm 发布信息清单

## 我需要以下信息才能帮你发布

### 🔐 必需信息（发布前）

#### 1️⃣ npm 账号认证方式
选择以下一种方式提供认证信息：

**方式 A：npm Token（推荐，最安全）**
```
需要提供：
- npm token (从 npm.com 的 Access Tokens 生成)
  位置：https://www.npmjs.com/settings/[your-username]/tokens
  推荐权限：Automation token (发布权限)
  格式：npm_xxxx...
```

**方式 B：用户名 + 密码（备选）**
```
需要提供：
- npm 账户用户名
- npm 账户密码
```

**方式 C：一次性密码 (OTP)**
```
如果启用了两步验证，还需要：
- OTP 验证码（6 位数字）
  这个在发布时通过短信或认证器生成
```

---

#### 2️⃣ npm 账户验证
需要确认：
- [ ] 你有 npm 账户吗？（www.npmjs.com 注册）
- [ ] 账户邮箱已验证吗？
- [ ] 是否启用了两步验证（2FA）？

---

### 📦 包信息确认

#### 3️⃣ 包名确认
```
当前配置：@sansheng/liubu
需要确认：
- [ ] 这个包名是你想要的吗？
- [ ] 这个名字你有发布权限吗？
```

**检查包名是否可用：**
```bash
npm search sansheng-liubu
npm view @sansheng/liubu
```

#### 4️⃣ 版本号
```
当前配置：1.0.0
需要确认：
- [ ] 这是首次发布吗？（如果是，1.0.0 合适）
- [ ] 还是更新现有版本？（需要递增版本号）
```

#### 5️⃣ 基本元数据
```
当前配置：
- 名称：@sansheng/liubu
- 描述：三省六部制 OpenCode Plugin - 完整的多智能体协作框架
- 许可证：MIT
- 最小 Node 版本：16.0.0

需要确认或修改：
- [ ] 描述文本是否合适？
- [ ] 作者信息（author 字段）
- [ ] 项目主页（homepage 字段）
- [ ] Bug 报告地址（bugs 字段）
- [ ] 仓库地址（repository 字段）
```

---

### 🔗 GitHub 相关（可选但推荐）

#### 6️⃣ GitHub 仓库信息
```
如果有 GitHub 仓库，提供以下信息：
- [ ] GitHub 用户名或组织名
- [ ] GitHub 仓库名
- [ ] 仓库 URL

例如：https://github.com/yourname/sansheng-liubu
```

**这会用于：**
- 在 npm 包页面显示仓库链接
- 自动生成 package.json 中的 repository 字段
- 代码浏览

#### 7️⃣ 发布 GitHub Release（可选）
```
需要确认：
- [ ] 是否需要创建 GitHub release？
  （会在 GitHub 上显示版本发布记录）
```

---

### 🎯 发布策略

#### 8️⃣ 发布范围
```
选择以下一种：

方式 A：完全公开发布（推荐首次）
  命令：npm publish --access public
  效果：所有人都可以搜索和安装

方式 B：scoped 包（默认私有，需指定公开）
  命令：npm publish --access public
  当前包名已是 scoped (@sansheng/liubu)
  需要确认：[ ] 公开发布？
```

#### 9️⃣ 预发布版本
```
是否需要先发布测试版本？

选项 A：直接发布正式版（推荐）
  版本：1.0.0
  命令：npm publish --access public

选项 B：先发布测试版本
  版本：1.0.0-alpha.1 或 1.0.0-beta.1
  命令：npm publish --tag next
  优势：用户可以选择性安装测试
```

---

### 📝 发布后计划

#### 🔟 发布后需要做什么？
```
可选工作项（发布后）：
- [ ] 在 npm 包页面补充额外信息（如主页链接、文档链接）
- [ ] 在 GitHub 创建 release notes
- [ ] 发送宣传公告（社区、论坛、Slack 等）
- [ ] 创建示例项目展示使用方法
- [ ] 收集用户反馈并持续迭代
```

---

## 📋 快速清单（最少要提供的信息）

如果你想我立即帮你发布，**最少需要以下信息：**

```
1. npm 认证方式（选一个）：
   [ ] A. npm token
       → 提供 token 值
   [ ] B. 用户名 + 密码
       → 提供账户和密码
   [ ] C. 如果有 2FA
       → 告诉我，发布时提供 OTP

2. 包名确认：
   [ ] 确认 @sansheng/liubu 是你想要的？

3. 版本号确认：
   [ ] 确认 1.0.0 是正确的版本？

4. GitHub 仓库（可选）：
   [ ] 有 GitHub 仓库吗？URL 是什么？
```

---

## 🔐 安全建议

### 不建议做的事
❌ **不要**在聊天中直接发送密码
❌ **不要**在代码中硬编码认证信息
❌ **不要**使用账户密码，改用 token

### 推荐做法
✅ **推荐**使用 npm automation token（最安全）
✅ **推荐**启用两步验证（2FA）
✅ **推荐**定期轮换 token

---

## 🚀 我能帮你做什么

一旦你提供了信息，我可以帮你：

```
✅ 1. 更新 package.json 的元数据
   - author 字段
   - repository 字段
   - homepage 字段
   - bugs 字段

✅ 2. 验证打包
   - npm pack --dry-run
   - 检查文件完整性

✅ 3. 发布到 npm
   - npm login
   - npm publish

✅ 4. 验证发布成功
   - npm info @sansheng/liubu
   - 检查 npm 官网显示

✅ 5. 创建 GitHub release（如果有仓库）
   - 创建 version tag
   - 推送到 GitHub
```

---

## 📞 下一步

请根据上面的 **快速清单** 提供信息，我会立即帮你发布！

如果有任何疑问，查看 **NPM_PUBLISH_GUIDE.md** 获取更多详情。
