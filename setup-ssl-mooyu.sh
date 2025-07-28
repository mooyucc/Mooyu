#!/bin/bash

# Mooyu.cc SSL 证书配置脚本
# 适用于 mooyu.cc 和 www.mooyu.cc

echo "=== Mooyu.cc SSL 证书配置脚本 ==="

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "请使用 root 用户运行此脚本"
    exit 1
fi

# 1. 安装 Certbot
echo "1. 安装 Certbot..."
if command -v yum &> /dev/null; then
    # CentOS/RHEL
    yum install -y epel-release
    yum install -y certbot python3-certbot-nginx
elif command -v apt-get &> /dev/null; then
    # Ubuntu/Debian
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
else
    echo "不支持的操作系统，请手动安装 Certbot"
    exit 1
fi

# 2. 创建网站目录
echo "2. 创建网站目录..."
mkdir -p /var/www/mooyu-website

# 3. 复制网站文件
echo "3. 复制网站文件..."
cp -r /root/mooyu-website/* /var/www/mooyu-website/
chown -R nginx:nginx /var/www/mooyu-website
chmod -R 755 /var/www/mooyu-website

# 4. 配置 Nginx
echo "4. 配置 Nginx..."
cp nginx-mooyu.conf /etc/nginx/conf.d/mooyu.conf

# 5. 测试 Nginx 配置
echo "5. 测试 Nginx 配置..."
nginx -t
if [ $? -ne 0 ]; then
    echo "Nginx 配置测试失败"
    exit 1
fi

# 6. 重启 Nginx
echo "6. 重启 Nginx..."
systemctl restart nginx

# 7. 配置防火墙
echo "7. 配置防火墙..."
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload

# 8. 获取 SSL 证书
echo "8. 获取 SSL 证书..."
certbot --nginx -d mooyu.cc -d www.mooyu.cc --non-interactive --agree-tos --email admin@mooyu.cc

# 9. 测试证书续期
echo "9. 测试证书续期..."
certbot renew --dry-run

# 10. 设置自动续期
echo "10. 设置自动续期..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# 11. 验证证书状态
echo "11. 验证证书状态..."
certbot certificates

echo "=== SSL 证书配置完成 ==="
echo "请访问 https://mooyu.cc 验证配置" 