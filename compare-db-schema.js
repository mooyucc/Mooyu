#!/usr/bin/env node

// 对比本地和远程服务器数据库字段的脚本
const mongoose = require('mongoose');
require('dotenv').config();
const { execSync } = require('child_process');

// 本地数据库模型定义（从 server.js 提取）
const localSchoolSchema = {
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
};

const localUserSchema = {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
};

const localCommentSchema = {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    schoolName: { type: String, required: true },
    content: { type: String, required: true, maxlength: 200 },
    author: { type: String, default: '匿名用户' },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: String }],
    isVisible: { type: Boolean, default: true }
};

// 从实际数据中提取字段（MongoDB 动态模式）
async function getFieldsFromData(collection, sampleSize = 10) {
    const samples = await collection.find({}).limit(sampleSize).lean();
    const fields = new Set();
    
    function extractFields(obj, prefix = '') {
        for (const key in obj) {
            if (key === '_id' || key === '__v') continue;
            const fullKey = prefix ? `${prefix}.${key}` : key;
            fields.add(fullKey);
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
                extractFields(obj[key], fullKey);
            }
        }
    }
    
    samples.forEach(sample => extractFields(sample));
    return Array.from(fields).sort();
}

// 获取远程服务器数据库 URI
function getRemoteDbUri() {
    try {
        // 使用更简单的方法获取 URI
        const command = 'ssh root@122.51.133.41 "cd /root/Mooyu && grep MONGODB_URI .env 2>/dev/null | cut -d= -f2- | tr -d \\"\\'" || echo \'\'"';
        const uri = execSync(command, { encoding: 'utf-8' }).trim();
        
        if (uri && uri.length > 0) {
            return uri;
        }
    } catch (error) {
        // 忽略错误，继续尝试其他方法
    }
    
    // 如果无法获取，尝试使用环境变量
    if (process.env.REMOTE_MONGODB_URI) {
        return process.env.REMOTE_MONGODB_URI;
    }
    
    console.log('\n⚠ 无法自动获取远程数据库 URI');
    console.log('请设置环境变量 REMOTE_MONGODB_URI');
    console.log('格式: mongodb://username:password@host:port/database?authSource=admin');
    return null;
}

async function compareSchemas() {
    try {
        const localUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu';
        const remoteUri = getRemoteDbUri();
        
        if (!remoteUri) {
            console.log('\n✗ 无法继续：未提供远程数据库 URI');
            process.exit(1);
        }

        console.log('=== 数据库字段对比 ===\n');
        console.log('本地数据库:', localUri.replace(/\/\/.*@/, '//***:***@'));
        console.log('远程数据库:', remoteUri.replace(/\/\/.*@/, '//***:***@'));
        console.log('');

        // 连接本地数据库
        console.log('1. 连接本地数据库...');
        await mongoose.connect(localUri);
        console.log('✓ 本地数据库连接成功\n');

        const localDb = mongoose.connection.db;
        const localSchools = localDb.collection('schools');
        const localUsers = localDb.collection('users');
        const localComments = localDb.collection('comments');

        // 获取本地字段
        console.log('2. 分析本地数据库字段...');
        const localSchoolFields = await getFieldsFromData(localSchools);
        const localUserFields = await getFieldsFromData(localUsers);
        const localCommentFields = await getFieldsFromData(localComments);
        
        console.log(`   学校字段: ${localSchoolFields.length} 个`);
        console.log(`   用户字段: ${localUserFields.length} 个`);
        console.log(`   评论字段: ${localCommentFields.length} 个\n`);

        // 断开本地连接
        await mongoose.disconnect();

        // 连接远程数据库
        console.log('3. 连接远程数据库...');
        await mongoose.connect(remoteUri);
        console.log('✓ 远程数据库连接成功\n');

        const remoteDb = mongoose.connection.db;
        const remoteSchools = remoteDb.collection('schools');
        const remoteUsers = remoteDb.collection('users');
        const remoteComments = remoteDb.collection('comments');

        // 获取远程字段
        console.log('4. 分析远程数据库字段...');
        const remoteSchoolFields = await getFieldsFromData(remoteSchools);
        const remoteUserFields = await getFieldsFromData(remoteUsers);
        const remoteCommentFields = await getFieldsFromData(remoteComments);
        
        console.log(`   学校字段: ${remoteSchoolFields.length} 个`);
        console.log(`   用户字段: ${remoteUserFields.length} 个`);
        console.log(`   评论字段: ${remoteCommentFields.length} 个\n`);

        // 对比结果
        console.log('=== 字段对比结果 ===\n');

        // 对比学校字段
        console.log('【学校 (School) 字段对比】');
        const schoolLocalOnly = localSchoolFields.filter(f => !remoteSchoolFields.includes(f));
        const schoolRemoteOnly = remoteSchoolFields.filter(f => !localSchoolFields.includes(f));
        const schoolCommon = localSchoolFields.filter(f => remoteSchoolFields.includes(f));

        if (schoolLocalOnly.length === 0 && schoolRemoteOnly.length === 0) {
            console.log('✓ 字段完全一致！');
        } else {
            if (schoolLocalOnly.length > 0) {
                console.log(`⚠ 仅本地存在的字段 (${schoolLocalOnly.length} 个):`);
                schoolLocalOnly.forEach(f => console.log(`   - ${f}`));
            }
            if (schoolRemoteOnly.length > 0) {
                console.log(`⚠ 仅远程存在的字段 (${schoolRemoteOnly.length} 个):`);
                schoolRemoteOnly.forEach(f => console.log(`   - ${f}`));
            }
            console.log(`✓ 共同字段: ${schoolCommon.length} 个`);
        }
        console.log('');

        // 对比用户字段
        console.log('【用户 (User) 字段对比】');
        const userLocalOnly = localUserFields.filter(f => !remoteUserFields.includes(f));
        const userRemoteOnly = remoteUserFields.filter(f => !localUserFields.includes(f));
        const userCommon = localUserFields.filter(f => remoteUserFields.includes(f));

        if (userLocalOnly.length === 0 && userRemoteOnly.length === 0) {
            console.log('✓ 字段完全一致！');
        } else {
            if (userLocalOnly.length > 0) {
                console.log(`⚠ 仅本地存在的字段 (${userLocalOnly.length} 个):`);
                userLocalOnly.forEach(f => console.log(`   - ${f}`));
            }
            if (userRemoteOnly.length > 0) {
                console.log(`⚠ 仅远程存在的字段 (${userRemoteOnly.length} 个):`);
                userRemoteOnly.forEach(f => console.log(`   - ${f}`));
            }
            console.log(`✓ 共同字段: ${userCommon.length} 个`);
        }
        console.log('');

        // 对比评论字段
        console.log('【评论 (Comment) 字段对比】');
        const commentLocalOnly = localCommentFields.filter(f => !remoteCommentFields.includes(f));
        const commentRemoteOnly = remoteCommentFields.filter(f => !localCommentFields.includes(f));
        const commentCommon = localCommentFields.filter(f => remoteCommentFields.includes(f));

        if (commentLocalOnly.length === 0 && commentRemoteOnly.length === 0) {
            console.log('✓ 字段完全一致！');
        } else {
            if (commentLocalOnly.length > 0) {
                console.log(`⚠ 仅本地存在的字段 (${commentLocalOnly.length} 个):`);
                commentLocalOnly.forEach(f => console.log(`   - ${f}`));
            }
            if (commentRemoteOnly.length > 0) {
                console.log(`⚠ 仅远程存在的字段 (${commentRemoteOnly.length} 个):`);
                commentRemoteOnly.forEach(f => console.log(`   - ${f}`));
            }
            console.log(`✓ 共同字段: ${commentCommon.length} 个`);
        }
        console.log('');

        // 总结
        const totalLocalOnly = schoolLocalOnly.length + userLocalOnly.length + commentLocalOnly.length;
        const totalRemoteOnly = schoolRemoteOnly.length + userRemoteOnly.length + commentRemoteOnly.length;

        console.log('=== 总结 ===');
        if (totalLocalOnly === 0 && totalRemoteOnly === 0) {
            console.log('✓ 所有集合的字段完全一致！');
        } else {
            console.log(`⚠ 发现差异:`);
            console.log(`   - 仅本地存在的字段: ${totalLocalOnly} 个`);
            console.log(`   - 仅远程存在的字段: ${totalRemoteOnly} 个`);
            console.log('\n建议: 检查 server.js 中的模型定义是否与远程服务器一致');
        }

        await mongoose.disconnect();
        console.log('\n✓ 数据库连接已关闭');

    } catch (error) {
        console.error('✗ 错误:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

compareSchemas();
