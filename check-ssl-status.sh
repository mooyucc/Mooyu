#!/bin/bash

# SSL 证书状态检查脚本
# 用于检查 mooyu.cc 和 www.mooyu.cc 的 SSL 证书状态

echo "=== SSL 证书状态检查 ==="

# 检查 Certbot 是否安装
if ! command -v certbot &> /dev/null; then
    echo "❌ Certbot 未安装"
    exit 1
fi

echo "✅ Certbot 已安装"

# 检查证书状态
echo ""
echo "📋 证书状态："
certbot certificates

# 检查证书文件是否存在
echo ""
echo "📁 证书文件检查："
if [ -f "/etc/letsencrypt/live/mooyu.cc/fullchain.pem" ]; then
    echo "✅ 证书文件存在"
else
    echo "❌ 证书文件不存在"
fi

if [ -f "/etc/letsencrypt/live/mooyu.cc/privkey.pem" ]; then
    echo "✅ 私钥文件存在"
else
    echo "❌ 私钥文件不存在"
fi

# 检查 Nginx 配置
echo ""
echo "🌐 Nginx 配置检查："
if [ -f "/etc/nginx/conf.d/mooyu.conf" ]; then
    echo "✅ Nginx 配置文件存在"
    nginx -t
else
    echo "❌ Nginx 配置文件不存在"
fi

# 检查端口监听
echo ""
echo "🔌 端口监听检查："
if netstat -tlnp | grep :80 > /dev/null; then
    echo "✅ HTTP 端口 (80) 正在监听"
else
    echo "❌ HTTP 端口 (80) 未监听"
fi

if netstat -tlnp | grep :443 > /dev/null; then
    echo "✅ HTTPS 端口 (443) 正在监听"
else
    echo "❌ HTTPS 端口 (443) 未监听"
fi

# 检查防火墙
echo ""
echo "🔥 防火墙检查："
if firewall-cmd --list-ports | grep -q "80/tcp"; then
    echo "✅ HTTP 端口 (80) 已开放"
else
    echo "❌ HTTP 端口 (80) 未开放"
fi

if firewall-cmd --list-ports | grep -q "443/tcp"; then
    echo "✅ HTTPS 端口 (443) 已开放"
else
    echo "❌ HTTPS 端口 (443) 未开放"
fi

# 检查自动续期
echo ""
echo "🔄 自动续期检查："
if crontab -l 2>/dev/null | grep -q "certbot renew"; then
    echo "✅ 自动续期已配置"
else
    echo "❌ 自动续期未配置"
fi

# 测试证书续期
echo ""
echo "🧪 测试证书续期："
certbot renew --dry-run

echo ""
echo "=== 检查完成 ===" 