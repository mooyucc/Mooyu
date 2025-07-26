# 检查当前 Nginx 配置

## 1. 查看 Nginx 状态
```bash
ssh root@122.51.133.41
systemctl status nginx
```

## 2. 查看默认配置文件
```bash
cat /etc/nginx/nginx.conf
ls -la /etc/nginx/conf.d/
ls -la /etc/nginx/sites-enabled/  # 如果存在
```

## 3. 查看默认站点配置
```bash
cat /etc/nginx/conf.d/default.conf
# 或者
cat /etc/nginx/sites-available/default
```

## 4. 停止 Nginx 默认配置
```bash
# 备份默认配置
cp /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.backup

# 删除或重命名默认配置
mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled
```

## 5. 创建 MooYu 专用配置
```bash
nano /etc/nginx/conf.d/mooyu.conf
```

配置内容：
```nginx
server {
    listen 80;
    server_name 122.51.133.41 mooyu.cc www.mooyu.cc;
    
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

## 6. 测试并重启 Nginx
```bash
nginx -t
systemctl restart nginx
```

## 7. 验证配置
访问 http://122.51.133.41 应该现在显示 MooYu 网站了。 