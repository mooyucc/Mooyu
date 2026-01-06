// 导出学校数据脚本（从数据库导出到CSV）
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu')
  .then(() => {
    console.log('成功连接到MongoDB数据库');
    exportSchoolData();
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// 学校数据模型（与server.js保持一致）
const SchoolSchema = new mongoose.Schema({}, { strict: false });
const School = mongoose.model('School', SchoolSchema);

// 数据库字段到CSV字段的映射（与import-school-data.js中的映射相反）
const fieldMapping = {
    'sequenceNumber': '序号',
    'name': '学校名称',
    'website': '网址',
    'country': '国家',
    'city': '城市',
    'affiliatedGroup': '隶属教育集团',
    'schoolType': '学校类型',
    'coveredStages': '涵盖学段',
    'kindergarten': '幼儿园',
    'primary': '小学',
    'juniorHigh': '初中',
    'seniorHigh': '高中',
    'ibPYP': 'IB（国际文凭课程）PYP',
    'ibMYP': 'IB（国际文凭课程）MYP',
    'ibDP': 'IB（国际文凭课程）DP',
    'ibCP': 'IB（国际文凭课程）CP',
    'aLevel': 'A-Level（英国高中课程）',
    'ap': 'AP（美国大学先修课程）',
    'canadian': '加拿大课程',
    'australian': '澳大利亚课程',
    'igcse': 'IGCSE',
    'otherCourses': '其他课程',
    // AI评估字段（字段名在CSV和数据库中相同，直接映射）
    'AI评估_总分': 'AI评估_总分',
    'AI评估_课程声誉与体系成熟度_得分': 'AI评估_课程声誉与体系成熟度_得分',
    'AI评估_课程声誉与体系成熟度_说明': 'AI评估_课程声誉与体系成熟度_说明',
    'AI评估_教学成果与影响力_得分': 'AI评估_教学成果与影响力_得分',
    'AI评估_教学成果与影响力_说明': 'AI评估_教学成果与影响力_说明',
    'AI评估_大学认可度_得分': 'AI评估_大学认可度_得分',
    'AI评估_大学认可度_说明': 'AI评估_大学认可度_说明',
    'AI评估_升学成果_得分': 'AI评估_升学成果_得分',
    'AI评估_升学成果_说明': 'AI评估_升学成果_说明',
    'AI评估_师生比_得分': 'AI评估_师生比_得分',
    'AI评估_师生比_说明': 'AI评估_师生比_说明',
    'AI评估_教师教育背景与稳定性_得分': 'AI评估_教师教育背景与稳定性_得分',
    'AI评估_教师教育背景与稳定性_说明': 'AI评估_教师教育背景与稳定性_说明',
    'AI评估_国际教员比例_得分': 'AI评估_国际教员比例_得分',
    'AI评估_国际教员比例_说明': 'AI评估_国际教员比例_说明',
    'AI评估_国际学生比例_得分': 'AI评估_国际学生比例_得分',
    'AI评估_国际学生比例_说明': 'AI评估_国际学生比例_说明',
    'AI评估_国际研究网络_得分': 'AI评估_国际研究网络_得分',
    'AI评估_国际研究网络_说明': 'AI评估_国际研究网络_说明',
    'AI评估_品牌与社区影响力_得分': 'AI评估_品牌与社区影响力_得分',
    'AI评估_品牌与社区影响力_说明': 'AI评估_品牌与社区影响力_说明',
    'AI评估_最终总结_JSON': 'AI评估_最终总结_JSON'
};

// CSV列顺序（按照原始CSV格式）
const csvColumns = [
    '序号', '学校名称', '网址', '国家', '城市', '隶属教育集团', '学校类型', '涵盖学段',
    '幼儿园', '小学', '初中', '高中',
    'IB（国际文凭课程）PYP', 'IB（国际文凭课程）MYP', 'IB（国际文凭课程）DP', 'IB（国际文凭课程）CP',
    'A-Level（英国高中课程）', 'AP（美国大学先修课程）', '加拿大课程', '澳大利亚课程', 'IGCSE', '其他课程',
    'AI评估_总分', 'AI评估_课程声誉与体系成熟度_得分', 'AI评估_课程声誉与体系成熟度_说明',
    'AI评估_教学成果与影响力_得分', 'AI评估_教学成果与影响力_说明',
    'AI评估_大学认可度_得分', 'AI评估_大学认可度_说明',
    'AI评估_升学成果_得分', 'AI评估_升学成果_说明',
    'AI评估_师生比_得分', 'AI评估_师生比_说明',
    'AI评估_教师教育背景与稳定性_得分', 'AI评估_教师教育背景与稳定性_说明',
    'AI评估_国际教员比例_得分', 'AI评估_国际教员比例_说明',
    'AI评估_国际学生比例_得分', 'AI评估_国际学生比例_说明',
    'AI评估_国际研究网络_得分', 'AI评估_国际研究网络_说明',
    'AI评估_品牌与社区影响力_得分', 'AI评估_品牌与社区影响力_说明',
    'AI评估_最终总结_JSON'
];

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

// 确保JSON格式正确（用于导出）
function ensureValidJSON(value, fieldName) {
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

// 转义CSV字段值（处理包含逗号、引号或换行符的值）
function escapeCSVValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    
    const str = String(value);
    
    // 如果包含逗号、引号或换行符，需要用引号包裹，并转义引号
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    
    return str;
}

// 导出学校数据
async function exportSchoolData() {
    try {
        // 获取所有学校数据，按序号排序
        const schools = await School.find({}).sort({ sequenceNumber: 1, createdAt: 1 });
        
        console.log(`找到 ${schools.length} 所学校，开始导出...`);
        
        if (schools.length === 0) {
            console.log('数据库中没有学校数据');
            mongoose.connection.close();
            process.exit(0);
        }
        
        // 构建CSV内容
        let csvContent = '';
        
        // 写入标题行
        csvContent += csvColumns.join(',') + '\n';
        
        // 写入数据行，同时更新数据库中的序号
        const updatePromises = [];
        
        schools.forEach((school, index) => {
            const row = [];
            const newSequenceNumber = index + 1; // 从1开始的连续序号
            
            // 如果数据库中的序号与新的序号不同，则更新数据库
            if (school.sequenceNumber !== newSequenceNumber) {
                updatePromises.push(
                    School.updateOne(
                        { _id: school._id },
                        { $set: { sequenceNumber: newSequenceNumber, updatedAt: new Date() } }
                    )
                );
            }
            
            csvColumns.forEach(column => {
                // 找到对应的数据库字段
                const dbField = Object.keys(fieldMapping).find(key => fieldMapping[key] === column);
                
                if (dbField) {
                    let value = school[dbField];
                    
                    // 处理序号字段：使用新的连续序号
                    if (column === '序号') {
                        value = newSequenceNumber;
                    }
                    
                    // 处理空值
                    if (value === null || value === undefined) {
                        value = '';
                    }
                    
                    // 对于JSON字段，确保格式正确
                    if (column === 'AI评估_最终总结_JSON' && value) {
                        value = ensureValidJSON(String(value), column);
                    }
                    
                    row.push(escapeCSVValue(value));
                } else {
                    row.push('');
                }
            });
            
            csvContent += row.join(',') + '\n';
        });
        
        // 批量更新数据库中的序号
        if (updatePromises.length > 0) {
            console.log(`正在更新 ${updatePromises.length} 所学校的序号...`);
            await Promise.all(updatePromises);
            console.log('数据库序号更新完成！');
        }
        
        // 确定输出文件路径
        const outputPath = path.join(__dirname, 'SchoolData', 'SchoolData.csv');
        
        // 确保目录存在
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 写入文件
        fs.writeFileSync(outputPath, csvContent, 'utf-8');
        
        console.log(`成功导出 ${schools.length} 所学校数据到: ${outputPath}`);
        console.log('导出完成！');
        
        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('导出数据时出错:', error);
        mongoose.connection.close();
        process.exit(1);
    }
}

