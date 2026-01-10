#!/usr/bin/env node

// 详细对比本地模型定义和远程服务器实际字段
const { execSync } = require('child_process');
const path = require('path');

// 从 server.js 中提取的本地模型定义字段
const localSchoolFields = [
    'sequenceNumber',
    'name',
    'website',
    'country',
    'city',
    'schoolType',
    'coveredStages',
    'kindergarten',
    'primary',
    'juniorHigh',
    'seniorHigh',
    'ibPYP',
    'ibMYP',
    'ibDP',
    'ibCP',
    'aLevel',
    'ap',
    'canadian',
    'australian',
    'igcse',
    'otherCourses',
    'AI评估_总分',
    'AI评估_课程与融合_得分',
    'AI评估_课程与融合_说明',
    'AI评估_学术评估_得分',
    'AI评估_学术评估_说明',
    'AI评估_升学成果_得分',
    'AI评估_升学成果_说明',
    'AI评估_规划体系_得分',
    'AI评估_规划体系_说明',
    'AI评估_师资稳定_得分',
    'AI评估_师资稳定_说明',
    'AI评估_课堂文化_得分',
    'AI评估_课堂文化_说明',
    'AI评估_活动系统_得分',
    'AI评估_活动系统_说明',
    'AI评估_幸福感/生活_得分',
    'AI评估_幸福感/生活_说明',
    'AI评估_品牌与社区影响力_得分',
    'AI评估_品牌与社区影响力_说明',
    'AI评估_最终总结_JSON',
    'searchCount',
    'createdAt',
    'updatedAt'
].sort();

const localUserFields = [
    'email',
    'password',
    'name',
    'role',
    'createdAt'
].sort();

const localCommentFields = [
    'schoolId',
    'schoolName',
    'content',
    'author',
    'parentId',
    'createdAt',
    'updatedAt',
    'likes',
    'likedBy',
    'isVisible'
].sort();

async function getRemoteFields() {
    try {
        // 上传脚本到远程服务器
        const scriptPath = path.join(__dirname, 'get-remote-schema.js');
        console.log('上传脚本到远程服务器...');
        execSync(`scp ${scriptPath} root@122.51.133.41:/root/Mooyu/get-remote-schema.js`, { stdio: 'inherit' });
        
        // 在远程服务器上运行脚本
        console.log('在远程服务器上运行脚本...');
        const remoteSchemaJson = execSync(
            'ssh root@122.51.133.41 "cd /root/Mooyu && node get-remote-schema.js"',
            { encoding: 'utf-8' }
        );
        
        const remoteSchema = JSON.parse(remoteSchemaJson);
        return {
            schools: (remoteSchema.schools || []).sort(),
            users: (remoteSchema.users || []).sort(),
            comments: (remoteSchema.comments || []).sort()
        };
    } catch (error) {
        console.error('获取远程字段失败:', error.message);
        return null;
    }
}

function compareFields(localFields, remoteFields, collectionName) {
    console.log(`\n【${collectionName} 字段对比】`);
    
    const localOnly = localFields.filter(f => !remoteFields.includes(f));
    const remoteOnly = remoteFields.filter(f => !localFields.includes(f));
    const common = localFields.filter(f => remoteFields.includes(f));
    
    if (localOnly.length === 0 && remoteOnly.length === 0) {
        console.log('✓ 字段完全一致！');
        console.log(`  共同字段: ${common.length} 个`);
    } else {
        if (localOnly.length > 0) {
            console.log(`⚠ 仅本地模型定义的字段 (${localOnly.length} 个):`);
            localOnly.forEach(f => console.log(`   - ${f}`));
        }
        if (remoteOnly.length > 0) {
            console.log(`⚠ 仅远程数据库存在的字段 (${remoteOnly.length} 个):`);
            remoteOnly.forEach(f => console.log(`   - ${f}`));
        }
        console.log(`✓ 共同字段: ${common.length} 个`);
    }
    
    return { localOnly, remoteOnly, common };
}

async function main() {
    console.log('=== 数据库字段详细对比 ===\n');
    console.log('对比本地 server.js 模型定义 vs 远程服务器实际字段\n');
    
    const remoteFields = await getRemoteFields();
    
    if (!remoteFields) {
        console.log('✗ 无法获取远程字段，对比终止');
        process.exit(1);
    }
    
    console.log('\n=== 字段对比结果 ===');
    
    const schoolResult = compareFields(localSchoolFields, remoteFields.schools, '学校 (School)');
    const userResult = compareFields(localUserFields, remoteFields.users, '用户 (User)');
    const commentResult = compareFields(localCommentFields, remoteFields.comments, '评论 (Comment)');
    
    // 总结
    const totalLocalOnly = schoolResult.localOnly.length + userResult.localOnly.length + commentResult.localOnly.length;
    const totalRemoteOnly = schoolResult.remoteOnly.length + userResult.remoteOnly.length + commentResult.remoteOnly.length;
    
    console.log('\n=== 总结 ===');
    if (totalLocalOnly === 0 && totalRemoteOnly === 0) {
        console.log('✓ 所有集合的字段完全一致！');
    } else {
        console.log(`⚠ 发现差异:`);
        console.log(`   - 仅本地模型定义的字段: ${totalLocalOnly} 个`);
        console.log(`   - 仅远程数据库存在的字段: ${totalRemoteOnly} 个`);
        
        if (schoolResult.localOnly.length > 0) {
            console.log('\n⚠ 注意: 本地模型定义了以下字段，但远程数据库中没有:');
            schoolResult.localOnly.forEach(f => console.log(`   - ${f}`));
            console.log('   这些字段可能是新增的，需要同步到远程服务器');
        }
        
        if (schoolResult.remoteOnly.length > 0) {
            console.log('\n⚠ 注意: 远程数据库存在以下字段，但本地模型未定义:');
            schoolResult.remoteOnly.forEach(f => console.log(`   - ${f}`));
            console.log('   这些字段可能是旧字段，或者需要添加到本地模型中');
        }
    }
    
    console.log('\n✓ 对比完成');
}

main().catch(error => {
    console.error('✗ 错误:', error.message);
    process.exit(1);
});
