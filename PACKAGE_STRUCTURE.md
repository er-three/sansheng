# 📦 npm 包结构

## 目录树

```
claude_sansheng-liubu/
│
├── src/                           # TypeScript 源代码
│   └── index.ts                   # Plugin 入口文件（编译为 dist/index.js）
│
├── .opencode/                     # OpenCode Plugin 资源（自动被发现）
│   ├── agents/                    # 11 个智能体定义
│   │   ├── huangdi.md             # 皇帝（战略决策）
│   │   ├── zhongshu.md            # 中书省（规划）
│   │   ├── menxia.md              # 门下省（审核）
│   │   ├── shangshu.md            # 尚书省（执行）
│   │   ├── yibu.md                # 吏部（档案）
│   │   ├── hubu.md                # 户部（工商）
│   │   ├── libu.md                # 礼部（仪式）
│   │   ├── bingbu.md              # 兵部（战术）
│   │   ├── xingbu.md              # 刑部（审判）
│   │   ├── gongbu.md              # 工部（工程）
│   │   └── kubu.md                # 库部（档案）
│   │
│   ├── domains/                   # 4 个工作域
│   │   ├── asset-management/      # 资产提取域
│   │   │   ├── domain.yaml
│   │   │   ├── init_skills: [asset-standards]
│   │   │   └── skills/
│   │   │       ├── scan/
│   │   │       ├── extract/
│   │   │       ├── mapping/
│   │   │       ├── behavior/
│   │   │       ├── detect/
│   │   │       ├── verify-consistency/
│   │   │       ├── openspec-persist/
│   │   │       └── asset-standards/        # Init skill
│   │   │
│   │   ├── cr-processing/         # 变更请求处理域
│   │   │   ├── domain.yaml
│   │   │   └── skills/
│   │   │       ├── cr-proposal/
│   │   │       ├── cr-specification/
│   │   │       ├── cr-implementation/
│   │   │       └── cr-persist/
│   │   │
│   │   ├── reverse-engineering/   # 反向工程域
│   │   │   ├── domain.yaml
│   │   │   ├── init_skills: [project-standards]
│   │   │   └── skills/project-standards/
│   │   │
│   │   └── video/                 # 视频处理域
│   │       └── domain.yaml
│   │
│   └── plugins/
│       └── sansheng-liubu.ts       # 主 Plugin 文件（1047 行）
│           ├── set_variables()
│           ├── switch_domain()
│           ├── pipeline_status()
│           ├── verify_step()
│           ├── list_domains()
│           ├── openspec_write()    # 库部工具
│           └── openspec_validate() # 库部工具
│
├── dist/                          # 编译输出（自动生成，不提交 git）
│   ├── index.js
│   ├── index.d.ts
│   ├── index.js.map
│   └── index.d.ts.map
│
├── package.json                   # npm 包配置
├── tsconfig.json                  # TypeScript 编译配置
├── .gitignore                     # git 忽略配置
├── LICENSE                        # MIT 许可证
├── NPM_README.md                  # npm 包展示 README
├── README.md                      # 完整文档（1100+ 行）
├── AGENTS.md                      # 三省六部详细说明
├── QUICK_START.md                 # 快速开始
├── MIGRATION_SUMMARY.md           # 迁移总结
├── 三省六部制工作流程详解.md     # 工作流程深入解析
└── registry.json                  # Plugin 注册信息
```

## 文件职责

### 编译相关
- **tsconfig.json** - TypeScript 编译配置，指定 target、outDir、declaration 等
- **src/index.ts** - Plugin 入口，导出初始化函数和信息查询函数

### npm 包配置
- **package.json** - npm 包元数据、脚本、依赖版本
  - main: "dist/index.js"
  - types: "dist/index.d.ts"
  - files: ["dist", ".opencode", "package.json", "README.md", "LICENSE"]

### Plugin 资源（自动被 OpenCode 发现）
- **.opencode/agents/** - 11 个智能体定义（无需注册）
- **.opencode/domains/** - 4 个工作域配置（无需注册）
- **.opencode/plugins/** - 主 Plugin 文件（工具/函数定义）

### 文档
- **NPM_README.md** - npm 官网展示的 README
- **README.md** - 完整文档和工作原理
- **AGENTS.md** - 三省六部制详解
- **QUICK_START.md** - 5 分钟入门

## npm 发布流程

### 1. 编译
```bash
npm run build
# 输出: dist/index.js, dist/index.d.ts (+ .map 文件)
```

### 2. 验证 package.json
```bash
npm pack --dry-run
# 查看会被发布的文件列表
```

### 3. 发布
```bash
# 首次需要登录
npm login

# 发布到 npm
npm publish --access public

# 发布到特定 registry
npm publish --registry https://registry.npmjs.org/
```

### 4. 验证发布成功
```bash
npm info @sansheng/liubu
# 查看包信息

npm search sansheng-liubu
# 搜索包
```

## 用户使用流程

### 1. 安装
```bash
npm install @sansheng/liubu
```

### 2. 配置 opencode.json
```json
{
  "plugin": ["@sansheng/liubu"]
}
```

### 3. OpenCode 自动加载
- ✅ 自动从 npm node_modules 加载 @sansheng/liubu
- ✅ 自动发现 .opencode/agents/ 中的 11 个智能体
- ✅ 自动发现 .opencode/domains/ 中的 4 个工作域
- ✅ 自动发现每个 domain 中的 skills/
- ✅ 自动加载 plugins/sansheng-liubu.ts 中的工具函数

### 4. 使用命令
```bash
/switch-domain asset-management
/status
/start 任务描述
/cr-start asset_type=service asset_name=user-service cr_description="..."
```

## 核心优势

| 对比项 | 之前（本地文件） | 之后（npm 包） |
|--------|------------------|----------------|
| **安装** | 手动克隆 repo | `npm install @sansheng/liubu` |
| **配置** | 复制路径配置 | 一行 opencode.json |
| **版本** | 手动同步 | `npm update` |
| **发现** | 手动注册 | 自动发现 |
| **分享** | 传文件 | 共享 npm 包 |
| **更新** | 重新克隆 | `npm upgrade` |

## 关键数据

- **总行数**：40,000+ 行（含文档）
- **agents**：11 个
- **domains**：4 个
- **skills**：15+ 个
- **tools**：7 个
- **已实现**: OmO Phase 1 & 2，100% 完整
