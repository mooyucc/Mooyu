require('dotenv').config();
const mongoose = require('mongoose');

// 连接MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu';

// 定义模型（与 server.js 保持一致）
const User = mongoose.model('User', {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const SchoolSchema = new mongoose.Schema({
    sequenceNumber: { type: Number },
    name: { type: String, required: true },
    website: { type: String },
    country: { type: String },
    city: { type: String },
    schoolType: { type: String },
    coveredStages: { type: String },
    kindergarten: { type: String },
    primary: { type: String },
    juniorHigh: { type: String },
    seniorHigh: { type: String },
    ibPYP: { type: String },
    ibMYP: { type: String },
    ibDP: { type: String },
    ibCP: { type: String },
    aLevel: { type: String },
    ap: { type: String },
    canadian: { type: String },
    australian: { type: String },
    igcse: { type: String },
    otherCourses: { type: String },
    'AI评估_总分': { type: Number },
    'AI评估_课程与融合_得分': { type: Number },
    'AI评估_课程与融合_说明': { type: String },
    'AI评估_学术评估_得分': { type: Number },
    'AI评估_学术评估_说明': { type: String },
    'AI评估_升学成果_得分': { type: Number },
    'AI评估_升学成果_说明': { type: String },
    'AI评估_规划体系_得分': { type: Number },
    'AI评估_规划体系_说明': { type: String },
    'AI评估_师资稳定_得分': { type: Number },
    'AI评估_师资稳定_说明': { type: String },
    'AI评估_课堂文化_得分': { type: Number },
    'AI评估_课堂文化_说明': { type: String },
    'AI评估_活动系统_得分': { type: Number },
    'AI评估_活动系统_说明': { type: String },
    'AI评估_幸福感/生活_得分': { type: Number },
    'AI评估_幸福感/生活_说明': { type: String },
    'AI评估_品牌与社区影响力_得分': { type: Number },
    'AI评估_品牌与社区影响力_说明': { type: String },
    'AI评估_最终总结_JSON': { type: String },
    searchCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const School = mongoose.model('School', SchoolSchema);

const CommentSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    schoolName: { type: String, required: true },
    content: { type: String, required: true, maxlength: 200 },
    author: { type: String, default: '匿名用户' },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: String }],
    isVisible: { type: Boolean, default: true }
});

const Comment = mongoose.model('Comment', CommentSchema);

async function checkDatabaseCounts() {
    try {
        console.log('正在连接数据库...');
        await mongoose.connect(MONGODB_URI);
        console.log('✓ 成功连接到MongoDB数据库\n');

        // 统计各集合的记录数
        const userCount = await User.countDocuments();
        const schoolCount = await School.countDocuments();
        const commentCount = await Comment.countDocuments();

        // 显示结果
        console.log('=== 数据库记录统计 ===');
        console.log(`用户 (User):        ${userCount} 条`);
        console.log(`学校 (School):      ${schoolCount} 条`);
        console.log(`评论 (Comment):     ${commentCount} 条`);
        console.log('─────────────────────');
        console.log(`总计:               ${userCount + schoolCount + commentCount} 条\n`);

        // 额外统计信息
        if (schoolCount > 0) {
            const schoolsWithAI = await School.countDocuments({ 'AI评估_总分': { $exists: true, $ne: null } });
            console.log('=== 学校数据详情 ===');
            console.log(`已进行AI评估的学校: ${schoolsWithAI} 所`);
            console.log(`未进行AI评估的学校: ${schoolCount - schoolsWithAI} 所\n`);
        }

        if (commentCount > 0) {
            const visibleComments = await Comment.countDocuments({ isVisible: true });
            const hiddenComments = await Comment.countDocuments({ isVisible: false });
            console.log('=== 评论数据详情 ===');
            console.log(`可见评论:          ${visibleComments} 条`);
            console.log(`隐藏评论:          ${hiddenComments} 条\n`);
        }

        if (userCount > 0) {
            const adminCount = await User.countDocuments({ role: 'admin' });
            const normalUserCount = await User.countDocuments({ role: 'user' });
            console.log('=== 用户数据详情 ===');
            console.log(`管理员:            ${adminCount} 个`);
            console.log(`普通用户:          ${normalUserCount} 个\n`);
        }

        await mongoose.disconnect();
        console.log('✓ 数据库连接已关闭');
    } catch (error) {
        console.error('✗ 错误:', error.message);
        process.exit(1);
    }
}

checkDatabaseCounts();
