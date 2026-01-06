// 数据库字段迁移脚本：将 nature 字段重命名为 schoolType，并将"民办国际化学校"改为"民办双语学校"
require('dotenv').config();
const mongoose = require('mongoose');

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu')
  .then(() => {
    console.log('成功连接到MongoDB数据库');
    migrateFields();
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// 学校数据模型
const SchoolSchema = new mongoose.Schema({}, { strict: false });
const School = mongoose.model('School', SchoolSchema);

async function migrateFields() {
  try {
    console.log('开始迁移数据库字段...\n');
    
    // 获取所有学校
    const schools = await School.find({});
    console.log(`找到 ${schools.length} 所学校\n`);
    
    let updatedCount = 0;
    let contentUpdatedCount = 0;
    
    for (const school of schools) {
      const updateData = {};
      let needsUpdate = false;
      
      // 如果存在 nature 字段，迁移到 schoolType
      if (school.nature !== undefined && school.nature !== null) {
        updateData.schoolType = school.nature;
        needsUpdate = true;
        
        // 如果内容是"民办国际化学校"，改为"民办双语学校"
        if (school.nature === '民办国际化学校') {
          updateData.schoolType = '民办双语学校';
          contentUpdatedCount++;
        }
      }
      
      // 如果存在 schoolType 字段但值为"民办国际化学校"，也需要更新
      if (school.schoolType === '民办国际化学校') {
        updateData.schoolType = '民办双语学校';
        needsUpdate = true;
        contentUpdatedCount++;
      }
      
      if (needsUpdate) {
        await School.updateOne(
          { _id: school._id },
          { 
            $set: updateData,
            $unset: { nature: '' }
          }
        );
        
        updatedCount++;
        console.log(`✓ 更新学校: ${school.name}`);
        if (updateData.schoolType === '民办双语学校') {
          console.log(`  字段值: ${school.nature || school.schoolType} → 民办双语学校`);
        } else {
          console.log(`  字段名: nature → schoolType`);
        }
      }
    }
    
    console.log(`\n========== 迁移完成 ==========`);
    console.log(`总计: ${schools.length} 所学校`);
    console.log(`更新字段名: ${updatedCount} 所`);
    console.log(`更新内容（民办国际化学校 → 民办双语学校）: ${contentUpdatedCount} 所`);
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('迁移错误:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

