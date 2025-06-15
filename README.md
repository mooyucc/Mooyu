# MooYu Website

## 项目简介

MooYu Website 是一个多项目管理工具及其相关产品的官方网站，包含产品介绍、下载、用户管理等功能。前端采用原生 HTML/CSS/JS，后端基于 Node.js + Express + MongoDB，适配现代浏览器及 macOS 平台。

---

## 技术栈

- **前端**：HTML5、CSS3、JavaScript（原生）
- **后端**：Node.js、Express
- **数据库**：MongoDB（通过 mongoose 连接）
- **依赖管理**：npm
- **主要依赖**：
  - express
  - mongoose
  - bcryptjs
  - jsonwebtoken
  - cors
  - dotenv
  - express-validator
  - nodemon（开发环境）

---

## 目录结构

```
.
├── index.html                # 首页，产品入口
├── mooflow.html              # MooFlow 产品介绍页
├── download.html             # App Family 下载页
├── server.js                 # Node.js 后端服务主文件
├── download-images.js        # 下载相关脚本
├── package.json              # 项目依赖与脚本配置
├── package-lock.json         # 依赖锁定文件
├── favicon.ico               # 网站图标
├── /js
│   └── main.js               # 前端主脚本
├── /css
│   └── style.css             # 全站样式表
├── /images                   # 图片与图标资源
│   ├── logo.png
│   ├── MooyuB.png
│   ├── thanks.png
│   ├── favicon-*.png/svg
│   ├── Flow_core-features.png
│   ├── ...                   # 其他产品相关图片
├── /download                 # 应用安装包
│   ├── MooFlow.dmg
│   └── MooFlow_free.dmg
├── /node_modules             # 依赖库（自动生成）
└── .git/                     # Git 版本管理目录
```

---

## 主要文件说明

- `index.html`：网站首页，展示 MooYu 产品家族入口。
- `mooflow.html`：MooFlow 产品详细介绍及功能展示。
- `download.html`：所有 MooYu App 的下载页面。
- `server.js`：后端服务，提供用户注册、登录、管理等 API，静态资源托管。
- `js/main.js`：前端交互逻辑脚本。
- `css/style.css`：全站统一样式。
- `images/`：所有图片、图标资源。
- `download/`：macOS 应用安装包。
- `package.json`：项目依赖与启动脚本配置。

---

## 启动方式

1. 安装依赖：
```bash
   npm install
```
2. 启动后端服务：
```bash
   npm start
```
   或开发模式（自动重载）：
```bash
   npm run dev
```
3. 访问 `http://localhost:3000` 即可浏览网站。

---

## 适用平台

- 前端页面兼容主流现代浏览器
- 后端服务建议运行于 macOS/Linux/Windows
- MooFlow 应用安装包适用于 macOS

---

如需详细开发文档或有任何问题，欢迎联系开发者或提交 issue。 