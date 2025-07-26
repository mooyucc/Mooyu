#!/bin/bash

# MooYu 域名部署脚本
# 使用方法: bash deploy-domain.sh

echo "开始配置 MooYu 域名访问..."

# 1. 安装 Nginx
echo "1. 安装 Nginx..."
yum install -y nginx
systemctl start nginx
systemctl enable nginx

# 2. 创建 Nginx 配置文件
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
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 3. 测试 Nginx 配置
echo "3. 测试 Nginx 配置..."
nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx 配置测试通过"
    systemctl restart nginx
else
    echo "Nginx 配置测试失败，请检查配置文件"
    exit 1
fi

# 4. 配置防火墙
echo "4. 配置防火墙..."
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload

# 5. 安装 Certbot
echo "5. 安装 Certbot..."
yum install -y epel-release
yum install -y certbot python3-certbot-nginx

# 6. 获取 SSL 证书
echo "6. 获取 SSL 证书..."
certbot --nginx -d mooyu.cc -d www.mooyu.cc --non-interactive --agree-tos --email mooyucc@qq.com

# 7. 设置自动续期
echo "7. 设置自动续期..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# 8. 验证服务状态
echo "8. 验证服务状态..."
systemctl status nginx
systemctl status pm2-mooyu

echo "域名配置完成！"
echo "现在您可以通过以下地址访问网站："
echo "- HTTP: http://mooyu.cc"
echo "- HTTPS: https://mooyu.cc"
echo "- HTTPS: https://www.mooyu.cc" 