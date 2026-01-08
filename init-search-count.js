// 初始化所有学校的搜索次数为1
require('dotenv').config();
const mongoose = require('mongoose');

// 连接MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('成功连接到MongoDB数据库');
    initSearchCount();
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// 学校数据模型（简化版，只包含必要字段）
const SchoolSchema = new mongoose.Schema({
    name: { type: String, required: true },
    searchCount: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
}, { strict: false });

const School = mongoose.model('School', SchoolSchema);

async function initSearchCount() {
    try {
        console.log('========================================');
        console.log('开始初始化学校搜索次数...');
        console.log('========================================\n');

        // 统计需要更新的学校
        const schoolsToUpdate = await School.find({
            $or: [
                { searchCount: { $exists: false } },
                { searchCount: null },
                { searchCount: 0 }
            ]
        });

        const totalToUpdate = schoolsToUpdate.length;
        console.log(`找到 ${totalToUpdate} 所学校需要初始化搜索次数\n`);

        if (totalToUpdate === 0) {
            console.log('所有学校都已经有搜索次数，无需更新。');
            await mongoose.connection.close();
            process.exit(0);
        }

        // 批量更新：将所有 searchCount 为 0、null 或不存在的学校设置为 1
        const updateResult = await School.updateMany(
            {
                $or: [
                    { searchCount: { $exists: false } },
                    { searchCount: null },
                    { searchCount: 0 }
                ]
            },
            {
                $set: {
                    searchCount: 1,
                    updatedAt: new Date()
                }
            }
        );

        console.log(`✓ 成功更新 ${updateResult.modifiedCount} 所学校的搜索次数为 1\n`);

        // 验证更新结果
        const remainingZero = await School.countDocuments({
            $or: [
                { searchCount: { $exists: false } },
                { searchCount: null },
                { searchCount: 0 }
            ]
        });

        if (remainingZero === 0) {
            console.log('✓ 所有学校的搜索次数已成功初始化\n');
        } else {
            console.log(`⚠ 仍有 ${remainingZero} 所学校的搜索次数为 0 或未设置\n`);
        }

        // 统计总学校数和有搜索次数的学校数
        const totalSchools = await School.countDocuments({});
        const schoolsWithSearchCount = await School.countDocuments({
            searchCount: { $gt: 0 }
        });

        console.log('========================================');
        console.log('统计信息:');
        console.log(`  总学校数: ${totalSchools}`);
        console.log(`  有搜索次数的学校数: ${schoolsWithSearchCount}`);
        console.log('========================================\n');

        console.log('初始化完成！');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('初始化搜索次数失败:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

