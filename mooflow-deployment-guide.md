# MooFlow 网页端应用部署指南

## 概述

本指南将帮助您将 MooFlow 网页端应用从 GitHub Pages 迁移到腾讯云服务器，与现有的 MooYu 网站互不干扰。

## 部署方案

### 方案一：子域名部署（推荐）
- MooYu 主站：https://mooyu.cc
- MooFlow 应用：http://flow.mooyu.cc

### 方案二：子域名部署
- MooYu 主站：https://mooyu.cc
- MooFlow 应用：https://flow.mooyu.cc

## 部署步骤

### 1. 准备 MooFlow 应用文件

将您的 MooFlow 网页端应用文件整理到以下结构：
```
mooflow/
├── index.html          # 主页面
├── favicon.png         # 网站图标
├── bg-login.png        # 登录背景图
├── assets/             # 编译后的资源文件
│   ├── index-*.css     # 样式文件
│   └── index-*.js      # JavaScript 文件
├── jspdf.umd.min.js    # PDF 生成库
└── svg2pdf.umd.min.js  # SVG 转 PDF 库
```

### 2. 上传文件到服务器

```bash
# 在本地终端执行
scp -r "/Users/kevinx/Documents/Ai Project/MooFlow-Web/dist/*" root@122.51.133.41:/root/Mooyu/mooflow/
```

### 3. 在服务器上执行部署

```bash
# SSH 连接到服务器
ssh root@122.51.133.41

# 进入项目目录
cd /root/Mooyu

# 运行部署脚本
chmod +x deploy-mooflow.sh
bash deploy-mooflow.sh
```

### 4. 配置 Nginx（子域名方案）

```bash
# 复制 Nginx 配置
cp nginx-mooflow.conf /etc/nginx/conf.d/

# 测试配置
nginx -t

# 重新加载 Nginx
systemctl reload nginx
```

### 5. 申请 SSL 证书（子域名方案）

```bash
# 申请 flow.mooyu.cc 的 SSL 证书
certbot --nginx -d flow.mooyu.cc
```

### 6. 启动服务

```bash
# 启动所有服务
pm2 start ecosystem.config.js --env production

# 查看服务状态
pm2 status

# 查看日志
pm2 logs mooflow
```

### 7. 配置腾讯云安全组

在腾讯云控制台添加安全组规则：
- 协议端口：TCP:3001
- 来源：全部 IPv4 地址
- 策略：允许
- 描述：MooFlow 应用端口

## 访问地址

### 子域名方案（推荐）
- MooYu 主站：https://mooyu.cc
- MooFlow 应用：http://flow.mooyu.cc

### 备用访问方式
- MooYu 主站：http://mooyu.cc:3000
- MooFlow 应用：http://mooyu.cc:3001

## 管理命令

```bash
# 查看所有服务状态
pm2 status

# 重启 MooFlow 服务
pm2 restart mooflow

# 查看 MooFlow 日志
pm2 logs mooflow

# 停止 MooFlow 服务
pm2 stop mooflow

# 删除 MooFlow 服务
pm2 delete mooflow
```

## 更新部署

当您需要更新 MooFlow 应用时：

```bash
# 1. 上传新文件
scp -r "/Users/kevinx/Documents/Ai Project/MooFlow-Web/dist/*" root@122.51.133.41:/root/Mooyu/mooflow/

# 2. 重启服务
ssh root@122.51.133.41
cd /root/Mooyu
pm2 restart mooflow
```

## 故障排除

### 1. 端口冲突
如果端口 3001 被占用，可以修改 `ecosystem.config.js` 中的端口配置。

### 2. 文件权限问题
```bash
chmod -R 755 /root/Mooyu/mooflow
chown -R root:root /root/Mooyu/mooflow
```

### 3. Nginx 配置错误
```bash
nginx -t
systemctl status nginx
```

### 4. SSL 证书问题
```bash
certbot certificates
certbot renew --dry-run
```

## 优势

1. **独立部署**：MooFlow 与 MooYu 主站完全独立
2. **易于管理**：使用 PM2 统一管理多个服务
3. **灵活扩展**：可以轻松添加更多子应用
4. **成本效益**：在单台服务器上运行多个应用
5. **专业域名**：可以使用子域名提供更好的用户体验

## 注意事项

1. 确保 MooFlow 应用是单页应用（SPA），否则需要配置路由重写
2. 定期备份应用文件和数据
3. 监控服务器资源使用情况
4. 设置日志轮转避免磁盘空间不足 