#!/bin/bash

echo "=== 修复 flow.mooyu.cc 子域名配置 ==="

# 检查是否在服务器上运行
if [ "$EUID" -ne 0 ]; then
    echo "请在服务器上以 root 用户运行此脚本"
    exit 1
fi

# 1. 备份现有配置
echo "备份现有 Nginx 配置..."
cp /etc/nginx/conf.d/mooyu.conf /etc/nginx/conf.d/mooyu.conf.backup 2>/dev/null || true

# 2. 创建 flow.mooyu.cc 的 Nginx 配置
echo "创建 flow.mooyu.cc 的 Nginx 配置..."
cat > /etc/nginx/conf.d/flow.mooyu.cc.conf << 'EOF'
# Flow 子域名配置（HTTP 版本）
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
EOF

# 3. 测试 Nginx 配置
echo "测试 Nginx 配置..."
nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx 配置测试通过"
    
    # 4. 重启 Nginx
    echo "重启 Nginx 服务..."
    systemctl restart nginx
    
    # 5. 检查 Nginx 状态
    echo "检查 Nginx 状态..."
    systemctl status nginx --no-pager
    
    # 6. 检查端口监听
    echo "检查端口监听状态..."
    netstat -tlnp | grep :80
    netstat -tlnp | grep :443
    
    # 7. 检查 MooFlow 服务状态
    echo "检查 MooFlow 服务状态..."
    if command -v pm2 &> /dev/null; then
        pm2 status
    else
        echo "PM2 未安装，请手动检查 MooFlow 服务"
    fi
    
    # 8. 测试本地连接
    echo "测试本地连接..."
    curl -I http://localhost:3001 2>/dev/null || echo "MooFlow 服务未运行在端口 3001"
    
    echo ""
    echo "=== 配置完成 ==="
    echo "现在可以访问："
    echo "- http://flow.mooyu.cc"
    echo "- http://mooyu.cc:3001 (备用)"
    echo ""
    echo "如果仍然无法访问，请检查："
    echo "1. DNS 解析是否正确指向服务器 IP"
    echo "2. 防火墙是否开放 80 端口"
    echo "3. 腾讯云安全组是否允许 80 端口"
    echo "4. MooFlow 服务是否正在运行"
    
else
    echo "Nginx 配置测试失败，请检查配置"
    exit 1
fi 