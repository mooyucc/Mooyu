#!/bin/bash

# Nginx 启动失败诊断脚本

echo "=== Nginx 启动失败诊断 ==="
echo ""

# 1. 检查 Nginx 服务状态
echo "1. 检查 Nginx 服务状态："
systemctl status nginx.service
echo ""

# 2. 查看详细错误日志
echo "2. 查看 systemd 日志："
journalctl -xeu nginx.service --no-pager | tail -30
echo ""

# 3. 检查 Nginx 错误日志
echo "3. 检查 Nginx 错误日志："
if [ -f /var/log/nginx/error.log ]; then
    tail -20 /var/log/nginx/error.log
else
    echo "错误日志文件不存在"
fi
echo ""

# 4. 检查端口占用
echo "4. 检查端口占用情况："
netstat -tlnp | grep :80
netstat -tlnp | grep :443
echo ""

# 5. 检查 Nginx 进程
echo "5. 检查 Nginx 进程："
ps aux | grep nginx
echo ""

# 6. 检查配置文件
echo "6. 检查配置文件："
ls -la /etc/nginx/conf.d/
echo ""

# 7. 测试配置文件语法
echo "7. 测试配置文件语法："
nginx -t
echo ""

# 8. 检查 SELinux 状态（如果适用）
echo "8. 检查 SELinux 状态："
if command -v sestatus >/dev/null 2>&1; then
    sestatus
else
    echo "SELinux 未安装"
fi
echo ""

# 9. 检查防火墙状态
echo "9. 检查防火墙状态："
if command -v firewall-cmd >/dev/null 2>&1; then
    firewall-cmd --list-all
elif command -v ufw >/dev/null 2>&1; then
    ufw status
else
    echo "未检测到防火墙"
fi
echo ""

echo "=== 诊断完成 ===" 