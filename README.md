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
├── /logs                     # 应用日志目录
├── /.github                  # GitHub 配置目录
│   └── /workflows
│       └── deploy.yml        # GitHub Actions 自动部署配置
├── ecosystem.config.js       # PM2 配置文件
├── deploy-domain.sh          # 域名部署脚本
├── diagnose-nginx.sh         # Nginx 诊断脚本
├── fix-nginx.sh             # Nginx 修复脚本
├── nginx-config.md          # Nginx 配置文档
├── ssl-setup.md             # SSL 证书配置文档
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

1. 安装 Node.js 依赖：
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
5. 访问 `http://localhost:3000` 即可浏览网站。

## AI 搜索功能说明

系统使用 AI（Deepseek）来获取和整理学校信息：

1. **AI 查询学校信息**
   - 基于 AI 知识库查询学校基础信息
   - 包括：学校名称、网址、类型、学段、课程等
   - 如果学校已有官方网站，AI 会优先基于网站信息进行查询

2. **学校对比时调用 AI**
   - 学校对比功能直接使用 AI 进行评估和评分
   - 基于评估体系进行量化评分对比

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

### 3. 上传更新项目文件到服务器
在本地终端（不是 SSH 里）输入：
```bash
# 方法一：使用新的更新脚本（推荐）
./update-website.sh

# 方法二：手动上传到正确的 Nginx 服务目录
scp -r /Users/kevinx/Documents/Website/Mooyu/mooyu-website/* root@122.51.133.41:/var/www/mooyu-website/
ssh root@122.51.133.41 "chown -R nginx:nginx /var/www/mooyu-website/ && systemctl restart nginx"
```
输入服务器密码，等待上传完成。


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


### 快速部署域名访问
1. 上传部署脚本到服务器：
```bash
scp deploy-domain.sh root@122.51.133.41:/root/Mooyu/
```

2. 在服务器上执行部署脚本：
```bash
ssh root@122.51.133.41
cd /root/Mooyu
chmod +x deploy-domain.sh
bash deploy-domain.sh
```

### 应用更新方式

#### 1. 主网站更新（MooYu 主站）
```bash
# 使用更新脚本（推荐）
./update-website.sh

# 或手动更新（使用 rsync，自动排除不需要的文件）
rsync -av --progress --exclude-from=.rsyncignore /Users/kevinx/Documents/Website/Mooyu/mooyu-website/ root@122.51.133.41:/var/www/mooyu-website/
ssh root@122.51.133.41 "chown -R nginx:nginx /var/www/mooyu-website/ && systemctl restart nginx"
```

#### 2. MooFlow 应用更新
```bash
# 使用 MooFlow 更新脚本（推荐）
./update-mooflow.sh

# 或手动更新
scp -r "/Users/kevinx/Documents/Ai Project/MooFlow-Web/dist"/* root@122.51.133.41:/root/Mooyu/mooflow/
scp /Users/kevinx/Documents/Website/Mooyu/mooyu-website/mooflow-server.js root@122.51.133.41:/root/Mooyu/
ssh root@122.51.133.41 "pm2 restart mooflow"
```

### 使用 PM2 管理 Node.js 服务
```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 重启服务
pm2 restart mooyu

# 查看日志
pm2 logs mooyu

# 设置开机自启
pm2 startup
pm2 save
```

### 手动配置步骤
如果自动脚本失败，可以按照以下步骤手动配置：

1. **安装 Nginx**：
```bash
yum install -y nginx
systemctl start nginx
systemctl enable nginx
```

2. **创建 Nginx 配置文件**：
```bash
nano /etc/nginx/conf.d/mooyu.conf
```
参考 `nginx-config.md` 文件中的配置内容。

3. **配置 SSL 证书**：
```bash
yum install -y epel-release certbot python3-certbot-nginx
certbot --nginx -d mooyu.cc -d www.mooyu.cc
```

4. **配置防火墙**：
```bash
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
```

5. **腾讯云安全组设置**：
在腾讯云控制台的安全组中添加规则：
- 协议端口：TCP:80 (HTTP)
- 协议端口：TCP:443 (HTTPS)

### 访问地址
配置完成后，可以通过以下地址访问：
- MooYu 主站：https://mooyu.cc
- MooFlow 应用：http://flow.mooyu.cc
- 备用访问：http://mooyu.cc:3001

### 子域名问题修复
如果 `flow.mooyu.cc` 显示主站内容而不是 MooFlow 应用，请运行：
```bash
# 上传修复脚本
scp fix-flow-subdomain.sh root@122.51.133.41:/root/Mooyu/
scp diagnose-flow-subdomain.sh root@122.51.133.41:/root/Mooyu/

# 在服务器上执行修复
ssh root@122.51.133.41
cd /root/Mooyu
chmod +x fix-flow-subdomain.sh
./fix-flow-subdomain.sh
```

详细修复指南请参考 `flow-subdomain-fix.md` 文件。

### SSL 证书自动续期
证书会自动续期，如需手动检查：
```bash
certbot renew --dry-run
```