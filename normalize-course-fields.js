// 规范化课程字段：将所有课程字段的值统一为"有"或"无"
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu')
  .then(() => {
    console.log('成功连接到MongoDB数据库');
    normalizeCourseFields();
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// 学校数据模型
const SchoolSchema = new mongoose.Schema({}, { strict: false });
const School = mongoose.model('School', SchoolSchema);

// 课程字段列表
const courseFields = [
  'ibPYP',
  'ibMYP',
  'ibDP',
  'ibCP',
  'aLevel',
  'ap',
  'canadian',
  'australian',
  'igcse'
];

// 规范化单个字段值：将非"有"/"无"的值转换为"有"或"无"
function normalizeFieldValue(value) {
  if (!value || value === '' || value === '无') {
    return '无';
  }
  // 如果有任何非空值（包括具体的课程名称），都视为"有"
  return '有';
}

// 规范化数据库中的课程字段
async function normalizeDatabase() {
  try {
    console.log('开始规范化数据库中的课程字段...');
    
    const schools = await School.find({});
    console.log(`找到 ${schools.length} 所学校`);
    
    let updatedCount = 0;
    
    for (const school of schools) {
      let hasChanges = false;
      const updates = {};
      
      for (const field of courseFields) {
        const currentValue = school[field];
        const normalizedValue = normalizeFieldValue(currentValue);
        
        if (currentValue !== normalizedValue) {
          updates[field] = normalizedValue;
          hasChanges = true;
          console.log(`  学校: ${school.name}, 字段: ${field}, 原值: "${currentValue}" -> 新值: "${normalizedValue}"`);
        }
      }
      
      if (hasChanges) {
        await School.updateOne(
          { _id: school._id },
          { 
            $set: {
              ...updates,
              updatedAt: new Date()
            }
          }
        );
        updatedCount++;
      }
    }
    
    console.log(`\n数据库规范化完成：更新了 ${updatedCount} 所学校的课程字段`);
    return updatedCount;
  } catch (error) {
    console.error('规范化数据库时出错:', error);
    throw error;
  }
}

// 规范化CSV文件中的课程字段
function normalizeCSV() {
  try {
    console.log('\n开始规范化CSV文件中的课程字段...');
    
    const csvPath = path.join(__dirname, 'SchoolData', 'SchoolData.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('CSV文件不存在:', csvPath);
      return 0;
    }
    
    // 读取CSV文件
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      console.error('CSV文件格式错误：至少需要标题行和一行数据');
      return 0;
    }
    
    // 解析标题行
    const headers = parseCSVLine(lines[0]);
    
    // 找到课程字段的索引
    const courseFieldIndices = {};
    const courseFieldNames = [
      'IB PYP国际文凭小学项目',
      'IB MYP国际文凭中学项目',
      'IB DP国际文凭大学预科项目',
      'IB CP国际文凭职业相关课程',
      'A-Level英国普通高中水平证书',
      'AP美国大学先修课程',
      '加拿大课程',
      '澳大利亚课程',
      'IGCSE国际普通中学教育文凭'
    ];
    
    courseFieldNames.forEach(fieldName => {
      const index = headers.indexOf(fieldName);
      if (index !== -1) {
        courseFieldIndices[index] = fieldName;
      }
    });
    
    console.log(`找到 ${Object.keys(courseFieldIndices).length} 个课程字段`);
    
    // 处理数据行
    let updatedRows = 0;
    const newLines = [lines[0]]; // 保留标题行
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;
      
      let rowChanged = false;
      
      // 更新课程字段的值
      Object.keys(courseFieldIndices).forEach(indexStr => {
        const index = parseInt(indexStr);
        if (index < values.length) {
          const currentValue = values[index].trim();
          const normalizedValue = normalizeFieldValue(currentValue);
          
          if (currentValue !== normalizedValue) {
            values[index] = normalizedValue;
            rowChanged = true;
            console.log(`  第 ${i} 行, 字段: ${courseFieldIndices[index]}, 原值: "${currentValue}" -> 新值: "${normalizedValue}"`);
          }
        }
      });
      
      if (rowChanged) {
        updatedRows++;
      }
      
      // 重新组装行（处理包含逗号的字段）
      newLines.push(formatCSVLine(values));
    }
    
    // 写入文件
    const newContent = newLines.join('\n') + '\n';
    fs.writeFileSync(csvPath, newContent, 'utf-8');
    
    console.log(`\nCSV文件规范化完成：更新了 ${updatedRows} 行数据`);
    return updatedRows;
  } catch (error) {
    console.error('规范化CSV文件时出错:', error);
    throw error;
  }
}

// 解析CSV行（处理引号和逗号）
function parseCSVLine(line) {
  const parts = [];
  let currentPart = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (i + 1 < line.length && line[i + 1] === '"') {
        currentPart += '"';
        i++; // 跳过下一个引号
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      parts.push(currentPart.trim());
      currentPart = '';
    } else {
      currentPart += char;
    }
  }
  if (currentPart || !inQuotes) {
    parts.push(currentPart.trim());
  }
  
  return parts;
}

// 格式化CSV行（转义包含逗号、引号或换行符的值）
function formatCSVLine(values) {
  return values.map(value => {
    if (value === null || value === undefined) {
      return '';
    }
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }).join(',');
}

// 主函数
async function normalizeCourseFields() {
  try {
    console.log('========================================');
    console.log('开始规范化课程字段（统一为"有"或"无"）');
    console.log('========================================\n');
    
    // 先规范化数据库
    const dbUpdated = await normalizeDatabase();
    
    // 再规范化CSV文件
    const csvUpdated = normalizeCSV();
    
    console.log('\n========================================');
    console.log('规范化完成！');
    console.log(`数据库：更新了 ${dbUpdated} 所学校`);
    console.log(`CSV文件：更新了 ${csvUpdated} 行数据`);
    console.log('========================================');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('规范化过程中出错:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

