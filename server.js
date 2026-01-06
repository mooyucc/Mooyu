require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const path = require('path');
const evaluationSystem = require('./evaluation-system');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // 提供静态文件

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu')
  .then(() => {
    console.log('成功连接到MongoDB数据库');
    createDefaultAdmin();
  })
  .catch((err) => {
    console.error('MongoDB连接错误:', err);
  });

// 用户模型
const User = mongoose.model('User', {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

// 学校数据模型（根据新CSV结构）
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
    'AI评估_总分': { type: Number }, // AI评估总分
    'AI评估_课程声誉与体系成熟度_得分': { type: Number }, // 课程声誉与体系成熟度得分
    'AI评估_课程声誉与体系成熟度_说明': { type: String }, // 课程声誉与体系成熟度说明
    'AI评估_教学成果与影响力_得分': { type: Number }, // 教学成果与影响力得分
    'AI评估_教学成果与影响力_说明': { type: String }, // 教学成果与影响力说明
    'AI评估_大学认可度_得分': { type: Number }, // 大学认可度得分
    'AI评估_大学认可度_说明': { type: String }, // 大学认可度说明
    'AI评估_升学成果_得分': { type: Number }, // 升学成果得分
    'AI评估_升学成果_说明': { type: String }, // 升学成果说明
    'AI评估_师生比_得分': { type: Number }, // 师生比得分
    'AI评估_师生比_说明': { type: String }, // 师生比说明
    'AI评估_教师教育背景与稳定性_得分': { type: Number }, // 教师教育背景与稳定性得分
    'AI评估_教师教育背景与稳定性_说明': { type: String }, // 教师教育背景与稳定性说明
    'AI评估_国际教员比例_得分': { type: Number }, // 国际教员比例得分
    'AI评估_国际教员比例_说明': { type: String }, // 国际教员比例说明
    'AI评估_国际学生比例_得分': { type: Number }, // 国际学生比例得分
    'AI评估_国际学生比例_说明': { type: String }, // 国际学生比例说明
    'AI评估_国际研究网络_得分': { type: Number }, // 国际研究网络得分
    'AI评估_国际研究网络_说明': { type: String }, // 国际研究网络说明
    'AI评估_品牌与社区影响力_得分': { type: Number }, // 品牌与社区影响力得分
    'AI评估_品牌与社区影响力_说明': { type: String }, // 品牌与社区影响力说明
    'AI评估_最终总结_JSON': { type: String }, // 最终总结（JSON格式）
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { strict: false }); // 使用strict: false以支持动态字段（如CSV导入时可能包含的额外字段）

const School = mongoose.model('School', SchoolSchema);

// 创建默认管理员账户
async function createDefaultAdmin() {
    try {
        const adminExists = await User.findOne({ email: 'admin@mooyu.cc' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new User({
                email: 'admin@mooyu.cc',
                password: hashedPassword,
                name: '管理员',
                role: 'admin'
            });
            await admin.save();
            console.log('默认管理员账户已创建');
        }
    } catch (error) {
        console.error('创建默认管理员账户失败:', error);
    }
}

// 中间件：验证管理员权限
const isAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: '未提供认证令牌' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: '无权限访问' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: '无效的认证令牌' });
    }
};

// 管理员API：获取所有用户
app.get('/api/admin/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 });
        res.json(users);
    } catch (error) {
        console.error('获取用户列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员API：删除用户
app.delete('/api/admin/users/:id', isAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        res.json({ message: '用户已删除' });
    } catch (error) {
        console.error('删除用户错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 注册路由
app.post('/api/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name } = req.body;
        
        // 检查用户是否已存在
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: '该邮箱已被注册' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建新用户
        const user = new User({
            email,
            password: hashedPassword,
            name
        });

        await user.save();

        // 生成JWT
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
            message: '注册成功',
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 登录路由
app.post('/api/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // 查找用户
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: '邮箱或密码错误' });
        }

        // 验证密码
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: '邮箱或密码错误' });
        }

        // 生成JWT
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            message: '登录成功',
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// ==================== School Insight API ====================

// 获取所有学校列表（支持搜索）
app.get('/api/schools', async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const query = {};
        
        if (search) {
            // 仅对学校名称进行模糊搜索
            query.name = { $regex: search, $options: 'i' };
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        let schools = await School.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        let total = await School.countDocuments(query);
        
        // 如果找到学校，检查字段完整性，缺失的字段通过AI补充
        if (search && schools.length > 0) {
            for (let i = 0; i < schools.length; i++) {
                const school = schools[i];
                const missingFields = checkBasicInfoCompleteness(school);
                
                if (missingFields.length > 0) {
                    try {
                        console.log(`学校 "${school.name}" 缺少字段: ${missingFields.join(', ')}，尝试通过AI补充...`);
                        const aiSchoolData = await querySchoolBasicInfoFromAI(school.name);
                        
                        if (aiSchoolData && aiSchoolData.name) {
                            // 只更新缺失的字段
                            const updateData = {};
                            missingFields.forEach(field => {
                                if (field === 'affiliatedGroup') {
                                    // 对于隶属教育集团字段，如果 AI 返回空值或未找到，设置为"无"
                                    const value = aiSchoolData[field];
                                    updateData[field] = (value && value !== '' && value !== '未知') ? value : '无';
                                } else if (aiSchoolData[field] && aiSchoolData[field] !== '' && aiSchoolData[field] !== '未知') {
                                    // 如果是网址字段，需要验证和清理
                                    if (field === 'website') {
                                        const validatedWebsite = validateAndCleanWebsite(aiSchoolData[field]);
                                        if (validatedWebsite) {
                                            updateData[field] = validatedWebsite;
                                        }
                                    } else {
                                        updateData[field] = aiSchoolData[field];
                                    }
                                }
                            });
                            
                            if (Object.keys(updateData).length > 0) {
                                updateData.updatedAt = new Date();
                                await School.updateOne({ _id: school._id }, { $set: updateData });
                                console.log(`学校 "${school.name}" 已补充字段: ${Object.keys(updateData).join(', ')}`);
                                
                                // 更新内存中的学校对象
                                Object.assign(school, updateData);
                            }
                        }
                    } catch (aiError) {
                        console.error(`AI补充学校 "${school.name}" 信息失败:`, aiError);
                        // AI查询失败不影响正常返回结果
                    }
                }
            }
        }
        
        // 如果搜索没有结果，且搜索词是学校名称（不是其他关键字），且不是范围太大的关键字，返回可能的学校名称列表
        let possibleSchoolNames = [];
        if (search && schools.length === 0) {
            // 判断搜索词是否是学校名称关键字
            const isSchoolName = isSchoolNameKeyword(search);
            // 判断是否是范围太大的关键字
            const isTooBroad = isTooBroadKeyword(search);
            
            // 只有在是学校名称且不是范围太大的关键字时，才调用AI
            if (isSchoolName && !isTooBroad) {
                try {
                    console.log(`数据库中未找到学校 "${search}"，尝试通过AI搜索可能的学校名称...`);
                    possibleSchoolNames = await searchPossibleSchoolNames(search);
                } catch (aiError) {
                    console.error('AI搜索学校名称失败:', aiError);
                    // AI搜索失败不影响正常返回空结果
                }
            } else {
                if (isTooBroad) {
                    console.log(`搜索词 "${search}" 范围太大，仅搜索数据库，不调用AI`);
                } else if (!isSchoolName) {
                    console.log(`搜索词 "${search}" 不是学校名称关键字，仅搜索数据库，不调用AI`);
                }
            }
        }
        
        res.json({
            schools,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit)),
            possibleSchoolNames: possibleSchoolNames // 返回可能的学校名称列表
        });
    } catch (error) {
        console.error('获取学校列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 根据教育集团获取学校列表
app.get('/api/schools/by-group/:groupName', async (req, res) => {
    try {
        const { groupName } = req.params;
        const decodedGroupName = decodeURIComponent(groupName);
        
        // 如果教育集团是"无"，返回空数组
        if (!decodedGroupName || decodedGroupName === '无' || decodedGroupName === '') {
            return res.json({
                schools: [],
                total: 0,
                groupName: decodedGroupName
            });
        }
        
        // 查询同属该教育集团的所有学校
        const query = { affiliatedGroup: decodedGroupName };
        const schools = await School.find(query)
            .sort({ sequenceNumber: 1, createdAt: 1 });
        
        const total = schools.length;
        
        res.json({
            schools,
            total,
            groupName: decodedGroupName
        });
    } catch (error) {
        console.error('根据教育集团获取学校列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 根据ID获取单个学校详情
app.get('/api/schools/:id', async (req, res) => {
    try {
        const school = await School.findById(req.params.id);
        if (!school) {
            return res.status(404).json({ message: '学校不存在' });
        }
        res.json(school);
    } catch (error) {
        console.error('获取学校详情错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取下一个序号（自动递增）
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

// 根据用户选择的学校名称创建学校记录
app.post('/api/schools/create-from-name', async (req, res) => {
    try {
        const { schoolName } = req.body;
        
        if (!schoolName || !schoolName.trim()) {
            return res.status(400).json({ message: '学校名称不能为空' });
        }
        
        // 检查学校是否已存在
        const existingSchool = await School.findOne({ name: schoolName.trim() });
        if (existingSchool) {
            return res.json({ 
                message: '学校已存在',
                school: existingSchool 
            });
        }
        
        // 通过AI查询学校基础信息
        console.log(`正在通过AI查询学校 "${schoolName}" 的基础信息...`);
        const aiSchoolData = await querySchoolBasicInfoFromAI(schoolName.trim());
        
        if (!aiSchoolData || !aiSchoolData.name) {
            return res.status(404).json({ message: '无法查询到该学校的信息' });
        }
        
        // 再次检查（AI返回的名称可能与用户选择的不同）
        const existingSchoolByAIName = await School.findOne({ name: aiSchoolData.name });
        if (existingSchoolByAIName) {
            return res.json({ 
                message: '学校已存在',
                school: existingSchoolByAIName 
            });
        }
        
        // 如果没有序号，自动分配下一个序号
        if (!aiSchoolData.sequenceNumber || aiSchoolData.sequenceNumber === null || aiSchoolData.sequenceNumber === undefined) {
            aiSchoolData.sequenceNumber = await getNextSequenceNumber();
        }
        
        // 创建新学校
        const newSchool = new School(aiSchoolData);
        await newSchool.save();
        
        console.log(`学校 "${aiSchoolData.name}" 已创建，序号: ${aiSchoolData.sequenceNumber}`);
        
        res.json({
            message: '学校创建成功',
            school: newSchool
        });
    } catch (error) {
        console.error('创建学校错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 对比多个学校（通过ID数组）
app.post('/api/schools/compare', async (req, res) => {
    try {
        const { schoolIds } = req.body;
        
        if (!Array.isArray(schoolIds) || schoolIds.length < 2) {
            return res.status(400).json({ message: '至少需要选择2所学校进行对比' });
        }
        
        if (schoolIds.length > 5) {
            return res.status(400).json({ message: '最多只能对比5所学校' });
        }
        
        const schools = await School.find({ _id: { $in: schoolIds } });
        
        if (schools.length !== schoolIds.length) {
            return res.status(404).json({ message: '部分学校不存在' });
        }
        
        res.json({ schools });
    } catch (error) {
        console.error('对比学校错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 判断搜索词是否是学校名称（而不是其他关键字如课程、性质等）
function isSchoolNameKeyword(searchTerm) {
    // 学校名称通常包含这些关键词
    const schoolNameKeywords = /学校|学院|中学|小学|幼儿园|实验|国际|双语|民办|公办|私立|公立|教育|实验学校|外国语|附属/i;
    
    // 如果包含学校名称关键词，且不是纯课程或性质关键词，则认为是学校名称
    if (schoolNameKeywords.test(searchTerm)) {
        // 排除纯课程关键词
        const courseOnlyPattern = /^(IB|A-Level|AP|IGCSE|加拿大课程|澳大利亚课程)$/i;
        if (courseOnlyPattern.test(searchTerm.trim())) {
            return false;
        }
        return true;
    }
    
    // 如果长度在合理范围内（3-50字符），且不包含明显的非学校名称关键词，也可能是学校名称
    if (searchTerm.length >= 3 && searchTerm.length <= 50) {
        // 排除明显的非学校名称关键词
        const nonSchoolKeywords = /^(K-12|课程|性质|学段|幼儿园|小学|初中|高中|IB|A-Level|AP|IGCSE)$/i;
        if (nonSchoolKeywords.test(searchTerm.trim())) {
            return false;
        }
        // 如果包含中文字符，可能是学校名称
        if (/[\u4e00-\u9fa5]/.test(searchTerm)) {
            return true;
        }
    }
    
    return false;
}

// 判断搜索词是否是范围太大的关键字（如城市名、省份名等）
function isTooBroadKeyword(searchTerm) {
    // 常见的范围太大的关键字
    const broadKeywords = [
        '上海', '北京', '广州', '深圳', '杭州', '南京', '成都', '武汉', '西安', '重庆',
        '天津', '苏州', '无锡', '宁波', '青岛', '大连', '厦门', '福州', '济南', '郑州',
        '长沙', '合肥', '石家庄', '哈尔滨', '长春', '沈阳', '昆明', '贵阳', '南宁', '海口',
        '乌鲁木齐', '拉萨', '银川', '西宁', '呼和浩特',
        '广东', '江苏', '浙江', '山东', '河南', '四川', '湖北', '湖南', '安徽', '河北',
        '福建', '江西', '陕西', '山西', '辽宁', '黑龙江', '吉林', '云南', '贵州', '广西',
        '海南', '新疆', '西藏', '宁夏', '青海', '内蒙古', '北京', '上海', '天津', '重庆',
        '中国', '全国'
    ];
    
    const trimmedSearch = searchTerm.trim();
    
    // 完全匹配
    if (broadKeywords.includes(trimmedSearch)) {
        return true;
    }
    
    // 如果搜索词只是城市名或省份名（没有其他内容），也认为是范围太大
    const cityProvincePattern = /^(上海|北京|广州|深圳|杭州|南京|成都|武汉|西安|重庆|天津|苏州|无锡|宁波|青岛|大连|厦门|福州|济南|郑州|长沙|合肥|石家庄|哈尔滨|长春|沈阳|昆明|贵阳|南宁|海口|乌鲁木齐|拉萨|银川|西宁|呼和浩特|广东|江苏|浙江|山东|河南|四川|湖北|湖南|安徽|河北|福建|江西|陕西|山西|辽宁|黑龙江|吉林|云南|贵州|广西|海南|新疆|西藏|宁夏|青海|内蒙古|中国|全国)$/;
    if (cityProvincePattern.test(trimmedSearch)) {
        return true;
    }
    
    return false;
}

// 检查学校类型是否一致，如果不一致返回警告信息
function checkNatureConsistency(schools) {
    if (!schools || schools.length < 2) {
        return null;
    }
    
    // 获取所有学校的类型
    const schoolTypes = schools
        .map(s => s.schoolType || s.nature) // 兼容旧字段
        .filter(n => n && n !== '未知' && n !== '无');
    
    if (schoolTypes.length < 2) {
        return null;
    }
    
    // 检查是否所有类型都相同
    const uniqueTypes = [...new Set(schoolTypes)];
    
    if (uniqueTypes.length > 1) {
        // 类型不一致，生成警告信息
        const typeGroups = {};
        schools.forEach(school => {
            const schoolType = school.schoolType || school.nature || '未知'; // 兼容旧字段
            if (!typeGroups[schoolType]) {
                typeGroups[schoolType] = [];
            }
            typeGroups[schoolType].push(school.name);
        });
        
        const typeList = Object.keys(typeGroups)
            .map(type => `${type}（${typeGroups[type].join('、')}）`)
            .join('；');
        
        return {
            type: 'nature_inconsistency',
            message: `注意：对比的学校类型不同（${typeList}），评分结果可能存在偏差。不同类型的学校在课程设置、升学目标、费用等方面存在差异，建议优先对比同类型的学校以获得更准确的评估结果。`
        };
    }
    
    return null;
}

// 检查学校基础信息字段的完整性
function checkBasicInfoCompleteness(school) {
    // 必须字段：空、undefined、null、"未知"、"无"都认为是缺失，需要补充
    const requiredFields = [
        'schoolType',   // 学校类型，必须字段
        'coveredStages', // 涵盖学段，必须字段
        'country',      // 国家，必须字段
        'city'          // 城市，必须字段
    ];
    
    // 网址字段：即使值为"无"也尝试补充（大多数学校应该有网站）
    const websiteField = 'website';
    
    // 隶属教育集团字段：如果为空、undefined、null，需要补充（如果学校没有隶属教育集团，应该设置为"无"）
    const affiliatedGroupField = 'affiliatedGroup';
    
    // 可选字段：值为"无"是有效数据，不需要补充
    // 这些字段如果值为"无"，表示学校确实没有该课程，这是有效信息
    const optionalFields = [
        'kindergarten',
        'primary',
        'juniorHigh',
        'seniorHigh',
        'ibPYP',
        'ibMYP',
        'ibDP',
        'ibCP',
        'aLevel',
        'ap',
        'canadian',
        'australian',
        'igcse',
        'otherCourses'
    ];
    
    const missingFields = [];
    
    // 检查必须字段：空、undefined、null、"未知"、"无"都认为是缺失
    requiredFields.forEach(field => {
        const value = school[field];
        if (!value || value === '' || value === '未知' || value === '无') {
            missingFields.push(field);
        }
    });
    
    // 检查网址字段：空、undefined、null、"未知"、"无"都尝试补充
    const websiteValue = school[websiteField];
    if (!websiteValue || websiteValue === '' || websiteValue === '未知' || websiteValue === '无') {
        missingFields.push(websiteField);
    }
    
    // 检查隶属教育集团字段：空、undefined、null 都需要补充（如果学校没有隶属教育集团，应该设置为"无"）
    const affiliatedGroupValue = school[affiliatedGroupField];
    if (!affiliatedGroupValue || affiliatedGroupValue === '' || affiliatedGroupValue === undefined || affiliatedGroupValue === null) {
        missingFields.push(affiliatedGroupField);
    }
    
    // 检查可选字段：只有空、undefined、null、"未知"才认为是缺失，"无"是有效值
    optionalFields.forEach(field => {
        const value = school[field];
        // "无"是有效值，表示学校确实没有该课程，不需要补充
        // 只有空、undefined、null、"未知"才认为是缺失
        if (value === null || value === undefined || value === '' || value === '未知') {
            missingFields.push(field);
        }
        // 如果value是"无"，不进入if，不添加到missingFields
    });
    
    return missingFields;
}

// 检查学校是否有完整的AI评估数据
function hasCompleteAIScoring(school, verbose = false) {
    // 检查是否有总分
    if (!school['AI评估_总分'] || school['AI评估_总分'] === null || school['AI评估_总分'] === undefined) {
        if (verbose) console.log(`  [${school.name}] 缺少: AI评估_总分`);
        return false;
    }
    
    // 检查所有10个二级指标是否都有得分和说明
    const indicators = [
        '课程声誉与体系成熟度',
        '教学成果与影响力',
        '大学认可度',
        '升学成果',
        '师生比',
        '教师教育背景与稳定性',
        '国际教员比例',
        '国际学生比例',
        '国际研究网络',
        '品牌与社区影响力'
    ];
    
    for (const indicator of indicators) {
        const scoreField = `AI评估_${indicator}_得分`;
        const explanationField = `AI评估_${indicator}_说明`;
        
        if (!school[scoreField] || school[scoreField] === null || school[scoreField] === undefined) {
            if (verbose) console.log(`  [${school.name}] 缺少: ${scoreField}`);
            return false;
        }
        if (!school[explanationField] || school[explanationField] === null || school[explanationField] === '') {
            if (verbose) console.log(`  [${school.name}] 缺少: ${explanationField}`);
            return false;
        }
    }
    
    // 检查是否有最终总结
    if (!school['AI评估_最终总结_JSON'] || school['AI评估_最终总结_JSON'] === null || school['AI评估_最终总结_JSON'] === '') {
        if (verbose) console.log(`  [${school.name}] 缺少: AI评估_最终总结_JSON`);
        return false;
    }
    
    return true;
}

// 安全地保存JSON字符串到数据库（确保格式正确）
function safeSaveJSONString(data) {
    if (!data) {
        return null;
    }
    
    // 如果已经是字符串，先验证它是否是有效的JSON
    if (typeof data === 'string') {
        try {
            // 尝试解析，如果成功则重新序列化以确保格式正确
            const parsed = JSON.parse(data);
            return JSON.stringify(parsed);
        } catch (e) {
            // 如果解析失败，尝试修复
            const fixed = tryFixInvalidJSON(data);
            if (fixed && typeof fixed === 'object') {
                return JSON.stringify(fixed);
            }
            // 如果无法修复，抛出错误
            throw new Error(`无效的JSON字符串，无法修复: ${e.message}`);
        }
    }
    
    // 如果是对象，直接序列化
    if (typeof data === 'object') {
        try {
            const jsonString = JSON.stringify(data);
            // 验证序列化后的字符串可以正确解析
            JSON.parse(jsonString);
            return jsonString;
        } catch (e) {
            throw new Error(`无法序列化对象为JSON: ${e.message}`);
        }
    }
    
    throw new Error(`不支持的数据类型: ${typeof data}`);
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
            // 匹配: propertyName: 或 propertyName:value
            let fixed = jsonString.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
            
            // 第二步：尝试解析修复后的JSON
            try {
                return JSON.parse(fixed);
            } catch (e2) {
                // 第三步：如果还是失败，尝试修复字符串值没有引号的问题
                // 匹配模式: "key":value（value不是数字、布尔值、null、对象、数组或已有引号的字符串）
                // 使用非贪婪匹配，直到遇到逗号或右大括号
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
                        // 使用Function构造器代替eval，稍微安全一些
                        const result = new Function('return ' + fixed)();
                        if (result && typeof result === 'object') {
                            return result;
                        }
                    } catch (e4) {
                        // 所有修复方法都失败
                        console.error('JSON修复失败:', e4.message);
                        console.error('修复后的字符串:', fixed.substring(0, 200));
                        return null;
                    }
                }
            }
        } catch (fixError) {
            console.error('JSON修复过程出错:', fixError.message);
            return null;
        }
    }
}

// 检查学校是否有评估数据但缺少最终总结
function hasScoringButMissingSummary(school) {
    // 检查是否有总分
    const hasTotalScore = school['AI评估_总分'] && 
                         school['AI评估_总分'] !== null && 
                         school['AI评估_总分'] !== undefined;
    
    if (!hasTotalScore) {
        return false;
    }
    
    // 检查是否有至少一个指标的得分和说明
    const indicators = [
        '课程声誉与体系成熟度',
        '教学成果与影响力',
        '大学认可度',
        '升学成果',
        '师生比',
        '教师教育背景与稳定性',
        '国际教员比例',
        '国际学生比例',
        '国际研究网络',
        '品牌与社区影响力'
    ];
    
    let hasAnyIndicator = false;
    for (const indicator of indicators) {
        const scoreField = `AI评估_${indicator}_得分`;
        const explanationField = `AI评估_${indicator}_说明`;
        
        if (school[scoreField] && school[explanationField]) {
            hasAnyIndicator = true;
            break;
        }
    }
    
    // 如果有总分和至少一个指标，但缺少最终总结，则需要补充
    const missingSummary = !school['AI评估_最终总结_JSON'] || 
                          school['AI评估_最终总结_JSON'] === null || 
                          school['AI评估_最终总结_JSON'] === '';
    
    return hasTotalScore && hasAnyIndicator && missingSummary;
}

// 从数据库数据转换为AI返回格式
function convertDBToAIFormat(schools, evaluationSystem) {
    // 定义所有二级指标（按评估体系顺序）
    const indicators = [];
    evaluationSystem.dimensions.forEach(dimension => {
        dimension.indicators.forEach(indicator => {
            indicators.push({
                dimension: dimension.name,
                indicator: indicator.name,
                weight: indicator.weight
            });
        });
    });
    
    const comparisonTable = [];
    const totalScores = {};
    const summary = {};
    
    // 为每个指标构建comparisonTable行
    indicators.forEach(ind => {
        const row = {
            dimension: ind.dimension,
            indicator: ind.indicator,
            weight: ind.weight,
            scores: {},
            explanations: {}
        };
        
        // 从每个学校读取对应的得分和说明
        schools.forEach(school => {
            const fieldBase = ind.indicator;
            const scoreField = `AI评估_${fieldBase}_得分`;
            const explanationField = `AI评估_${fieldBase}_说明`;
            
            if (school[scoreField] !== null && school[scoreField] !== undefined) {
                row.scores[school.name] = parseFloat(school[scoreField]);
            }
            
            if (school[explanationField]) {
                row.explanations[school.name] = school[explanationField];
            }
        });
        
        comparisonTable.push(row);
    });
    
    // 读取总分
    schools.forEach(school => {
        if (school['AI评估_总分'] !== null && school['AI评估_总分'] !== undefined) {
            totalScores[school.name] = parseFloat(school['AI评估_总分']);
        }
    });
    
    // 读取最终总结
    const schoolsNeedingSummaryFix = [];
    schools.forEach(school => {
        if (school['AI评估_最终总结_JSON']) {
            try {
                // 先尝试标准JSON解析
                const parsedSummary = JSON.parse(school['AI评估_最终总结_JSON']);
                summary[school.name] = parsedSummary;
                console.log(`✓ 成功读取学校 "${school.name}" 的最终总结`);
            } catch (e) {
                // 如果标准解析失败，尝试修复格式错误的JSON
                console.warn(`⚠ 解析学校 "${school.name}" 的最终总结JSON失败，尝试修复...`);
                console.warn(`  原始数据: ${school['AI评估_最终总结_JSON']?.substring(0, 150)}...`);
                
                const fixedSummary = tryFixInvalidJSON(school['AI评估_最终总结_JSON']);
                if (fixedSummary && typeof fixedSummary === 'object') {
                    summary[school.name] = fixedSummary;
                    console.log(`✓ 成功修复并读取学校 "${school.name}" 的最终总结`);
                    
                    // 将修复后的JSON保存回数据库
                    try {
                        const correctedJSON = safeSaveJSONString(fixedSummary);
                        School.updateOne(
                            { _id: school._id }, 
                            { $set: { 'AI评估_最终总结_JSON': correctedJSON, updatedAt: new Date() } }
                        ).catch(err => {
                            console.error(`  保存修复后的JSON失败:`, err);
                        });
                    } catch (saveErr) {
                        console.error(`  保存修复后的JSON失败:`, saveErr);
                    }
                } else {
                    console.error(`✗ 无法修复学校 "${school.name}" 的最终总结JSON，需要重新生成`);
                    schoolsNeedingSummaryFix.push(school);
                }
            }
        } else {
            console.warn(`⚠ 学校 "${school.name}" 缺少 AI评估_最终总结_JSON 字段`);
            schoolsNeedingSummaryFix.push(school);
        }
    });
    
    // 确保 summary 中的 totalScore 与 totalScores 保持一致
    schools.forEach(school => {
        const schoolName = school.name;
        const totalScoreFromField = totalScores[schoolName];
        const summaryData = summary[schoolName];
        
        if (totalScoreFromField !== undefined && summaryData && summaryData.totalScore !== undefined) {
            // 如果两个值不一致，使用 totalScores 的值（更可靠）
            if (Math.abs(parseFloat(summaryData.totalScore) - parseFloat(totalScoreFromField)) > 0.01) {
                console.warn(`⚠ 学校 "${schoolName}" 的 summary.totalScore (${summaryData.totalScore}) 与 AI评估_总分 (${totalScoreFromField}) 不一致，使用 AI评估_总分 的值`);
                summaryData.totalScore = totalScoreFromField;
                
                // 将修复后的JSON保存回数据库
                try {
                    const correctedJSON = safeSaveJSONString(summaryData);
                    School.updateOne(
                        { _id: school._id }, 
                        { $set: { 'AI评估_最终总结_JSON': correctedJSON, updatedAt: new Date() } }
                    ).catch(err => {
                        console.error(`  保存修复后的JSON失败:`, err);
                    });
                } catch (saveErr) {
                    console.error(`  保存修复后的JSON失败:`, saveErr);
                }
            }
        } else if (totalScoreFromField !== undefined && summaryData && summaryData.totalScore === undefined) {
            // 如果 summary 中没有 totalScore，从 totalScores 补充
            console.warn(`⚠ 学校 "${schoolName}" 的 summary 中缺少 totalScore，从 AI评估_总分 补充`);
            summaryData.totalScore = totalScoreFromField;
            
            // 将修复后的JSON保存回数据库
            try {
                const correctedJSON = safeSaveJSONString(summaryData);
                School.updateOne(
                    { _id: school._id }, 
                    { $set: { 'AI评估_最终总结_JSON': correctedJSON, updatedAt: new Date() } }
                ).catch(err => {
                    console.error(`  保存修复后的JSON失败:`, err);
                });
            } catch (saveErr) {
                console.error(`  保存修复后的JSON失败:`, saveErr);
            }
        }
    });
    
    // 检查是否有学校缺少最终总结（包括解析失败的）
    const schoolsWithSummary = Object.keys(summary);
    const schoolsWithoutSummary = schools.filter(s => !schoolsWithSummary.includes(s.name));
    
    if (schoolsWithoutSummary.length > 0) {
        console.warn(`⚠ 以下学校缺少最终总结数据: ${schoolsWithoutSummary.map(s => s.name).join(', ')}`);
    }
    
    // 返回需要修复的学校列表（供调用者使用）
    return {
        comparisonTable,
        totalScores,
        summary,
        schoolsNeedingSummaryFix: schoolsNeedingSummaryFix.length > 0 ? schoolsNeedingSummaryFix : undefined
    };
}

// 将AI返回的数据保存到数据库
async function saveAIScoringToDB(schools, aiResult) {
    const indicatorToFieldMap = {
        '课程声誉与体系成熟度': '课程声誉与体系成熟度',
        '教学成果与影响力': '教学成果与影响力',
        '大学认可度': '大学认可度',
        '升学成果': '升学成果',
        '师生比': '师生比',
        '教师教育背景与稳定性': '教师教育背景与稳定性',
        '国际教员比例': '国际教员比例',
        '国际学生比例': '国际学生比例',
        '国际研究网络': '国际研究网络',
        '品牌与社区影响力': '品牌与社区影响力'
    };
    
    const updatePromises = schools.map(async (school) => {
        const schoolName = school.name;
        const updateData = {};
        
        // 保存总分
        if (aiResult.totalScores && aiResult.totalScores[schoolName] !== undefined) {
            updateData['AI评估_总分'] = parseFloat(aiResult.totalScores[schoolName]);
        }
        
        // 保存各二级指标的得分和说明
        if (aiResult.comparisonTable) {
            aiResult.comparisonTable.forEach(row => {
                const indicator = row.indicator;
                const fieldBase = indicatorToFieldMap[indicator];
                
                if (fieldBase && row.scores && row.scores[schoolName] !== undefined) {
                    updateData[`AI评估_${fieldBase}_得分`] = parseFloat(row.scores[schoolName]);
                }
                
                if (fieldBase && row.explanations && row.explanations[schoolName]) {
                    updateData[`AI评估_${fieldBase}_说明`] = row.explanations[schoolName];
                }
            });
        }
        
        // 保存最终总结
        if (aiResult.summary) {
            // 尝试精确匹配学校名称
            let summaryData = null;
            let matchingKey = null;
            
            if (aiResult.summary[schoolName]) {
                summaryData = aiResult.summary[schoolName];
                matchingKey = schoolName;
            } else {
                // 如果精确匹配失败，尝试查找相似的学校名称
                matchingKey = Object.keys(aiResult.summary).find(key => 
                    key === schoolName || 
                    key.includes(schoolName) || 
                    schoolName.includes(key)
                );
                if (matchingKey) {
                    summaryData = aiResult.summary[matchingKey];
                    console.warn(`⚠ 学校名称不完全匹配: 数据库="${schoolName}", AI返回="${matchingKey}"，使用 "${matchingKey}" 的数据`);
                } else {
                    console.error(`✗ 无法找到学校 "${schoolName}" 在AI返回的summary中的对应数据`);
                    console.error(`  AI返回的学校名称列表: ${Object.keys(aiResult.summary).join(', ')}`);
                }
            }
            
            if (summaryData) {
                try {
                    // 确保 summary 中的 totalScore 与 totalScores 保持一致
                    if (aiResult.totalScores && aiResult.totalScores[schoolName] !== undefined) {
                        const totalScoreFromTotalScores = parseFloat(aiResult.totalScores[schoolName]);
                        // 如果 summary 中的 totalScore 与 totalScores 不一致，使用 totalScores 的值
                        if (summaryData.totalScore !== totalScoreFromTotalScores) {
                            console.warn(`⚠ 学校 "${schoolName}" 的 summary.totalScore (${summaryData.totalScore}) 与 totalScores (${totalScoreFromTotalScores}) 不一致，使用 totalScores 的值`);
                            summaryData.totalScore = totalScoreFromTotalScores;
                        }
                    }
                    
                    updateData['AI评估_最终总结_JSON'] = safeSaveJSONString(summaryData);
                    console.log(`✓ 保存学校 "${schoolName}" 的最终总结`);
                } catch (error) {
                    console.error(`✗ 保存学校 "${schoolName}" 的最终总结失败: ${error.message}`);
                }
            }
        } else {
            console.warn(`⚠ AI返回结果中没有summary字段`);
        }
        
        // 更新数据库
        if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = new Date();
            await School.updateOne({ _id: school._id }, { $set: updateData });
        } else {
            console.warn(`⚠ 学校 "${schoolName}" 没有需要更新的数据`);
        }
    });
    
    await Promise.all(updatePromises);
}

// AI评分对比（流式版本，使用SSE）
app.post('/api/schools/compare-scoring-stream', async (req, res) => {
    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用nginx缓冲
    
    const sendProgress = (type, message, data = null) => {
        const event = {
            type,
            message,
            timestamp: new Date().toISOString(),
            ...(data && { data })
        };
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    
    try {
        const { schoolIds } = req.body;
        
        if (!Array.isArray(schoolIds) || schoolIds.length < 2) {
            sendProgress('error', '至少需要选择2所学校进行对比');
            res.end();
            return;
        }
        
        if (schoolIds.length > 3) {
            sendProgress('error', '最多只能对比3所学校进行AI评估');
            res.end();
            return;
        }
        
        sendProgress('start', '开始评估流程...');
        
        const schools = await School.find({ _id: { $in: schoolIds } });
        
        if (schools.length !== schoolIds.length) {
            sendProgress('error', '部分学校不存在');
            res.end();
            return;
        }
        
        sendProgress('step', '正在检查学校基础信息完整性...', { schools: schools.map(s => s.name) });
        
        // 在AI评估之前，先检查并补充缺失的基础字段
        for (let i = 0; i < schools.length; i++) {
            const school = schools[i];
            const missingFields = checkBasicInfoCompleteness(school);
            
            if (missingFields.length > 0) {
                sendProgress('step', `正在搜索并补充学校 "${school.name}" 的基础信息...`, { 
                    school: school.name, 
                    missingFields 
                });
                
                try {
                    const aiSchoolData = await querySchoolBasicInfoFromAI(school.name);
                    
                    if (aiSchoolData && aiSchoolData.name) {
                        const updateData = {};
                        missingFields.forEach(field => {
                            if (aiSchoolData[field] && aiSchoolData[field] !== '' && aiSchoolData[field] !== '未知') {
                                if (field === 'website') {
                                    const validatedWebsite = validateAndCleanWebsite(aiSchoolData[field]);
                                    if (validatedWebsite) {
                                        updateData[field] = validatedWebsite;
                                    }
                                } else {
                                    updateData[field] = aiSchoolData[field];
                                }
                            }
                        });
                        
                        if (Object.keys(updateData).length > 0) {
                            updateData.updatedAt = new Date();
                            await School.updateOne({ _id: school._id }, { $set: updateData });
                            Object.assign(school, updateData);
                            sendProgress('step', `✓ 已补充学校 "${school.name}" 的基础信息`, { 
                                school: school.name,
                                updatedFields: Object.keys(updateData)
                            });
                        }
                    }
                } catch (aiError) {
                    console.error(`AI补充学校 "${school.name}" 基础信息失败:`, aiError);
                }
            }
        }
        
        sendProgress('step', '正在检查AI评估数据...');
        
        // 检查所有学校是否都有完整的AI评估数据
        const scoringStatus = schools.map(school => {
            const hasComplete = hasCompleteAIScoring(school, false);
            return {
                name: school.name,
                hasCompleteScoring: hasComplete
            };
        });
        
        const allHaveScoring = scoringStatus.every(status => status.hasCompleteScoring);
        const missingSchools = scoringStatus.filter(s => !s.hasCompleteScoring).map(s => s.name);
        
        if (allHaveScoring) {
            sendProgress('step', '所有学校已有完整评估数据，正在从数据库读取...');
            const scoringResult = convertDBToAIFormat(schools, evaluationSystem);
            const natureWarning = checkNatureConsistency(schools);
            
            // 每次对比都重新生成 conclusion（不保存到数据库）
            sendProgress('step', '正在生成对比结论...', {
                message: '根据当前学校组合生成对比结论和建议'
            });
            try {
                const conclusion = await generateComparisonConclusion(schools, scoringResult);
                if (conclusion) {
                    scoringResult.summary = scoringResult.summary || {};
                    scoringResult.summary.conclusion = conclusion;
                }
            } catch (conclusionError) {
                console.error('生成对比结论失败:', conclusionError);
                // 即使生成失败，也继续返回其他数据
            }
            
            sendProgress('complete', '评估完成', {
                schools: schools.map(s => s.toObject()),
                scoring: scoringResult,
                warning: natureWarning || undefined
            });
            res.end();
        } else {
            sendProgress('step', `正在搜索并分析学校数据...`, { 
                missingSchools,
                message: `以下学校需要AI评估: ${missingSchools.join(', ')}`
            });
            
            sendProgress('thinking', 'AI正在思考和分析学校信息...', {
                schools: schools.map(s => s.name)
            });
            
            // 重新从数据库获取最新的学校数据
            const updatedSchools = await School.find({ _id: { $in: schoolIds } });
            const prompt = buildScoringPrompt(updatedSchools, evaluationSystem);
            
            // 发送每个指标的评估事件
            sendProgress('evaluating', 'AI正在评估学校各项指标...', {
                schools: updatedSchools.map(s => s.name),
                message: '正在根据评估体系进行量化评分'
            });
            
            // 逐条发送每个指标的评估事件
            const allIndicators = [];
            evaluationSystem.dimensions.forEach(dimension => {
                dimension.indicators.forEach(indicator => {
                    allIndicators.push({
                        dimension: dimension.name,
                        indicator: indicator.name
                    });
                });
            });
            
            // 发送每个指标的评估事件（模拟逐条评估）
            for (let i = 0; i < allIndicators.length; i++) {
                const { dimension, indicator } = allIndicators[i];
                // 添加小延迟，让用户能看到逐条显示的效果（延迟时间根据指标数量动态调整）
                const delay = Math.min(200, Math.max(100, 2000 / allIndicators.length));
                await new Promise(resolve => setTimeout(resolve, delay));
                sendProgress('evaluating', `AI正在评估 ${dimension}部分的${indicator}...`, {
                    dimension: dimension,
                    indicator: indicator,
                    schools: updatedSchools.map(s => s.name),
                    progress: `${i + 1}/${allIndicators.length}`
                });
            }
            
            const scoringResult = await callDeepseekAPI(prompt);
            
            sendProgress('step', '正在保存评估结果到数据库...');
            
            // 将AI评估结果保存到数据库（conclusion不会被保存，因为它不在saveAIScoringToDB中处理）
            try {
                await saveAIScoringToDB(updatedSchools, scoringResult);
                sendProgress('step', '✓ 评估结果已保存');
            } catch (saveError) {
                console.error('保存AI评估结果到数据库失败:', saveError);
            }
            
            // 确保 conclusion 被包含在返回结果中（每次对比都重新生成）
            // 如果 AI 已经返回了 conclusion，使用它；否则生成一个新的
            if (!scoringResult.summary || !scoringResult.summary.conclusion) {
                sendProgress('step', '正在生成对比结论...', {
                    message: '根据当前学校组合生成对比结论和建议'
                });
                try {
                    const conclusion = await generateComparisonConclusion(updatedSchools, scoringResult);
                    if (conclusion) {
                        scoringResult.summary = scoringResult.summary || {};
                        scoringResult.summary.conclusion = conclusion;
                    }
                } catch (conclusionError) {
                    console.error('生成对比结论失败:', conclusionError);
                    // 即使生成失败，也继续返回其他数据
                }
            }
            
            const natureWarning = checkNatureConsistency(updatedSchools);
            
            sendProgress('complete', '评估完成', {
                schools: updatedSchools.map(s => s.toObject()),
                scoring: scoringResult,
                warning: natureWarning || undefined
            });
            res.end();
        }
    } catch (error) {
        console.error('AI评分对比错误:', error);
        sendProgress('error', `评估失败: ${error.message}`);
        res.end();
    }
});

// AI评分对比（调用Deepseek API）
app.post('/api/schools/compare-scoring', async (req, res) => {
    try {
        const { schoolIds } = req.body;
        
        if (!Array.isArray(schoolIds) || schoolIds.length < 2) {
            return res.status(400).json({ message: '至少需要选择2所学校进行对比' });
        }
        
        if (schoolIds.length > 3) {
            return res.status(400).json({ message: '最多只能对比3所学校进行AI评估' });
        }
        
        const schools = await School.find({ _id: { $in: schoolIds } });
        
        if (schools.length !== schoolIds.length) {
            return res.status(404).json({ message: '部分学校不存在' });
        }
        
        // 在AI评估之前，先检查并补充缺失的基础字段
        console.log('检查学校基础信息完整性...');
        for (let i = 0; i < schools.length; i++) {
            const school = schools[i];
            const missingFields = checkBasicInfoCompleteness(school);
            
            if (missingFields.length > 0) {
                try {
                    console.log(`学校 "${school.name}" 缺少基础字段: ${missingFields.join(', ')}，尝试通过AI补充...`);
                    const aiSchoolData = await querySchoolBasicInfoFromAI(school.name);
                    
                    if (aiSchoolData && aiSchoolData.name) {
                        // 只更新缺失的字段
                        const updateData = {};
                        missingFields.forEach(field => {
                            if (aiSchoolData[field] && aiSchoolData[field] !== '' && aiSchoolData[field] !== '未知') {
                                // 如果是网址字段，需要验证和清理
                                if (field === 'website') {
                                    const validatedWebsite = validateAndCleanWebsite(aiSchoolData[field]);
                                    if (validatedWebsite) {
                                        updateData[field] = validatedWebsite;
                                    }
                                } else {
                                    updateData[field] = aiSchoolData[field];
                                }
                            }
                        });
                        
                        if (Object.keys(updateData).length > 0) {
                            updateData.updatedAt = new Date();
                            await School.updateOne({ _id: school._id }, { $set: updateData });
                            console.log(`学校 "${school.name}" 已补充基础字段: ${Object.keys(updateData).join(', ')}`);
                            
                            // 更新内存中的学校对象，确保后续使用最新数据
                            Object.assign(school, updateData);
                        } else {
                            console.log(`学校 "${school.name}" AI查询结果中未找到可用的补充数据`);
                        }
                    } else {
                        console.warn(`学校 "${school.name}" AI查询失败或返回数据无效`);
                    }
                } catch (aiError) {
                    console.error(`AI补充学校 "${school.name}" 基础信息失败:`, aiError);
                    // AI查询失败不影响后续的AI评估流程
                }
            } else {
                console.log(`学校 "${school.name}" 基础信息完整`);
            }
        }
        
        // 检查所有学校是否都有完整的AI评估数据
        const scoringStatus = schools.map(school => {
            const hasComplete = hasCompleteAIScoring(school, false);
            if (!hasComplete) {
                // 如果缺少数据，详细检查缺少什么
                hasCompleteAIScoring(school, true);
            }
            return {
                name: school.name,
                hasCompleteScoring: hasComplete
            };
        });
        
        console.log('AI评估数据检查结果:');
        scoringStatus.forEach(status => {
            console.log(`  - ${status.name}: ${status.hasCompleteScoring ? '✓ 有完整数据' : '✗ 缺少数据'}`);
        });
        
        const allHaveScoring = scoringStatus.every(status => status.hasCompleteScoring);
        
        if (allHaveScoring) {
            // 如果所有学校都有完整的评估数据，直接从数据库读取
            console.log('从数据库读取AI评估数据');
            const scoringResult = convertDBToAIFormat(schools, evaluationSystem);
            
            // 检查是否有学校需要修复最终总结（JSON解析失败的情况）
            const schoolsNeedingSummary = scoringResult.schoolsNeedingSummaryFix || [];
            
            // 验证最终总结数据，检查是否有学校缺少最终总结
            console.log('最终总结数据验证:');
            schools.forEach(school => {
                const hasSummary = scoringResult.summary && scoringResult.summary[school.name];
                console.log(`  - ${school.name}: ${hasSummary ? '✓ 有最终总结' : '✗ 缺少最终总结'}`);
                if (hasSummary) {
                    console.log(`    总分: ${scoringResult.summary[school.name].totalScore || 'N/A'}`);
                } else {
                    // 检查是否有评估数据但缺少最终总结
                    if (hasScoringButMissingSummary(school)) {
                        if (!schoolsNeedingSummary.find(s => s._id.toString() === school._id.toString())) {
                            schoolsNeedingSummary.push(school);
                        }
                        console.log(`    ⚠ 该学校有评估数据但缺少最终总结，需要补充`);
                    }
                }
            });
            
            // 如果有学校缺少最终总结，通过AI补充
            if (schoolsNeedingSummary.length > 0) {
                console.log(`\n发现 ${schoolsNeedingSummary.length} 所学校有评估数据但缺少最终总结，开始补充...`);
                
                // 重新从数据库获取最新的学校数据
                const updatedSchools = await School.find({ _id: { $in: schoolIds } });
                
                    // 只为缺少最终总结的学校生成总结
                    // 需要调用完整的AI评估来生成最终总结（因为总结需要基于所有评估数据）
                    const schoolsForSummary = updatedSchools.filter(s => 
                        schoolsNeedingSummary.some(need => need._id.toString() === s._id.toString())
                    );
                    
                    // 如果有其他学校，也需要包含在对比中（用于生成conclusion）
                    const allSchoolsForSummary = updatedSchools;
                    
                    try {
                        console.log(`调用AI API生成最终总结（学校: ${schoolsForSummary.map(s => s.name).join(', ')}）`);
                        const prompt = buildScoringPrompt(allSchoolsForSummary, evaluationSystem);
                        const aiResult = await callDeepseekAPI(prompt);
                        
                        // 只更新缺少最终总结的学校的最终总结字段
                        for (const school of schoolsForSummary) {
                            const schoolName = school.name;
                            if (aiResult.summary && aiResult.summary[schoolName]) {
                                try {
                                    const summaryJSON = safeSaveJSONString(aiResult.summary[schoolName]);
                                    const updateData = {
                                        'AI评估_最终总结_JSON': summaryJSON,
                                        updatedAt: new Date()
                                    };
                                    await School.updateOne({ _id: school._id }, { $set: updateData });
                                    console.log(`✓ 已为学校 "${schoolName}" 补充最终总结`);
                                    
                                    // 更新内存中的学校对象
                                    school['AI评估_最终总结_JSON'] = summaryJSON;
                                    
                                    // 更新scoringResult中的summary
                                    scoringResult.summary[schoolName] = aiResult.summary[schoolName];
                                } catch (error) {
                                    console.error(`✗ 保存学校 "${schoolName}" 的最终总结失败: ${error.message}`);
                                }
                            } else {
                                console.warn(`⚠ 无法为学校 "${schoolName}" 生成最终总结`);
                            }
                        }
                    
                    // 如果有conclusion，也添加到scoringResult中（但不保存到数据库）
                    if (aiResult.summary && aiResult.summary.conclusion) {
                        scoringResult.summary.conclusion = aiResult.summary.conclusion;
                    }
                } catch (summaryError) {
                    console.error('补充最终总结失败:', summaryError);
                    // 即使补充失败，也返回已有的数据
                }
            }
            
            // 每次对比都重新生成 conclusion（不保存到数据库）
            // 即使所有学校都有完整数据，也要生成针对当前学校组合的结论
            if (!scoringResult.summary || !scoringResult.summary.conclusion) {
                try {
                    console.log('正在生成对比结论...');
                    const conclusion = await generateComparisonConclusion(schools, scoringResult);
                    if (conclusion) {
                        scoringResult.summary = scoringResult.summary || {};
                        scoringResult.summary.conclusion = conclusion;
                    }
                } catch (conclusionError) {
                    console.error('生成对比结论失败:', conclusionError);
                    // 即使生成失败，也继续返回其他数据
                }
            }
            
            // 检查学校性质是否一致
            const natureWarning = checkNatureConsistency(schools);
            
            res.json({
                schools: schools.map(s => s.toObject()),
                scoring: scoringResult,
                warning: natureWarning || undefined
            });
        } else {
            // 如果有学校缺少评估数据，调用AI API
            // 注意：此时schools对象已经包含了补充后的基础信息
            const missingSchools = scoringStatus.filter(s => !s.hasCompleteScoring).map(s => s.name);
            console.log(`调用AI API进行评估（以下学校缺少完整数据: ${missingSchools.join(', ')}）`);
            
            // 重新从数据库获取最新的学校数据（包含刚刚补充的基础信息）
            const updatedSchools = await School.find({ _id: { $in: schoolIds } });
            const prompt = buildScoringPrompt(updatedSchools, evaluationSystem);
            const scoringResult = await callDeepseekAPI(prompt);
            
            // 验证AI返回的最终总结数据
            console.log('AI返回的最终总结数据验证:');
            if (scoringResult.summary) {
                schools.forEach(school => {
                    const hasSummary = scoringResult.summary[school.name];
                    console.log(`  - ${school.name}: ${hasSummary ? '✓ 有最终总结' : '✗ 缺少最终总结'}`);
                    if (hasSummary) {
                        console.log(`    总分: ${scoringResult.summary[school.name].totalScore || 'N/A'}`);
                    }
                });
                console.log(`  AI返回的学校名称列表: ${Object.keys(scoringResult.summary).join(', ')}`);
            } else {
                console.warn('  ⚠ AI返回结果中没有summary字段');
            }
            
            // 将AI评估结果保存到数据库（使用更新后的学校数据）
            try {
                await saveAIScoringToDB(updatedSchools, scoringResult);
                console.log('AI评估结果已保存到数据库');
                
                // 验证最终总结是否都已保存
                console.log('验证最终总结保存情况:');
                const finalSchools = await School.find({ _id: { $in: schoolIds } });
                const reSavePromises = [];
                
                for (const school of finalSchools) {
                    const hasSummary = school['AI评估_最终总结_JSON'] && 
                                     school['AI评估_最终总结_JSON'] !== null && 
                                     school['AI评估_最终总结_JSON'] !== '';
                    console.log(`  - ${school.name}: ${hasSummary ? '✓ 已保存最终总结' : '✗ 缺少最终总结'}`);
                    
                    // 如果保存后仍然缺少最终总结，尝试再次补充
                    if (!hasSummary && scoringResult.summary && scoringResult.summary[school.name]) {
                        console.log(`    ⚠ 检测到保存失败，尝试重新保存最终总结...`);
                        try {
                            const summaryJSON = safeSaveJSONString(scoringResult.summary[school.name]);
                            const updateData = {
                                'AI评估_最终总结_JSON': summaryJSON,
                                updatedAt: new Date()
                            };
                            reSavePromises.push(
                                School.updateOne({ _id: school._id }, { $set: updateData })
                                    .then(() => {
                                        console.log(`    ✓ 已重新保存学校 "${school.name}" 的最终总结`);
                                    })
                                    .catch(err => {
                                        console.error(`    ✗ 重新保存学校 "${school.name}" 的最终总结失败:`, err);
                                    })
                            );
                        } catch (error) {
                            console.error(`    ✗ 无法序列化学校 "${school.name}" 的最终总结: ${error.message}`);
                        }
                    }
                }
                
                // 等待所有重新保存操作完成
                if (reSavePromises.length > 0) {
                    await Promise.all(reSavePromises);
                }
            } catch (saveError) {
                console.error('保存AI评估结果到数据库失败:', saveError);
                // 即使保存失败，也返回结果给前端
            }
            
            // 检查学校性质是否一致
            const natureWarning = checkNatureConsistency(updatedSchools);
            
            res.json({
                schools: updatedSchools.map(s => s.toObject()),
                scoring: scoringResult,
                warning: natureWarning || undefined
            });
        }
    } catch (error) {
        console.error('AI评分对比错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 构建评分提示词
function buildScoringPrompt(schools, evaluationSystem) {
    let prompt = `你是一位专业的学校评估专家。请根据以下评估体系，对以下学校进行量化评分对比（满分100分）。

评估体系（包含三级维度，用于内部评分计算，但最终返回结果只需包含一级维度和二级指标）：
`;
    
    evaluationSystem.dimensions.forEach((dimension, dimIndex) => {
        prompt += `${dimIndex + 1}. ${dimension.name}（一级维度总权重${dimension.weight}%）\n`;
        dimension.indicators.forEach((indicator, indIndex) => {
            prompt += `   ${dimIndex + 1}.${indIndex + 1} ${indicator.name}（二级指标权重${indicator.weight}%，必须使用此精确数值）\n`;
            prompt += `      说明：${indicator.description}\n`;
            
            // 添加三级维度及其评分标准
            if (indicator.thirdLevelDimensions && indicator.thirdLevelDimensions.length > 0) {
                indicator.thirdLevelDimensions.forEach((thirdLevel, thirdIndex) => {
                    prompt += `      ${dimIndex + 1}.${indIndex + 1}.${thirdIndex + 1} ${thirdLevel.name}（三级维度权重${thirdLevel.weight}分）\n`;
                    prompt += `          5分制评分标准：\n`;
                    Object.keys(thirdLevel.scoringCriteria).sort((a, b) => parseInt(b) - parseInt(a)).forEach(score => {
                        prompt += `            ${score}分：${thirdLevel.scoringCriteria[score]}\n`;
                    });
                });
                prompt += `      注意：请根据上述三级维度的5分制评分标准，对每个三级维度进行评分（1-5分），然后按照公式计算二级指标得分：\n`;
                prompt += `      二级指标得分 = Σ(三级维度得分 ÷ 5 × 三级维度权重)\n`;
                prompt += `      例如：如果某个三级维度得分为4分，权重为10分，则贡献值为 4÷5×10 = 8分\n`;
            }
        });
    });
    
    prompt += `\n待评估学校信息：\n\n`;
    
    schools.forEach((school, index) => {
        prompt += `学校${index + 1}：${school.name}\n`;
        prompt += `- 学校类型：${school.schoolType || school.nature || '未知'}\n`; // 兼容旧字段
        prompt += `- 涵盖学段：${school.coveredStages || '未知'}\n`;
        prompt += `- 学段设置：幼儿园${school.kindergarten || '未知'}，小学${school.primary || '未知'}，初中${school.juniorHigh || '未知'}，高中${school.seniorHigh || '未知'}\n`;
        prompt += `- IB课程：PYP ${school.ibPYP || '无'}，MYP ${school.ibMYP || '无'}，DP ${school.ibDP || '无'}，CP ${school.ibCP || '无'}\n`;
        prompt += `- 其他课程：A-Level ${school.aLevel || '无'}，AP ${school.ap || '无'}，IGCSE ${school.igcse || '无'}，加拿大课程 ${school.canadian || '无'}，澳大利亚课程 ${school.australian || '无'}，其他课程 ${school.otherCourses || '无'}\n`;
        prompt += `\n`;
    });
    
    prompt += `请严格按照以下要求返回结果：

**重要：权重数值必须严格按照上述评估体系中的权重值，不能修改或调整！每个二级指标的权重是固定的百分比。**

**评分方法：**
1. 对每个三级维度按照5分制评分标准进行评分（1-5分）
2. 根据三级维度得分计算二级指标得分：二级指标得分 = Σ(三级维度得分 ÷ 5 × 三级维度权重)
3. 二级指标得分不能超过其权重值
4. **重要：评分说明只需要概括性地描述学校在该二级指标上的整体表现，不要详细列出每个三级维度的得分情况。评分说明应该简洁明了，突出两所学校的对比特点。**

**返回格式要求：**
1. 量化对比表必须包含以下信息（只显示一级维度和二级指标，不显示三级维度）：
   - 评估维度（一级维度）
   - 指标名称（二级指标）
   - 权重（二级指标权重，必须与评估体系中的权重值完全一致，不可修改）
   - 每所学校的得分（二级指标得分，满分=权重数值，得分不能超过权重值）
   - 评分说明（**重要：评分说明应该是概括性的，简要对比说明两所学校在该指标上的整体表现和特点，不要详细列出第三级维度的具体得分情况。例如："学校A的课程体系非常全面，覆盖IB全阶段及A-Level、AP、IGCSE等，体系成熟度高，在家长和学界有较高口碑。学校B是IB世界学校，提供IB全阶段课程并辅以AP和IGCSE，体系权威且稳定，但课程广度略逊于学校A。"）**

2. 总分汇总：
   - 每所学校的总分（各项二级指标得分相加，满分100分）

3. 最终总结与选择建议，包括：
   - 每所学校的总分
   - 每所学校的优势（在高权重指标上的表现）
   - 每所学校的特点（整体定位）
   - 适合的家庭类型
   - 核心结论和建议

请使用JSON格式返回，结构如下（权重值必须与评估体系中的权重值完全一致）：
{
  "comparisonTable": [
    {
      "dimension": "科研",
      "indicator": "课程声誉与体系成熟度",
      "weight": 25,
      "scores": {
        "学校1名称": 得分数字（0-25之间）,
        "学校2名称": 得分数字（0-25之间）
      },
      "explanations": {
        "学校1名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）",
        "学校2名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）"
      }
    },
    {
      "dimension": "科研",
      "indicator": "教学成果与影响力",
      "weight": 20,
      "scores": {
        "学校1名称": 得分数字（0-20之间）,
        "学校2名称": 得分数字（0-20之间）
      },
      "explanations": {
        "学校1名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）",
        "学校2名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）"
      }
    },
    {
      "dimension": "升学",
      "indicator": "大学认可度",
      "weight": 15,
      "scores": {
        "学校1名称": 得分数字（0-15之间）,
        "学校2名称": 得分数字（0-15之间）
      },
      "explanations": {
        "学校1名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）",
        "学校2名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）"
      }
    },
    {
      "dimension": "升学",
      "indicator": "升学成果",
      "weight": 5,
      "scores": {
        "学校1名称": 得分数字（0-5之间）,
        "学校2名称": 得分数字（0-5之间）
      },
      "explanations": {
        "学校1名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）",
        "学校2名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）"
      }
    },
    {
      "dimension": "教学",
      "indicator": "师生比",
      "weight": 10,
      "scores": {
        "学校1名称": 得分数字（0-10之间）,
        "学校2名称": 得分数字（0-10之间）
      },
      "explanations": {
        "学校1名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）",
        "学校2名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）"
      }
    },
    {
      "dimension": "教学",
      "indicator": "教师教育背景与稳定性",
      "weight": 5,
      "scores": {
        "学校1名称": 得分数字（0-5之间）,
        "学校2名称": 得分数字（0-5之间）
      },
      "explanations": {
        "学校1名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）",
        "学校2名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）"
      }
    },
    {
      "dimension": "国际化",
      "indicator": "国际教员比例",
      "weight": 5,
      "scores": {
        "学校1名称": 得分数字（0-5之间）,
        "学校2名称": 得分数字（0-5之间）
      },
      "explanations": {
        "学校1名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）",
        "学校2名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）"
      }
    },
    {
      "dimension": "国际化",
      "indicator": "国际学生比例",
      "weight": 5,
      "scores": {
        "学校1名称": 得分数字（0-5之间）,
        "学校2名称": 得分数字（0-5之间）
      },
      "explanations": {
        "学校1名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）",
        "学校2名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）"
      }
    },
    {
      "dimension": "国际化",
      "indicator": "国际研究网络",
      "weight": 5,
      "scores": {
        "学校1名称": 得分数字（0-5之间）,
        "学校2名称": 得分数字（0-5之间）
      },
      "explanations": {
        "学校1名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）",
        "学校2名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）"
      }
    },
    {
      "dimension": "社会影响",
      "indicator": "品牌与社区影响力",
      "weight": 5,
      "scores": {
        "学校1名称": 得分数字（0-5之间）,
        "学校2名称": 得分数字（0-5之间）
      },
      "explanations": {
        "学校1名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）",
        "学校2名称": "概括性说明该学校在此指标上的整体表现和特点（不要详细列出第三级维度得分）"
      }
    }
  ],
  "totalScores": {
    "学校1名称": 总分数字,
    "学校2名称": 总分数字
  },
  "summary": {
    "学校1名称": {
      "totalScore": 总分数字,
      "strengths": "优势描述",
      "characteristics": "特点描述",
      "suitableFor": "适合的家庭类型"
    },
    "学校2名称": {
      "totalScore": 总分数字,
      "strengths": "优势描述",
      "characteristics": "特点描述",
      "suitableFor": "适合的家庭类型"
    },
    "conclusion": "核心结论和建议"
  }
}`;
    
    return prompt;
}

// 生成对比结论（conclusion）
// 这个函数每次对比时都会调用，生成针对当前学校组合的对比结论
async function generateComparisonConclusion(schools, scoringData) {
    try {
        // 构建简化的提示词，只要求生成结论
        let prompt = `你是一位专业的学校评估专家。请根据以下学校的评估数据，生成一个综合的对比结论和建议。

待对比的学校：
`;
        
        schools.forEach((school, index) => {
            const totalScore = scoringData.totalScores && scoringData.totalScores[school.name] 
                ? scoringData.totalScores[school.name] 
                : '未知';
            prompt += `${index + 1}. ${school.name}（总分：${totalScore}分）\n`;
            prompt += `   - 学校类型：${school.schoolType || school.nature || '未知'}\n`;
            prompt += `   - 涵盖学段：${school.coveredStages || '未知'}\n`;
            
            // 添加学校的优势、特点等信息（如果有）
            if (scoringData.summary && scoringData.summary[school.name]) {
                const summary = scoringData.summary[school.name];
                if (summary.strengths) {
                    prompt += `   - 优势：${summary.strengths}\n`;
                }
                if (summary.characteristics) {
                    prompt += `   - 特点：${summary.characteristics}\n`;
                }
            }
            prompt += `\n`;
        });
        
        prompt += `请根据以上信息，生成一个综合的对比结论和建议。结论应该：
1. 对比各学校的总分和核心优势
2. 分析各学校的特点和定位差异
3. 根据不同家庭的需求和优先级，提供选择建议
4. 语言简洁明了，重点突出

请使用JSON格式返回，结构如下：
{
  "conclusion": "核心结论和建议（详细描述各学校的对比情况，并根据不同需求提供选择建议）"
}`;
        
        const result = await callDeepseekAPI(prompt);
        
        if (result && result.conclusion) {
            return result.conclusion;
        } else {
            console.warn('AI返回的结论格式不正确');
            return null;
        }
    } catch (error) {
        console.error('生成对比结论失败:', error);
        return null;
    }
}

// 通过AI搜索可能的学校名称列表
async function searchPossibleSchoolNames(searchTerm) {
    const prompt = `你是一位专业的学校信息查询专家。用户输入了"${searchTerm}"，这可能是一个不完整的学校名称。

请根据这个搜索词，搜索并返回可能的完整学校名称列表。请尽可能多地列出相关的学校名称（最多10个），按相关性排序。

请使用JSON格式返回，结构如下：
{
  "schoolNames": [
    "完整的学校名称1",
    "完整的学校名称2",
    "完整的学校名称3",
    ...
  ]
}

注意：
- 只返回学校名称数组，不要返回其他信息
- 如果搜索词已经很完整，可能只返回1个结果
- 如果无法确定，请返回多个可能的选项
- 确保返回的JSON格式正确`;

    try {
        const result = await callDeepseekAPI(prompt);
        
        if (result && result.schoolNames && Array.isArray(result.schoolNames) && result.schoolNames.length > 0) {
            return result.schoolNames;
        }
        
        return [];
    } catch (error) {
        console.error('AI搜索学校名称失败:', error);
        throw error;
    }
}

// 统一学校性质到四类分类
function unifyNature(nature, schoolName, schoolData) {
  if (!nature || nature === '未知' || nature === '无') {
    return '未知';
  }
  
  // 如果已经是标准四类之一，直接返回（将"民办国际化学校"统一为"民办双语学校"）
  const standardCategories = ['公立学校', '普通民办学校', '民办双语学校', '公立学校（国际部）'];
  if (standardCategories.includes(nature)) {
    // 如果是旧的"民办国际化学校"，统一改为"民办双语学校"
    return nature === '民办国际化学校' ? '民办双语学校' : nature;
  }
  
  // 检查是否是公立学校（国际部）
  if (schoolName && (schoolName.includes('公立') || schoolName.includes('公办'))) {
    if (schoolName.includes('国际部') || schoolName.includes('国际班') || 
        schoolName.includes('国际课程中心') || schoolName.includes('国际课程部')) {
      return '公立学校（国际部）';
    }
  }
  
  // 检查是否是公立学校
  if (schoolName && (schoolName.includes('公立') || schoolName.includes('公办') || 
                     schoolName.includes('市立') || schoolName.includes('区立'))) {
    if (!schoolName.includes('国际部') && !schoolName.includes('国际班')) {
      return '公立学校';
    }
  }
  
  // 检查是否有国际课程
  // 注意：课程字段可能是"有"、"无"，也可能是具体课程名称（如"IB（国际文凭课程）PYP"）
  const hasInternationalCourse = schoolData && (
    (schoolData.ibPYP && schoolData.ibPYP !== '无' && schoolData.ibPYP !== '') ||
    (schoolData.ibMYP && schoolData.ibMYP !== '无' && schoolData.ibMYP !== '') ||
    (schoolData.ibDP && schoolData.ibDP !== '无' && schoolData.ibDP !== '') ||
    (schoolData.ibCP && schoolData.ibCP !== '无' && schoolData.ibCP !== '') ||
    (schoolData.aLevel && schoolData.aLevel !== '无' && schoolData.aLevel !== '') ||
    (schoolData.ap && schoolData.ap !== '无' && schoolData.ap !== '') ||
    (schoolData.igcse && schoolData.igcse !== '无' && schoolData.igcse !== '') ||
    (schoolData.canadian && schoolData.canadian !== '无' && schoolData.canadian !== '') ||
    (schoolData.australian && schoolData.australian !== '无' && schoolData.australian !== '')
  );
  
  // 检查是否是民办国际化学校
  const hasInternationalKeyword = (schoolName && (schoolName.includes('国际') || schoolName.includes('双语'))) ||
                                   nature.includes('国际') || nature.includes('双语');
  
  if (hasInternationalKeyword && hasInternationalCourse) {
    return '民办双语学校';
  }
  
  // 检查是否是普通民办学校
  if (schoolName && (schoolName.includes('民办') || schoolName.includes('私立')) ||
      nature.includes('民办') || nature.includes('私立')) {
    return '普通民办学校';
  }
  
  // 根据nature字段关键词判断
  if (nature.includes('公立') || nature.includes('公办')) {
    if (nature.includes('国际部') || nature.includes('国际班')) {
      return '公立学校（国际部）';
    }
    return '公立学校';
  }
  
  if (nature.includes('国际') || nature.includes('双语')) {
    return '民办双语学校';
  }
  
  if (nature.includes('民办') || nature.includes('私立')) {
    return '普通民办学校';
  }
  
  // 如果无法判断，返回原值
  return nature;
}

// 验证和清理网址
function validateAndCleanWebsite(website) {
    if (!website || website === '' || website === '无' || website === '未知') {
        return '';
    }
    
    // 移除前后空格
    let cleaned = website.trim();
    
    // 如果网址不包含协议，添加https://
    if (cleaned && !cleaned.match(/^https?:\/\//i)) {
        cleaned = 'https://' + cleaned;
    }
    
    // 验证网址格式
    try {
        const url = new URL(cleaned);
        // 确保是http或https协议
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return '';
        }
        return cleaned;
    } catch (e) {
        // 如果URL格式无效，返回空字符串
        console.warn(`无效的网址格式: ${website}`);
        return '';
    }
}

// 通过AI查询学校基础信息
async function querySchoolBasicInfoFromAI(schoolName) {
    const prompt = `你是一位专业的学校信息查询专家。请根据学校名称"${schoolName}"，查询并返回该学校的基础信息。

**重要：请务必查询准确的官方网址**

请查询以下信息：
1. 学校名称（完整准确的全称）
2. **学校网址（非常重要！请务必查询该学校的官方网站，确保网址准确无误。网址格式应为完整的URL，如：https://example.com 或 https://www.example.com。如果无法确定准确的官方网址，请留空）**
3. 国家（学校所在的国家，如：中国、美国、英国等）
4. 城市（学校所在的城市，如：上海、北京、纽约等）
5. 学校类型（**重要：必须从以下四类中选择一类，不能使用其他描述**）：
   - "公立学校"：政府主办，普惠，择校难
   - "普通民办学校"：机制灵活，追求成绩或特色
   - "民办双语学校"：为出国留学铺路，环境多元，提供国际课程（IB/AP/A-Level等）
   - "公立学校（国际部）"：公立学校下设的国际部，提供国际课程
   
   判断标准：
   - 如果学校名称包含"公立"、"公办"等，且包含"国际部"、"国际班"等，选择"公立学校（国际部）"
   - 如果学校名称包含"公立"、"公办"等，且不包含国际部相关关键词，选择"公立学校"
   - 如果学校是民办性质，且提供国际课程（IB/AP/A-Level等），选择"民办双语学校"
   - 如果学校是民办性质，但不提供国际课程或主要面向国内升学，选择"普通民办学校"
6. 涵盖学段（如：K-12、小学、初中、高中等）
7. 隶属教育集团（如果学校隶属于某个教育集团，请填写集团名称；如果学校没有隶属任何教育集团，请填写"无"）
8. 学段设置：
   - 幼儿园（有/无）
   - 小学（有/无）
   - 初中（有/无）
   - 高中（有/无）
6. IB课程：
   - IB PYP（有/无，如果有请填写"IB（国际文凭课程）PYP"，否则填"无"）
   - IB MYP（有/无，如果有请填写"IB（国际文凭课程）MYP"，否则填"无"）
   - IB DP（有/无，如果有请填写"IB（国际文凭课程）DP"，否则填"无"）
   - IB CP（有/无，如果有请填写"IB（国际文凭课程）CP"，否则填"无"）
7. 其他课程：
   - A-Level（有/无，如果有请填写"A-Level（英国高中课程）"，否则填"无"）
   - AP（有/无，如果有请填写"AP（美国大学先修课程）"，否则填"无"）
   - 加拿大课程（有/无）
   - 澳大利亚课程（有/无）
   - IGCSE（有/无）
   - 其他课程（如有，请详细列出）

请使用JSON格式返回，结构如下：
{
  "name": "学校完整名称",
  "website": "学校官方网址（完整的URL，如 https://example.com，如果不确定请留空）",
  "country": "国家（如：中国、美国、英国等）",
  "city": "城市（如：上海、北京、纽约等）",
  "nature": "学校类型（必须是以下四类之一：'公立学校'、'普通民办学校'、'民办双语学校'、'公立学校（国际部）'）",
  "coveredStages": "涵盖学段",
  "affiliatedGroup": "隶属教育集团（如果学校隶属于某个教育集团，请填写集团名称；如果学校没有隶属任何教育集团，请填写"无"）",
  "kindergarten": "幼儿园（有/无）",
  "primary": "小学（有/无）",
  "juniorHigh": "初中（有/无）",
  "seniorHigh": "高中（有/无）",
  "ibPYP": "IB（国际文凭课程）PYP 或 无",
  "ibMYP": "IB（国际文凭课程）MYP 或 无",
  "ibDP": "IB（国际文凭课程）DP 或 无",
  "ibCP": "IB（国际文凭课程）CP 或 无",
  "aLevel": "A-Level（英国高中课程） 或 无",
  "ap": "AP（美国大学先修课程） 或 无",
  "canadian": "加拿大课程（有/无）",
  "australian": "澳大利亚课程（有/无）",
  "igcse": "IGCSE（有/无）",
  "otherCourses": "其他课程（如有，请详细列出，否则填"无"）"
}

**特别注意网址字段：**
- 网址必须是该学校的官方网站
- 网址格式必须完整，包含协议（https://或http://）
- 如果不确定准确的官方网址，请留空，不要猜测
- 不要返回不相关或错误的网址

注意：
- 如果某个信息无法查询到，请填写"未知"或"无"
- 请确保返回的JSON格式正确
- 学校名称必须准确完整`;

    try {
        const result = await callDeepseekAPI(prompt);
        
        // 验证返回的数据结构
        if (result && result.name) {
            // 验证和清理网址
            const validatedWebsite = validateAndCleanWebsite(result.website);
            
            // 统一处理学校类型
            const unifiedSchoolType = unifyNature(result.nature, result.name, {
                ibPYP: result.ibPYP,
                ibMYP: result.ibMYP,
                ibDP: result.ibDP,
                ibCP: result.ibCP,
                aLevel: result.aLevel,
                ap: result.ap,
                igcse: result.igcse,
                canadian: result.canadian,
                australian: result.australian
            });
            
            // 确保所有字段都有值（至少是空字符串）
            // 处理隶属教育集团字段：如果为空或未找到，设置为"无"
            const affiliatedGroup = result.affiliatedGroup;
            const finalAffiliatedGroup = (affiliatedGroup && affiliatedGroup !== '' && affiliatedGroup !== '未知') 
                ? affiliatedGroup 
                : '无';
            
            return {
                name: result.name || '',
                website: validatedWebsite, // 使用验证后的网址
                country: result.country || '未知',
                city: result.city || '未知',
                schoolType: unifiedSchoolType,
                coveredStages: result.coveredStages || '未知',
                affiliatedGroup: finalAffiliatedGroup, // 隶属教育集团，如果没有则设置为"无"
                kindergarten: result.kindergarten || '无',
                primary: result.primary || '无',
                juniorHigh: result.juniorHigh || '无',
                seniorHigh: result.seniorHigh || '无',
                ibPYP: result.ibPYP || '无',
                ibMYP: result.ibMYP || '无',
                ibDP: result.ibDP || '无',
                ibCP: result.ibCP || '无',
                aLevel: result.aLevel || '无',
                ap: result.ap || '无',
                canadian: result.canadian || '无',
                australian: result.australian || '无',
                igcse: result.igcse || '无',
                otherCourses: result.otherCourses || '无'
            };
        }
        
        return null;
    } catch (error) {
        console.error('AI查询学校基础信息失败:', error);
        throw error;
    }
}

// 调用Deepseek API
async function callDeepseekAPI(prompt) {
    const DEEPSEEK_API_KEY = 'sk-d78c307ad1a84e488f19e87d59107c2e';
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
    
    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: '你是一位专业的学校评估专家，擅长根据评估体系对学校进行量化评分和对比分析。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 4000
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Deepseek API错误: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Deepseek API返回格式错误');
        }
        
        const content = data.choices[0].message.content;
        
        // 尝试从返回内容中提取JSON
        let jsonContent = content.trim();
        
        // 移除markdown代码块标记
        jsonContent = jsonContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
        
        // 提取JSON对象（匹配第一个{到最后一个}）
        const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonContent = jsonMatch[0];
        }
        
        // 替换中文引号为英文引号
        jsonContent = jsonContent
            .replace(/"/g, '"')  // 中文左双引号
            .replace(/"/g, '"')  // 中文右双引号
            .replace(/'/g, "'")  // 中文左单引号
            .replace(/'/g, "'"); // 中文右单引号
        
        try {
            return JSON.parse(jsonContent);
        } catch (parseError) {
            // 如果解析失败，尝试更激进的清理
            try {
                // 移除所有可能的非标准字符，但保留JSON结构
                let cleanedJson = jsonContent
                    .replace(/[\u2018\u2019]/g, "'")  // 其他单引号变体
                    .replace(/[\u201C\u201D]/g, '"'); // 其他双引号变体
                return JSON.parse(cleanedJson);
            } catch (secondParseError) {
                // 如果还是失败，返回原始内容
                console.error('JSON解析失败，返回原始内容:', parseError);
                console.error('清理后仍然失败:', secondParseError);
                console.error('JSON内容预览:', jsonContent.substring(0, 500));
                return {
                    rawContent: content,
                    error: '无法解析为JSON格式'
                };
            }
        }
    } catch (error) {
        console.error('调用Deepseek API失败:', error);
        throw error;
    }
}

// 管理员API：创建学校
app.post('/api/admin/schools', isAdmin, async (req, res) => {
    try {
        const schoolData = req.body;
        
        // 如果没有序号，自动分配下一个序号
        if (!schoolData.sequenceNumber || schoolData.sequenceNumber === null || schoolData.sequenceNumber === undefined) {
            schoolData.sequenceNumber = await getNextSequenceNumber();
        }
        
        const school = new School(schoolData);
        await school.save();
        res.status(201).json({ message: '学校创建成功', school });
    } catch (error) {
        console.error('创建学校错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员API：更新学校
app.put('/api/admin/schools/:id', isAdmin, async (req, res) => {
    try {
        const school = await School.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );
        
        if (!school) {
            return res.status(404).json({ message: '学校不存在' });
        }
        
        res.json({ message: '学校更新成功', school });
    } catch (error) {
        console.error('更新学校错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员API：删除学校
app.delete('/api/admin/schools/:id', isAdmin, async (req, res) => {
    try {
        const school = await School.findByIdAndDelete(req.params.id);
        if (!school) {
            return res.status(404).json({ message: '学校不存在' });
        }
        res.json({ message: '学校已删除' });
    } catch (error) {
        console.error('删除学校错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员API：批量导入SchoolData目录下的所有CSV文件
app.post('/api/admin/schools/import-all', isAdmin, async (req, res) => {
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        // 执行批量导入脚本
        const { stdout, stderr } = await execAsync('node import-schools-batch.js', {
            cwd: __dirname,
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });
        
        res.json({ 
            message: '批量导入完成',
            output: stdout,
            error: stderr || null
        });
    } catch (error) {
        console.error('批量导入错误:', error);
        res.status(500).json({ 
            message: '批量导入失败',
            error: error.message 
        });
    }
});


// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
    console.log('静态文件目录:', path.join(__dirname));
});
