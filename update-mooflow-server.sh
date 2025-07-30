#!/bin/bash

# MooFlow 服务器代码更新脚本
# 更新 MooFlow 的服务器代码和依赖

echo "=== MooFlow 服务器代码更新脚本 ==="
echo "时间: $(date)"
echo ""

echo "1. 备份当前服务器代码..."
ssh root@122.51.133.41 "cp /root/Mooyu/mooflow-server.js /root/Mooyu/mooflow-server.js.backup.$(date +%Y%m%d_%H%M%S)"

echo "2. 上传 MooFlow 服务器代码..."
scp "/Users/kevinx/Documents/Website/Mooyu/mooyu-website/mooflow-server.js" root@122.51.133.41:/root/Mooyu/

echo "3. 上传 package.json（如果存在）..."
if [ -f "package.json" ]; then
    scp package.json root@122.51.133.41:/root/Mooyu/
    echo "4. 安装/更新依赖..."
    ssh root@122.51.133.41 "cd /root/Mooyu && npm install"
else
    echo "4. 跳过依赖更新（本地无 package.json）..."
fi

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
echo "=== MooFlow 服务器代码更新完成 ==="
echo "MooFlow 服务器已更新"
echo "备份位置: /root/Mooyu/mooflow-server.js.backup.*"
echo ""
echo "如需回滚，请运行:"
echo "ssh root@122.51.133.41 'cp /root/Mooyu/mooflow-server.js.backup.* /root/Mooyu/mooflow-server.js'"
echo "ssh root@122.51.133.41 'pm2 restart mooflow'" 