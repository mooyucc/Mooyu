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

配置文件内容：
```nginx
server {
    listen 80;
    server_name mooyu.cc www.mooyu.cc;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mooyu.cc www.mooyu.cc;
    
    # SSL 证书配置（稍后配置）
    ssl_certificate /etc/letsencrypt/live/mooyu.cc/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mooyu.cc/privkey.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
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
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
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