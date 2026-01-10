#!/usr/bin/env node

/**
 * 数据库完全替换脚本
 * 将本地数据库的所有数据完全替换到服务器数据库
 * 
 * 使用方法:
 *   node replace-server-db.js <服务器数据库URI>
 * 
 * 或者设置环境变量:
 *   REMOTE_MONGODB_URI=mongodb://... node replace-server-db.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 获取数据库 URI
const LOCAL_DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu';
const REMOTE_DB_URI = process.argv[2] || process.env.REMOTE_MONGODB_URI;

if (!REMOTE_DB_URI) {
    console.error('✗ 错误: 未提供服务器数据库 URI');
    console.error('使用方法: node replace-server-db.js <服务器数据库URI>');
    console.error('或者设置环境变量: REMOTE_MONGODB_URI=mongodb://...');
    process.exit(1);
}

// 需要同步的集合列表
const COLLECTIONS = ['schools', 'users', 'comments'];

async function replaceDatabase() {
    let localConnection = null;
    let remoteConnection = null;

    try {
        console.log('=== 数据库完全替换 ===\n');
        console.log('本地数据库:', LOCAL_DB_URI.replace(/\/\/.*@/, '//***:***@'));
        console.log('服务器数据库:', REMOTE_DB_URI.replace(/\/\/.*@/, '//***:***@'));
        console.log('');

        // 1. 连接本地数据库
        console.log('1. 连接本地数据库...');
        localConnection = mongoose.createConnection(LOCAL_DB_URI);
        await new Promise((resolve, reject) => {
            localConnection.once('connected', resolve);
            localConnection.once('error', reject);
        });
        console.log('   ✓ 本地数据库连接成功\n');

        // 2. 导出本地数据
        console.log('2. 导出本地数据...');
        const localDb = localConnection.db;
        const exportedData = {};

        for (const collectionName of COLLECTIONS) {
            const collection = localDb.collection(collectionName);
            const count = await collection.countDocuments();
            
            if (count > 0) {
                exportedData[collectionName] = await collection.find({}).toArray();
                console.log(`   ✓ ${collectionName}: ${exportedData[collectionName].length} 条记录`);
            } else {
                exportedData[collectionName] = [];
                console.log(`   - ${collectionName}: 0 条记录（跳过）`);
            }
        }
        console.log('');

        // 3. 断开本地连接
        await localConnection.close();
        localConnection = null;

        // 4. 连接服务器数据库（通过SSH隧道或直接连接）
        console.log('3. 连接服务器数据库...');
        // 如果REMOTE_DB_URI是localhost，说明需要在服务器上运行，这里先尝试连接
        // 如果连接失败，说明需要SSH隧道
        remoteConnection = mongoose.createConnection(REMOTE_DB_URI);
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('连接超时，可能需要SSH隧道或服务器IP地址'));
            }, 10000);
            remoteConnection.once('connected', () => {
                clearTimeout(timeout);
                resolve();
            });
            remoteConnection.once('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
        console.log('   ✓ 服务器数据库连接成功\n');

        // 5. 删除服务器上的所有数据
        console.log('4. 删除服务器上的旧数据...');
        const remoteDb = remoteConnection.db;
        
        for (const collectionName of COLLECTIONS) {
            const collection = remoteDb.collection(collectionName);
            const count = await collection.countDocuments();
            
            if (count > 0) {
                await collection.deleteMany({});
                console.log(`   ✓ ${collectionName}: 已删除 ${count} 条记录`);
            } else {
                console.log(`   - ${collectionName}: 无数据（跳过）`);
            }
        }
        console.log('');

        // 6. 导入本地数据到服务器
        console.log('5. 导入本地数据到服务器...');
        let totalImported = 0;

        for (const collectionName of COLLECTIONS) {
            const data = exportedData[collectionName];
            
            if (data && data.length > 0) {
                const collection = remoteDb.collection(collectionName);
                
                // 批量插入
                await collection.insertMany(data, { ordered: false });
                console.log(`   ✓ ${collectionName}: 已导入 ${data.length} 条记录`);
                totalImported += data.length;
            } else {
                console.log(`   - ${collectionName}: 无数据（跳过）`);
            }
        }
        console.log('');

        // 7. 验证导入结果
        console.log('6. 验证导入结果...');
        for (const collectionName of COLLECTIONS) {
            const collection = remoteDb.collection(collectionName);
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
        if (localConnection) {
            await localConnection.close();
        }
        if (remoteConnection) {
            await remoteConnection.close();
        }
        process.exit(0);
    }
}

// 执行替换
replaceDatabase();
