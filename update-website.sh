#!/bin/bash

# MooYu 网站更新脚本
# 直接将文件上传到 Nginx 服务目录 /var/www/mooyu-website/

echo "=== MooYu 网站更新脚本 ==="
echo "时间: $(date)"
echo ""

# 检查本地项目目录
LOCAL_DIR="/Users/kevinx/Documents/Website/Mooyu/mooyu-website"
if [ ! -d "$LOCAL_DIR" ]; then
    echo "错误: 本地项目目录不存在: $LOCAL_DIR"
    exit 1
fi

echo "1. 备份当前网站文件..."
ssh root@122.51.133.41 "cp -r /var/www/mooyu-website /var/www/mooyu-website.backup.$(date +%Y%m%d_%H%M%S)"

echo "2. 上传文件到 Nginx 服务目录..."
# 使用 rsync 上传，自动排除 .rsyncignore 中定义的文件
rsync -av --progress --exclude-from=.rsyncignore "$LOCAL_DIR/" root@122.51.133.41:/var/www/mooyu-website/

echo "3. 设置正确的文件权限..."
ssh root@122.51.133.41 "chown -R nginx:nginx /var/www/mooyu-website/ && chmod -R 755 /var/www/mooyu-website/"

echo "4. 重启 Nginx 服务..."
ssh root@122.51.133.41 "systemctl restart nginx"

echo "5. 检查服务状态..."
ssh root@122.51.133.41 "systemctl status nginx --no-pager -l"

echo ""
echo "=== 更新完成 ==="
echo "网站已更新到: https://mooyu.cc"
echo "备份位置: /var/www/mooyu-website.backup.*"
echo ""
echo "如需回滚，请运行:"
echo "ssh root@122.51.133.41 'cp -r /var/www/mooyu-website.backup.* /var/www/mooyu-website/'" 