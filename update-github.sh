#!/bin/bash

# MooYu Website GitHub 更新脚本
# 自动提交并推送到 GitHub 仓库

echo "🚀 开始更新 GitHub 仓库..."

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否在正确的项目目录
if [ ! -f "package.json" ] || [ ! -f "index.html" ]; then
    echo -e "${RED}❌ 错误：请在 MooYu 项目根目录下运行此脚本${NC}"
    echo "当前目录：$(pwd)"
    exit 1
fi

# 检查 Git 是否已初始化
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Git 未初始化，正在初始化...${NC}"
    git init
fi

# 检查远程仓库配置
echo -e "${BLUE}📋 检查远程仓库配置...${NC}"
if ! git remote get-url origin > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  未配置远程仓库，正在添加...${NC}"
    git remote add origin https://github.com/mooyucc/Mooyu.git
else
    echo -e "${GREEN}✅ 远程仓库已配置${NC}"
    echo "远程仓库地址：$(git remote get-url origin)"
fi

# 检查是否有未提交的更改
if git diff --quiet && git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️  没有检测到需要提交的更改${NC}"
    echo "如需强制提交，请手动执行："
    echo "  git add ."
    echo "  git commit -m \"强制更新\""
    echo "  git push origin main"
    exit 0
fi

# 生成提交信息（使用当前日期）
COMMIT_DATE=$(date +"%Y%m%d")
COMMIT_MESSAGE="${COMMIT_DATE}代码更新"

# 添加所有文件到暂存区
echo -e "${BLUE}📦 添加文件到暂存区...${NC}"
git add .

# 提交更改
echo -e "${BLUE}💾 提交更改...${NC}"
echo "提交信息：$COMMIT_MESSAGE"
git commit -m "$COMMIT_MESSAGE"

# 检查提交是否成功
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 提交成功${NC}"
else
    echo -e "${RED}❌ 提交失败${NC}"
    exit 1
fi

# 推送到远程仓库
echo -e "${BLUE}🚀 推送到 GitHub...${NC}"
git push origin main

# 检查推送是否成功
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ GitHub 更新成功！${NC}"
    echo -e "${GREEN}🌐 仓库地址：https://github.com/mooyucc/Mooyu${NC}"
else
    echo -e "${RED}❌ 推送失败${NC}"
    echo "可能的原因："
    echo "1. 网络连接问题"
    echo "2. GitHub 认证问题"
    echo "3. 分支名称不匹配"
    echo ""
    echo "请检查："
    echo "1. 网络连接"
    echo "2. GitHub 认证设置"
    echo "3. 分支名称（当前分支：$(git branch --show-current)）"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 GitHub 更新完成！${NC}"
echo "更新时间：$(date)"
echo "提交信息：$COMMIT_MESSAGE" 