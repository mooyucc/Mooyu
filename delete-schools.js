#!/usr/bin/env node

// 删除指定学校数据的脚本
const mongoose = require('mongoose');
require('dotenv').config();

const schoolsToDelete = [
    '上海浦东新区民办万科学校'
];

async function deleteSchools() {
    try {
        // 连接数据库
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu');
        console.log('✓ 成功连接到MongoDB数据库');

        // 定义School模型
        const SchoolSchema = new mongoose.Schema({}, { strict: false });
        const School = mongoose.model('School', SchoolSchema);

        // 查找要删除的学校
        const schools = await School.find({ name: { $in: schoolsToDelete } });
        
        if (schools.length === 0) {
            console.log('⚠ 未找到要删除的学校');
            process.exit(0);
        }

        console.log(`\n找到 ${schools.length} 所学校:`);
        schools.forEach(school => {
            console.log(`  - ${school.name} (ID: ${school._id})`);
        });

        // 确认删除
        console.log('\n⚠️  警告: 即将删除上述学校的所有数据（包括基础信息和AI评估数据）');
        
        // 执行删除
        const result = await School.deleteMany({ name: { $in: schoolsToDelete } });
        
        console.log(`\n✓ 成功删除 ${result.deletedCount} 所学校的数据`);
        
        // 显示删除的学校名称
        schools.forEach(school => {
            console.log(`  ✓ 已删除: ${school.name}`);
        });

        // 关闭数据库连接
        await mongoose.connection.close();
        console.log('\n✓ 数据库连接已关闭');
        process.exit(0);

    } catch (error) {
        console.error('✗ 删除学校数据失败:', error);
        process.exit(1);
    }
}

deleteSchools();