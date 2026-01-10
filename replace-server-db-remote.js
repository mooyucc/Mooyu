#!/usr/bin/env node

/**
 * 数据库完全替换脚本（在服务器上运行）
 * 从本地数据库导出数据，然后在服务器上导入
 * 
 * 使用方法:
 *   在服务器上运行: node replace-server-db-remote.js <本地数据库导出文件路径>
 */

const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

// 获取数据库 URI（服务器上的数据库）
const SERVER_DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu';

// 需要同步的集合列表
const COLLECTIONS = ['schools', 'users', 'comments'];

async function replaceDatabase(dataFile) {
    let connection = null;

    try {
        console.log('=== 数据库完全替换（服务器端） ===\n');
        console.log('服务器数据库:', SERVER_DB_URI.replace(/\/\/.*@/, '//***:***@'));
        console.log('数据文件:', dataFile);
        console.log('');

        // 1. 读取导出的数据
        console.log('1. 读取导出的数据...');
        if (!fs.existsSync(dataFile)) {
            throw new Error(`数据文件不存在: ${dataFile}`);
        }
        const exportedData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        console.log('   ✓ 数据文件读取成功\n');

        // 2. 连接服务器数据库
        console.log('2. 连接服务器数据库...');
        connection = mongoose.createConnection(SERVER_DB_URI);
        await new Promise((resolve, reject) => {
            connection.once('connected', resolve);
            connection.once('error', reject);
        });
        console.log('   ✓ 服务器数据库连接成功\n');

        // 3. 删除服务器上的所有数据
        console.log('3. 删除服务器上的旧数据...');
        const db = connection.db;
        
        for (const collectionName of COLLECTIONS) {
            const collection = db.collection(collectionName);
            const count = await collection.countDocuments();
            
            if (count > 0) {
                await collection.deleteMany({});
                console.log(`   ✓ ${collectionName}: 已删除 ${count} 条记录`);
            } else {
                console.log(`   - ${collectionName}: 无数据（跳过）`);
            }
        }
        console.log('');

        // 4. 导入数据到服务器
        console.log('4. 导入数据到服务器...');
        let totalImported = 0;

        for (const collectionName of COLLECTIONS) {
            const data = exportedData[collectionName];
            
            if (data && data.length > 0) {
                const collection = db.collection(collectionName);
                
                // 批量插入
                await collection.insertMany(data, { ordered: false });
                console.log(`   ✓ ${collectionName}: 已导入 ${data.length} 条记录`);
                totalImported += data.length;
            } else {
                console.log(`   - ${collectionName}: 无数据（跳过）`);
            }
        }
        console.log('');

        // 5. 验证导入结果
        console.log('5. 验证导入结果...');
        for (const collectionName of COLLECTIONS) {
            const collection = db.collection(collectionName);
            const count = await collection.countDocuments();
            const expectedCount = exportedData[collectionName]?.length || 0;
            
            if (count === expectedCount) {
                console.log(`   ✓ ${collectionName}: ${count} 条记录（验证通过）`);
            } else {
                console.log(`   ⚠ ${collectionName}: ${count} 条记录（期望 ${expectedCount} 条）`);
            }
        }
        console.log('');

        console.log('=== 数据库替换完成 ===');
        console.log(`总共导入 ${totalImported} 条记录`);
        console.log('✓ 服务器数据库已用本地数据库完全替换');

    } catch (error) {
        console.error('\n✗ 错误:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        // 清理连接
        if (connection) {
            await connection.close();
        }
        process.exit(0);
    }
}

// 执行替换
const dataFile = process.argv[2];
if (!dataFile) {
    console.error('✗ 错误: 未提供数据文件路径');
    console.error('使用方法: node replace-server-db-remote.js <数据文件路径>');
    process.exit(1);
}

replaceDatabase(dataFile);
