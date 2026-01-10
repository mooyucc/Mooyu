#!/usr/bin/env node

// 在远程服务器上运行，获取数据库字段信息
const mongoose = require('mongoose');
require('dotenv').config();

async function getRemoteSchema() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mooyu';
        await mongoose.connect(uri);
        
        const db = mongoose.connection.db;
        const schools = db.collection('schools');
        const users = db.collection('users');
        const comments = db.collection('comments');
        
        // 获取字段
        const schoolSamples = await schools.find({}).limit(10).toArray();
        const userSamples = await users.find({}).limit(10).toArray();
        const commentSamples = await comments.find({}).limit(10).toArray();
        
        const fields = {
            schools: new Set(),
            users: new Set(),
            comments: new Set()
        };
        
        function extractFields(obj, targetSet, prefix = '') {
            for (const key in obj) {
                if (key === '_id' || key === '__v') continue;
                const fullKey = prefix ? `${prefix}.${key}` : key;
                targetSet.add(fullKey);
                if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
                    extractFields(obj[key], targetSet, fullKey);
                }
            }
        }
        
        schoolSamples.forEach(s => extractFields(s, fields.schools));
        userSamples.forEach(s => extractFields(s, fields.users));
        commentSamples.forEach(s => extractFields(s, fields.comments));
        
        console.log(JSON.stringify({
            schools: Array.from(fields.schools).sort(),
            users: Array.from(fields.users).sort(),
            comments: Array.from(fields.comments).sort()
        }));
        
        await mongoose.disconnect();
    } catch (error) {
        console.error(JSON.stringify({ error: error.message }));
        process.exit(1);
    }
}

getRemoteSchema();
