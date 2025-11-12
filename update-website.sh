#!/bin/bash

# MooYu 网站更新脚本
# 直接将文件上传到 Nginx 服务目录 /var/www/mooyu-website/

echo "=== MooYu 网站更新脚本 ==="
echo "时间: $(date)"
echo ""

# 检查本地项目目录
LOCAL_DIR="/Users/kevinx/Documents/Website/Mooyu/mooyu-website"
BUILD_DIR="$LOCAL_DIR/dist"
if [ ! -d "$LOCAL_DIR" ]; then
    echo "错误: 本地项目目录不存在: $LOCAL_DIR"
    exit 1
fi

echo "1. 构建最新静态资源..."
cd "$LOCAL_DIR" || exit 1
node build-assets.js
if [ ! -d "$BUILD_DIR" ]; then
    echo "错误: 构建输出目录不存在: $BUILD_DIR"
    exit 1
fi

echo "2. 备份当前网站文件..."
ssh root@122.51.133.41 "cp -r /var/www/mooyu-website /var/www/mooyu-website.backup.$(date +%Y%m%d_%H%M%S)"

echo "3. 上传文件到 Nginx 服务目录..."
# 使用 rsync 上传构建后的文件，删除远端已过期的版本
rsync -av --delete --progress "$BUILD_DIR/" root@122.51.133.41:/var/www/mooyu-website/

echo "4. 设置正确的文件权限..."
ssh root@122.51.133.41 "chown -R nginx:nginx /var/www/mooyu-website/ && chmod -R 755 /var/www/mooyu-website/"

echo "5. 重启 Nginx 服务..."
ssh root@122.51.133.41 "systemctl restart nginx"

echo "6. 检查服务状态..."
ssh root@122.51.133.41 "systemctl status nginx --no-pager -l"

echo ""
echo "=== 更新完成 ==="
echo "网站已更新到: https://mooyu.cc"
echo "备份位置: /var/www/mooyu-website.backup.*"
echo ""
echo "如需回滚，请运行:"
echo "ssh root@122.51.133.41 'cp -r /var/www/mooyu-website.backup.* /var/www/mooyu-website/'" 