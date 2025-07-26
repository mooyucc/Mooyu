#!/bin/bash

# 快速修复 Nginx 配置脚本
# 解决 80 端口显示 "Hello World" 的问题

echo "开始修复 Nginx 配置..."

# 1. 检查 Nginx 状态
echo "1. 检查 Nginx 状态..."
systemctl status nginx

# 2. 检查端口占用情况
echo "2. 检查端口占用情况..."
netstat -tlnp | grep :80
netstat -tlnp | grep :443

# 3. 检查 Nginx 进程
echo "3. 检查 Nginx 进程..."
ps aux | grep nginx

# 4. 备份默认配置
echo "4. 备份默认配置..."
if [ -f /etc/nginx/conf.d/default.conf ]; then
    cp /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.backup
    echo "默认配置已备份"
fi

# 5. 禁用默认配置
echo "5. 禁用默认配置..."
if [ -f /etc/nginx/conf.d/default.conf ]; then
    mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled
    echo "默认配置已禁用"
fi

# 6. 创建 MooYu 配置
echo "6. 创建 MooYu 配置..."
cat > /etc/nginx/conf.d/mooyu.conf << 'EOF'
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
EOF

echo "MooYu 配置已创建"

# 7. 检查配置文件权限
echo "7. 检查配置文件权限..."
ls -la /etc/nginx/conf.d/
chown root:root /etc/nginx/conf.d/mooyu.conf
chmod 644 /etc/nginx/conf.d/mooyu.conf

# 8. 测试配置
echo "8. 测试 Nginx 配置..."
nginx -t

if [ $? -eq 0 ]; then
    echo "配置测试通过"
    
    # 9. 停止所有 Nginx 进程
    echo "9. 停止所有 Nginx 进程..."
    pkill nginx
    sleep 2
    
    # 10. 重启 Nginx
    echo "10. 重启 Nginx..."
    systemctl restart nginx
    
    # 11. 检查重启结果
    if [ $? -eq 0 ]; then
        echo "✅ Nginx 重启成功！"
        systemctl status nginx
        echo "现在访问 http://122.51.133.41 应该显示 MooYu 网站了"
        echo "如果域名解析已生效，也可以访问 http://mooyu.cc"
    else
        echo "❌ Nginx 重启失败，查看详细错误信息..."
        echo "=== systemctl status nginx.service ==="
        systemctl status nginx.service
        echo "=== journalctl -xeu nginx.service ==="
        journalctl -xeu nginx.service --no-pager | tail -20
        echo "=== 检查错误日志 ==="
        tail -20 /var/log/nginx/error.log
        exit 1
    fi
else
    echo "❌ 配置测试失败，请检查配置文件"
    exit 1
fi 