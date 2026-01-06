# School Insight API 接口清单

本文档列出所有 School Insight 相关的 API 接口，供 Xcode 开发时参考。

## 基础配置

- **API 基础 URL**: `https://mooyu.cc/api`（或你的服务器地址）
- **请求格式**: JSON
- **响应格式**: JSON
- **字符编码**: UTF-8

## 接口列表

### 1. 获取学校列表（支持搜索）

**接口**: `GET /api/schools`

**请求参数**:
- `search` (可选, String): 搜索关键词，支持学校名称模糊搜索
- `page` (可选, Int, 默认: 1): 页码
- `limit` (可选, Int, 默认: 20): 每页数量

**请求示例**:
```
GET /api/schools?search=万科&page=1&limit=20
```

**响应示例**:
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
      "kindergarten": "有",
      "primary": "有",
      "juniorHigh": "有",
      "seniorHigh": "有",
      "ibPYP": "有",
      "ibMYP": "有",
      "ibDP": "有",
      "ibCP": "无",
      "aLevel": "无",
      "ap": "无",
      "canadian": "无",
      "australian": "无",
      "igcse": "无",
      "otherCourses": "",
      "AI评估_总分": 85.5,
      "AI评估_课程声誉与体系成熟度_得分": 22.5,
      "AI评估_课程声誉与体系成熟度_说明": "该校IB课程体系完整...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5,
  "possibleSchoolNames": []
}
```

**特殊说明**:
- 如果搜索没有结果，且搜索词是学校名称，`possibleSchoolNames` 字段可能包含 AI 建议的学校名称列表
- 如果找到学校但信息不完整，后端会自动通过 AI 补充缺失字段

---

### 2. 获取单个学校详情

**接口**: `GET /api/schools/:id`

**路径参数**:
- `id` (必需, String): 学校 ID（MongoDB ObjectId）

**请求示例**:
```
GET /api/schools/695bac0f78b790e0a720e09c
```

**响应示例**:
```json
{
  "_id": "695bac0f78b790e0a720e09c",
  "sequenceNumber": 3,
  "name": "上海浦东新区民办万科学校",
  "website": "https://vsp.dtd-edu.cn",
  "country": "中国",
  "city": "上海",
  "nature": "民办双语K-12学校",
  "coveredStages": "K-12",
  "kindergarten": "有",
  "primary": "有",
  "juniorHigh": "有",
  "seniorHigh": "有",
  "ibPYP": "有",
  "ibMYP": "有",
  "ibDP": "有",
  "ibCP": "无",
  "aLevel": "无",
  "ap": "无",
  "canadian": "无",
  "australian": "无",
  "igcse": "无",
  "otherCourses": "",
  "AI评估_总分": 85.5,
  "AI评估_课程声誉与体系成熟度_得分": 22.5,
  "AI评估_课程声誉与体系成熟度_说明": "该校IB课程体系完整...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**错误响应**:
- `404`: 学校不存在
```json
{
  "message": "学校不存在"
}
```

---

### 3. 根据学校名称创建学校

**接口**: `POST /api/schools/create-from-name`

**请求头**:
- `Content-Type: application/json`

**请求体**:
```json
{
  "schoolName": "上海某国际学校"
}
```

**响应示例**:
```json
{
  "message": "学校创建成功",
  "school": {
    "_id": "695bac0f78b790e0a720e09c",
    "sequenceNumber": 101,
    "name": "上海某国际学校",
    "website": "https://example.com",
    "country": "中国",
    "city": "上海",
    "nature": "民办国际学校",
    "coveredStages": "K-12",
    ...
  }
}
```

**错误响应**:
- `400`: 学校名称不能为空
```json
{
  "message": "学校名称不能为空"
}
```

- `404`: 无法查询到该学校的信息
```json
{
  "message": "无法查询到该学校的信息"
}
```

**特殊说明**:
- 如果学校已存在，返回已存在的学校信息
- 后端会通过 AI 自动查询并填充学校基础信息

---

### 4. 基础对比（多学校）

**接口**: `POST /api/schools/compare`

**请求头**:
- `Content-Type: application/json`

**请求体**:
```json
{
  "schoolIds": [
    "695bac0f78b790e0a720e09c",
    "695bac0f78b790e0a720e09d",
    "695bac0f78b790e0a720e09e"
  ]
}
```

**限制**:
- 最少 2 所学校
- 最多 5 所学校

**响应示例**:
```json
{
  "schools": [
    {
      "_id": "695bac0f78b790e0a720e09c",
      "name": "上海浦东新区民办万科学校",
      "website": "https://vsp.dtd-edu.cn",
      "country": "中国",
      "city": "上海",
      "nature": "民办双语K-12学校",
      "coveredStages": "K-12",
      ...
    },
    {
      "_id": "695bac0f78b790e0a720e09d",
      "name": "上海某国际学校",
      ...
    }
  ]
}
```

**错误响应**:
- `400`: 参数错误
```json
{
  "message": "至少需要选择2所学校进行对比"
}
```

```json
{
  "message": "最多只能对比5所学校"
}
```

- `404`: 部分学校不存在
```json
{
  "message": "部分学校不存在"
}
```

---

### 5. AI 评分对比

**接口**: `POST /api/schools/compare-scoring`

**请求头**:
- `Content-Type: application/json`

**请求体**:
```json
{
  "schoolIds": [
    "695bac0f78b790e0a720e09c",
    "695bac0f78b790e0a720e09d",
    "695bac0f78b790e0a720e09e"
  ]
}
```

**限制**:
- 最少 2 所学校
- 最多 3 所学校（AI 评估限制）

**响应示例**:
```json
{
  "schools": [
    {
      "_id": "695bac0f78b790e0a720e09c",
      "name": "上海浦东新区民办万科学校",
      ...
    },
    {
      "_id": "695bac0f78b790e0a720e09d",
      "name": "上海某国际学校",
      ...
    }
  ],
  "scoring": {
    "comparisonTable": [
      {
        "dimension": "科研",
        "indicator": "课程声誉与体系成熟度",
        "weight": 25,
        "scores": {
          "上海浦东新区民办万科学校": 22.5,
          "上海某国际学校": 20.0
        },
        "explanations": {
          "上海浦东新区民办万科学校": "该校IB课程体系完整，获得官方认证...",
          "上海某国际学校": "该校课程体系较为成熟..."
        }
      },
      {
        "dimension": "科研",
        "indicator": "教学成果与影响力",
        "weight": 20,
        "scores": {
          "上海浦东新区民办万科学校": 18.0,
          "上海某国际学校": 16.5
        },
        "explanations": {
          "上海浦东新区民办万科学校": "学生在学术竞赛中表现优异...",
          "上海某国际学校": "教学成果良好..."
        }
      }
      // ... 更多指标
    ],
    "totalScores": {
      "上海浦东新区民办万科学校": 85.5,
      "上海某国际学校": 78.2
    },
    "summary": {
      "上海浦东新区民办万科学校": {
        "totalScore": 85.5,
        "strengths": "IB课程体系完整，教学成果突出",
        "characteristics": "注重学生全面发展，国际化程度高",
        "suitableFor": "适合希望接受国际化教育，注重学术成果的家庭"
      },
      "上海某国际学校": {
        "totalScore": 78.2,
        "strengths": "课程设置灵活，师资力量强",
        "characteristics": "注重个性化发展",
        "suitableFor": "适合希望个性化教育的家庭"
      },
      "conclusion": "综合对比，上海浦东新区民办万科学校在课程体系和教学成果方面表现更优..."
    }
  }
}
```

**错误响应**:
- `400`: 参数错误
```json
{
  "message": "至少需要选择2所学校进行对比"
}
```

```json
{
  "message": "最多只能对比3所学校进行AI评估"
}
```

- `404`: 部分学校不存在
```json
{
  "message": "部分学校不存在"
}
```

- `500`: 服务器错误（AI 评估失败）
```json
{
  "message": "服务器错误",
  "error": "AI评估失败: ..."
}
```

**特殊说明**:
- 如果学校已有完整的 AI 评估数据，直接从数据库返回
- 如果缺少数据，会调用 AI API 进行评估（可能需要较长时间）
- 评估结果会自动保存到数据库

---

## 数据字段说明

### 学校基础字段

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `_id` | String | MongoDB ID | "695bac0f78b790e0a720e09c" |
| `sequenceNumber` | Int | 序号 | 3 |
| `name` | String | 学校名称（必填） | "上海浦东新区民办万科学校" |
| `website` | String | 网址 | "https://vsp.dtd-edu.cn" |
| `country` | String | 国家 | "中国" |
| `city` | String | 城市 | "上海" |
| `nature` | String | 学校性质 | "民办双语K-12学校" |
| `coveredStages` | String | 涵盖学段 | "K-12" |

### 学段设置字段

| 字段名 | 类型 | 说明 | 可能值 |
|--------|------|------|--------|
| `kindergarten` | String | 幼儿园 | "有" / "无" |
| `primary` | String | 小学 | "有" / "无" |
| `juniorHigh` | String | 初中 | "有" / "无" |
| `seniorHigh` | String | 高中 | "有" / "无" |

### IB 课程字段

| 字段名 | 类型 | 说明 | 可能值 |
|--------|------|------|--------|
| `ibPYP` | String | IB PYP | "有" / "无" |
| `ibMYP` | String | IB MYP | "有" / "无" |
| `ibDP` | String | IB DP | "有" / "无" |
| `ibCP` | String | IB CP | "有" / "无" |

### 其他课程字段

| 字段名 | 类型 | 说明 | 可能值 |
|--------|------|------|--------|
| `aLevel` | String | A-Level | "有" / "无" |
| `ap` | String | AP | "有" / "无" |
| `canadian` | String | 加拿大课程 | "有" / "无" |
| `australian` | String | 澳大利亚课程 | "有" / "无" |
| `igcse` | String | IGCSE | "有" / "无" |
| `otherCourses` | String | 其他课程 | 任意字符串 |

### AI 评估字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `AI评估_总分` | Double | AI 评估总分（满分 100） |
| `AI评估_课程声誉与体系成熟度_得分` | Double | 课程声誉与体系成熟度得分 |
| `AI评估_课程声誉与体系成熟度_说明` | String | 课程声誉与体系成熟度说明 |
| `AI评估_教学成果与影响力_得分` | Double | 教学成果与影响力得分 |
| `AI评估_教学成果与影响力_说明` | String | 教学成果与影响力说明 |
| `AI评估_大学认可度_得分` | Double | 大学认可度得分 |
| `AI评估_大学认可度_说明` | String | 大学认可度说明 |
| `AI评估_升学成果_得分` | Double | 升学成果得分 |
| `AI评估_升学成果_说明` | String | 升学成果说明 |
| `AI评估_师生比_得分` | Double | 师生比得分 |
| `AI评估_师生比_说明` | String | 师生比说明 |
| `AI评估_教师教育背景与稳定性_得分` | Double | 教师教育背景与稳定性得分 |
| `AI评估_教师教育背景与稳定性_说明` | String | 教师教育背景与稳定性说明 |
| `AI评估_国际教员比例_得分` | Double | 国际教员比例得分 |
| `AI评估_国际教员比例_说明` | String | 国际教员比例说明 |
| `AI评估_国际学生比例_得分` | Double | 国际学生比例得分 |
| `AI评估_国际学生比例_说明` | String | 国际学生比例说明 |
| `AI评估_国际研究网络_得分` | Double | 国际研究网络得分 |
| `AI评估_国际研究网络_说明` | String | 国际研究网络说明 |
| `AI评估_品牌与社区影响力_得分` | Double | 品牌与社区影响力得分 |
| `AI评估_品牌与社区影响力_说明` | String | 品牌与社区影响力说明 |
| `AI评估_最终总结_JSON` | String | 最终总结（JSON 格式字符串） |

---

## 错误处理

### HTTP 状态码

- `200`: 成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器错误

### 错误响应格式

```json
{
  "message": "错误描述",
  "error": "详细错误信息（可选）"
}
```

---

## 注意事项

1. **API 速率限制**: 当前没有严格的速率限制，但建议：
   - 避免过于频繁的请求（建议间隔至少 1 秒）
   - 使用分页获取大量数据
   - 缓存数据以减少请求次数

2. **AI 评估耗时**: AI 评分对比可能需要较长时间（10-30 秒），建议：
   - 显示加载状态
   - 实现超时处理
   - 考虑异步处理和后台任务

3. **数据更新**: 学校数据可能会通过 AI 自动补充，建议：
   - 定期刷新数据
   - 缓存策略要合理

4. **字段映射**: 中文字段名在 Swift 中需要使用 `CodingKeys` 进行映射

---

## 测试建议

### 使用 Postman 或 curl 测试

```bash
# 搜索学校
curl "https://mooyu.cc/api/schools?search=万科"

# 获取学校详情
curl "https://mooyu.cc/api/schools/695bac0f78b790e0a720e09c"

# 基础对比
curl -X POST "https://mooyu.cc/api/schools/compare" \
  -H "Content-Type: application/json" \
  -d '{"schoolIds": ["id1", "id2"]}'

# AI评分对比
curl -X POST "https://mooyu.cc/api/schools/compare-scoring" \
  -H "Content-Type: application/json" \
  -d '{"schoolIds": ["id1", "id2"]}'
```

---

**最后更新**: 2025-01-XX

