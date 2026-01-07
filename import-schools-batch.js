// 批量导入SchoolData目录下的所有CSV文件（新CSV格式）
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu')
  .then(() => {
    console.log('成功连接到MongoDB数据库');
    importAllSchools();
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// 学校数据模型（与server.js保持一致）
const SchoolSchema = new mongoose.Schema({
    sequenceNumber: { type: Number }, // 序号
    name: { type: String, required: true }, // 学校名称
    website: { type: String }, // 网址
    schoolType: { type: String }, // 学校类型
    coveredStages: { type: String }, // 涵盖学段
    kindergarten: { type: String }, // 幼儿园 (有/无)
    primary: { type: String }, // 小学 (有/无)
    juniorHigh: { type: String }, // 初中 (有/无)
    seniorHigh: { type: String }, // 高中 (有/无)
    ibPYP: { type: String }, // IB（国际文凭课程）PYP (有/无)
    ibMYP: { type: String }, // IB（国际文凭课程）MYP (有/无)
    ibDP: { type: String }, // IB（国际文凭课程）DP (有/无)
    ibCP: { type: String }, // IB（国际文凭课程）CP (有/无)
    aLevel: { type: String }, // A-Level（英国高中课程）(有/无)
    ap: { type: String }, // AP（美国大学先修课程）(有/无)
    canadian: { type: String }, // 加拿大课程 (有/无)
    australian: { type: String }, // 澳大利亚课程 (有/无)
    igcse: { type: String }, // IGCSE (有/无)
    otherCourses: { type: String }, // 其他课程
    
    // AI评估字段
    'AI评估_总分': { type: Number },
    'AI评估_课程与融合_得分': { type: Number },
    'AI评估_课程与融合_说明': { type: String },
    'AI评估_学术评估_得分': { type: Number },
    'AI评估_学术评估_说明': { type: String },
    'AI评估_升学成果_得分': { type: Number },
    'AI评估_升学成果_说明': { type: String },
    'AI评估_规划体系_得分': { type: Number },
    'AI评估_规划体系_说明': { type: String },
    'AI评估_师资稳定_得分': { type: Number },
    'AI评估_师资稳定_说明': { type: String },
    'AI评估_课堂文化_得分': { type: Number },
    'AI评估_课堂文化_说明': { type: String },
    'AI评估_活动系统_得分': { type: Number },
    'AI评估_活动系统_说明': { type: String },
    'AI评估_幸福感/生活_得分': { type: Number },
    'AI评估_幸福感/生活_说明': { type: String },
    'AI评估_品牌与社区影响力_得分': { type: Number },
    'AI评估_品牌与社区影响力_说明': { type: String },
    'AI评估_最终总结_JSON': { type: String },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { strict: false }); // 使用strict: false以支持动态字段

const School = mongoose.model('School', SchoolSchema);

// CSV字段到数据库字段的映射
const fieldMapping = {
    '序号': 'sequenceNumber',
    '学校名称': 'name',
    '网址': 'website',
    '学校类型': 'schoolType',
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

// 解析CSV文件（新格式：第一行是标题，后续行是数据，每行代表一个学校）
// 返回所有学校的数组
function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
        throw new Error('CSV文件格式错误：至少需要标题行和一行数据');
    }
    
    // 解析标题行
    const headers = parseCSVLine(lines[0]);
    
    // 解析所有数据行
    const schoolsData = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const schoolData = {};
        
        // 将标题和值对应
        headers.forEach((header, index) => {
            const dbField = fieldMapping[header];
            if (dbField && values[index] !== undefined) {
                let value = values[index].trim();
                
                // 处理序号字段（转换为数字）
                if (dbField === 'sequenceNumber') {
                    schoolData[dbField] = value ? parseInt(value) : null;
                } else {
                    // 其他字段直接存储字符串值
                    schoolData[dbField] = value || '';
                }
            }
        });
        
        // 只有当学校名称存在时才添加
        if (schoolData.name) {
            schoolsData.push(schoolData);
        }
    }
    
    return schoolsData;
}

// 导入单个学校数据对象
async function importSchoolData(schoolData, fileName) {
    try {
        if (!schoolData.name) {
            return { success: false, message: '未找到学校名称' };
        }
        
        // 检查学校是否已存在（按名称或序号）
        const existingSchool = await School.findOne({ 
            $or: [
                { name: schoolData.name },
                { sequenceNumber: schoolData.sequenceNumber }
            ]
        });
        
        if (existingSchool) {
            Object.assign(existingSchool, schoolData);
            existingSchool.updatedAt = new Date();
            await existingSchool.save();
            return { 
                success: true, 
                message: '更新成功', 
                school: schoolData.name,
                action: 'updated'
            };
        } else {
            const school = new School(schoolData);
            await school.save();
            return { 
                success: true, 
                message: '创建成功', 
                school: schoolData.name,
                action: 'created'
            };
        }
    } catch (error) {
        console.error(`导入学校 "${schoolData.name || '未知'}" 时出错:`, error);
        return { 
            success: false, 
            message: error.message,
            school: schoolData.name || '未知'
        };
    }
}

// 导入单个CSV文件（可能包含多所学校）
async function importSchool(csvPath) {
    try {
        const schoolsData = parseCSV(csvPath);
        
        if (schoolsData.length === 0) {
            console.warn(`警告: ${path.basename(csvPath)} 中没有有效的学校数据，跳过`);
            return { success: false, message: '没有有效的学校数据', schools: [] };
        }
        
        const results = [];
        for (const schoolData of schoolsData) {
            const result = await importSchoolData(schoolData, path.basename(csvPath));
            results.push(result);
        }
        
        // 如果所有学校都导入成功，返回成功
        const allSuccess = results.every(r => r.success);
        return {
            success: allSuccess,
            message: allSuccess ? '所有学校导入成功' : '部分学校导入失败',
            schools: results
        };
    } catch (error) {
        console.error(`导入 ${path.basename(csvPath)} 时出错:`, error);
        return { 
            success: false, 
            message: error.message,
            file: path.basename(csvPath),
            schools: []
        };
    }
}

// 批量导入所有学校
async function importAllSchools() {
    try {
        const schoolDataDir = path.join(__dirname, 'SchoolData');
        
        // 检查目录是否存在
        if (!fs.existsSync(schoolDataDir)) {
            console.error(`SchoolData目录不存在: ${schoolDataDir}`);
            console.log('正在创建目录...');
            fs.mkdirSync(schoolDataDir, { recursive: true });
            console.log('目录已创建，请将CSV文件放入该目录后重新运行');
            mongoose.connection.close();
            process.exit(0);
        }
        
        // 读取目录中的所有CSV文件
        const files = fs.readdirSync(schoolDataDir)
            .filter(file => file.toLowerCase().endsWith('.csv'))
            .map(file => path.join(schoolDataDir, file));
        
        if (files.length === 0) {
            console.log('SchoolData目录中没有找到CSV文件');
            mongoose.connection.close();
            process.exit(0);
        }
        
        console.log(`找到 ${files.length} 个CSV文件，开始导入...\n`);
        
        const results = [];
        let successCount = 0;
        let failCount = 0;
        let createdCount = 0;
        let updatedCount = 0;
        
        // 逐个导入
        for (const file of files) {
            console.log(`正在处理: ${path.basename(file)}`);
            const result = await importSchool(file);
            
            if (result.schools && result.schools.length > 0) {
                // CSV文件中包含多所学校
                result.schools.forEach(schoolResult => {
                    results.push({ file: path.basename(file), ...schoolResult });
                    
                    if (schoolResult.success) {
                        successCount++;
                        if (schoolResult.action === 'created') {
                            createdCount++;
                            console.log(`  ✓ 创建: ${schoolResult.school}`);
                        } else {
                            updatedCount++;
                            console.log(`  ✓ 更新: ${schoolResult.school}`);
                        }
                    } else {
                        failCount++;
                        console.log(`  ✗ 失败: ${schoolResult.school} - ${schoolResult.message}`);
                    }
                });
            } else {
                // 单个学校或错误情况
                results.push({ file: path.basename(file), ...result });
                if (result.success) {
                    successCount++;
                    if (result.action === 'created') {
                        createdCount++;
                        console.log(`  ✓ 创建: ${result.school}`);
                    } else {
                        updatedCount++;
                        console.log(`  ✓ 更新: ${result.school}`);
                    }
                } else {
                    failCount++;
                    console.log(`  ✗ 失败: ${result.message}`);
                }
            }
        }
        
        // 输出汇总
        console.log('\n========== 导入完成 ==========');
        console.log(`总计: ${files.length} 个文件`);
        console.log(`成功: ${successCount} 个`);
        console.log(`失败: ${failCount} 个`);
        console.log(`新建: ${createdCount} 个`);
        console.log(`更新: ${updatedCount} 个`);
        
        if (failCount > 0) {
            console.log('\n失败的文件:');
            results.filter(r => !r.success).forEach(r => {
                console.log(`  - ${r.file}: ${r.message}`);
            });
        }
        
        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('批量导入时出错:', error);
        mongoose.connection.close();
        process.exit(1);
    }
}
