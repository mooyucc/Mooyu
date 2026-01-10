#!/usr/bin/env node

// 清除数据库中所有学校数据的脚本
const mongoose = require('mongoose');
require('dotenv').config();

async function clearAllSchools() {
    try {
        // 连接数据库
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu');
        console.log('✓ 成功连接到MongoDB数据库\n');

        // 定义模型
        const SchoolSchema = new mongoose.Schema({}, { strict: false });
        const School = mongoose.model('School', SchoolSchema);

        const CommentSchema = new mongoose.Schema({
            schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
            schoolName: { type: String, required: true },
            content: { type: String, required: true },
            author: { type: String, default: '匿名用户' },
            parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now },
            likes: { type: Number, default: 0 },
            likedBy: [{ type: String }],
            isVisible: { type: Boolean, default: true }
        }, { strict: false });
        const Comment = mongoose.model('Comment', CommentSchema);

        // 统计当前数据
        const schoolCount = await School.countDocuments();
        const commentCount = await Comment.countDocuments();

        if (schoolCount === 0) {
            console.log('⚠ 数据库中没有任何学校数据');
            await mongoose.connection.close();
            process.exit(0);
        }

        console.log('=== 当前数据统计 ===');
        console.log(`学校数据: ${schoolCount} 条`);
        console.log(`评论数据: ${commentCount} 条\n`);

        // 检查命令行参数：--keep-comments 保留评论，否则删除评论
        const keepComments = process.argv.includes('--keep-comments');

        console.log('⚠️  ⚠️  ⚠️  警告 ⚠️  ⚠️  ⚠️');
        console.log('即将删除数据库中所有的学校数据！');
        if (!keepComments) {
            console.log('同时将删除所有相关评论数据！');
        } else {
            console.log('评论数据将保留（但评论中的 schoolId 将指向不存在的学校）');
        }
        console.log('此操作不可恢复！\n');

        console.log('开始删除数据...\n');

        // 删除评论（除非指定保留）
        if (!keepComments) {
            const commentResult = await Comment.deleteMany({});
            console.log(`✓ 已删除 ${commentResult.deletedCount} 条评论数据`);
        } else {
            console.log('⚠ 保留评论数据');
        }

        // 删除所有学校
        const schoolResult = await School.deleteMany({});
        console.log(`✓ 已删除 ${schoolResult.deletedCount} 条学校数据`);

        // 显示最终统计
        const remainingSchools = await School.countDocuments();
        const remainingComments = await Comment.countDocuments();
        
        console.log('\n=== 删除后数据统计 ===');
        console.log(`剩余学校数据: ${remainingSchools} 条`);
        console.log(`剩余评论数据: ${remainingComments} 条\n`);

        // 关闭数据库连接
        await mongoose.connection.close();
        console.log('✓ 数据库连接已关闭');
        console.log('\n✓ 所有学校数据已清除完成！');
        process.exit(0);

    } catch (error) {
        console.error('✗ 删除学校数据失败:', error);
        process.exit(1);
    }
}

clearAllSchools();
