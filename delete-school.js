// 删除指定学校记录
require('dotenv').config();
const mongoose = require('mongoose');

// 连接MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('成功连接到MongoDB数据库');
    deleteSchool();
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// 学校数据模型
const SchoolSchema = new mongoose.Schema({}, { strict: false });
const School = mongoose.model('School', SchoolSchema);

async function deleteSchool() {
  try {
    const schoolName = process.argv[2] || '清华大学';
    
    console.log('========================================');
    console.log(`开始删除学校: ${schoolName}`);
    console.log('========================================\n');

    // 查找学校
    const schools = await School.find({ name: schoolName });
    
    if (schools.length === 0) {
      console.log(`未找到名称为 "${schoolName}" 的学校记录`);
      mongoose.connection.close();
      process.exit(0);
      return;
    }

    console.log(`找到 ${schools.length} 条匹配记录：`);
    schools.forEach((school, index) => {
      console.log(`  ${index + 1}. ID: ${school._id}`);
      console.log(`     名称: ${school.name || '未知'}`);
      console.log(`     城市: ${school.city || '未知'}`);
      console.log(`     类型: ${school.schoolType || school.nature || '未知'}`);
      console.log(`     学段: ${school.coveredStages || '未知'}\n`);
    });

    // 删除所有匹配的记录
    const deleteResult = await School.deleteMany({ name: schoolName });
    
    console.log('========================================');
    console.log('删除结果：');
    console.log(`  - 已删除 ${deleteResult.deletedCount} 条记录`);
    console.log('========================================\n');

    if (deleteResult.deletedCount > 0) {
      console.log(`✓ 成功删除学校 "${schoolName}" 的所有记录！`);
    } else {
      console.log(`⚠️  未删除任何记录`);
    }

  } catch (error) {
    console.error('✗ 删除学校过程中出错:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n数据库连接已关闭');
    process.exit(0);
  }
}

