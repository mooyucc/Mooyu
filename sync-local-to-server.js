// 将本地数据库内容同步到服务器数据库
// 相同学校名称的数据以本地数据库为准
require('dotenv').config();
const mongoose = require('mongoose');

// 数据库连接配置
const LOCAL_DB_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/mooyu';
const SERVER_DB_URI = process.env.SERVER_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu';

// 如果通过命令行参数提供服务器数据库URI
if (process.argv.length > 2) {
  const serverUri = process.argv[2];
  if (serverUri.startsWith('mongodb://')) {
    SERVER_DB_URI = serverUri;
  } else {
    console.error('错误: 服务器数据库URI格式不正确，应为 mongodb://...');
    process.exit(1);
  }
}

console.log('=== 本地数据库 → 服务器数据库同步 ===');
console.log(`本地数据库: ${LOCAL_DB_URI}`);
console.log(`服务器数据库: ${SERVER_DB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // 隐藏密码
console.log('');

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
    console.error('提示: 请确保服务器数据库URI正确，格式如:');
    console.error('  mongodb://username:password@122.51.133.41:27017/mooyu?authSource=admin');
    return false;
  }
}

// 同步数据
async function syncData() {
  try {
    console.log('\n开始同步数据...\n');
    
    // 从本地数据库读取所有学校
    console.log('1. 从本地数据库读取学校数据...');
    const localSchools = await LocalSchool.find({}).lean();
    console.log(`   找到 ${localSchools.length} 所学校\n`);
    
    if (localSchools.length === 0) {
      console.log('本地数据库中没有学校数据，同步结束');
      return;
    }
    
    // 从服务器数据库读取所有学校（用于统计）
    console.log('2. 从服务器数据库读取现有学校数据...');
    const serverSchools = await ServerSchool.find({}).lean();
    console.log(`   服务器现有 ${serverSchools.length} 所学校\n`);
    
    // 创建服务器学校名称映射（用于快速查找）
    const serverSchoolMap = new Map();
    serverSchools.forEach(school => {
      if (school.name) {
        serverSchoolMap.set(school.name, school._id);
      }
    });
    
    // 统计信息
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    console.log('3. 开始同步学校数据...\n');
    
    // 遍历本地学校，同步到服务器
    for (let i = 0; i < localSchools.length; i++) {
      const localSchool = localSchools[i];
      const schoolName = localSchool.name;
      
      if (!schoolName) {
        console.log(`⚠ 跳过: 学校名称为空 (ID: ${localSchool._id})`);
        skippedCount++;
        continue;
      }
      
      try {
        // 准备要同步的数据（排除_id和__v字段）
        const schoolData = { ...localSchool };
        delete schoolData._id;
        delete schoolData.__v;
        
        // 设置更新时间
        schoolData.updatedAt = new Date();
        if (!schoolData.createdAt) {
          schoolData.createdAt = new Date();
        }
        
        // 检查服务器中是否存在同名学校
        const serverSchoolId = serverSchoolMap.get(schoolName);
        
        if (serverSchoolId) {
          // 更新现有学校
          await ServerSchool.updateOne(
            { _id: serverSchoolId },
            { $set: schoolData }
          );
          updatedCount++;
          console.log(`✓ [${i + 1}/${localSchools.length}] 更新: ${schoolName}`);
        } else {
          // 创建新学校
          await ServerSchool.create(schoolData);
          createdCount++;
          console.log(`+ [${i + 1}/${localSchools.length}] 创建: ${schoolName}`);
        }
      } catch (error) {
        const errorMsg = `✗ [${i + 1}/${localSchools.length}] 同步失败: ${schoolName} - ${error.message}`;
        console.error(errorMsg);
        errors.push({ name: schoolName, error: error.message });
      }
    }
    
    // 输出统计信息
    console.log('\n========== 同步完成 ==========');
    console.log(`总计: ${localSchools.length} 所学校`);
    console.log(`创建: ${createdCount} 所`);
    console.log(`更新: ${updatedCount} 所`);
    console.log(`跳过: ${skippedCount} 所`);
    if (errors.length > 0) {
      console.log(`失败: ${errors.length} 所`);
      console.log('\n失败的学校:');
      errors.forEach(err => {
        console.log(`  - ${err.name}: ${err.error}`);
      });
    }
    console.log('');
    
  } catch (error) {
    console.error('\n同步数据时出错:', error);
    throw error;
  }
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
    
    // 执行同步
    await syncData();
    
    // 关闭数据库连接
    await localConnection.close();
    await serverConnection.close();
    
    console.log('所有操作完成！');
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

