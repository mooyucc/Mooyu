// 导入学校数据脚本（新CSV格式）
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu')
  .then(() => {
    console.log('成功连接到MongoDB数据库');
    importSchoolData();
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
    country: { type: String }, // 国家
    city: { type: String }, // 城市
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
    'AI评估_课程声誉与体系成熟度_得分': { type: Number },
    'AI评估_课程声誉与体系成熟度_说明': { type: String },
    'AI评估_教学成果与影响力_得分': { type: Number },
    'AI评估_教学成果与影响力_说明': { type: String },
    'AI评估_大学认可度_得分': { type: Number },
    'AI评估_大学认可度_说明': { type: String },
    'AI评估_升学成果_得分': { type: Number },
    'AI评估_升学成果_说明': { type: String },
    'AI评估_师生比_得分': { type: Number },
    'AI评估_师生比_说明': { type: String },
    'AI评估_教师教育背景与稳定性_得分': { type: Number },
    'AI评估_教师教育背景与稳定性_说明': { type: String },
    'AI评估_国际教员比例_得分': { type: Number },
    'AI评估_国际教员比例_说明': { type: String },
    'AI评估_国际学生比例_得分': { type: Number },
    'AI评估_国际学生比例_说明': { type: String },
    'AI评估_国际研究网络_得分': { type: Number },
    'AI评估_国际研究网络_说明': { type: String },
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
    '国家': 'country',
    '城市': 'city',
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

// 解析CSV文件（新格式：第一行是标题，后续行是数据，每行代表一个学校）
function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
        throw new Error('CSV文件格式错误：至少需要标题行和一行数据');
    }
    
    // 解析标题行
    const headers = parseCSVLine(lines[0]);
    
    // 解析第一行数据（单个CSV文件通常只包含一个学校的数据）
    const values = parseCSVLine(lines[1]);
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
    
    return schoolData;
}

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

// 导入学校数据
async function importSchoolData() {
    try {
        // 支持命令行参数指定文件路径
        const csvPathArg = process.argv[2];
        
        let csvPath = null;
        
        if (csvPathArg) {
            csvPath = csvPathArg;
        } else {
            // 尝试多个可能的路径
            const possiblePaths = [
                '/Users/kevinx/Desktop/SchoolData.csv',
                path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop/SchoolData.csv'),
                path.join(__dirname, '../Desktop/SchoolData.csv')
            ];
            
            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    csvPath = p;
                    break;
                }
            }
        }
        
        if (!csvPath || !fs.existsSync(csvPath)) {
            console.error('CSV文件不存在');
            if (csvPathArg) {
                console.error(`指定的路径: ${csvPathArg}`);
            } else {
                console.error('请通过命令行参数指定CSV文件路径:');
                console.error('  node import-school-data.js /path/to/school.csv');
            }
            process.exit(1);
        }
        
        console.log(`使用CSV文件: ${csvPath}`);
        
        console.log('开始解析CSV文件...');
        const schoolData = parseCSV(csvPath);
        
        if (!schoolData.name) {
            console.error('错误：未找到学校名称');
            process.exit(1);
        }
        
        console.log('解析完成，学校名称:', schoolData.name);
        
        // 获取下一个序号（用于新创建的学校）
        async function getNextSequenceNumber() {
            const maxSchool = await School.findOne({})
                .sort({ sequenceNumber: -1 })
                .select('sequenceNumber');
            
            if (maxSchool && maxSchool.sequenceNumber !== null && maxSchool.sequenceNumber !== undefined) {
                return maxSchool.sequenceNumber + 1;
            }
            
            // 如果没有找到序号，返回总数 + 1
            const count = await School.countDocuments({});
            return count + 1;
        }
        
        // 检查学校是否已存在
        const existingSchool = await School.findOne({ name: schoolData.name });
        
        if (existingSchool) {
            console.log(`学校 "${schoolData.name}" 已存在，更新数据...`);
            Object.assign(existingSchool, schoolData);
            existingSchool.updatedAt = new Date();
            await existingSchool.save();
            console.log('学校数据更新成功！');
        } else {
            console.log('创建新学校记录...');
            // 如果CSV中没有序号或序号为空，自动分配下一个序号
            if (!schoolData.sequenceNumber || schoolData.sequenceNumber === null || schoolData.sequenceNumber === undefined) {
                schoolData.sequenceNumber = await getNextSequenceNumber();
                console.log(`自动分配序号: ${schoolData.sequenceNumber}`);
            }
            const school = new School(schoolData);
            await school.save();
            console.log('学校数据导入成功！');
        }
        
        console.log('导入的学校数据:');
        console.log(JSON.stringify(schoolData, null, 2));
        
        mongoose.connection.close();
        console.log('数据库连接已关闭');
        process.exit(0);
    } catch (error) {
        console.error('导入数据时出错:', error);
        mongoose.connection.close();
        process.exit(1);
    }
}
