#!/bin/bash

echo "=== Nginx 诊断脚本 ==="
echo "时间: $(date)"
echo ""

# 1. 检查 Nginx 是否已安装
echo "1. 检查 Nginx 安装状态:"
if command -v nginx &> /dev/null; then
    echo "✓ Nginx 已安装"
    nginx -v
else
    echo "✗ Nginx 未安装"
    exit 1
fi
echo ""

# 2. 检查 Nginx 配置文件语法
echo "2. 检查 Nginx 配置文件语法:"
if nginx -t; then
    echo "✓ 配置文件语法正确"
else
    echo "✗ 配置文件语法错误"
    echo "请检查以下配置文件:"
    nginx -T 2>&1 | grep "nginx: configuration file"
fi
echo ""

# 3. 检查端口占用情况
echo "3. 检查端口占用情况:"
echo "检查 80 端口:"
netstat -tlnp | grep :80 || echo "80 端口未被占用"
echo "检查 443 端口:"
netstat -tlnp | grep :443 || echo "443 端口未被占用"
echo ""

# 4. 检查 Nginx 进程
echo "4. 检查 Nginx 进程:"
ps aux | grep nginx | grep -v grep || echo "没有运行中的 Nginx 进程"
echo ""

# 5. 检查 Nginx 日志
echo "5. 检查 Nginx 错误日志:"
if [ -f /var/log/nginx/error.log ]; then
    echo "最近的错误日志:"
    tail -10 /var/log/nginx/error.log
else
    echo "错误日志文件不存在: /var/log/nginx/error.log"
fi
echo ""

# 6. 检查配置文件位置
echo "6. 检查 Nginx 配置文件:"
nginx -T 2>&1 | grep "nginx: configuration file" | head -1
echo ""

# 7. 检查 SELinux 状态（如果适用）
echo "7. 检查 SELinux 状态:"
if command -v sestatus &> /dev/null; then
    sestatus | head -1
else
    echo "SELinux 未安装或不可用"
fi
echo ""

# 8. 检查防火墙状态
echo "8. 检查防火墙状态:"
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --state
    echo "防火墙规则:"
    firewall-cmd --list-all
else
    echo "firewalld 未安装"
fi
echo ""

# 9. 尝试启动 Nginx 并捕获详细错误
echo "9. 尝试启动 Nginx:"
systemctl start nginx 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Nginx 启动成功"
    systemctl status nginx
else
    echo "✗ Nginx 启动失败"
    echo "详细错误信息:"
    journalctl -xeu nginx.service --no-pager -n 20
fi
echo ""

echo "=== 诊断完成 ===" 