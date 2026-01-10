#!/usr/bin/env node

// 对比本地和远程服务器数据库字段的脚本（改进版）
const mongoose = require('mongoose');
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 从实际数据中提取字段（MongoDB 动态模式）
async function getFieldsFromData(collection, sampleSize = 10) {
    const samples = await collection.find({}).limit(sampleSize).toArray();
    const fields = new Set();
    
    function extractFields(obj, prefix = '') {
        for (const key in obj) {
            if (key === '_id' || key === '__v') continue;
            const fullKey = prefix ? `${prefix}.${key}` : key;
            fields.add(fullKey);
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date) && obj[key] !== null) {
                extractFields(obj[key], fullKey);
            }
        }
    }
    
    samples.forEach(sample => extractFields(sample));
    return Array.from(fields).sort();
}

async function compareSchemas() {
    try {
        const localUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu';
        
        console.log('=== 数据库字段对比 ===\n');
        console.log('本地数据库:', localUri.replace(/\/\/.*@/, '//***:***@'));
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
        let localSchoolFields = [];
        let localUserFields = [];
        let localCommentFields = [];
        
        if (await localSchools.countDocuments() > 0) {
            localSchoolFields = await getFieldsFromData(localSchools);
        }
        if (await localUsers.countDocuments() > 0) {
            localUserFields = await getFieldsFromData(localUsers);
        }
        if (await localComments.countDocuments() > 0) {
            localCommentFields = await getFieldsFromData(localComments);
        }
        
        console.log(`   学校字段: ${localSchoolFields.length} 个`);
        console.log(`   用户字段: ${localUserFields.length} 个`);
        console.log(`   评论字段: ${localCommentFields.length} 个\n`);

        // 断开本地连接
        await mongoose.disconnect();

        // 获取远程数据库字段
        console.log('3. 获取远程服务器数据库字段...');
        
        // 上传脚本到远程服务器
        const scriptPath = path.join(__dirname, 'get-remote-schema.js');
        console.log('   上传脚本到远程服务器...');
        execSync(`scp ${scriptPath} root@122.51.133.41:/root/Mooyu/get-remote-schema.js`, { stdio: 'inherit' });
        
        // 在远程服务器上运行脚本
        console.log('   在远程服务器上运行脚本...');
        const remoteSchemaJson = execSync(
            'ssh root@122.51.133.41 "cd /root/Mooyu && node get-remote-schema.js"',
            { encoding: 'utf-8' }
        );
        
        const remoteSchema = JSON.parse(remoteSchemaJson);
        const remoteSchoolFields = remoteSchema.schools || [];
        const remoteUserFields = remoteSchema.users || [];
        const remoteCommentFields = remoteSchema.comments || [];
        
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

        console.log('\n✓ 对比完成');

    } catch (error) {
        console.error('✗ 错误:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

compareSchemas();
