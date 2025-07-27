#!/bin/bash

# MooYu 域名部署脚本
# 使用方法: bash deploy-domain.sh

set -e  # 遇到错误立即退出

echo "=== MooYu 域名部署脚本 ==="
echo "时间: $(date)"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "错误: 请使用 root 用户运行此脚本"
    exit 1
fi

# 1. 安装 Nginx
echo "1. 安装 Nginx..."
if ! command -v nginx &> /dev/null; then
    yum install -y nginx
    echo "✓ Nginx 安装完成"
else
    echo "✓ Nginx 已安装"
fi

systemctl start nginx
systemctl enable nginx
echo "✓ Nginx 服务已启动并设置为开机自启"

# 2. 创建 Nginx 配置文件
echo ""
echo "2. 创建 Nginx 配置文件..."
cat > /etc/nginx/conf.d/mooyu.conf << 'EOF'
server {
    listen 80;
    server_name mooyu.cc www.mooyu.cc;
    
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
}
EOF

echo "✓ Nginx 配置文件已创建"

# 3. 测试 Nginx 配置
echo ""
echo "3. 测试 Nginx 配置..."
if nginx -t; then
    echo "✓ Nginx 配置测试通过"
    systemctl restart nginx
    echo "✓ Nginx 服务已重启"
else
    echo "✗ Nginx 配置测试失败，请检查配置文件"
    exit 1
fi

# 4. 配置防火墙
echo ""
echo "4. 配置防火墙..."
firewall-cmd --permanent --add-port=80/tcp 2>/dev/null || true
firewall-cmd --permanent --add-port=443/tcp 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true
echo "✓ 防火墙配置完成"

# 5. 安装 Certbot
echo ""
echo "5. 安装 Certbot..."
if ! command -v certbot &> /dev/null; then
    yum install -y epel-release
    yum install -y certbot python3-certbot-nginx
    echo "✓ Certbot 安装完成"
else
    echo "✓ Certbot 已安装"
fi

# 6. 获取 SSL 证书
echo ""
echo "6. 获取 SSL 证书..."
if certbot --nginx -d mooyu.cc -d www.mooyu.cc --non-interactive --agree-tos --email mooyucc@qq.com; then
    echo "✓ SSL 证书获取成功"
else
    echo "⚠ SSL 证书获取失败，请检查域名解析"
    echo "您可以稍后手动运行: certbot --nginx -d mooyu.cc -d www.mooyu.cc"
fi

# 7. 设置自动续期
echo ""
echo "7. 设置自动续期..."
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
echo "✓ 自动续期已设置"

# 8. 验证服务状态
echo ""
echo "8. 验证服务状态..."
echo "Nginx 状态:"
systemctl status nginx --no-pager -l

echo ""
echo "PM2 状态:"
if command -v pm2 &> /dev/null; then
    pm2 status
else
    echo "PM2 未安装，请手动检查 Node.js 服务状态"
fi

echo ""
echo "=== 部署完成 ==="
echo "现在您可以通过以下地址访问网站："
echo "- HTTP: http://mooyu.cc"
echo "- HTTPS: https://mooyu.cc"
echo "- HTTPS: https://www.mooyu.cc"
echo ""
echo "如果遇到问题，请运行: bash diagnose-nginx.sh" 