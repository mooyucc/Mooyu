// 从服务器下载学校数据并更新到CSV文件
const fs = require('fs');
const path = require('path');

// API 基础 URL
const API_BASE_URL = process.env.API_BASE_URL || 'https://mooyu.cc/api';

// 数据库字段到CSV字段的映射
const fieldMapping = {
    'sequenceNumber': '序号',
    'name': '学校名称',
    'website': '网址',
    'country': '国家',
    'city': '城市',
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

// CSV列顺序（按照原始CSV格式）
const csvColumns = [
    '序号', '学校名称', '网址', '国家', '城市', '学校类型', '涵盖学段',
    '幼儿园', '小学', '初中', '高中',
    'IB（国际文凭课程）PYP', 'IB（国际文凭课程）MYP', 'IB（国际文凭课程）DP', 'IB（国际文凭课程）CP',
    'A-Level（英国高中课程）', 'AP（美国大学先修课程）', '加拿大课程', '澳大利亚课程', 'IGCSE', '其他课程',
    'AI评估_总分', 'AI评估_课程与融合_得分', 'AI评估_课程与融合_说明',
    'AI评估_学术评估_得分', 'AI评估_学术评估_说明',
    'AI评估_升学成果_得分', 'AI评估_升学成果_说明',
    'AI评估_规划体系_得分', 'AI评估_规划体系_说明',
    'AI评估_师资稳定_得分', 'AI评估_师资稳定_说明',
    'AI评估_课堂文化_得分', 'AI评估_课堂文化_说明',
    'AI评估_活动系统_得分', 'AI评估_活动系统_说明',
    'AI评估_幸福感/生活_得分', 'AI评估_幸福感/生活_说明',
    'AI评估_品牌与社区影响力_得分', 'AI评估_品牌与社区影响力_说明',
    'AI评估_最终总结_JSON'
];

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

// 从API获取所有学校数据（分页获取）
async function fetchAllSchools() {
    const allSchools = [];
    let page = 1;
    const limit = 100; // 每页获取100条，减少请求次数
    let totalPages = 1;
    
    console.log(`开始从服务器 ${API_BASE_URL} 获取学校数据...`);
    
    do {
        try {
            const url = `${API_BASE_URL}/schools?page=${page}&limit=${limit}`;
            console.log(`正在获取第 ${page} 页数据...`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.schools || !Array.isArray(data.schools)) {
                throw new Error('服务器返回数据格式错误');
            }
            
            allSchools.push(...data.schools);
            totalPages = data.totalPages || Math.ceil(data.total / limit);
            
            console.log(`已获取 ${allSchools.length} / ${data.total} 所学校数据`);
            
            page++;
            
            // 添加延迟，避免请求过快
            if (page <= totalPages) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error(`获取第 ${page} 页数据时出错:`, error.message);
            throw error;
        }
    } while (page <= totalPages);
    
    return allSchools;
}

// 将学校数据转换为CSV格式
function convertSchoolsToCSV(schools) {
    // 按序号排序
    schools.sort((a, b) => {
        const seqA = a.sequenceNumber || 0;
        const seqB = b.sequenceNumber || 0;
        if (seqA !== seqB) {
            return seqA - seqB;
        }
        // 如果序号相同，按创建时间排序
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
    });
    
    // 构建CSV内容
    let csvContent = '';
    
    // 写入标题行
    csvContent += csvColumns.join(',') + '\n';
    
    // 写入数据行
    schools.forEach((school, index) => {
        const row = [];
        const newSequenceNumber = index + 1; // 从1开始的连续序号
        
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
                
                row.push(escapeCSVValue(value));
            } else {
                row.push('');
            }
        });
        
        csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
}

// 主函数
async function downloadSchoolData() {
    try {
        // 获取所有学校数据
        const schools = await fetchAllSchools();
        
        if (schools.length === 0) {
            console.log('服务器中没有学校数据');
            process.exit(0);
        }
        
        console.log(`\n共获取 ${schools.length} 所学校数据，开始转换为CSV格式...`);
        
        // 转换为CSV格式
        const csvContent = convertSchoolsToCSV(schools);
        
        // 确定输出文件路径
        const outputPath = path.join(__dirname, 'SchoolData', 'SchoolData.csv');
        
        // 确保目录存在
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 写入文件
        fs.writeFileSync(outputPath, csvContent, 'utf-8');
        
        console.log(`\n成功下载并更新 ${schools.length} 所学校数据到: ${outputPath}`);
        console.log('下载完成！');
        
        process.exit(0);
    } catch (error) {
        console.error('\n下载数据时出错:', error);
        process.exit(1);
    }
}

// 运行主函数
downloadSchoolData();

