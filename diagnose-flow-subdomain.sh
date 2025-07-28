#!/bin/bash

echo "=== 诊断 flow.mooyu.cc 子域名问题 ==="

# 检查是否在服务器上运行
if [ "$EUID" -ne 0 ]; then
    echo "请在服务器上以 root 用户运行此脚本"
    exit 1
fi

echo "1. 检查 Nginx 配置文件..."
ls -la /etc/nginx/conf.d/ | grep flow

echo ""
echo "2. 检查 Nginx 主配置..."
grep -r "flow.mooyu.cc" /etc/nginx/ 2>/dev/null || echo "未找到 flow.mooyu.cc 配置"

echo ""
echo "3. 检查 Nginx 状态..."
systemctl status nginx --no-pager

echo ""
echo "4. 检查端口监听..."
netstat -tlnp | grep :80
netstat -tlnp | grep :443

echo ""
echo "5. 检查 MooFlow 服务状态..."
if command -v pm2 &> /dev/null; then
    pm2 status
else
    echo "PM2 未安装"
fi

echo ""
echo "6. 检查 MooFlow 进程..."
ps aux | grep mooflow

echo ""
echo "7. 测试本地 MooFlow 服务..."
curl -I http://localhost:3001 2>/dev/null || echo "无法连接到 localhost:3001"

echo ""
echo "8. 检查防火墙状态..."
firewall-cmd --list-all

echo ""
echo "9. 检查 DNS 解析..."
nslookup flow.mooyu.cc

echo ""
echo "10. 检查服务器 IP..."
curl -s ifconfig.me

echo ""
echo "=== 诊断完成 ==="
echo "如果发现问题，请运行 fix-flow-subdomain.sh 脚本进行修复" 