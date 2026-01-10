# API 访问指南

本文档说明如何从其他应用访问 Mooyu 服务器上的数据库。

## 方案一：使用现有 REST API（推荐）

### 可用的公开 API 端点

#### 1. 获取学校列表（支持搜索和分页）

```http
GET https://mooyu.cc/api/schools?search=关键词&page=1&limit=20
```

**参数：**
- `search` (可选): 搜索关键词，支持学校名称、性质、学段、课程等
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20

**响应示例：**
```json
{
  "schools": [
    {
      "_id": "695bac0f78b790e0a720e09c",
      "sequenceNumber": 3,
      "name": "上海浦东新区民办万科学校",
      "website": "https://vsp.dtd-edu.cn",
      "country": "中国",
      "city": "上海",
      "nature": "民办双语K-12学校",
      "coveredStages": "K-12",
      ...
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5,
  "possibleSchoolNames": []
}
```

#### 2. 获取单个学校详情

```http
GET https://mooyu.cc/api/schools/:id
```

**示例：**
```http
GET https://mooyu.cc/api/schools/695bac0f78b790e0a720e09c
```

#### 3. 对比多个学校

```http
POST https://mooyu.cc/api/schools/compare
Content-Type: application/json

{
  "schoolIds": ["id1", "id2", "id3"]
}
```

**限制：** 最少 2 所，最多 5 所学校

### 使用示例

#### JavaScript/Node.js
```javascript
// 获取学校列表
const response = await fetch('https://mooyu.cc/api/schools?search=万科');
const data = await response.json();
console.log(data.schools);

// 获取单个学校
const school = await fetch('https://mooyu.cc/api/schools/695bac0f78b790e0a720e09c');
const schoolData = await school.json();
```

#### Python
```python
import requests

# 获取学校列表
response = requests.get('https://mooyu.cc/api/schools', params={
    'search': '万科',
    'page': 1,
    'limit': 20
})
data = response.json()
print(data['schools'])

# 获取单个学校
school = requests.get('https://mooyu.cc/api/schools/695bac0f78b790e0a720e09c')
school_data = school.json()
```

#### curl
```bash
# 搜索学校
curl "https://mooyu.cc/api/schools?search=万科"

# 获取单个学校
curl "https://mooyu.cc/api/schools/695bac0f78b790e0a720e09c"
```

## 方案二：使用 API Key 认证（更安全，适合第三方应用）

如果需要更安全的访问控制，可以使用带 API Key 的端点。

### 获取 API Key

联系管理员获取 API Key。

### 使用 API Key

```http
GET https://mooyu.cc/api/schools?search=万科
X-API-Key: your-api-key-here
```

或使用查询参数：

```http
GET https://mooyu.cc/api/schools?search=万科&apiKey=your-api-key-here
```

## 方案三：直接连接 MongoDB（高级，需要网络配置）

### 前提条件

1. 服务器需要开放 MongoDB 端口（默认 27017）
2. 配置 MongoDB 认证
3. 配置防火墙规则

### 连接字符串格式

```
mongodb://username:password@122.51.133.41:27017/mooyu?authSource=admin
```

### Node.js 示例

```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://username:password@122.51.133.41:27017/mooyu?authSource=admin')
  .then(() => {
    console.log('连接成功');
    // 查询数据
    const School = mongoose.model('School', schoolSchema);
    School.find({}).then(schools => {
      console.log(schools);
    });
  })
  .catch(err => console.error('连接失败:', err));
```

### Python 示例

```python
from pymongo import MongoClient

client = MongoClient('mongodb://username:password@122.51.133.41:27017/mooyu?authSource=admin')
db = client.mooyu
schools = db.schools.find({})
for school in schools:
    print(school)
```

### 安全注意事项

⚠️ **重要：** 直接连接 MongoDB 存在安全风险，建议：
1. 使用 VPN 或 SSH 隧道
2. 限制 IP 白名单
3. 使用强密码
4. 启用 TLS/SSL 加密

## 数据模型

### School 模型字段

```javascript
{
  _id: ObjectId,                    // MongoDB 自动生成的 ID
  sequenceNumber: Number,           // 序号
  name: String,                     // 学校名称（必填）
  website: String,                  // 网址
  country: String,                   // 国家
  city: String,                     // 城市
  nature: String,                   // 学校性质
  coveredStages: String,            // 涵盖学段
  kindergarten: String,             // 幼儿园
  primary: String,                  // 小学
  juniorHigh: String,               // 初中
  seniorHigh: String,               // 高中
  ibPYP: String,                    // IB PYP
  ibMYP: String,                    // IB MYP
  ibDP: String,                     // IB DP
  ibCP: String,                     // IB CP
  aLevel: String,                   // A-Level
  ap: String,                       // AP
  canadian: String,                 // 加拿大课程
  australian: String,               // 澳大利亚课程
  igcse: String,                    // IGCSE
  otherCourses: String,             // 其他课程
  'AI评估_总分': Number,            // AI评估总分
  // ... 更多 AI 评估字段
  createdAt: Date,                  // 创建时间
  updatedAt: Date                   // 更新时间
}
```

## 错误处理

API 返回标准 HTTP 状态码：

- `200`: 成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器错误

错误响应格式：
```json
{
  "message": "错误描述"
}
```

## 速率限制

当前没有速率限制，但建议：
- 避免过于频繁的请求（建议间隔至少 1 秒）
- 使用分页获取大量数据
- 缓存数据以减少请求次数

## 支持

如有问题，请联系：
- Email: mooyucc@qq.com

