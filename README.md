# Warp Plus

> 基于 Tauri + React + TypeScript 构建的桌面工具集合应用

## 📦 已完成功能

### 1. Warp 登录助手
- **功能**：通过 refresh_token 和 state 快速登录 Warp 终端
- **特性**：
  - 支持粘贴完整 URL 自动提取 state 参数
  - 实时生成 `warp://` 协议链接
  - 一键触发系统协议处理器打开 Warp
  - 图文并茂的使用教程（可点击放大查看）
  - 集成广告栏（QQ群链接）

### 2. 临时邮箱工具
- **功能**：快速生成临时邮箱地址并实时查收邮件
- **特性**：
  - 页面加载时自动生成邮箱
  - 一键复制邮箱地址
  - 每 10 秒自动刷新邮件列表
  - 支持手动刷新
  - 邮件列表展示（发件人、主题、时间）
  - 点击邮件卡片展开查看详情
  - 支持 HTML 邮件渲染（iframe 沙箱）
  - 纯文本邮件格式化显示
  - 后端 Rust API 集成（`mail.chatgpt.org.uk`）

### 3. 机器码处理工具
- **功能**：获取和管理本机硬件信息及机器码
- **特性**：
  - 获取系统硬件信息（CPU、磁盘、内存等）
  - 基于硬件信息生成唯一机器码
  - 机器码验证和校验功能
  - 一键复制机器码
  - 机器码绑定与授权管理

### 4. Warp UUID 生成器
- **功能**：生成和管理 Warp UUID
- **特性**：
  - 一键生成新的 UUID
  - UUID 格式验证
  - 一键复制功能
  - 历史记录管理
  - 集成 Token 存储功能

### 5. MCP 管理器
- **功能**：管理 Model Context Protocol 连接和规则
- **特性**：
  - MCP 服务器连接配置
  - 规则创建和编辑界面
  - 规则导入/导出（JSON 格式）
  - 规则注册表管理
  - 实时连接状态显示

### 6. UI/UX 优化
- 侧边栏导航（支持多标签页切换）
- 暗色模式自动适配
- 组件化 CSS 管理（拆分至独立文件）
- 响应式布局
- 平滑动画效果

## 💻 平台支持

本应用基于 Tauri 构建，支持以下操作系统：

- ✅ **Windows** 10/11（x64）
- ✅ **macOS** 10.15+（Intel & Apple Silicon）
- ✅ **Linux**（Ubuntu 20.04+、Debian、Fedora、Arch 等主流发行版）

### 系统要求
- Windows: WebView2 运行时（Windows 11 自带，Windows 10 可能需要安装）
- macOS: macOS 10.15 Catalina 或更高版本
- Linux: 需要安装 webkit2gtk、libappindicator 等依赖

## 🛠 技术栈

### 前端
- **框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式**：原生 CSS（组件级 CSS 文件）
- **状态管理**：React Hooks

### 后端
- **框架**：Tauri 2.x
- **语言**：Rust
- **HTTP 客户端**：reqwest
- **命令系统**：模块化 Tauri Commands

### 其他
- **协议处理**：`@tauri-apps/plugin-opener`
- **API 集成**：mail.chatgpt.org.uk（临时邮箱）

## 📋 下一步计划

### 1. 机器码处理工具
- [x] 获取本机硬件信息
- [x] 生成/验证机器码
- [x] 机器码绑定与授权管理

### 2. MCP（Model Context Protocol）集成
- [x] MCP 服务器连接管理
- [x] 上下文同步与共享

### 3. 规则管理系统
- [x] 自定义规则配置界面
- [x] 规则导入/导出
- [x] 规则验证与测试
- [x] 规则模板库

### 4. 其他优化
- [ ] 应用设置页面
- [ ] 数据持久化（本地存储）
- [ ] 错误日志记录
- [ ] 自动更新功能

## 🚀 开发指南

### 环境要求
- Node.js 18+
- Rust 1.70+
- pnpm / npm / yarn

### 安装依赖
```bash
pnpm install
```

### 开发模式
```bash
pnpm tauri dev
```

### 构建应用
```bash
pnpm tauri build
```

## 📁 项目结构

```
warp-plus/
├── .github/
│   └── workflows/
│       └── release.yml            # GitHub Actions 发布
├── public/
│   ├── tauri.svg
│   ├── vite.svg
│   └── warp/                      # 教程截图
│       ├── 1.png … 6.png
├── src/
│   ├── App.tsx                    # 主应用
│   ├── App.css                    # 全局样式
│   ├── main.tsx                   # 前端入口
│   ├── vite-env.d.ts
│   ├── assets/
│   │   └── react.svg
│   └── components/                # React 组件
│       ├── Login.tsx / Login.css  # 账户中心（登录/充值/记录）
│       ├── WarpLogin.tsx / .css   # Warp 上号器（自动领取/填充）
│       ├── TempMail.tsx / .css    # 临时邮箱
│       ├── WarpUUID.tsx / .css    # 我的信息/机器码与额度
│       ├── MCPManager.tsx / .css  # MCP 管理
├── src-tauri/
│   ├── build.rs
│   ├── Cargo.toml
│   ├── Cargo.lock
│   ├── tauri.conf.json            # Tauri 配置（version: 1.2.0）
│   ├── .gitignore
│   ├── capabilities/
│   │   └── default.json
│   ├── icons/                     # 应用图标
│   └── src/
│       ├── main.rs                # 二进制入口
│       ├── lib.rs                 # 库入口 / 注册命令
│       └── commands/              # Tauri 命令模块
│           ├── mod.rs
│           ├── auth.rs            # 登录/余额/充值/统计/领取/记录
│           ├── email.rs           # 临时邮箱
│           ├── mcp_rules.rs       # MCP 规则
│           ├── registry.rs        # 系统注册表/机器码
│           └── warp_token.rs      # Warp Token/额度
├── package.json                   # 版本：1.2.0
└── README.md
```

## 🔗 相关链接

- **QQ 交流群**：[1014952167](https://qm.qq.com/q/vi1EFO0mxG)
- **Tauri 文档**：https://tauri.app/
- **React 文档**：https://react.dev/

## 👤 作者

**呆橘** (DaiJu)

- GitHub: [@xn030523](https://github.com/xn030523)
- QQ 群: [1014952167](https://qm.qq.com/q/vi1EFO0mxG)

## 📝 开源协议

MIT License © 2025 呆橘
