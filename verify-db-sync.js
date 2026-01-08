// 验证服务器数据库是否与本地数据库完全一致
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

console.log('=== 验证数据库同步状态 ===');
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
    return false;
  }
}

// 深度比较两个对象（排除 _id 和 __v）
function deepEqual(obj1, obj2) {
  // 创建副本并排除 _id 和 __v
  const clean1 = JSON.parse(JSON.stringify(obj1));
  const clean2 = JSON.parse(JSON.stringify(obj2));
  delete clean1._id;
  delete clean1.__v;
  delete clean2._id;
  delete clean2.__v;
  
  // 比较 JSON 字符串
  return JSON.stringify(clean1) === JSON.stringify(clean2);
}

// 获取对象的所有字段（排除 _id 和 __v）
function getAllFields(obj) {
  const fields = new Set();
  for (const key in obj) {
    if (key !== '_id' && key !== '__v') {
      fields.add(key);
    }
  }
  return fields;
}

// 验证数据
async function verifyData() {
  try {
    console.log('\n开始验证数据...\n');
    
    // 1. 从本地数据库读取所有学校
    console.log('1. 从本地数据库读取学校数据...');
    const localSchools = await LocalSchool.find({}).lean();
    console.log(`   找到 ${localSchools.length} 所学校\n`);
    
    // 2. 从服务器数据库读取所有学校
    console.log('2. 从服务器数据库读取学校数据...');
    const serverSchools = await ServerSchool.find({}).lean();
    console.log(`   找到 ${serverSchools.length} 所学校\n`);
    
    // 3. 比较数量
    if (localSchools.length !== serverSchools.length) {
      console.log('❌ 数量不一致！');
      console.log(`   本地: ${localSchools.length} 所`);
      console.log(`   服务器: ${serverSchools.length} 所`);
      return false;
    }
    console.log('✓ 学校数量一致\n');
    
    // 4. 创建服务器学校名称映射
    const serverSchoolMap = new Map();
    serverSchools.forEach(school => {
      if (school.name) {
        serverSchoolMap.set(school.name, school);
      }
    });
    
    // 5. 比较每所学校的数据
    console.log('3. 逐校比较数据...\n');
    let allMatch = true;
    const mismatches = [];
    const fieldDifferences = [];
    
    for (let i = 0; i < localSchools.length; i++) {
      const localSchool = localSchools[i];
      const schoolName = localSchool.name;
      
      if (!schoolName) {
        console.log(`⚠ 跳过: 本地学校名称为空 (ID: ${localSchool._id})`);
        continue;
      }
      
      const serverSchool = serverSchoolMap.get(schoolName);
      
      if (!serverSchool) {
        console.log(`❌ [${i + 1}/${localSchools.length}] 服务器中不存在: ${schoolName}`);
        mismatches.push({ name: schoolName, issue: '服务器中不存在' });
        allMatch = false;
        continue;
      }
      
      // 比较数据内容
      const isEqual = deepEqual(localSchool, serverSchool);
      
      if (!isEqual) {
        console.log(`❌ [${i + 1}/${localSchools.length}] 数据不一致: ${schoolName}`);
        
        // 详细比较字段
        const localFields = getAllFields(localSchool);
        const serverFields = getAllFields(serverSchool);
        
        // 找出不同的字段
        const allFields = new Set([...localFields, ...serverFields]);
        const diffFields = [];
        
        for (const field of allFields) {
          const localValue = localSchool[field];
          const serverValue = serverSchool[field];
          
          // 处理日期对象比较
          let localVal = localValue;
          let serverVal = serverValue;
          
          if (localValue instanceof Date) {
            localVal = localValue.toISOString();
          }
          if (serverValue instanceof Date) {
            serverVal = serverValue.toISOString();
          }
          
          if (JSON.stringify(localVal) !== JSON.stringify(serverVal)) {
            diffFields.push({
              field,
              local: localVal,
              server: serverVal
            });
          }
        }
        
        if (diffFields.length > 0) {
          console.log(`   差异字段数: ${diffFields.length}`);
          // 只显示前5个差异字段
          const displayFields = diffFields.slice(0, 5);
          displayFields.forEach(diff => {
            console.log(`   - ${diff.field}:`);
            console.log(`     本地: ${JSON.stringify(diff.local).substring(0, 100)}${JSON.stringify(diff.local).length > 100 ? '...' : ''}`);
            console.log(`     服务器: ${JSON.stringify(diff.server).substring(0, 100)}${JSON.stringify(diff.server).length > 100 ? '...' : ''}`);
          });
          if (diffFields.length > 5) {
            console.log(`   ... 还有 ${diffFields.length - 5} 个字段存在差异`);
          }
        }
        
        fieldDifferences.push({ name: schoolName, fields: diffFields });
        mismatches.push({ name: schoolName, issue: '数据内容不一致', fields: diffFields.length });
        allMatch = false;
      } else {
        console.log(`✓ [${i + 1}/${localSchools.length}] 数据一致: ${schoolName}`);
      }
    }
    
    // 6. 检查服务器中是否有本地不存在的学校
    console.log('\n4. 检查服务器中是否有本地不存在的学校...\n');
    const localSchoolNames = new Set(localSchools.map(s => s.name).filter(Boolean));
    for (const serverSchool of serverSchools) {
      if (serverSchool.name && !localSchoolNames.has(serverSchool.name)) {
        console.log(`⚠ 服务器中存在但本地不存在: ${serverSchool.name}`);
        mismatches.push({ name: serverSchool.name, issue: '本地不存在' });
        allMatch = false;
      }
    }
    
    // 7. 统计所有字段
    console.log('\n5. 统计字段信息...\n');
    const allLocalFields = new Set();
    const allServerFields = new Set();
    
    localSchools.forEach(school => {
      Object.keys(school).forEach(key => {
        if (key !== '_id' && key !== '__v') {
          allLocalFields.add(key);
        }
      });
    });
    
    serverSchools.forEach(school => {
      Object.keys(school).forEach(key => {
        if (key !== '_id' && key !== '__v') {
          allServerFields.add(key);
        }
      });
    });
    
    console.log(`本地数据库字段数: ${allLocalFields.size}`);
    console.log(`服务器数据库字段数: ${allServerFields.size}`);
    
    // 找出字段差异
    const onlyLocal = [...allLocalFields].filter(f => !allServerFields.has(f));
    const onlyServer = [...allServerFields].filter(f => !allLocalFields.has(f));
    
    if (onlyLocal.length > 0) {
      console.log(`\n⚠ 仅本地存在的字段 (${onlyLocal.length}):`);
      onlyLocal.forEach(f => console.log(`   - ${f}`));
    }
    
    if (onlyServer.length > 0) {
      console.log(`\n⚠ 仅服务器存在的字段 (${onlyServer.length}):`);
      onlyServer.forEach(f => console.log(`   - ${f}`));
    }
    
    if (onlyLocal.length === 0 && onlyServer.length === 0) {
      console.log('✓ 字段结构完全一致');
    }
    
    // 8. 输出总结
    console.log('\n========== 验证结果 ==========');
    if (allMatch && onlyLocal.length === 0 && onlyServer.length === 0) {
      console.log('✅ 验证通过！服务器数据库与本地数据库完全一致');
      console.log(`   - 学校数量: ${localSchools.length}`);
      console.log(`   - 字段结构: 完全一致`);
      console.log(`   - 数据内容: 完全一致`);
    } else {
      console.log('❌ 验证失败！发现以下问题:');
      if (mismatches.length > 0) {
        console.log(`   - 数据不一致的学校: ${mismatches.length} 所`);
        mismatches.forEach(m => {
          console.log(`     • ${m.name}: ${m.issue}${m.fields ? ` (${m.fields} 个字段差异)` : ''}`);
        });
      }
      if (onlyLocal.length > 0 || onlyServer.length > 0) {
        console.log(`   - 字段结构差异: 本地有 ${onlyLocal.length} 个独有字段，服务器有 ${onlyServer.length} 个独有字段`);
      }
    }
    console.log('');
    
    return allMatch && onlyLocal.length === 0 && onlyServer.length === 0;
    
  } catch (error) {
    console.error('\n验证数据时出错:', error);
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
    
    // 执行验证
    const isMatch = await verifyData();
    
    // 关闭数据库连接
    await localConnection.close();
    await serverConnection.close();
    
    console.log('验证完成！');
    process.exit(isMatch ? 0 : 1);
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

