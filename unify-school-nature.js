require('dotenv').config();
const mongoose = require('mongoose');

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu')
  .then(() => {
    console.log('成功连接到MongoDB数据库');
    unifySchoolNature();
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// 学校数据模型
const SchoolSchema = new mongoose.Schema({}, { strict: false });
const School = mongoose.model('School', SchoolSchema);

/**
 * 将学校性质统一映射到四类分类
 * 1. 公立学校
 * 2. 普通民办学校
 * 3. 民办双语学校
 * 4. 公立学校（国际部）
 */
function mapToUnifiedNature(school) {
  const nature = school.nature || '';
  const name = school.name || '';
  
  // 检查是否是公立学校（国际部）
  // 关键词：公立、公办 + 国际部、国际班、国际课程中心
  if (name.includes('公立') || name.includes('公办')) {
    if (name.includes('国际部') || name.includes('国际班') || name.includes('国际课程中心') || 
        name.includes('国际课程部') || name.includes('国际课程')) {
      return '公立学校（国际部）';
    }
  }
  
  // 检查是否是公立学校
  // 关键词：公立、公办、市立、区立、省立、国立，且不包含国际部等
  if (name.includes('公立') || name.includes('公办') || name.includes('市立') || 
      name.includes('区立') || name.includes('省立') || name.includes('国立')) {
    if (!name.includes('国际部') && !name.includes('国际班') && !name.includes('国际课程中心')) {
      return '公立学校';
    }
  }
  
  // 检查是否是民办双语学校
  // 判断标准：
  // 1. 学校名称包含"国际"、"双语"且提供国际课程（IB/AP/A-Level等）
  // 2. 或者nature字段包含"国际"、"双语"等关键词
  // 检查是否有国际课程（注意：课程字段可能是"有"、"无"，也可能是具体课程名称）
  const hasInternationalCourse = 
    (school.ibPYP && school.ibPYP !== '无' && school.ibPYP !== '') ||
    (school.ibMYP && school.ibMYP !== '无' && school.ibMYP !== '') ||
    (school.ibDP && school.ibDP !== '无' && school.ibDP !== '') ||
    (school.ibCP && school.ibCP !== '无' && school.ibCP !== '') ||
    (school.aLevel && school.aLevel !== '无' && school.aLevel !== '') ||
    (school.ap && school.ap !== '无' && school.ap !== '') ||
    (school.igcse && school.igcse !== '无' && school.igcse !== '' && school.igcse !== '无') ||
    (school.canadian && school.canadian !== '无' && school.canadian !== '') ||
    (school.australian && school.australian !== '无' && school.australian !== '');
  
  const hasInternationalKeyword = name.includes('国际') || name.includes('双语') || 
                                  nature.includes('国际') || nature.includes('双语');
  
  // 如果是民办性质，且有国际课程，优先归类为民办双语学校
  if (name.includes('民办') || name.includes('私立') || 
      nature.includes('民办') || nature.includes('私立')) {
    if (hasInternationalCourse) {
      // 如果名称或性质包含国际化关键词，或者提供国际课程，归类为民办国际化学校
      if (hasInternationalKeyword || hasInternationalCourse) {
        return '民办双语学校';
      }
    }
  }
  
  // 如果nature字段明确包含"国际"、"双语"等，且提供国际课程，归类为民办国际化学校
  if ((nature.includes('国际') || nature.includes('双语')) && hasInternationalCourse) {
    return '民办国际化学校';
  }
  
  // 检查是否是普通民办学校
  // 关键词：民办、私立，且没有国际课程
  if (name.includes('民办') || name.includes('私立') || 
      nature.includes('民办') || nature.includes('私立')) {
    // 如果没有国际课程，归类为普通民办学校
    if (!hasInternationalCourse) {
      return '普通民办学校';
    }
  }
  
  // 根据nature字段的常见值进行映射
  const natureLower = nature.toLowerCase();
  
  // 公立学校相关
  if (nature.includes('公立') || nature.includes('公办') || nature.includes('市立') || 
      nature.includes('区立') || nature.includes('省立')) {
    if (nature.includes('国际部') || nature.includes('国际班')) {
      return '公立学校（国际部）';
    }
    return '公立学校';
  }
  
  // 民办国际化学校相关
  if (nature.includes('国际') || nature.includes('双语')) {
    return '民办国际化学校';
  }
  
  // 普通民办学校相关
  if (nature.includes('民办') || nature.includes('私立')) {
    return '普通民办学校';
  }
  
  // 默认情况：根据是否有国际课程判断
  if (hasInternationalCourse) {
    return '民办国际化学校';
  }
  
  // 如果无法判断，保持原值（但会在后续处理中标记）
  return nature || '未知';
}

/**
 * 统一所有学校的nature字段
 */
async function unifySchoolNature() {
  try {
    console.log('开始统一学校性质字段...\n');
    
    // 获取所有学校
    const schools = await School.find({});
    console.log(`共找到 ${schools.length} 所学校\n`);
    
    const stats = {
      '公立学校': 0,
      '普通民办学校': 0,
      '民办双语学校': 0,
      '公立学校（国际部）': 0,
      '未知': 0,
      '未更新': 0
    };
    
    const updates = [];
    const unchanged = [];
    
    for (const school of schools) {
      const oldNature = school.nature || '未知';
      const newNature = mapToUnifiedNature(school);
      
      if (newNature !== oldNature) {
        updates.push({
          id: school._id,
          name: school.name,
          oldNature: oldNature,
          newNature: newNature
        });
        stats[newNature] = (stats[newNature] || 0) + 1;
      } else {
        unchanged.push({
          name: school.name,
          nature: oldNature
        });
        if (stats[newNature] !== undefined) {
          stats[newNature] = (stats[newNature] || 0) + 1;
        } else {
          stats['未更新'] = (stats['未更新'] || 0) + 1;
        }
      }
    }
    
    // 显示更新统计
    console.log('=== 更新统计 ===');
    console.log(`需要更新的学校: ${updates.length} 所`);
    console.log(`无需更新的学校: ${unchanged.length} 所\n`);
    
    // 显示分类统计
    console.log('=== 分类统计 ===');
    Object.keys(stats).forEach(category => {
      if (stats[category] > 0) {
        console.log(`${category}: ${stats[category]} 所`);
      }
    });
    console.log('');
    
    // 显示需要更新的学校详情
    if (updates.length > 0) {
      console.log('=== 需要更新的学校 ===');
      updates.forEach((update, index) => {
        console.log(`${index + 1}. ${update.name}`);
        console.log(`   原值: ${update.oldNature}`);
        console.log(`   新值: ${update.newNature}`);
      });
      console.log('');
      
      // 确认是否更新
      console.log('是否执行更新？(y/n)');
      // 由于是脚本，我们直接执行更新
      console.log('自动执行更新...\n');
      
      // 批量更新
      let updatedCount = 0;
      for (const update of updates) {
        try {
          await School.updateOne(
            { _id: update.id },
            { 
              $set: { 
                nature: update.newNature,
                updatedAt: new Date()
              } 
            }
          );
          updatedCount++;
          console.log(`✓ 已更新: ${update.name} (${update.oldNature} -> ${update.newNature})`);
        } catch (error) {
          console.error(`✗ 更新失败: ${update.name}`, error.message);
        }
      }
      
      console.log(`\n更新完成！共更新 ${updatedCount} 所学校`);
    } else {
      console.log('所有学校的性质字段已经是统一格式，无需更新');
    }
    
    // 显示无法判断的学校
    const unknownSchools = schools.filter(s => {
      const mapped = mapToUnifiedNature(s);
      return mapped === '未知' || mapped === s.nature && (s.nature === '未知' || !s.nature);
    });
    
    if (unknownSchools.length > 0) {
      console.log('\n=== 需要人工判断的学校 ===');
      unknownSchools.forEach((school, index) => {
        console.log(`${index + 1}. ${school.name}`);
        console.log(`   当前性质: ${school.nature || '未知'}`);
        console.log(`   课程: IB=${school.ibDP || '无'}, AP=${school.ap || '无'}, A-Level=${school.aLevel || '无'}`);
      });
    }
    
    console.log('\n统一完成！');
    process.exit(0);
  } catch (error) {
    console.error('统一学校性质失败:', error);
    process.exit(1);
  }
}

