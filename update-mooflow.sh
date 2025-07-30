#!/bin/bash

# MooFlow 应用更新脚本
# 只更新 MooFlow 的静态文件，保持服务器依赖和配置不变

echo "=== MooFlow 应用更新脚本 ==="
echo "时间: $(date)"
echo ""

# 检查本地 MooFlow 项目目录
MOOFLOW_DIST_DIR="/Users/kevinx/Documents/Ai Project/MooFlow-Web/dist"
if [ ! -d "$MOOFLOW_DIST_DIR" ]; then
    echo "错误: MooFlow dist 目录不存在: $MOOFLOW_DIST_DIR"
    exit 1
fi

echo "1. 备份当前 MooFlow 静态文件..."
ssh root@122.51.133.41 "cp -r /root/Mooyu/mooflow /root/Mooyu/mooflow.backup.$(date +%Y%m%d_%H%M%S)"

echo "2. 检查服务器依赖..."
ssh root@122.51.133.41 "cd /root/Mooyu && if [ ! -d 'node_modules' ] || [ ! -f 'package.json' ]; then echo '警告: 服务器缺少依赖，正在安装...'; npm install; fi"

echo "3. 上传 MooFlow 静态文件到开发目录..."
scp -r "$MOOFLOW_DIST_DIR"/* root@122.51.133.41:/root/Mooyu/mooflow/

echo "4. 设置正确的文件权限..."
ssh root@122.51.133.41 "chown -R root:root /root/Mooyu/mooflow/ && chmod -R 755 /root/Mooyu/mooflow/"

echo "5. 检查 MooFlow 服务状态..."
ssh root@122.51.133.41 "pm2 status mooflow"

echo "6. 重启 MooFlow 服务..."
ssh root@122.51.133.41 "pm2 restart mooflow"

echo "7. 等待服务启动..."
sleep 3

echo "8. 检查 MooFlow 服务状态..."
ssh root@122.51.133.41 "pm2 status mooflow"

echo "9. 检查端口 3001 是否正常监听..."
ssh root@122.51.133.41 "ss -tlnp | grep :3001"

echo "10. 测试服务响应..."
ssh root@122.51.133.41 "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001"

echo ""
echo "=== MooFlow 更新完成 ==="
echo "MooFlow 应用已更新到: http://flow.mooyu.cc"
echo "备份位置: /root/Mooyu/mooflow.backup.*"
echo ""
echo "注意: 只更新了静态文件，服务器依赖和配置保持不变"
echo ""
echo "如需回滚，请运行:"
echo "ssh root@122.51.133.41 'cp -r /root/Mooyu/mooflow.backup.* /root/Mooyu/mooflow/'"
echo "ssh root@122.51.133.41 'pm2 restart mooflow'" 