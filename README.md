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
├── mooplan.html              # MooPlan 产品介绍页
├── mooflow.html              # MooFlow 产品介绍页
├── moodata.html              # MooData 产品介绍页
├── login.html                # 用户登录页面
├── download.html             # App Family 下载页
├── server.js                 # Node.js 后端服务主文件
├── download-images.js        # 下载相关脚本
├── package.json              # 项目依赖与脚本配置
├── package-lock.json         # 依赖锁定文件
├── favicon.ico               # 网站图标
├── .gitignore                # Git 忽略文件配置
├── .gitattributes            # Git 属性配置
├── .DS_Store                 # macOS 系统文件
├── /js
│   └── main.js               # 前端主脚本
├── /css
│   └── style.css             # 全站样式表
├── /images                   # 图片与图标资源
│   ├── logo.png
│   ├── MooyuA.png
│   ├── MooyuB.png
│   ├── Mooyu.png
│   ├── thanks.png
│   ├── free.png
│   ├── favicon-*.png/svg
│   ├── Flow_core-features.png
│   ├── Flow_design.png
│   ├── Flow_design-dark.png
│   ├── Flow_matrix.png
│   ├── Flow_personalization.png
│   ├── Flow_views.png
│   ├── Flow_workspace.png
│   ├── Plan_core-features.png
│   ├── Data_core-features.png
│   ├── iconMooPlan.png
│   ├── iconMooFlow.png
│   ├── iconMooData.png
│   ├── apple-logo.png
│   ├── apple-logo2.png
│   ├── google-logo.png
│   ├── apple-touch-icon.png
│   ├── safari-pinned-tab.svg
│   ├── site.webmanifest
│   ├── web-app-manifest-*.png
│   └── ...                   # 其他产品相关图片
├── /download                 # 应用安装包目录
├── /node_modules             # 依赖库（自动生成）
├── /.github                  # GitHub 配置目录
│   └── /workflows
│       └── deploy.yml        # GitHub Actions 自动部署配置
└── .git/                     # Git 版本管理目录
```

---

## 主要文件说明

- `index.html`：网站首页，展示 MooYu 产品家族入口。
- `mooplan.html`：MooPlan 产品详细介绍及功能展示。
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
- MooPlan 应用安装包适用于 macOS

---
## Github 推送
1、查看当前远程仓库地址
```bash
git remote -v
```
2、切换仓库
先移除原有的远程仓库，再添加正确的仓库地址：
```bash
git remote remove origin
git remote add origin https://github.com/mooyucc/Mooyu.git
```
### 将本地代码推送到 GitHub Mooyu仓库
1. 打开终端，进入项目目录：
```bash
cd "/Users/kevinx/Documents/Website/Mooyu/mooyu-website"
```
2. 初始化 Git（如未初始化）：
```bash
git init
```
3. 添加远程仓库（如未添加）：
```bash
git remote add origin https://github.com/mooyucc/Mooyu.git
```
4. 推送到 GitHub：
```bash
git add .
git commit -m "YYMMDD代码更新"
git push origin main
```


---

## 腾讯云服务器部署 Node.js + MongoDB 网站（Docker 版 MongoDB 和安全组设置）全流程

### 1. 通过 SSH 连接服务器
```bash
ssh root@122.51.133.41
```
输入密码，连接成功。

### 2. 创建项目目录
```bash
mkdir -p /root/Mooyu
```

### 3. 上传项目文件到服务器
在本地终端（不是 SSH 里）输入：
```bash
scp -r /Users/kevinx/Documents/Website/Mooyu/mooyu-website/* root@122.51.133.41:/root/Mooyu
```
输入服务器密码，等待上传完成。

### 4. 安装 Node.js（如未安装）
可用 nvm 或 yum/apt 安装，推荐 nvm 管理多版本。

### 5. 安装 Docker（用于 MongoDB）
```bash
yum install -y docker
systemctl start docker
systemctl enable docker
```

### 6. 配置 Docker 国内镜像加速器（推荐）
内容如下（以腾讯云为例）：
```bash
mkdir -p /etc/docker
```
```bash
cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": ["https://mirror.ccs.tencentyun.com"]
}
EOF
```
```bash
systemctl restart docker
```

### 7. 启动 MongoDB 容器
```bash
docker run -d --name mongo -p 27017:27017 -v /data/mongo:/data/db mongo:6.0
```

### 8. 安装 Node.js 项目依赖
```bash
cd /root/Mooyu
npm install
```

### 9. 启动 Node.js 服务
```bash
npm start
```

### 10. 配置腾讯云安全组，开放 3000 端口
1. 登录腾讯云控制台
2. 进入云服务器实例详情
3. 点击“防火墙”，
4. “添加规则”→
   - 应用类型：自定义
   - 来源：全部IPv4地址
   - 协议端口：TCP:3000
   - 策略：允许
   - 描述：Node.js 3000端口
5. 保存，等待生效

### 11. 浏览器访问测试
在浏览器输入：
```
http://你的服务器IP:3000
```
即可访问你的 Node.js 网站。

---

如需后续绑定域名、配置 HTTPS、Nginx 反代等，欢迎随时提问！

##腾讯云服务器文件更新流程，以及重新启动Node.js服务
1、先停止Node.js服务
```bash
ssh root@122.51.133.41
cd /root/Mooyu
pm2 stop mooyu
```
2、上传替换代码文件
```bash
scp -r /Users/kevinx/Documents/Website/Mooyu/mooyu-website/* root@122.51.133.41:/root/Mooyu
```
3、重新启动Node.js服务
```bash
pm2 restart mooyu
```
备注：如果你只是更新静态文件（如图片、前端 html/js/css），通常不需要重启服务，除非你改动了后端代码。

##已经建立Github自动部署到腾讯云的Workflow，只要更新GitHub仓库即可