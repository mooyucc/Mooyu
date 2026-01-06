// 将本地数据库内容同步到服务器数据库（通过SSH）
// 相同学校名称的数据以本地数据库为准
require('dotenv').config();
const mongoose = require('mongoose');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 本地数据库连接配置
const LOCAL_DB_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/mooyu';
const SERVER_HOST = 'root@122.51.133.41';
const SERVER_DIR = '/root/Mooyu';
const TEMP_FILE = path.join(__dirname, 'temp-schools-sync.json');

console.log('=== 本地数据库 → 服务器数据库同步（通过SSH） ===');
console.log(`本地数据库: ${LOCAL_DB_URI}`);
console.log(`服务器: ${SERVER_HOST}`);
console.log('');

// 学校数据模型
const SchoolSchema = new mongoose.Schema({}, { strict: false });

// 连接到本地数据库并导出数据
async function exportLocalData() {
  try {
    console.log('1. 连接到本地数据库...');
    const connection = await mongoose.connect(LOCAL_DB_URI);
    const School = mongoose.model('School', SchoolSchema);
    
    console.log('2. 从本地数据库读取学校数据...');
    const schools = await School.find({}).lean();
    console.log(`   找到 ${schools.length} 所学校\n`);
    
    if (schools.length === 0) {
      console.log('本地数据库中没有学校数据，同步结束');
      await mongoose.connection.close();
      return null;
    }
    
    // 保存到临时文件
    console.log('3. 保存数据到临时文件...');
    fs.writeFileSync(TEMP_FILE, JSON.stringify(schools, null, 2), 'utf-8');
    console.log(`   已保存到: ${TEMP_FILE}\n`);
    
    await mongoose.connection.close();
    return schools;
  } catch (error) {
    console.error('导出本地数据失败:', error.message);
    throw error;
  }
}

// 上传数据到服务器并执行同步
async function uploadAndSync(schools) {
  try {
    console.log('4. 上传数据文件到服务器...');
    const remoteFile = `${SERVER_DIR}/temp-schools-sync.json`;
    
    // 使用scp上传文件
    execSync(`scp "${TEMP_FILE}" ${SERVER_HOST}:${remoteFile}`, { stdio: 'inherit' });
    console.log(`   已上传到服务器: ${remoteFile}\n`);
    
    console.log('5. 在服务器上执行同步脚本...');
    
    // 创建服务器端同步脚本
    const serverScript = `
const mongoose = require('mongoose');
const fs = require('fs');

const SERVER_DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu';
const SchoolSchema = new mongoose.Schema({}, { strict: false });

async function syncData() {
  try {
    console.log('连接到服务器数据库...');
    const connection = await mongoose.connect(SERVER_DB_URI);
    const School = connection.model('School', SchoolSchema);
    
    console.log('读取本地数据文件...');
    const localSchools = JSON.parse(fs.readFileSync('${remoteFile}', 'utf-8'));
    console.log(\`找到 \${localSchools.length} 所学校\\n\`);
    
    // 读取服务器现有学校
    const serverSchools = await School.find({}).lean();
    console.log(\`服务器现有 \${serverSchools.length} 所学校\\n\`);
    
    // 创建服务器学校名称映射
    const serverSchoolMap = new Map();
    serverSchools.forEach(school => {
      if (school.name) {
        serverSchoolMap.set(school.name, school._id);
      }
    });
    
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    console.log('开始同步学校数据...\\n');
    
    for (let i = 0; i < localSchools.length; i++) {
      const localSchool = localSchools[i];
      const schoolName = localSchool.name;
      
      if (!schoolName) {
        console.log(\`⚠ 跳过: 学校名称为空 (ID: \${localSchool._id})\`);
        skippedCount++;
        continue;
      }
      
      try {
        const schoolData = { ...localSchool };
        delete schoolData._id;
        delete schoolData.__v;
        
        schoolData.updatedAt = new Date();
        if (!schoolData.createdAt) {
          schoolData.createdAt = new Date();
        }
        
        const serverSchoolId = serverSchoolMap.get(schoolName);
        
        if (serverSchoolId) {
          await School.updateOne(
            { _id: serverSchoolId },
            { $set: schoolData }
          );
          updatedCount++;
          console.log(\`✓ [\${i + 1}/\${localSchools.length}] 更新: \${schoolName}\`);
        } else {
          await School.create(schoolData);
          createdCount++;
          console.log(\`+ [\${i + 1}/\${localSchools.length}] 创建: \${schoolName}\`);
        }
      } catch (error) {
        const errorMsg = \`✗ [\${i + 1}/\${localSchools.length}] 同步失败: \${schoolName} - \${error.message}\`;
        console.error(errorMsg);
        errors.push({ name: schoolName, error: error.message });
      }
    }
    
    console.log('\\n========== 同步完成 ==========');
    console.log(\`总计: \${localSchools.length} 所学校\`);
    console.log(\`创建: \${createdCount} 所\`);
    console.log(\`更新: \${updatedCount} 所\`);
    console.log(\`跳过: \${skippedCount} 所\`);
    if (errors.length > 0) {
      console.log(\`失败: \${errors.length} 所\`);
      console.log('\\n失败的学校:');
      errors.forEach(err => {
        console.log(\`  - \${err.name}: \${err.error}\`);
      });
    }
    
    // 清理临时文件
    fs.unlinkSync('${remoteFile}');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('同步失败:', error);
    process.exit(1);
  }
}

syncData();
`;
    
    // 上传服务器端脚本
    const serverScriptFile = `${SERVER_DIR}/sync-schools-temp.js`;
    fs.writeFileSync(path.join(__dirname, 'sync-schools-temp.js'), serverScript, 'utf-8');
    execSync(`scp "${path.join(__dirname, 'sync-schools-temp.js')}" ${SERVER_HOST}:${serverScriptFile}`, { stdio: 'inherit' });
    
    // 在服务器上执行脚本
    execSync(`ssh ${SERVER_HOST} "cd ${SERVER_DIR} && node sync-schools-temp.js"`, { stdio: 'inherit' });
    
    // 清理服务器上的临时脚本
    execSync(`ssh ${SERVER_HOST} "rm -f ${serverScriptFile}"`, { stdio: 'inherit' });
    
    console.log('\n6. 清理本地临时文件...');
    fs.unlinkSync(TEMP_FILE);
    fs.unlinkSync(path.join(__dirname, 'sync-schools-temp.js'));
    console.log('   清理完成\n');
    
  } catch (error) {
    console.error('上传和同步失败:', error.message);
    // 清理临时文件
    if (fs.existsSync(TEMP_FILE)) {
      fs.unlinkSync(TEMP_FILE);
    }
    if (fs.existsSync(path.join(__dirname, 'sync-schools-temp.js'))) {
      fs.unlinkSync(path.join(__dirname, 'sync-schools-temp.js'));
    }
    throw error;
  }
}

// 主函数
async function main() {
  try {
    // 导出本地数据
    const schools = await exportLocalData();
    
    if (!schools || schools.length === 0) {
      console.log('没有数据需要同步');
      process.exit(0);
    }
    
    // 上传并同步
    await uploadAndSync(schools);
    
    console.log('========== 所有操作完成 ==========');
    process.exit(0);
  } catch (error) {
    console.error('\n执行失败:', error);
    process.exit(1);
  }
}

// 运行主函数
main();

