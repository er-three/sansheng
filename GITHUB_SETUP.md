# GitHub 配置快速参考

## 🔑 你的 SSH 公钥

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK5JRM4aJ8rmerxIKG7qE3l90StmRCNznPypBFbXgGht deep-flux-liubu@github.com
```

---

## 📝 快速步骤

### 1️⃣ 添加 SSH 秘钥到 GitHub

打开：https://github.com/settings/keys

- **Title**: `deep-flux-liubu`
- **Key type**: `Authentication Key`
- **Key**: 粘贴上面的公钥

### 2️⃣ 创建 GitHub 仓库

打开：https://github.com/new

- **Repository name**: `liubu`
- **Description**: `三省六部制 OpenCode Plugin`
- **Public**: ✓（因为是 npm 包）
- **Initialize**: 不勾选（我们已有文件）

### 3️⃣ 推送代码到 GitHub

```bash
cd /Users/jianlaide/Documents/ai/opencode_plugin/claude_sansheng-liubu

git init
git add .
git commit -m "feat: initial OpenCode plugin with npm package setup"

# 替换 YOUR_USERNAME 为你的 GitHub 用户名
git remote add origin git@github.com:deep-magnet/liubu.git

git branch -M main
git push -u origin main
```

### 4️⃣ 创建 GitHub Release（可选）

打开：https://github.com/deep-magnet/liubu/releases/new

- **Tag version**: `v1.0.0-beta.1`
- **Release title**: `Version 1.0.0-beta.1`
- **Mark as pre-release**: ✓
- **Body**:
  ```
  # Beta Release

  - 完整实现 OmO Phase 1 & 2
  - 11 个 agents + 4 个 domains
  - 15+ 个 skills
  - 40,000+ 行代码和文档

  ## 安装
  ```bash
  npm install @deep-flux/liubu@next
  ```

  ## 快速开始
  查看 [README.md](./README.md)
  ```

### 5️⃣ 发布到 npm（当准备好时）

```bash
cd /Users/jianlaide/Documents/ai/opencode_plugin/claude_sansheng-liubu

npm login
npm publish ./deep-flux-liubu-1.0.0-beta.1.tgz --tag next

# 或者直接：
npm publish --tag next
```

---

## ✅ Git 用户信息

```
用户名：deep-magnet
邮箱：shiquyihou@163.com
```

---

## 🔧 SSH 秘钥位置

```
私钥：~/.ssh/github_deep_flux
公钥：~/.ssh/github_deep_flux.pub
```

---

## 🧪 测试 SSH 连接

```bash
ssh -T git@github.com
```

应该看到：
```
Hi deep-magnet! You've successfully authenticated, but GitHub does not provide shell access.
```

---

## 📦 包信息回顾

```
包名：@deep-flux/liubu
版本：1.0.0-beta.1
大小：59.4 KB
文件：63 个
位置：/Users/jianlaide/Documents/ai/opencode_plugin/claude_sansheng-liubu/
```

---

## 💾 关键文件

| 文件 | 用途 |
|------|------|
| package.json | npm 包配置 |
| README.md | 完整文档 |
| src/index.ts | TypeScript 源代码 |
| dist/ | 编译输出 |
| .opencode/ | OpenCode 资源 |
| deep-flux-liubu-1.0.0-beta.1.tgz | 可发布的包 |

---

## 📚 相关文档

- **NPM_PUBLISH_GUIDE.md** - npm 发布指南
- **QUICK_START.md** - 5 分钟快速开始
- **AGENTS.md** - 三省六部详解
- **PACKAGE_STRUCTURE.md** - 包结构详解

---

**准备好了吗？现在就开始吧！🚀**
