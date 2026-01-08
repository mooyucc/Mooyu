// 删除本地数据库中所有包含"尚德"的学校数据
require('dotenv').config();
const mongoose = require('mongoose');

// 连接本地MongoDB
const LOCAL_MONGODB_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/mooyu';

mongoose.connect(LOCAL_MONGODB_URI)
  .then(() => {
    console.log('成功连接到本地MongoDB数据库');
    deleteShangdeSchools();
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// 学校数据模型
const SchoolSchema = new mongoose.Schema({}, { strict: false });
const School = mongoose.model('School', SchoolSchema);

async function deleteShangdeSchools() {
  try {
    console.log('========================================');
    console.log('开始查找并删除包含"尚德"的学校数据');
    console.log('========================================\n');

    // 查找所有包含"尚德"的学校（使用正则表达式进行模糊匹配）
    const schools = await School.find({ 
      name: { $regex: /尚德/, $options: 'i' } 
    });
    
    if (schools.length === 0) {
      console.log('未找到包含"尚德"的学校记录');
      mongoose.connection.close();
      process.exit(0);
      return;
    }

    console.log(`找到 ${schools.length} 条匹配记录：\n`);
    schools.forEach((school, index) => {
      console.log(`  ${index + 1}. ID: ${school._id}`);
      console.log(`     名称: ${school.name || '未知'}`);
      console.log(`     城市: ${school.city || '未知'}`);
      console.log(`     类型: ${school.schoolType || school.nature || '未知'}`);
      console.log(`     学段: ${school.coveredStages || '未知'}\n`);
    });

    // 确认删除
    console.log('========================================');
    console.log('准备删除以上所有记录...');
    console.log('========================================\n');

    // 删除所有匹配的记录
    const deleteResult = await School.deleteMany({ 
      name: { $regex: /尚德/, $options: 'i' } 
    });
    
    console.log('========================================');
    console.log('删除结果：');
    console.log(`  - 已删除 ${deleteResult.deletedCount} 条记录`);
    console.log('========================================\n');

    if (deleteResult.deletedCount > 0) {
      console.log(`✓ 成功删除所有包含"尚德"的学校记录！`);
    } else {
      console.log(`⚠️  未删除任何记录`);
    }

    // 验证删除结果
    const remainingSchools = await School.find({ 
      name: { $regex: /尚德/, $options: 'i' } 
    });
    
    if (remainingSchools.length === 0) {
      console.log('\n✓ 验证通过：数据库中已无包含"尚德"的学校记录');
    } else {
      console.log(`\n⚠️  警告：仍有 ${remainingSchools.length} 条记录未删除`);
    }

  } catch (error) {
    console.error('✗ 删除学校过程中出错:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n数据库连接已关闭');
    process.exit(0);
  }
}

