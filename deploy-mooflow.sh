#!/bin/bash

echo "=== MooFlow 应用部署脚本 ==="

# 检查是否在服务器上运行
if [ "$EUID" -ne 0 ]; then
    echo "请在服务器上以 root 用户运行此脚本"
    exit 1
fi

# 创建 mooFlow 目录
echo "创建 mooFlow 目录..."
mkdir -p /root/Mooyu/mooflow

# 安装依赖（如果还没有安装）
echo "检查并安装依赖..."
cd /root/Mooyu
if [ ! -d "node_modules" ]; then
    npm install
fi

# 创建 mooFlow 目录结构
echo "创建 mooFlow 目录结构..."
mkdir -p /root/Mooyu/mooflow/{css,js,images}

# 设置权限
chmod -R 755 /root/Mooyu/mooflow

echo "=== 部署完成 ==="
echo "请将您的 mooFlow 网页端应用文件上传到 /root/Mooyu/mooflow/ 目录"
echo "然后运行以下命令启动服务："
echo "pm2 start ecosystem.config.js --env production"
echo ""
echo "访问地址："
echo "- MooYu 主站: http://mooyu.cc (端口 3000)"
echo "- MooFlow 应用: http://mooyu.cc:3001 (端口 3001)" 