# Mooyu.cc SSL 证书手动配置指南

## 前提条件
- 服务器已安装 Nginx
- 域名 mooyu.cc 和 www.mooyu.cc 已正确解析到服务器 IP
- 服务器防火墙已开放 80 和 443 端口

## 步骤 1: 安装 Certbot

### CentOS/RHEL 系统：
```bash
# 安装 EPEL 仓库
yum install -y epel-release

# 安装 Certbot
yum install -y certbot python3-certbot-nginx
```

### Ubuntu/Debian 系统：
```bash
# 更新包列表
apt-get update

# 安装 Certbot
apt-get install -y certbot python3-certbot-nginx
```

## 步骤 2: 准备网站文件

```bash
# 创建网站目录
mkdir -p /var/www/mooyu-website

# 复制网站文件（假设网站文件在 /root/mooyu-website/）
cp -r /root/mooyu-website/* /var/www/mooyu-website/

# 设置正确的权限
chown -R nginx:nginx /var/www/mooyu-website
chmod -R 755 /var/www/mooyu-website
```

## 步骤 3: 配置 Nginx

### 创建 Nginx 配置文件：
```bash
nano /etc/nginx/conf.d/mooyu.conf
```

### 添加以下配置：
```nginx
# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name mooyu.cc www.mooyu.cc;
    return 301 https://$server_name$request_uri;
}

# HTTPS 配置
server {
    listen 443 ssl http2;
    server_name mooyu.cc www.mooyu.cc;
    
    # SSL 证书配置（Certbot 会自动更新这些路径）
    ssl_certificate /etc/letsencrypt/live/mooyu.cc/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mooyu.cc/privkey.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # 网站根目录
    root /var/www/mooyu-website;
    index index.html index.htm;
    
    # 静态文件处理
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
    }
    
    # 隐藏 Nginx 版本
    server_tokens off;
    
    # 日志配置
    access_log /var/log/nginx/mooyu.access.log;
    error_log /var/log/nginx/mooyu.error.log;
}
```

## 步骤 4: 测试 Nginx 配置

```bash
# 测试配置文件语法
nginx -t

# 如果测试通过，重启 Nginx
systemctl restart nginx
```

## 步骤 5: 配置防火墙

```bash
# 开放 HTTP 和 HTTPS 端口
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
```

## 步骤 6: 获取 SSL 证书

```bash
# 使用 Certbot 获取证书
certbot --nginx -d mooyu.cc -d www.mooyu.cc

# 或者仅获取证书（不自动配置 Nginx）
certbot certonly --nginx -d mooyu.cc -d www.mooyu.cc
```

## 步骤 7: 验证证书

```bash
# 查看证书状态
certbot certificates

# 测试证书续期
certbot renew --dry-run
```

## 步骤 8: 设置自动续期

```bash
# 添加到 crontab（每天中午 12 点检查续期）
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

# 查看 crontab
crontab -l
```

## 步骤 9: 验证配置

1. 访问 https://mooyu.cc
2. 访问 https://www.mooyu.cc
3. 检查浏览器地址栏的锁图标
4. 使用 SSL 检测工具验证配置

## 故障排除

### 如果证书获取失败：
```bash
# 检查域名解析
nslookup mooyu.cc
nslookup www.mooyu.cc

# 检查端口是否开放
netstat -tlnp | grep :80
netstat -tlnp | grep :443

# 查看 Certbot 日志
journalctl -u certbot
```

### 如果 Nginx 启动失败：
```bash
# 查看 Nginx 错误日志
tail -f /var/log/nginx/error.log

# 检查配置文件语法
nginx -t
```

## 安全建议

1. 定期更新系统和软件包
2. 监控证书过期时间
3. 配置日志轮转
4. 定期备份配置文件
5. 使用强密码和密钥 