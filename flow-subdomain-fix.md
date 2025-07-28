# flow.mooyu.cc 子域名修复指南

## 问题描述
`flow.mooyu.cc` 子域名当前指向了主站 `mooyu.cc`，而不是 MooFlow 应用。正确的配置应该是：
- `flow.mooyu.cc` → MooFlow 应用（端口 3001）
- `mooyu.cc` → 主站（端口 3000）

## 解决方案

### 1. 上传修复脚本到服务器
```bash
# 在本地终端执行
scp fix-flow-subdomain.sh root@122.51.133.41:/root/Mooyu/
scp diagnose-flow-subdomain.sh root@122.51.133.41:/root/Mooyu/
```

### 2. 在服务器上执行诊断
```bash
ssh root@122.51.133.41
cd /root/Mooyu
chmod +x diagnose-flow-subdomain.sh
./diagnose-flow-subdomain.sh
```

### 3. 执行修复脚本
```bash
chmod +x fix-flow-subdomain.sh
./fix-flow-subdomain.sh
```

### 4. 验证修复结果
```bash
# 测试本地连接
curl -I http://localhost:3001

# 测试域名访问
curl -I http://flow.mooyu.cc
```

## 手动配置步骤（如果自动脚本失败）

### 1. 创建 Nginx 配置文件
```bash
nano /etc/nginx/conf.d/flow.mooyu.cc.conf
```

添加以下内容：
```nginx
# Flow 子域名配置
server {
    listen 80;
    server_name flow.mooyu.cc;
    
    # 代理到 MooFlow 应用
    location / {
        proxy_pass http://localhost:3001;
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
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3001;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 健康检查
    location /api/health {
        proxy_pass http://localhost:3001;
        access_log off;
    }
}
```

### 2. 测试并重启 Nginx
```bash
nginx -t
systemctl restart nginx
```

### 3. 确保 MooFlow 服务正在运行
```bash
# 检查 PM2 状态
pm2 status

# 如果服务未运行，启动它
pm2 start ecosystem.config.js --env production
```

### 4. 检查防火墙设置
```bash
# 确保 80 端口开放
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --reload
```

## 常见问题排查

### 1. DNS 解析问题
```bash
# 检查 DNS 解析
nslookup flow.mooyu.cc
dig flow.mooyu.cc
```

确保 `flow.mooyu.cc` 解析到正确的服务器 IP。

### 2. 服务未运行
```bash
# 检查 MooFlow 服务
ps aux | grep mooflow
netstat -tlnp | grep :3001
```

### 3. 防火墙问题
```bash
# 检查防火墙状态
firewall-cmd --list-all
```

### 4. 腾讯云安全组
确保腾讯云安全组允许 80 端口访问。

## 验证步骤

1. **本地测试**：
   ```bash
   curl -I http://localhost:3001
   ```

2. **域名测试**：
   ```bash
   curl -I http://flow.mooyu.cc
   ```

3. **浏览器访问**：
   - 访问 http://flow.mooyu.cc
   - 应该显示 MooFlow 应用页面，而不是主站

## 预期结果

修复后，访问 `http://flow.mooyu.cc` 应该：
- 显示 MooFlow 应用界面
- 与 `http://mooyu.cc:3001` 显示相同内容
- 不再重定向到主站

## 备用方案

如果子域名配置仍有问题，可以：
1. 使用 `http://mooyu.cc:3001` 作为临时访问地址
2. 配置 HTTPS 版本的子域名（需要单独的 SSL 证书）
3. 使用路径路由：`https://mooyu.cc/flow` 