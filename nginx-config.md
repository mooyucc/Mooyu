# Nginx 配置步骤

## 1. 安装 Nginx
```bash
ssh root@122.51.133.41
yum install -y nginx
systemctl start nginx
systemctl enable nginx
```

## 2. 创建 Nginx 配置文件
```bash
nano /etc/nginx/conf.d/mooyu.conf
```

### 基础配置（HTTP）
```nginx
server {
    listen 80;
    server_name mooyu.cc www.mooyu.cc;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}
```

### 完整配置（HTTPS）
```nginx
server {
    listen 443 ssl http2;
    server_name mooyu.cc www.mooyu.cc;
    
    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/mooyu.cc/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mooyu.cc/privkey.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # HSTS 安全头
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # 反向代理到 Node.js 应用
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # 隐藏 Nginx 版本
    server_tokens off;
}
```

## 3. 测试配置并重启 Nginx
```bash
nginx -t
systemctl restart nginx
```

## 4. 配置防火墙
```bash
# 开放 80 和 443 端口
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
```

## 5. 腾讯云安全组设置
在腾讯云控制台的安全组中添加规则：
- 协议端口：TCP:80 (HTTP)
- 协议端口：TCP:443 (HTTPS)

## 6. 性能优化配置
在 `/etc/nginx/nginx.conf` 的 http 块中添加：
```nginx
# 启用 gzip 压缩
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# 文件缓存
open_file_cache max=1000 inactive=20s;
open_file_cache_valid 30s;
open_file_cache_min_uses 2;
open_file_cache_errors on;
```

## 7. 日志配置
```nginx
# 访问日志格式
log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                '$status $body_bytes_sent "$http_referer" '
                '"$http_user_agent" "$http_x_forwarded_for"';

access_log /var/log/nginx/mooyu.access.log main;
error_log /var/log/nginx/mooyu.error.log;
``` 