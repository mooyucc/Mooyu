// 清空数据库并迁移到新的评估标准字段结构
require('dotenv').config();
const mongoose = require('mongoose');

// 连接MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('成功连接到MongoDB数据库');
    clearAndMigrate();
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

// 学校数据模型（使用新的评估标准字段）
const SchoolSchema = new mongoose.Schema({
    sequenceNumber: { type: Number },
    name: { type: String, required: true },
    website: { type: String },
    country: { type: String },
    city: { type: String },
    schoolType: { type: String },
    coveredStages: { type: String },
    affiliatedGroup: { type: String },
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
    
    // 新的AI评估字段（根据新的评估标准）
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

// 旧的AI评估字段列表（需要删除）
const oldAIFields = [
    'AI评估_课程声誉与体系成熟度_得分',
    'AI评估_课程声誉与体系成熟度_说明',
    'AI评估_教学成果与影响力_得分',
    'AI评估_教学成果与影响力_说明',
    'AI评估_大学认可度_得分',
    'AI评估_大学认可度_说明',
    'AI评估_师生比_得分',
    'AI评估_师生比_说明',
    'AI评估_教师教育背景与稳定性_得分',
    'AI评估_教师教育背景与稳定性_说明',
    'AI评估_国际教员比例_得分',
    'AI评估_国际教员比例_说明',
    'AI评估_国际学生比例_得分',
    'AI评估_国际学生比例_说明',
    'AI评估_国际研究网络_得分',
    'AI评估_国际研究网络_说明'
];

async function clearAndMigrate() {
    try {
        console.log('========================================');
        console.log('开始清空数据库并迁移到新的评估标准...');
        console.log('========================================\n');

        // 1. 统计现有数据
        const totalSchools = await School.countDocuments({});
        console.log(`当前数据库中有 ${totalSchools} 所学校\n`);

        if (totalSchools === 0) {
            console.log('数据库已经是空的，无需清空。');
        } else {
            // 2. 删除所有学校数据
            console.log('⚠️  正在删除所有学校数据...');
            const deleteResult = await School.deleteMany({});
            console.log(`✓ 已删除 ${deleteResult.deletedCount} 所学校的数据\n`);
        }

        // 3. 验证新的字段结构
        console.log('验证新的字段结构...');
        const sampleSchool = new School({
            name: '测试学校',
            'AI评估_课程与融合_得分': 0,
            'AI评估_学术评估_得分': 0
        });
        
        // 验证字段是否有效（不会实际保存）
        const validationError = sampleSchool.validateSync();
        if (validationError) {
            console.error('✗ 字段验证失败:', validationError);
        } else {
            console.log('✓ 新的字段结构验证通过\n');
        }

        // 4. 显示新的评估标准字段列表
        console.log('新的AI评估字段列表：');
        console.log('========================================');
        const newAIFields = [
            'AI评估_总分',
            'AI评估_课程与融合_得分 / AI评估_课程与融合_说明',
            'AI评估_学术评估_得分 / AI评估_学术评估_说明',
            'AI评估_升学成果_得分 / AI评估_升学成果_说明',
            'AI评估_规划体系_得分 / AI评估_规划体系_说明',
            'AI评估_师资稳定_得分 / AI评估_师资稳定_说明',
            'AI评估_课堂文化_得分 / AI评估_课堂文化_说明',
            'AI评估_活动系统_得分 / AI评估_活动系统_说明',
            'AI评估_幸福感/生活_得分 / AI评估_幸福感/生活_说明',
            'AI评估_品牌与社区影响力_得分 / AI评估_品牌与社区影响力_说明',
            'AI评估_最终总结_JSON'
        ];
        newAIFields.forEach((field, index) => {
            console.log(`${index + 1}. ${field}`);
        });
        console.log('========================================\n');

        console.log('✓ 数据库清理和迁移完成！');
        console.log('\n注意：');
        console.log('1. 如果数据已清空，可以开始导入新的学校数据');
        console.log('2. 旧的AI评估字段已被清理');
        console.log('3. 新的评估标准字段已准备就绪');
        console.log('4. 下次AI评估将使用新的字段结构\n');

    } catch (error) {
        console.error('✗ 清理和迁移过程中出错:', error);
    } finally {
        mongoose.connection.close();
        console.log('数据库连接已关闭');
        process.exit(0);
    }
}

