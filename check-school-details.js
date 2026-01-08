// 检查指定学校的详细数据
require('dotenv').config();
const mongoose = require('mongoose');

// 数据库连接配置
const LOCAL_DB_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/mooyu';
let SERVER_DB_URI = process.env.SERVER_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu';

// 如果通过命令行参数提供服务器数据库URI
if (process.argv.length > 2) {
  const serverUri = process.argv[2];
  if (serverUri.startsWith('mongodb://')) {
    SERVER_DB_URI = serverUri;
  }
}

const SCHOOL_NAME = '上海浦东新区民办万科学校';

// 学校数据模型
const SchoolSchema = new mongoose.Schema({}, { strict: false });

let localConnection = null;
let serverConnection = null;
let LocalSchool = null;
let ServerSchool = null;

// 连接到本地数据库
async function connectLocalDB() {
  try {
    localConnection = await mongoose.createConnection(LOCAL_DB_URI);
    LocalSchool = localConnection.model('School', SchoolSchema);
    console.log('✓ 已连接到本地数据库');
    return true;
  } catch (error) {
    console.error('✗ 连接本地数据库失败:', error.message);
    return false;
  }
}

// 连接到服务器数据库
async function connectServerDB() {
  try {
    serverConnection = await mongoose.createConnection(SERVER_DB_URI);
    ServerSchool = serverConnection.model('School', SchoolSchema);
    console.log('✓ 已连接到服务器数据库');
    return true;
  } catch (error) {
    console.error('✗ 连接服务器数据库失败:', error.message);
    return false;
  }
}

// 显示学校详细信息
function displaySchoolInfo(school, label) {
  console.log(`\n========== ${label} ==========`);
  console.log(`学校名称: ${school.name || 'N/A'}`);
  console.log(`\n课程相关字段:`);
  
  // IB课程
  console.log(`\nIB课程:`);
  console.log(`  ibPYP: ${JSON.stringify(school.ibPYP)} (类型: ${typeof school.ibPYP})`);
  console.log(`  ibMYP: ${JSON.stringify(school.ibMYP)} (类型: ${typeof school.ibMYP})`);
  console.log(`  ibDP: ${JSON.stringify(school.ibDP)} (类型: ${typeof school.ibDP})`);
  console.log(`  ibCP: ${JSON.stringify(school.ibCP)} (类型: ${typeof school.ibCP})`);
  
  // 其他课程
  console.log(`\n其他课程:`);
  console.log(`  aLevel: ${JSON.stringify(school.aLevel)} (类型: ${typeof school.aLevel})`);
  console.log(`  ap: ${JSON.stringify(school.ap)} (类型: ${typeof school.ap})`);
  console.log(`  canadian: ${JSON.stringify(school.canadian)} (类型: ${typeof school.canadian})`);
  console.log(`  australian: ${JSON.stringify(school.australian)} (类型: ${typeof school.australian})`);
  console.log(`  igcse: ${JSON.stringify(school.igcse)} (类型: ${typeof school.igcse})`);
  console.log(`  otherCourses: ${JSON.stringify(school.otherCourses)} (类型: ${typeof school.otherCourses})`);
  
  // 学段相关
  console.log(`\n学段相关:`);
  console.log(`  kindergarten: ${JSON.stringify(school.kindergarten)}`);
  console.log(`  primary: ${JSON.stringify(school.primary)}`);
  console.log(`  juniorHigh: ${JSON.stringify(school.juniorHigh)}`);
  console.log(`  seniorHigh: ${JSON.stringify(school.seniorHigh)}`);
  console.log(`  coveredStages: ${JSON.stringify(school.coveredStages)}`);
  
  // 显示所有字段
  console.log(`\n所有字段列表:`);
  const allFields = Object.keys(school).filter(k => k !== '_id' && k !== '__v').sort();
  allFields.forEach(field => {
    const value = school[field];
    let displayValue = JSON.stringify(value);
    if (displayValue.length > 100) {
      displayValue = displayValue.substring(0, 100) + '...';
    }
    console.log(`  ${field}: ${displayValue}`);
  });
}

// 比较两个学校的数据
function compareSchools(localSchool, serverSchool) {
  console.log(`\n========== 详细对比 ==========`);
  
  const courseFields = ['ibPYP', 'ibMYP', 'ibDP', 'ibCP', 'aLevel', 'ap', 'canadian', 'australian', 'igcse', 'otherCourses'];
  
  console.log(`\n课程字段对比:`);
  courseFields.forEach(field => {
    const localVal = localSchool[field];
    const serverVal = serverSchool[field];
    const localStr = JSON.stringify(localVal);
    const serverStr = JSON.stringify(serverVal);
    
    if (localStr === serverStr) {
      console.log(`  ✓ ${field}: 一致 (${localStr})`);
    } else {
      console.log(`  ❌ ${field}: 不一致`);
      console.log(`     本地: ${localStr} (类型: ${typeof localVal})`);
      console.log(`     服务器: ${serverStr} (类型: ${typeof serverVal})`);
    }
  });
}

// 主函数
async function main() {
  try {
    // 连接到本地数据库
    const localConnected = await connectLocalDB();
    if (!localConnected) {
      process.exit(1);
    }
    
    // 连接到服务器数据库
    const serverConnected = await connectServerDB();
    if (!serverConnected) {
      await localConnection.close();
      process.exit(1);
    }
    
    // 查找学校
    console.log(`\n查找学校: ${SCHOOL_NAME}\n`);
    
    const localSchool = await LocalSchool.findOne({ name: SCHOOL_NAME }).lean();
    const serverSchool = await ServerSchool.findOne({ name: SCHOOL_NAME }).lean();
    
    if (!localSchool) {
      console.log('❌ 本地数据库中未找到该学校');
    } else {
      displaySchoolInfo(localSchool, '本地数据库');
    }
    
    if (!serverSchool) {
      console.log('❌ 服务器数据库中未找到该学校');
    } else {
      displaySchoolInfo(serverSchool, '服务器数据库');
    }
    
    if (localSchool && serverSchool) {
      compareSchools(localSchool, serverSchool);
    }
    
    // 关闭数据库连接
    await localConnection.close();
    await serverConnection.close();
    
    process.exit(0);
  } catch (error) {
    console.error('\n执行失败:', error);
    
    // 确保关闭连接
    if (localConnection) {
      await localConnection.close().catch(() => {});
    }
    if (serverConnection) {
      await serverConnection.close().catch(() => {});
    }
    
    process.exit(1);
  }
}

// 运行主函数
main();

