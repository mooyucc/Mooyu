// CSV 和数据库双向自动同步脚本
// 注意：自动同步功能已禁用，如需手动同步请使用 export-school-data.js 和 import-school-data.js
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 配置
const CSV_PATH = path.join(__dirname, 'SchoolData', 'SchoolData.csv');
const SYNC_INTERVAL = 5000; // 同步间隔（毫秒），5秒
const DEBOUNCE_DELAY = 2000; // 防抖延迟（毫秒），2秒

// 自动同步开关 - 设置为 false 禁用自动同步
const AUTO_SYNC_ENABLED = false;

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu')
  .then(() => {
    console.log('成功连接到MongoDB数据库');
    if (AUTO_SYNC_ENABLED) {
      startSync();
    } else {
      console.log('========================================');
      console.log('自动同步功能已禁用');
      console.log('如需手动同步，请使用以下命令：');
      console.log('  - 从数据库导出到CSV: npm run export-csv');
      console.log('  - 从CSV导入到数据库: npm run import-csv');
      console.log('========================================');
      // 不自动退出，保持连接以便手动操作
      // 如果需要立即退出，可以取消下面的注释
      // mongoose.connection.close();
      // process.exit(0);
    }
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// 学校数据模型
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

// 数据库字段到CSV字段的映射（反向映射）
const reverseFieldMapping = {};
Object.keys(fieldMapping).forEach(csvField => {
    reverseFieldMapping[fieldMapping[csvField]] = csvField;
});

// CSV列顺序
const csvColumns = [
    '序号', '学校名称', '网址', '国家', '城市', '学校类型', '隶属教育集团', '涵盖学段',
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

// 状态跟踪
let csvLastModified = 0;
let dbLastModified = new Date(0);
let isSyncing = false;
let syncTimeout = null;

// 解析CSV行
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

// 转义CSV字段值
function escapeCSVValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    
    const str = String(value);
    
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    
    return str;
}

// 从CSV导入到数据库
async function syncCSVToDB() {
    if (isSyncing) return;
    isSyncing = true;
    
    try {
        if (!fs.existsSync(CSV_PATH)) {
            console.log('CSV文件不存在，跳过导入');
            isSyncing = false;
            return;
        }
        
        const stats = fs.statSync(CSV_PATH);
        if (stats.mtimeMs <= csvLastModified) {
            isSyncing = false;
            return; // 文件未修改
        }
        
        console.log(`[${new Date().toLocaleTimeString()}] 检测到CSV文件变化，开始同步到数据库...`);
        
        const content = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            console.log('CSV文件格式错误');
            isSyncing = false;
            return;
        }
        
        const headers = parseCSVLine(lines[0]);
        const schoolsData = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length === 0 || !values[1]) continue;
            
            const schoolData = {};
            
            headers.forEach((header, index) => {
                const dbField = fieldMapping[header];
                if (dbField && values[index] !== undefined) {
                    let value = values[index].trim();
                    
                    if (dbField === 'sequenceNumber') {
                        schoolData[dbField] = value ? parseInt(value) : null;
                    } else if (dbField.startsWith('AI评估_') && (dbField.endsWith('_得分') || dbField === 'AI评估_总分')) {
                        schoolData[dbField] = value ? parseFloat(value) : null;
                    } else {
                        schoolData[dbField] = value || '';
                    }
                }
            });
            
            if (schoolData.name) {
                schoolsData.push(schoolData);
            }
        }
        
        let updatedCount = 0;
        let createdCount = 0;
        
        for (const schoolData of schoolsData) {
            const existingSchool = await School.findOne({ name: schoolData.name });
            
            if (existingSchool) {
                Object.assign(existingSchool, schoolData);
                existingSchool.updatedAt = new Date();
                await existingSchool.save();
                updatedCount++;
            } else {
                if (!schoolData.sequenceNumber) {
                    const maxSchool = await School.findOne({}).sort({ sequenceNumber: -1 });
                    schoolData.sequenceNumber = maxSchool && maxSchool.sequenceNumber ? maxSchool.sequenceNumber + 1 : 1;
                }
                const school = new School(schoolData);
                await school.save();
                createdCount++;
            }
        }
        
        csvLastModified = stats.mtimeMs;
        console.log(`✓ CSV → 数据库同步完成: 更新 ${updatedCount} 所，创建 ${createdCount} 所`);
        
    } catch (error) {
        console.error('CSV → 数据库同步错误:', error.message);
    } finally {
        isSyncing = false;
    }
}

// 从数据库导出到CSV
async function syncDBToCSV() {
    if (isSyncing) return;
    isSyncing = true;
    
    try {
        // 获取数据库中最新的更新时间
        const latestSchool = await School.findOne({}).sort({ updatedAt: -1 });
        
        if (!latestSchool || !latestSchool.updatedAt) {
            isSyncing = false;
            return;
        }
        
        if (latestSchool.updatedAt <= dbLastModified) {
            isSyncing = false;
            return; // 数据库未修改
        }
        
        console.log(`[${new Date().toLocaleTimeString()}] 检测到数据库变化，开始同步到CSV...`);
        
        const schools = await School.find({}).sort({ sequenceNumber: 1, createdAt: 1 });
        
        let csvContent = '';
        csvContent += csvColumns.join(',') + '\n';
        
        schools.forEach((school, index) => {
            const row = [];
            const newSequenceNumber = index + 1;
            
            csvColumns.forEach(column => {
                const dbField = Object.keys(fieldMapping).find(key => fieldMapping[key] === column);
                
                if (dbField) {
                    let value = school[fieldMapping[dbField]];
                    
                    if (column === '序号') {
                        value = newSequenceNumber;
                    }
                    
                    if (value === null || value === undefined) {
                        value = '';
                    }
                    
                    row.push(escapeCSVValue(value));
                } else {
                    row.push('');
                }
            });
            
            csvContent += row.join(',') + '\n';
        });
        
        // 确保目录存在
        const outputDir = path.dirname(CSV_PATH);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 写入文件（临时文件，然后重命名，避免文件监听触发）
        const tempPath = CSV_PATH + '.tmp';
        fs.writeFileSync(tempPath, csvContent, 'utf-8');
        
        // 重命名文件
        fs.renameSync(tempPath, CSV_PATH);
        
        // 更新最后修改时间（使用当前时间，避免触发CSV到数据库的同步）
        const stats = fs.statSync(CSV_PATH);
        csvLastModified = stats.mtimeMs;
        
        dbLastModified = latestSchool.updatedAt;
        console.log(`✓ 数据库 → CSV同步完成: ${schools.length} 所学校`);
        
    } catch (error) {
        console.error('数据库 → CSV同步错误:', error.message);
    } finally {
        isSyncing = false;
    }
}

// 初始化最后修改时间
function initLastModified() {
    if (fs.existsSync(CSV_PATH)) {
        const stats = fs.statSync(CSV_PATH);
        csvLastModified = stats.mtimeMs;
    }
    
    School.findOne({}).sort({ updatedAt: -1 }).then(school => {
        if (school && school.updatedAt) {
            dbLastModified = school.updatedAt;
        }
    });
}

// 启动同步
function startSync() {
    console.log('========================================');
    console.log('学校数据双向同步服务已启动');
    console.log('========================================');
    console.log(`CSV文件路径: ${CSV_PATH}`);
    console.log(`同步间隔: ${SYNC_INTERVAL / 1000} 秒`);
    console.log('按 Ctrl+C 停止同步服务');
    console.log('========================================\n');
    
    // 初始化
    initLastModified();
    
    // 使用文件监听（如果可用）
    let fileWatcher = null;
    if (fs.watch) {
        try {
            // 确保目录存在
            const csvDir = path.dirname(CSV_PATH);
            if (!fs.existsSync(csvDir)) {
                fs.mkdirSync(csvDir, { recursive: true });
            }
            
            // 如果文件不存在，先创建空文件
            if (!fs.existsSync(CSV_PATH)) {
                fs.writeFileSync(CSV_PATH, '', 'utf-8');
            }
            
            fileWatcher = fs.watch(CSV_PATH, { persistent: true }, (eventType) => {
                if (eventType === 'change') {
                    // 检查文件是否真的被外部修改（不是我们自己的写入）
                    const stats = fs.statSync(CSV_PATH);
                    if (stats.mtimeMs > csvLastModified + 100) { // 100ms容差
                        // 防抖处理
                        if (syncTimeout) {
                            clearTimeout(syncTimeout);
                        }
                        syncTimeout = setTimeout(() => {
                            syncCSVToDB();
                        }, DEBOUNCE_DELAY);
                    }
                }
            });
            console.log('✓ CSV文件监听已启动\n');
        } catch (error) {
            console.log('⚠ 文件监听启动失败，将使用轮询模式\n');
        }
    }
    
    // 定时同步（双向检查）
    setInterval(async () => {
        await syncCSVToDB();
        await syncDBToCSV();
    }, SYNC_INTERVAL);
    
    // 启动时立即同步一次
    setTimeout(async () => {
        await syncCSVToDB();
        await syncDBToCSV();
    }, 1000);
}

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n\n正在停止同步服务...');
    mongoose.connection.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n正在停止同步服务...');
    mongoose.connection.close();
    process.exit(0);
});

