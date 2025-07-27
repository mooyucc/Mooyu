#!/bin/bash

echo "=== Nginx 修复脚本 ==="
echo "时间: $(date)"
echo ""

# 1. 停止可能冲突的服务
echo "1. 停止可能冲突的服务:"
systemctl stop nginx 2>/dev/null || true
pkill nginx 2>/dev/null || true
echo "✓ 已停止现有 Nginx 进程"
echo ""

# 2. 检查并创建必要的目录
echo "2. 检查并创建必要的目录:"
mkdir -p /var/log/nginx
mkdir -p /var/cache/nginx
mkdir -p /etc/nginx/conf.d
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled
echo "✓ 目录检查完成"
echo ""

# 3. 设置正确的权限
echo "3. 设置目录权限:"
chown -R nginx:nginx /var/log/nginx 2>/dev/null || true
chown -R nginx:nginx /var/cache/nginx 2>/dev/null || true
chmod 755 /var/log/nginx
chmod 755 /var/cache/nginx
echo "✓ 权限设置完成"
echo ""

# 4. 检查配置文件语法
echo "4. 检查配置文件语法:"
if nginx -t; then
    echo "✓ 配置文件语法正确"
else
    echo "✗ 配置文件语法错误，尝试修复..."
    
    # 备份原配置
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # 创建基本配置
    cat > /etc/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    include /etc/nginx/conf.d/*.conf;
}
EOF
    echo "✓ 已创建基本配置文件"
fi
echo ""

# 5. 检查端口占用
echo "5. 检查端口占用:"
if netstat -tlnp | grep :80; then
    echo "⚠ 80 端口被占用，尝试释放..."
    netstat -tlnp | grep :80 | awk '{print $7}' | cut -d'/' -f1 | xargs kill -9 2>/dev/null || true
fi

if netstat -tlnp | grep :443; then
    echo "⚠ 443 端口被占用，尝试释放..."
    netstat -tlnp | grep :443 | awk '{print $7}' | cut -d'/' -f1 | xargs kill -9 2>/dev/null || true
fi
echo "✓ 端口检查完成"
echo ""

# 6. 重新加载 systemd
echo "6. 重新加载 systemd:"
systemctl daemon-reload
echo "✓ systemd 重新加载完成"
echo ""

# 7. 启动 Nginx
echo "7. 启动 Nginx:"
systemctl start nginx
if [ $? -eq 0 ]; then
    echo "✓ Nginx 启动成功"
    systemctl enable nginx
    echo "✓ Nginx 已设置为开机自启"
else
    echo "✗ Nginx 启动失败"
    echo "详细错误信息:"
    journalctl -xeu nginx.service --no-pager -n 10
    exit 1
fi
echo ""

# 8. 检查服务状态
echo "8. 检查服务状态:"
systemctl status nginx --no-pager
echo ""

# 9. 测试访问
echo "9. 测试本地访问:"
if curl -s http://localhost > /dev/null; then
    echo "✓ 本地访问测试成功"
else
    echo "✗ 本地访问测试失败"
fi
echo ""

echo "=== 修复完成 ==="
echo "如果仍有问题，请运行 diagnose-nginx.sh 进行详细诊断" 