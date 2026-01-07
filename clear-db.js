// 清空本地数据库内容
require('dotenv').config();
const mongoose = require('mongoose');

// 连接MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('成功连接到MongoDB数据库');
    clearDatabase();
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// 学校数据模型
const SchoolSchema = new mongoose.Schema({}, { strict: false });
const School = mongoose.model('School', SchoolSchema);

// 用户数据模型
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

async function clearDatabase() {
    try {
        console.log('========================================');
        console.log('开始清空数据库...');
        console.log('========================================\n');

        // 1. 统计现有数据
        const totalSchools = await School.countDocuments({});
        const totalUsers = await User.countDocuments({});
        
        console.log(`当前数据库统计：`);
        console.log(`  - 学校数据: ${totalSchools} 条`);
        console.log(`  - 用户数据: ${totalUsers} 条\n`);

        if (totalSchools === 0 && totalUsers === 0) {
            console.log('数据库已经是空的，无需清空。');
            mongoose.connection.close();
            console.log('数据库连接已关闭');
            process.exit(0);
            return;
        }

        // 2. 删除所有学校数据
        if (totalSchools > 0) {
            console.log('⚠️  正在删除所有学校数据...');
            const deleteSchoolResult = await School.deleteMany({});
            console.log(`✓ 已删除 ${deleteSchoolResult.deletedCount} 条学校数据\n`);
        }

        // 3. 删除所有用户数据
        if (totalUsers > 0) {
            console.log('⚠️  正在删除所有用户数据...');
            const deleteUserResult = await User.deleteMany({});
            console.log(`✓ 已删除 ${deleteUserResult.deletedCount} 条用户数据\n`);
        }

        // 4. 验证清空结果
        const remainingSchools = await School.countDocuments({});
        const remainingUsers = await User.countDocuments({});
        
        console.log('========================================');
        console.log('清空结果验证：');
        console.log(`  - 剩余学校数据: ${remainingSchools} 条`);
        console.log(`  - 剩余用户数据: ${remainingUsers} 条`);
        console.log('========================================\n');

        if (remainingSchools === 0 && remainingUsers === 0) {
            console.log('✓ 数据库已成功清空！');
        } else {
            console.log('⚠️  警告：仍有数据未清空');
        }

        console.log('\n注意：');
        console.log('1. 所有学校数据已被删除');
        console.log('2. 所有用户数据已被删除');
        console.log('3. 可以开始导入新的数据\n');

    } catch (error) {
        console.error('✗ 清空数据库过程中出错:', error);
    } finally {
        mongoose.connection.close();
        console.log('数据库连接已关闭');
        process.exit(0);
    }
}

