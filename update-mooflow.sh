#!/bin/bash

# MooFlow 应用更新脚本
# 更新 MooFlow 的静态文件和服务器代码

echo "=== MooFlow 应用更新脚本 ==="
echo "时间: $(date)"
echo ""

# 检查本地 MooFlow 项目目录
MOOFLOW_DIST_DIR="/Users/kevinx/Documents/Ai Project/MooFlow-Web/dist"
if [ ! -d "$MOOFLOW_DIST_DIR" ]; then
    echo "错误: MooFlow dist 目录不存在: $MOOFLOW_DIST_DIR"
    exit 1
fi

echo "1. 备份当前 MooFlow 文件..."
ssh root@122.51.133.41 "cp -r /root/Mooyu/mooflow /root/Mooyu/mooflow.backup.$(date +%Y%m%d_%H%M%S)"

echo "2. 上传 MooFlow 静态文件到开发目录..."
scp -r "$MOOFLOW_DIST_DIR"/* root@122.51.133.41:/root/Mooyu/mooflow/

echo "3. 上传 MooFlow 服务器代码..."
scp "/Users/kevinx/Documents/Website/Mooyu/mooyu-website/mooflow-server.js" root@122.51.133.41:/root/Mooyu/

echo "4. 设置正确的文件权限..."
ssh root@122.51.133.41 "chown -R root:root /root/Mooyu/mooflow/ && chmod -R 755 /root/Mooyu/mooflow/"

echo "5. 重启 MooFlow 服务..."
ssh root@122.51.133.41 "pm2 restart mooflow"

echo "6. 检查 MooFlow 服务状态..."
ssh root@122.51.133.41 "pm2 status mooflow"

echo "7. 检查端口 3001 是否正常监听..."
ssh root@122.51.133.41 "netstat -tlnp | grep :3001"

echo ""
echo "=== MooFlow 更新完成 ==="
echo "MooFlow 应用已更新到: http://flow.mooyu.cc"
echo "备份位置: /root/Mooyu/mooflow.backup.*"
echo ""
echo "如需回滚，请运行:"
echo "ssh root@122.51.133.41 'cp -r /root/Mooyu/mooflow.backup.* /root/Mooyu/mooflow/'"
echo "ssh root@122.51.133.41 'pm2 restart mooflow'" 