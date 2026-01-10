require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取服务器数据库 URI
function getServerDbUri() {
    // 优先使用环境变量
    if (process.env.REMOTE_MONGODB_URI) {
        return process.env.REMOTE_MONGODB_URI;
    }
    
    // 尝试从服务器获取
    try {
        const command = `ssh root@122.51.133.41 "cd /root/Mooyu && grep MONGODB_URI .env 2>/dev/null | cut -d= -f2- | tr -d \\"\\'" || echo ''"`;
        const uri = execSync(command, { encoding: 'utf8' }).trim();
        if (uri) {
            return uri;
        }
    } catch (error) {
        // 忽略错误，继续使用本地数据库
    }
    
    return null;
}

// 连接MongoDB
// 优先使用命令行参数，然后是环境变量，最后尝试从服务器获取
let MONGODB_URI = process.argv[2] || process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.log('正在尝试从服务器获取数据库 URI...');
    const serverUri = getServerDbUri();
    if (serverUri) {
        MONGODB_URI = serverUri;
        console.log('✓ 使用服务器数据库');
    } else {
        MONGODB_URI = 'mongodb://localhost:27017/mooyu';
        console.log('⚠ 使用本地数据库（默认）');
    }
} else if (process.argv[2]) {
    console.log('✓ 使用命令行指定的数据库 URI');
} else {
    console.log('✓ 使用环境变量中的数据库 URI');
}

// 显示数据库 URI（隐藏密码）
const displayUri = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
console.log(`数据库: ${displayUri}\n`);

// 定义School模型（与 server.js 保持一致）
const SchoolSchema = new mongoose.Schema({
    sequenceNumber: { type: Number },
    name: { type: String, required: true },
    website: { type: String },
    country: { type: String },
    city: { type: String },
    schoolType: { type: String },
    coveredStages: { type: String },
    kindergarten: { type: String },
    primary: { type: String },
    juniorHigh: { type: String },
    seniorHigh: { type: String },
    ibPYP: { type: String },
    ibMYP: { type: String },
    ibDP: { type: String },
    ibCP: { type: String },
    aLevel: { type: String },
    ap: { type: String },
    canadian: { type: String },
    australian: { type: String },
    igcse: { type: String },
    otherCourses: { type: String },
    affiliatedGroup: { type: String },
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
    searchCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { strict: false });

const School = mongoose.model('School', SchoolSchema);

// CSV 列名（与 CSV 文件第一行保持一致）
const CSV_HEADERS = [
    '序号', '学校名称', '网址', '国家', '城市', '隶属教育集团', '学校类型', '涵盖学段',
    '幼儿园', '小学', '初中', '高中',
    'IB PYP国际文凭小学项目', 'IB MYP国际文凭中学项目', 'IB DP国际文凭大学预科项目', 'IB CP国际文凭职业相关课程',
    'A-Level英国普通高中水平证书', 'AP美国大学先修课程', '加拿大课程', '澳大利亚课程', 'IGCSE国际普通中学教育文凭', '其他课程',
    'AI评估_总分', 'AI评估_课程与融合_得分', 'AI评估_课程与融合_说明', 'AI评估_学术评估_得分', 'AI评估_学术评估_说明',
    'AI评估_升学成果_得分', 'AI评估_升学成果_说明', 'AI评估_规划体系_得分', 'AI评估_规划体系_说明',
    'AI评估_师资稳定_得分', 'AI评估_师资稳定_说明', 'AI评估_课堂文化_得分', 'AI评估_课堂文化_说明',
    'AI评估_活动系统_得分', 'AI评估_活动系统_说明', 'AI评估_幸福感/生活_得分', 'AI评估_幸福感/生活_说明',
    'AI评估_品牌与社区影响力_得分', 'AI评估_品牌与社区影响力_说明', 'AI评估_最终总结_JSON'
];

// 数据库字段到 CSV 列的映射
const FIELD_MAPPING = {
    '序号': 'sequenceNumber',
    '学校名称': 'name',
    '网址': 'website',
    '国家': 'country',
    '城市': 'city',
    '隶属教育集团': 'affiliatedGroup',
    '学校类型': 'schoolType',
    '涵盖学段': 'coveredStages',
    '幼儿园': 'kindergarten',
    '小学': 'primary',
    '初中': 'juniorHigh',
    '高中': 'seniorHigh',
    'IB PYP国际文凭小学项目': 'ibPYP',
    'IB MYP国际文凭中学项目': 'ibMYP',
    'IB DP国际文凭大学预科项目': 'ibDP',
    'IB CP国际文凭职业相关课程': 'ibCP',
    'A-Level英国普通高中水平证书': 'aLevel',
    'AP美国大学先修课程': 'ap',
    '加拿大课程': 'canadian',
    '澳大利亚课程': 'australian',
    'IGCSE国际普通中学教育文凭': 'igcse',
    '其他课程': 'otherCourses',
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

// CSV 转义函数：处理包含逗号、引号、换行符的字段
function escapeCSVField(field) {
    if (field === null || field === undefined) {
        return '';
    }
    
    const str = String(field);
    
    // 如果字段包含逗号、引号或换行符，需要用引号包裹，并转义引号
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    
    return str;
}

// 将学校数据转换为 CSV 行
function schoolToCSVRow(school) {
    return CSV_HEADERS.map(header => {
        const dbField = FIELD_MAPPING[header];
        if (!dbField) {
            return '';
        }
        
        const value = school[dbField];
        return escapeCSVField(value);
    }).join(',');
}

async function updateCSVFromDatabase() {
    try {
        console.log('正在连接数据库...');
        await mongoose.connect(MONGODB_URI);
        console.log('✓ 成功连接到MongoDB数据库\n');

        // 查询所有学校，按序号排序
        const schools = await School.find({})
            .sort({ sequenceNumber: 1 })
            .lean();
        
        console.log(`找到 ${schools.length} 所学校\n`);

        if (schools.length === 0) {
            console.log('⚠ 数据库中没有学校数据，CSV 文件将只包含表头');
        }

        // 构建 CSV 内容
        const csvLines = [];
        
        // 添加表头
        csvLines.push(CSV_HEADERS.join(','));
        
        // 添加数据行
        schools.forEach((school, index) => {
            // 如果没有序号，使用索引+1
            if (!school.sequenceNumber) {
                school.sequenceNumber = index + 1;
            }
            csvLines.push(schoolToCSVRow(school));
        });

        // 写入 CSV 文件
        const csvPath = path.join(__dirname, 'SchoolData', 'SchoolData.csv');
        const csvContent = csvLines.join('\n') + '\n';
        
        fs.writeFileSync(csvPath, csvContent, 'utf8');
        
        console.log(`✓ 成功更新 CSV 文件: ${csvPath}`);
        console.log(`  - 共 ${schools.length} 所学校`);
        console.log(`  - 共 ${CSV_HEADERS.length} 个字段\n`);

        // 显示一些统计信息
        if (schools.length > 0) {
            const schoolsWithAI = schools.filter(s => s['AI评估_总分'] != null).length;
            console.log('=== 数据统计 ===');
            console.log(`已进行AI评估的学校: ${schoolsWithAI} 所`);
            console.log(`未进行AI评估的学校: ${schools.length - schoolsWithAI} 所\n`);
        }

        await mongoose.disconnect();
        console.log('✓ 数据库连接已关闭');
        process.exit(0);

    } catch (error) {
        console.error('✗ 更新 CSV 文件失败:', error);
        process.exit(1);
    }
}

updateCSVFromDatabase();
