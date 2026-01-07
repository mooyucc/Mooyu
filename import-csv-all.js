// 导入CSV文件中的所有学校数据（支持多行）
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu')
  .then(() => {
    console.log('成功连接到MongoDB数据库');
    importAllSchoolsFromCSV();
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// 学校数据模型（与server.js保持一致）
const SchoolSchema = new mongoose.Schema({}, { strict: false });
const School = mongoose.model('School', SchoolSchema);

// CSV字段到数据库字段的映射
const fieldMapping = {
    '序号': 'sequenceNumber',
    '学校名称': 'name',
    '网址': 'website',
    '国家': 'country',
    '城市': 'city',
    '学校类型': 'schoolType',
    '隶属教育集团': 'affiliatedGroup',
    '涵盖学段': 'coveredStages',
    '幼儿园': 'kindergarten',
    '小学': 'primary',
    '初中': 'juniorHigh',
    '高中': 'seniorHigh',
    'IB（国际文凭课程）PYP': 'ibPYP',
    'IB（国际文凭课程）MYP': 'ibMYP',
    'IB（国际文凭课程）DP': 'ibDP',
    'IB（国际文凭课程）CP': 'ibCP',
    'A-Level（英国高中课程）': 'aLevel',
    'AP（美国大学先修课程）': 'ap',
    '加拿大课程': 'canadian',
    '澳大利亚课程': 'australian',
    'IGCSE': 'igcse',
    '其他课程': 'otherCourses',
    // AI评估字段（字段名在CSV和数据库中相同，直接映射）
    'AI评估_总分': 'AI评估_总分',
    'AI评估_课程与融合_得分': 'AI评估_课程与融合_得分',
    'AI评估_课程与融合_说明': 'AI评估_课程与融合_说明',
    'AI评估_学术评估_得分': 'AI评估_学术评估_得分',
    'AI评估_学术评估_说明': 'AI评估_学术评估_说明',
    'AI评估_升学成果_得分': 'AI评估_升学成果_得分',
    'AI评估_升学成果_说明': 'AI评估_升学成果_说明',
    'AI评估_规划体系_得分': 'AI评估_规划体系_得分',
    'AI评估_规划体系_说明': 'AI评估_规划体系_说明',
    'AI评估_师资稳定_得分': 'AI评估_师资稳定_得分',
    'AI评估_师资稳定_说明': 'AI评估_师资稳定_说明',
    'AI评估_课堂文化_得分': 'AI评估_课堂文化_得分',
    'AI评估_课堂文化_说明': 'AI评估_课堂文化_说明',
    'AI评估_活动系统_得分': 'AI评估_活动系统_得分',
    'AI评估_活动系统_说明': 'AI评估_活动系统_说明',
    'AI评估_幸福感/生活_得分': 'AI评估_幸福感/生活_得分',
    'AI评估_幸福感/生活_说明': 'AI评估_幸福感/生活_说明',
    'AI评估_品牌与社区影响力_得分': 'AI评估_品牌与社区影响力_得分',
    'AI评估_品牌与社区影响力_说明': 'AI评估_品牌与社区影响力_说明',
    'AI评估_最终总结_JSON': 'AI评估_最终总结_JSON'
};

// 解析CSV行（处理引号和逗号）
function parseCSVLine(line) {
    const parts = [];
    let currentPart = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            parts.push(currentPart.trim());
            currentPart = '';
        } else {
            currentPart += char;
        }
    }
    // 添加最后一个部分
    if (currentPart || !inQuotes) {
        parts.push(currentPart.trim());
    }
    
    return parts;
}

// 尝试修复格式错误的JSON（处理属性名和字符串值没有引号的情况）
function tryFixInvalidJSON(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
        return null;
    }
    
    try {
        // 先尝试直接解析
        return JSON.parse(jsonString);
    } catch (e) {
        // 如果解析失败，尝试修复常见问题
        try {
            // 第一步：修复属性名没有引号的问题
            let fixed = jsonString.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
            
            // 第二步：尝试解析修复后的JSON
            try {
                return JSON.parse(fixed);
            } catch (e2) {
                // 第三步：如果还是失败，尝试修复字符串值没有引号的问题
                fixed = fixed.replace(/("(?:[^"\\]|\\.)*")\s*:\s*([^,}\]]+?)(?=\s*[,}])/g, (match, key, value) => {
                    const trimmedValue = value.trim();
                    // 如果值已经是数字、布尔值、null、对象、数组或已有引号，保持不变
                    if (/^-?\d+(\.\d+)?$/.test(trimmedValue) || 
                        trimmedValue === 'true' || 
                        trimmedValue === 'false' || 
                        trimmedValue === 'null' ||
                        trimmedValue.startsWith('{') ||
                        trimmedValue.startsWith('[') ||
                        (trimmedValue.startsWith('"') && trimmedValue.endsWith('"'))) {
                        return match;
                    }
                    // 否则，给字符串值加上引号，并转义内部的引号和反斜杠
                    const escapedValue = trimmedValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                    return `${key}: "${escapedValue}"`;
                });
                
                // 第四步：再次尝试解析
                try {
                    return JSON.parse(fixed);
                } catch (e3) {
                    // 第五步：如果还是失败，尝试使用Function构造器（仅用于修复数据，不用于用户输入）
                    try {
                        const result = new Function('return ' + fixed)();
                        if (result && typeof result === 'object') {
                            return result;
                        }
                    } catch (e4) {
                        return null;
                    }
                }
            }
        } catch (fixError) {
            return null;
        }
    }
}

// 验证并修复JSON格式
function validateAndFixJSON(value, fieldName) {
    if (!value || typeof value !== 'string') {
        return value;
    }
    
    // 如果是最终总结JSON字段，需要验证和修复
    if (fieldName === 'AI评估_最终总结_JSON') {
        try {
            // 先尝试直接解析
            JSON.parse(value);
            return value; // 格式正确，直接返回
        } catch (e) {
            // 格式错误，尝试修复
            const fixed = tryFixInvalidJSON(value);
            if (fixed && typeof fixed === 'object') {
                // 修复成功，返回标准JSON字符串
                return JSON.stringify(fixed);
            } else {
                console.warn(`⚠ 无法修复字段 "${fieldName}" 的JSON格式，将保持原值`);
                return value;
            }
        }
    }
    
    return value;
}

// 获取下一个序号
async function getNextSequenceNumber() {
    const maxSchool = await School.findOne({})
        .sort({ sequenceNumber: -1 })
        .select('sequenceNumber');
    
    if (maxSchool && maxSchool.sequenceNumber !== null && maxSchool.sequenceNumber !== undefined) {
        return maxSchool.sequenceNumber + 1;
    }
    
    const count = await School.countDocuments({});
    return count + 1;
}

// 导入所有学校数据
async function importAllSchoolsFromCSV() {
    try {
        const csvPathArg = process.argv[2];
        
        if (!csvPathArg) {
            console.error('请指定CSV文件路径:');
            console.error('  node import-csv-all.js /path/to/SchoolData.csv');
            process.exit(1);
        }
        
        const csvPath = path.resolve(csvPathArg);
        
        if (!fs.existsSync(csvPath)) {
            console.error(`CSV文件不存在: ${csvPath}`);
            process.exit(1);
        }
        
        console.log(`使用CSV文件: ${csvPath}`);
        
        // 读取并解析CSV文件
        const content = fs.readFileSync(csvPath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            console.error('CSV文件格式错误：至少需要标题行和一行数据');
            process.exit(1);
        }
        
        // 解析标题行
        const headers = parseCSVLine(lines[0]);
        console.log(`找到 ${headers.length} 个字段`);
        
        // 解析所有数据行
        const schoolsData = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length === 0 || !values[1]) continue; // 跳过空行或没有学校名称的行
            
            const schoolData = {};
            
            // 将标题和值对应
            headers.forEach((header, index) => {
                const dbField = fieldMapping[header];
                if (dbField && values[index] !== undefined) {
                    let value = values[index].trim();
                    
                    // 处理序号字段（转换为数字）
                    if (dbField === 'sequenceNumber') {
                        schoolData[dbField] = value ? parseInt(value) : null;
                    } else if (dbField.startsWith('AI评估_') && dbField.endsWith('_得分') || dbField === 'AI评估_总分') {
                        // AI评估得分字段转换为数字
                        schoolData[dbField] = value ? parseFloat(value) : null;
                    } else {
                        // 其他字段存储字符串值，对于JSON字段需要验证和修复格式
                        const processedValue = value || '';
                        schoolData[dbField] = validateAndFixJSON(processedValue, dbField);
                    }
                }
            });
            
            // 只有当学校名称存在时才添加
            if (schoolData.name) {
                schoolsData.push(schoolData);
            }
        }
        
        console.log(`解析到 ${schoolsData.length} 所学校，开始导入...\n`);
        
        let createdCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        
        // 导入每所学校
        for (const schoolData of schoolsData) {
            try {
                // 检查学校是否已存在（按名称）
                const existingSchool = await School.findOne({ name: schoolData.name });
                
                if (existingSchool) {
                    // 更新现有学校 - 使用 $set 确保所有字段都被更新，包括空字符串
                    await School.updateOne(
                        { _id: existingSchool._id },
                        { 
                            $set: {
                                ...schoolData,
                                updatedAt: new Date()
                            }
                        }
                    );
                    updatedCount++;
                    console.log(`✓ 更新: ${schoolData.name}`);
                    if (schoolData.affiliatedGroup) {
                        console.log(`  隶属教育集团: ${schoolData.affiliatedGroup}`);
                    }
                } else {
                    // 如果没有序号，自动分配下一个序号
                    if (!schoolData.sequenceNumber || schoolData.sequenceNumber === null || schoolData.sequenceNumber === undefined) {
                        schoolData.sequenceNumber = await getNextSequenceNumber();
                    }
                    
                    // 创建新学校
                    const school = new School(schoolData);
                    await school.save();
                    createdCount++;
                    console.log(`✓ 创建: ${schoolData.name} (序号: ${schoolData.sequenceNumber})`);
                }
            } catch (error) {
                errorCount++;
                console.error(`✗ 错误: ${schoolData.name} - ${error.message}`);
            }
        }
        
        console.log('\n========== 导入完成 ==========');
        console.log(`总计: ${schoolsData.length} 所学校`);
        console.log(`创建: ${createdCount} 所`);
        console.log(`更新: ${updatedCount} 所`);
        console.log(`错误: ${errorCount} 所`);
        
        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('导入数据时出错:', error);
        mongoose.connection.close();
        process.exit(1);
    }
}


