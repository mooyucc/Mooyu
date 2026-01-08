// 检查数据库中尚德学校的课程字段数据
require('dotenv').config();
const mongoose = require('mongoose');

// 连接本地MongoDB
const LOCAL_MONGODB_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/mooyu';

mongoose.connect(LOCAL_MONGODB_URI)
  .then(() => {
    console.log('成功连接到本地MongoDB数据库');
    checkShangdeData();
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// 学校数据模型
const SchoolSchema = new mongoose.Schema({}, { strict: false });
const School = mongoose.model('School', SchoolSchema);

async function checkShangdeData() {
  try {
    console.log('========================================');
    console.log('检查尚德学校的课程字段数据');
    console.log('========================================\n');

    // 查找所有包含"尚德"的学校
    const schools = await School.find({ 
      name: { $regex: /尚德/, $options: 'i' } 
    });
    
    if (schools.length === 0) {
      console.log('未找到包含"尚德"的学校记录');
      mongoose.connection.close();
      process.exit(0);
      return;
    }

    schools.forEach((school, index) => {
      console.log(`\n学校 ${index + 1}: ${school.name}`);
      console.log('----------------------------------------');
      console.log('IB课程字段：');
      console.log(`  ibPYP: "${school.ibPYP}" (类型: ${typeof school.ibPYP})`);
      console.log(`  ibMYP: "${school.ibMYP}" (类型: ${typeof school.ibMYP})`);
      console.log(`  ibDP: "${school.ibDP}" (类型: ${typeof school.ibDP})`);
      console.log(`  ibCP: "${school.ibCP}" (类型: ${typeof school.ibCP})`);
      console.log('\n其他课程字段：');
      console.log(`  aLevel: "${school.aLevel}" (类型: ${typeof school.aLevel})`);
      console.log(`  ap: "${school.ap}" (类型: ${typeof school.ap})`);
      console.log(`  canadian: "${school.canadian}" (类型: ${typeof school.canadian})`);
      console.log(`  australian: "${school.australian}" (类型: ${typeof school.australian})`);
      console.log(`  igcse: "${school.igcse}" (类型: ${typeof school.igcse})`);
      console.log(`  otherCourses: "${school.otherCourses}" (类型: ${typeof school.otherCourses})`);
    });

  } catch (error) {
    console.error('检查数据过程中出错:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n数据库连接已关闭');
    process.exit(0);
  }
}

