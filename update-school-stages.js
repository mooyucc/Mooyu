// 更新指定学校的学段字段
// 根据幼儿园、小学、初中、高中字段的"有/无"状态，自动生成学段字段
require('dotenv').config();
const mongoose = require('mongoose');

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu')
  .then(() => {
    console.log('成功连接到MongoDB数据库');
    updateSchoolStages();
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// 学校数据模型
const SchoolSchema = new mongoose.Schema({}, { strict: false });
const School = mongoose.model('School', SchoolSchema);

/**
 * 根据幼儿园、小学、初中、高中字段生成学段字符串
 */
function generateStagesString(school) {
  const stages = [];
  
  if (school.kindergarten === '有') {
    stages.push('幼儿园');
  }
  if (school.primary === '有') {
    stages.push('小学');
  }
  if (school.juniorHigh === '有') {
    stages.push('初中');
  }
  if (school.seniorHigh === '有') {
    stages.push('高中');
  }
  
  return stages.join('、');
}

/**
 * 更新指定学校的学段字段
 */
async function updateSchoolStages() {
  try {
    console.log('开始更新学校学段字段...\n');
    
    // 要更新的学校列表
    const schoolsToUpdate = [
      '上海尚德实验学校',
      '上海浦东新区民办万科学校'
    ];
    
    // 查找这些学校
    const schools = await School.find({ 
      name: { $in: schoolsToUpdate } 
    });
    
    console.log(`找到 ${schools.length} 所学校\n`);
    
    if (schools.length === 0) {
      console.log('未找到要更新的学校，请检查学校名称是否正确');
      mongoose.connection.close();
      process.exit(0);
    }
    
    // 显示找到的学校当前状态
    console.log('=== 找到的学校 ===');
    for (const school of schools) {
      console.log(`${school.name}`);
      console.log(`  当前学段: ${school.coveredStages || '(空)'}`);
      console.log(`  幼儿园: ${school.kindergarten || '(空)'}`);
      console.log(`  小学: ${school.primary || '(空)'}`);
      console.log(`  初中: ${school.juniorHigh || '(空)'}`);
      console.log(`  高中: ${school.seniorHigh || '(空)'}`);
      
      const newStageValue = generateStagesString(school);
      console.log(`  根据字段生成的学段: ${newStageValue || '(无)'}`);
    }
    console.log('');
    
    // 执行更新
    console.log('开始更新...\n');
    let updatedCount = 0;
    
    for (const school of schools) {
      const oldValue = school.coveredStages || '(空)';
      const newStageValue = generateStagesString(school);
      
      if (!newStageValue) {
        console.log(`○ 跳过: ${school.name} (无法根据字段生成学段，所有学段字段都不是"有")`);
        continue;
      }
      
      if (oldValue === newStageValue) {
        console.log(`○ 跳过: ${school.name} (学段字段已经是正确值: ${newStageValue})`);
        continue;
      }
      
      try {
        await School.updateOne(
          { _id: school._id },
          { 
            $set: { 
              coveredStages: newStageValue,
              updatedAt: new Date()
            } 
          }
        );
        updatedCount++;
        console.log(`✓ 已更新: ${school.name}`);
        console.log(`  原值: ${oldValue}`);
        console.log(`  新值: ${newStageValue}`);
      } catch (error) {
        console.error(`✗ 更新失败: ${school.name}`, error.message);
      }
    }
    
    console.log(`\n更新完成！共更新 ${updatedCount} 所学校的学段字段`);
    
    // 验证更新结果
    console.log('\n=== 验证更新结果 ===');
    const updatedSchools = await School.find({ 
      name: { $in: schoolsToUpdate } 
    });
    
    for (const school of updatedSchools) {
      console.log(`${school.name}`);
      console.log(`  学段: ${school.coveredStages || '(空)'}`);
      console.log(`  幼儿园: ${school.kindergarten || '(空)'}, 小学: ${school.primary || '(空)'}, 初中: ${school.juniorHigh || '(空)'}, 高中: ${school.seniorHigh || '(空)'}`);
    }
    
    mongoose.connection.close();
    console.log('\n数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    console.error('更新失败:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

