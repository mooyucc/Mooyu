#!/bin/bash

# MooYu 网站更新脚本（前后端一起更新）
# 前端：将文件上传到 Nginx 服务目录 /var/www/mooyu-website/
# 后端：更新服务器代码到 /root/Mooyu/
#
# 使用方法:
#   ./update-website.sh              # 只更新前后端，不操作数据库
#   ./update-website.sh --clear-db    # 更新前后端，并删除所有学校数据
#   ./update-website.sh --migrate-db   # 更新前后端，并执行数据库迁移
#   ./update-website.sh --update-db    # 更新前后端，并执行数据库清理和迁移

# 解析命令行参数
CLEAR_DB=false
MIGRATE_DB=false

for arg in "$@"; do
    case $arg in
        --clear-db)
            CLEAR_DB=true
            shift
            ;;
        --migrate-db)
            MIGRATE_DB=true
            shift
            ;;
        --update-db)
            CLEAR_DB=true
            MIGRATE_DB=true
            shift
            ;;
        *)
            echo "未知参数: $arg"
            echo "使用方法: $0 [--clear-db] [--migrate-db] [--update-db]"
            exit 1
            ;;
    esac
done

echo "=== MooYu 网站更新脚本（前后端） ==="
echo "时间: $(date)"
if [ "$CLEAR_DB" = true ] || [ "$MIGRATE_DB" = true ]; then
    echo "数据库操作:"
    [ "$CLEAR_DB" = true ] && echo "  - 将删除所有学校数据"
    [ "$MIGRATE_DB" = true ] && echo "  - 将执行数据库迁移"
else
    echo "数据库操作: 跳过（如需执行数据库操作，请使用 --clear-db 或 --migrate-db 参数）"
fi
echo ""

# 检查本地项目目录
LOCAL_DIR="/Users/kevinx/Documents/Website/Mooyu/mooyu-website"
BUILD_DIR="$LOCAL_DIR/dist"
if [ ! -d "$LOCAL_DIR" ]; then
    echo "错误: 本地项目目录不存在: $LOCAL_DIR"
    exit 1
fi

# ========== 前端更新 ==========
echo "=== 前端更新 ==="
echo "1. 构建最新静态资源..."
cd "$LOCAL_DIR" || exit 1
node build-assets.js
if [ ! -d "$BUILD_DIR" ]; then
    echo "错误: 构建输出目录不存在: $BUILD_DIR"
    exit 1
fi

echo "2. 备份当前网站文件..."
ssh root@122.51.133.41 "cp -r /var/www/mooyu-website /var/www/mooyu-website.backup.$(date +%Y%m%d_%H%M%S)"

echo "3. 上传前端文件到 Nginx 服务目录..."
# 使用 rsync 上传构建后的文件，删除远端已过期的版本
rsync -av --delete --progress "$BUILD_DIR/" root@122.51.133.41:/var/www/mooyu-website/

echo "4. 设置前端文件权限..."
ssh root@122.51.133.41 "chown -R nginx:nginx /var/www/mooyu-website/ && chmod -R 755 /var/www/mooyu-website/"

echo "5. 重启 Nginx 服务..."
ssh root@122.51.133.41 "systemctl restart nginx"

# ========== 后端更新 ==========
echo ""
echo "=== 后端更新 ==="
echo "6. 备份当前服务器代码..."
ssh root@122.51.133.41 "cp /root/Mooyu/server.js /root/Mooyu/server.js.backup.$(date +%Y%m%d_%H%M%S)"

echo "7. 上传后端服务器代码..."
scp "$LOCAL_DIR/server.js" root@122.51.133.41:/root/Mooyu/

echo "8. 上传 package.json（如果存在）..."
if [ -f "$LOCAL_DIR/package.json" ]; then
    scp "$LOCAL_DIR/package.json" root@122.51.133.41:/root/Mooyu/
    echo "9. 安装/更新后端依赖..."
    ssh root@122.51.133.41 "cd /root/Mooyu && npm install"
else
    echo "9. 跳过依赖更新（本地无 package.json）..."
fi

# ========== 数据库更新（可选） ==========
if [ "$CLEAR_DB" = true ] || [ "$MIGRATE_DB" = true ]; then
    echo ""
    echo "=== 数据库更新 ==="
    
    # 删除学校数据
    if [ "$CLEAR_DB" = true ]; then
        echo "10. 上传数据库清理脚本..."
        if [ -f "$LOCAL_DIR/clear-db.js" ]; then
            scp "$LOCAL_DIR/clear-db.js" root@122.51.133.41:/root/Mooyu/
            echo "  已上传: clear-db.js"
        fi
        
        echo "11. 删除服务器上的所有学校数据..."
        if [ -f "$LOCAL_DIR/clear-db.js" ]; then
            echo "  执行: clear-db.js（删除所有学校数据）"
            ssh root@122.51.133.41 "cd /root/Mooyu && node clear-db.js"
            echo "  ✓ 所有学校数据已删除"
        else
            echo "  ⚠ 警告: clear-db.js 不存在，跳过删除学校数据步骤"
        fi
    fi
    
    # 数据库迁移
    if [ "$MIGRATE_DB" = true ]; then
        echo "12. 上传数据库迁移脚本..."
        # 上传所有迁移脚本
        if [ -f "$LOCAL_DIR/migrate-nature-to-schooltype.js" ]; then
            scp "$LOCAL_DIR/migrate-nature-to-schooltype.js" root@122.51.133.41:/root/Mooyu/
            echo "  已上传: migrate-nature-to-schooltype.js"
        fi
        if [ -f "$LOCAL_DIR/unify-school-nature.js" ]; then
            scp "$LOCAL_DIR/unify-school-nature.js" root@122.51.133.41:/root/Mooyu/
            echo "  已上传: unify-school-nature.js"
        fi
        
        echo "13. 执行数据库迁移脚本..."
        # 执行迁移脚本（按顺序执行）
        if [ -f "$LOCAL_DIR/migrate-nature-to-schooltype.js" ]; then
            echo "  执行: migrate-nature-to-schooltype.js"
            ssh root@122.51.133.41 "cd /root/Mooyu && node migrate-nature-to-schooltype.js"
        fi
        # 注意：unify-school-nature.js 可能需要手动确认，暂时注释
        # if [ -f "$LOCAL_DIR/unify-school-nature.js" ]; then
        #     echo "  执行: unify-school-nature.js"
        #     ssh root@122.51.133.41 "cd /root/Mooyu && node unify-school-nature.js"
        # fi
    fi
fi

echo "14. 检查后端服务状态..."
ssh root@122.51.133.41 "pm2 status mooyu"

echo "15. 重启后端服务..."
ssh root@122.51.133.41 "pm2 restart mooyu"

echo "16. 等待服务启动..."
sleep 3

echo "17. 检查后端服务状态..."
ssh root@122.51.133.41 "pm2 status mooyu"

echo "18. 检查端口 3000 是否正常监听..."
ssh root@122.51.133.41 "ss -tlnp | grep :3000"

echo "19. 测试后端API响应..."
ssh root@122.51.133.41 "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/schools"

echo ""
echo "=== 更新完成 ==="
echo "前端已更新到: https://mooyu.cc"
echo "后端服务已重启"
if [ "$CLEAR_DB" = true ] || [ "$MIGRATE_DB" = true ]; then
    echo "数据库操作:"
    [ "$CLEAR_DB" = true ] && echo "  - 所有旧学校数据已删除"
    [ "$MIGRATE_DB" = true ] && echo "  - 数据库结构已更新"
else
    echo "数据库: 未执行任何操作"
fi
echo "前端备份位置: /var/www/mooyu-website.backup.*"
echo "后端备份位置: /root/Mooyu/server.js.backup.*"
echo ""
echo "如需回滚前端，请运行:"
echo "ssh root@122.51.133.41 'cp -r /var/www/mooyu-website.backup.* /var/www/mooyu-website/'"
echo "ssh root@122.51.133.41 'systemctl restart nginx'"
echo ""
echo "如需回滚后端，请运行:"
echo "ssh root@122.51.133.41 'cp /root/Mooyu/server.js.backup.* /root/Mooyu/server.js'"
echo "ssh root@122.51.133.41 'pm2 restart mooyu'" 