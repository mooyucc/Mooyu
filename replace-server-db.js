// 完全替换服务器数据库：先清空服务器数据库，然后用本地数据库完全替换
// 此脚本会删除服务器上的所有学校数据，然后用本地数据库的所有数据替换
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
  } else {
    console.error('错误: 服务器数据库URI格式不正确，应为 mongodb://...');
    process.exit(1);
  }
}

console.log('=== 完全替换服务器数据库 ===');
console.log(`本地数据库: ${LOCAL_DB_URI}`);
console.log(`服务器数据库: ${SERVER_DB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // 隐藏密码
console.log('⚠️  警告: 此操作将删除服务器上的所有学校数据！');
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

// 完全替换数据
async function replaceData() {
  try {
    console.log('\n开始完全替换数据...\n');
    
    // 1. 从本地数据库读取所有学校
    console.log('1. 从本地数据库读取学校数据...');
    const localSchools = await LocalSchool.find({}).lean();
    console.log(`   找到 ${localSchools.length} 所学校\n`);
    
    if (localSchools.length === 0) {
      console.log('⚠️  警告: 本地数据库中没有学校数据！');
      console.log('将继续清空服务器数据库...\n');
    }
    
    // 2. 统计服务器现有数据
    console.log('2. 统计服务器现有数据...');
    const serverSchoolCount = await ServerSchool.countDocuments({});
    console.log(`   服务器现有 ${serverSchoolCount} 所学校\n`);
    
    // 3. 清空服务器数据库的所有学校数据
    if (serverSchoolCount > 0) {
      console.log('3. 清空服务器数据库的所有学校数据...');
      const deleteResult = await ServerSchool.deleteMany({});
      console.log(`   ✓ 已删除 ${deleteResult.deletedCount} 条学校数据\n`);
    } else {
      console.log('3. 服务器数据库已经是空的，跳过清空步骤\n');
    }
    
    // 4. 如果本地有数据，则导入所有数据
    if (localSchools.length > 0) {
      console.log('4. 导入本地数据库的所有数据到服务器...\n');
      
      let createdCount = 0;
      let skippedCount = 0;
      const errors = [];
      
      // 遍历本地学校，全部创建到服务器
      for (let i = 0; i < localSchools.length; i++) {
        const localSchool = localSchools[i];
        const schoolName = localSchool.name;
        
        if (!schoolName) {
          console.log(`⚠ 跳过: 学校名称为空 (ID: ${localSchool._id})`);
          skippedCount++;
          continue;
        }
        
        try {
          // 准备要导入的数据（排除_id和__v字段，让服务器生成新的_id）
          const schoolData = { ...localSchool };
          delete schoolData._id;
          delete schoolData.__v;
          
          // 设置更新时间
          schoolData.updatedAt = new Date();
          if (!schoolData.createdAt) {
            schoolData.createdAt = new Date();
          }
          
          // 创建新学校（完全复制本地数据）
          await ServerSchool.create(schoolData);
          createdCount++;
          console.log(`+ [${i + 1}/${localSchools.length}] 导入: ${schoolName}`);
        } catch (error) {
          const errorMsg = `✗ [${i + 1}/${localSchools.length}] 导入失败: ${schoolName} - ${error.message}`;
          console.error(errorMsg);
          errors.push({ name: schoolName, error: error.message });
        }
      }
      
      // 输出统计信息
      console.log('\n========== 替换完成 ==========');
      console.log(`本地数据库: ${localSchools.length} 所学校`);
      console.log(`成功导入: ${createdCount} 所`);
      console.log(`跳过: ${skippedCount} 所`);
      if (errors.length > 0) {
        console.log(`失败: ${errors.length} 所`);
        console.log('\n失败的学校:');
        errors.forEach(err => {
          console.log(`  - ${err.name}: ${err.error}`);
        });
      }
      
      // 验证结果
      const finalCount = await ServerSchool.countDocuments({});
      console.log(`\n服务器数据库最终数量: ${finalCount} 所学校`);
      if (finalCount === createdCount) {
        console.log('✓ 数据替换成功！服务器数据库已与本地数据库完全一致。');
      } else {
        console.log('⚠️  警告: 服务器数据库数量与预期不符！');
      }
    } else {
      console.log('4. 本地数据库为空，服务器数据库已清空\n');
      console.log('========== 替换完成 ==========');
      console.log('服务器数据库已清空，本地数据库为空，无需导入数据。');
    }
    
    console.log('');
    
  } catch (error) {
    console.error('\n替换数据时出错:', error);
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
    
    // 执行完全替换
    await replaceData();
    
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

