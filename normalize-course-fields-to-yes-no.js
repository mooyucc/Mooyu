// 规范化数据库中所有学校的课程字段，将完整课程名称转换为"有"或"无"
require('dotenv').config();
const mongoose = require('mongoose');

// 连接本地MongoDB
const LOCAL_MONGODB_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/mooyu';

mongoose.connect(LOCAL_MONGODB_URI)
  .then(() => {
    console.log('成功连接到本地MongoDB数据库');
    normalizeCourseFields();
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// 学校数据模型
const SchoolSchema = new mongoose.Schema({}, { strict: false });
const School = mongoose.model('School', SchoolSchema);

/**
 * 规范化课程字段值：将完整课程名称转换为"有"或"无"
 */
function normalizeCourseField(value) {
    if (!value || value === '' || value === '无' || value === '未知') {
        return '无';
    }
    // 如果已经是"有"，直接返回
    if (value === '有' || value.toLowerCase() === 'yes' || value.toLowerCase() === 'true') {
        return '有';
    }
    // 如果包含课程名称关键词，说明有该课程，转换为"有"
    if (value.includes('IB') || value.includes('PYP') || value.includes('MYP') || 
        value.includes('DP') || value.includes('CP') || value.includes('A-Level') || 
        value.includes('A-Level') || value.includes('AP') || value.includes('加拿大') || 
        value.includes('澳大利亚') || value.includes('IGCSE')) {
        return '有';
    }
    // 其他情况返回"无"
    return '无';
}

async function normalizeCourseFields() {
  try {
    console.log('========================================');
    console.log('开始规范化课程字段数据');
    console.log('========================================\n');

    // 获取所有学校
    const schools = await School.find({});
    console.log(`找到 ${schools.length} 所学校\n`);

    if (schools.length === 0) {
      console.log('数据库中没有学校数据');
      mongoose.connection.close();
      process.exit(0);
      return;
    }

    let updatedCount = 0;
    const courseFields = ['ibPYP', 'ibMYP', 'ibDP', 'ibCP', 'aLevel', 'ap', 'canadian', 'australian', 'igcse'];

    for (const school of schools) {
      const updateData = {};
      let needsUpdate = false;

      // 检查并规范化每个课程字段
      for (const field of courseFields) {
        const oldValue = school[field];
        const newValue = normalizeCourseField(oldValue);
        
        if (oldValue !== newValue) {
          updateData[field] = newValue;
          needsUpdate = true;
        }
      }

      // 如果有需要更新的字段，执行更新
      if (needsUpdate) {
        await School.updateOne(
          { _id: school._id },
          { 
            $set: { 
              ...updateData,
              updatedAt: new Date()
            } 
          }
        );
        updatedCount++;
        console.log(`✓ 已更新: ${school.name}`);
        for (const [field, newValue] of Object.entries(updateData)) {
          const oldValue = school[field];
          console.log(`  ${field}: "${oldValue}" → "${newValue}"`);
        }
      }
    }

    console.log('\n========================================');
    console.log('规范化完成！');
    console.log(`  - 共检查 ${schools.length} 所学校`);
    console.log(`  - 更新了 ${updatedCount} 所学校的课程字段`);
    console.log('========================================\n');

    // 验证更新结果（检查尚德学校）
    const shangdeSchools = await School.find({ 
      name: { $regex: /尚德/, $options: 'i' } 
    });
    
    if (shangdeSchools.length > 0) {
      console.log('验证尚德学校数据：');
      shangdeSchools.forEach(school => {
        console.log(`\n${school.name}:`);
        console.log(`  ibPYP: "${school.ibPYP}"`);
        console.log(`  ibMYP: "${school.ibMYP}"`);
        console.log(`  ibDP: "${school.ibDP}"`);
        console.log(`  ibCP: "${school.ibCP}"`);
        console.log(`  aLevel: "${school.aLevel}"`);
        console.log(`  ap: "${school.ap}"`);
      });
    }

  } catch (error) {
    console.error('规范化过程中出错:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n数据库连接已关闭');
    process.exit(0);
  }
}

