# AI评估数据映射说明

本文档说明AI返回的数据结构与数据库存储字段、CSV导入导出字段以及前端渲染的对应关系。

**数据存储架构：**
- **主要存储**：MongoDB 数据库
- **数据导入导出**：CSV 文件（字段名称与数据库字段一致）
- **评估体系配置**：`evaluation-system.js`（动态读取）

## 一、AI返回的数据结构

AI返回的JSON格式如下：

```json
{
  "comparisonTable": [
    {
      "dimension": "学术卓越",                // 一级维度
      "indicator": "课程与融合",              // 二级指标
      "weight": 25,                           // 权重（百分比）
      "scores": {
        "学校1名称": 23.0,                    // 得分（保留一位小数）
        "学校2名称": 22.0
      },
      "explanations": {
        "学校1名称": "概括性说明文字",         // 评分说明
        "学校2名称": "概括性说明文字"
      }
    },
    // ... 其他9个二级指标
  ],
  "totalScores": {
    "学校1名称": 78.0,                        // 总分（保留一位小数）
    "学校2名称": 80.0
  },
  "summary": {
    "学校1名称": {
      "totalScore": 78.0,
      "strengths": "优势描述",
      "characteristics": "特点描述",
      "suitableFor": "适合的家庭类型"
    },
    "学校2名称": {
      "totalScore": 80.0,
      "strengths": "优势描述",
      "characteristics": "特点描述",
      "suitableFor": "适合的家庭类型"
    },
    "conclusion": "核心结论和建议"            // 全局结论
  }
}
```

## 二、数据库存储字段映射

**注意：** 实际代码使用 MongoDB 数据库存储，CSV 主要用于数据导入导出。数据库字段与 CSV 字段名称一致。

### 2.1 二级指标字段映射表

**评估体系配置：** 评估体系从 `evaluation-system.js` 动态读取，包含以下维度：
- **学术卓越**（权重30%）：课程与融合（15%）、学术评估（15%）
- **全球升学**（权重20%）：升学成果（10%）、规划体系（10%）
- **师资交互**（权重15%）：师资稳定（8%）、课堂文化（7%）
- **全人成长**（权重20%）：活动系统（10%）、幸福感/生活（10%）
- **社会影响**（权重15%）：品牌与社区影响力（15%）

| AI返回的indicator | 数据库/CSV字段名（得分） | 数据库/CSV字段名（说明） |
|------------------|-----------------|-----------------|
| 课程与融合 | `AI评估_课程与融合_得分` | `AI评估_课程与融合_说明` |
| 学术评估 | `AI评估_学术评估_得分` | `AI评估_学术评估_说明` |
| 升学成果 | `AI评估_升学成果_得分` | `AI评估_升学成果_说明` |
| 规划体系 | `AI评估_规划体系_得分` | `AI评估_规划体系_说明` |
| 师资稳定 | `AI评估_师资稳定_得分` | `AI评估_师资稳定_说明` |
| 课堂文化 | `AI评估_课堂文化_得分` | `AI评估_课堂文化_说明` |
| 活动系统 | `AI评估_活动系统_得分` | `AI评估_活动系统_说明` |
| 幸福感/生活 | `AI评估_幸福感/生活_得分` | `AI评估_幸福感/生活_说明` |
| 品牌与社区影响力 | `AI评估_品牌与社区影响力_得分` | `AI评估_品牌与社区影响力_说明` |

### 2.2 其他字段

| AI返回的字段 | 数据库/CSV字段名 | 数据类型 | 说明 |
|------------|----------------|---------|------|
| `totalScores[学校名称]` | `AI评估_总分` | Number | 总分，存储为数字类型 |
| `summary[学校名称]` | `AI评估_最终总结_JSON` | String | JSON格式字符串，包含 `totalScore`, `strengths`, `characteristics`, `suitableFor` |

**JSON结构示例：**
```json
{
  "totalScore": 78.0,
  "strengths": "优势描述",
  "characteristics": "特点描述",
  "suitableFor": "适合的家庭类型"
}
```

## 三、数据转换逻辑

### 3.1 从AI返回数据保存到数据库

**步骤：**
1. 遍历 `comparisonTable` 数组
2. 对于每个学校，根据 `indicator` 名称找到对应的数据库字段
3. 将 `scores[学校名称]` 转换为数字类型，保存到对应的 `_得分` 字段
4. 将 `explanations[学校名称]` 保存到对应的 `_说明` 字段
5. 将 `totalScores[学校名称]` 转换为数字类型，保存到 `AI评估_总分`
6. 将 `summary[学校名称]` 对象使用 `safeSaveJSONString()` 序列化为JSON，保存到 `AI评估_最终总结_JSON`
7. 确保 `summary.totalScore` 与 `totalScores` 保持一致

**实际代码实现：**
```javascript
// 指标名称到数据库字段的映射
const indicatorToFieldMap = {
  '课程与融合': '课程与融合',
  '学术评估': '学术评估',
  '升学成果': '升学成果',
  '规划体系': '规划体系',
  '师资稳定': '师资稳定',
  '课堂文化': '课堂文化',
  '活动系统': '活动系统',
  '幸福感/生活': '幸福感/生活',
  '品牌与社区影响力': '品牌与社区影响力'
};

async function saveAIScoringToDB(schools, aiResult) {
  const updatePromises = schools.map(async (school) => {
    const schoolName = school.name;
    const updateData = {};
    
    // 保存总分（存储为数字类型）
    if (aiResult.totalScores && aiResult.totalScores[schoolName] !== undefined) {
      updateData['AI评估_总分'] = parseFloat(aiResult.totalScores[schoolName]);
    }
    
    // 保存各二级指标的得分和说明
    if (aiResult.comparisonTable) {
      aiResult.comparisonTable.forEach(row => {
        const indicator = row.indicator;
        const fieldBase = indicatorToFieldMap[indicator];
        
        if (fieldBase && row.scores && row.scores[schoolName] !== undefined) {
          // 得分存储为数字类型
          updateData[`AI评估_${fieldBase}_得分`] = parseFloat(row.scores[schoolName]);
        }
        
        if (fieldBase && row.explanations && row.explanations[schoolName]) {
          updateData[`AI评估_${fieldBase}_说明`] = row.explanations[schoolName];
        }
      });
    }
    
    // 保存最终总结（使用安全JSON序列化函数）
    if (aiResult.summary) {
      // 支持学校名称模糊匹配
      let summaryData = aiResult.summary[schoolName] || 
        Object.keys(aiResult.summary).find(key => 
          key === schoolName || key.includes(schoolName) || schoolName.includes(key)
        );
      
      if (summaryData) {
        // 确保 summary.totalScore 与 totalScores 保持一致
        if (aiResult.totalScores && aiResult.totalScores[schoolName] !== undefined) {
          summaryData.totalScore = parseFloat(aiResult.totalScores[schoolName]);
        }
        
        updateData['AI评估_最终总结_JSON'] = safeSaveJSONString(summaryData);
      }
    }
    
    // 更新数据库
    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      await School.updateOne({ _id: school._id }, { $set: updateData });
    }
  });
  
  await Promise.all(updatePromises);
}
```

**关键点：**
- 得分字段存储为**数字类型**（Number），不保留小数位格式
- 前端显示时使用 `formatScore()` 函数格式化为一位小数
- 使用 `safeSaveJSONString()` 函数安全保存JSON，自动处理格式错误
- 支持学校名称模糊匹配，提高数据保存的容错性
- 自动确保 `summary.totalScore` 与 `totalScores` 的一致性

### 3.2 从数据库读取数据转换为AI返回格式

**步骤：**
1. 从 `evaluation-system.js` 读取评估体系配置（包含维度、指标和权重）
2. 根据评估体系动态构建 `comparisonTable` 数组
3. 从数据库读取每个学校的得分和说明字段
4. 构建 `totalScores` 对象
5. 解析 `AI评估_最终总结_JSON`，构建 `summary` 对象
6. 自动修复格式错误的JSON和数据不一致问题

**实际代码实现：**
```javascript
function convertDBToAIFormat(schools, evaluationSystem) {
  // 从评估体系配置动态获取所有二级指标
  const indicators = [];
  evaluationSystem.dimensions.forEach(dimension => {
    dimension.indicators.forEach(indicator => {
      indicators.push({
        dimension: dimension.name,
        indicator: indicator.name,
        weight: indicator.weight
      });
    });
  });
  
  const comparisonTable = [];
  const totalScores = {};
  const summary = {};
  
  // 为每个指标构建comparisonTable行
  indicators.forEach(ind => {
    const row = {
      dimension: ind.dimension,
      indicator: ind.indicator,
      weight: ind.weight,
      scores: {},
      explanations: {}
    };
    
    // 从每个学校读取对应的得分和说明
    schools.forEach(school => {
      const fieldBase = ind.indicator;
      const scoreField = `AI评估_${fieldBase}_得分`;
      const explanationField = `AI评估_${fieldBase}_说明`;
      
      // 检查 null 和 undefined
      if (school[scoreField] !== null && school[scoreField] !== undefined) {
        row.scores[school.name] = parseFloat(school[scoreField]);
      }
      
      if (school[explanationField]) {
        row.explanations[school.name] = school[explanationField];
      }
    });
    
    comparisonTable.push(row);
  });
  
  // 读取总分
  schools.forEach(school => {
    if (school['AI评估_总分'] !== null && school['AI评估_总分'] !== undefined) {
      totalScores[school.name] = parseFloat(school['AI评估_总分']);
    }
  });
  
  // 读取最终总结（带自动修复功能）
  schools.forEach(school => {
    if (school['AI评估_最终总结_JSON']) {
      try {
        summary[school.name] = JSON.parse(school['AI评估_最终总结_JSON']);
      } catch (e) {
        // 如果标准解析失败，尝试修复格式错误的JSON
        const fixedSummary = tryFixInvalidJSON(school['AI评估_最终总结_JSON']);
        if (fixedSummary && typeof fixedSummary === 'object') {
          summary[school.name] = fixedSummary;
          // 将修复后的JSON保存回数据库
          const correctedJSON = safeSaveJSONString(fixedSummary);
          School.updateOne(
            { _id: school._id }, 
            { $set: { 'AI评估_最终总结_JSON': correctedJSON, updatedAt: new Date() } }
          );
        }
      }
    }
  });
  
  // 确保 summary 中的 totalScore 与 totalScores 保持一致
  schools.forEach(school => {
    const schoolName = school.name;
    const totalScoreFromField = totalScores[schoolName];
    const summaryData = summary[schoolName];
    
    if (totalScoreFromField !== undefined && summaryData) {
      if (summaryData.totalScore === undefined || 
          Math.abs(parseFloat(summaryData.totalScore) - parseFloat(totalScoreFromField)) > 0.01) {
        summaryData.totalScore = totalScoreFromField;
        // 将修复后的JSON保存回数据库
        const correctedJSON = safeSaveJSONString(summaryData);
        School.updateOne(
          { _id: school._id }, 
          { $set: { 'AI评估_最终总结_JSON': correctedJSON, updatedAt: new Date() } }
        );
      }
    }
  });
  
  return {
    comparisonTable,
    totalScores,
    summary,
    schoolsNeedingSummaryFix: schools.filter(s => !summary[s.name])
  };
}
```

**关键点：**
- 评估体系配置从 `evaluation-system.js` 动态读取，支持灵活配置
- 自动修复格式错误的JSON（使用 `tryFixInvalidJSON()` 函数）
- 自动确保 `summary.totalScore` 与 `totalScores` 的一致性
- 修复后的数据会自动保存回数据库
- 返回需要修复的学校列表，供调用者处理

## 四、数据一致性检查

### 4.1 字段完整性
- ✅ 所有10个二级指标都有对应的 `_得分` 和 `_说明` 字段
- ✅ 总分字段：`AI评估_总分`
- ✅ 最终总结字段：`AI评估_最终总结_JSON`

### 4.2 数据格式一致性
- **得分格式**：
  - 数据库存储：数字类型（Number），不保留小数位格式
  - 前端显示：使用 `formatScore()` 函数格式化为一位小数（如：23.0, 16.0）
  - `formatScore()` 函数定义：`numScore.toFixed(1)`
- **说明格式**：纯文本，概括性描述，不包含第三级维度详情
- **JSON格式**：
  - 使用 `safeSaveJSONString()` 函数安全保存JSON
  - 自动处理格式错误，支持修复常见JSON格式问题
  - 使用 `tryFixInvalidJSON()` 函数修复格式错误的JSON

### 4.3 前端渲染一致性
前端从 `scoringData` 对象读取数据：
- `scoringData.comparisonTable` → 渲染对比表格
- `scoringData.totalScores` → 渲染总分行
- `scoringData.summary` → 渲染最终总结

**关键点：**
1. 从数据库读取数据后，必须转换为与AI返回相同的格式
2. 前端渲染代码不需要修改，因为它只依赖数据结构，不关心数据来源
3. 得分在数据库中以数字类型存储，前端显示时使用 `formatScore()` 函数格式化为一位小数
4. 评估体系配置从 `evaluation-system.js` 动态读取，确保指标和权重的一致性

## 五、使用流程

### 5.1 首次评估（使用AI）
1. 调用AI API获取评估结果
2. 使用 `saveAIScoringToDB()` 将结果保存到数据库
3. 返回给前端渲染

### 5.2 后续查询（使用缓存）
1. 检查数据库中是否有该学校的AI评估数据
2. 如果有，从数据库读取
3. 使用 `convertDBToAIFormat()` 转换为AI返回格式（自动修复数据不一致问题）
4. 返回给前端渲染（与AI返回的格式完全一致）

## 六、注意事项

1. **学校名称匹配**：
   - 优先使用精确匹配
   - 如果精确匹配失败，支持模糊匹配（包含关系）
   - 匹配失败时会记录警告日志
2. **数据更新**：如果学校信息更新，可能需要重新评估
3. **空值处理**：
   - 数据库字段为 `null` 或 `undefined` 时，前端会显示"—"
   - `formatScore()` 函数会自动处理空值
4. **JSON解析错误**：
   - 使用 `tryFixInvalidJSON()` 函数自动修复常见JSON格式错误
   - 修复后的数据会自动保存回数据库
   - 如果无法修复，会记录错误日志并返回需要修复的学校列表
5. **数据一致性**：
   - 自动确保 `summary.totalScore` 与 `totalScores` 保持一致
   - 不一致时会自动修复并保存回数据库
6. **conclusion字段**：`summary.conclusion` 是全局对比结论，只在多学校对比时生成，不需要存储到单个学校的记录中。如果需要在对比时显示，可以在对比时重新生成或从对比缓存中读取。
7. **评估体系配置**：评估体系从 `evaluation-system.js` 动态读取，修改配置后需要重启服务器

## 七、辅助函数说明

### 7.1 safeSaveJSONString()

**功能：** 安全地将数据序列化为JSON字符串

**实现逻辑：**
1. 如果输入是字符串，先验证是否为有效JSON，如果是则重新序列化确保格式正确
2. 如果输入是对象，直接序列化并验证
3. 如果字符串解析失败，尝试使用 `tryFixInvalidJSON()` 修复

**使用场景：** 保存 `AI评估_最终总结_JSON` 字段时使用

### 7.2 tryFixInvalidJSON()

**功能：** 尝试修复格式错误的JSON字符串

**修复策略：**
1. 修复属性名没有引号的问题（如：`{name: "value"}` → `{"name": "value"}`）
2. 修复字符串值没有引号的问题
3. 处理转义字符

**使用场景：** 读取数据库中的JSON字段时，如果标准解析失败，使用此函数尝试修复

### 7.3 formatScore()

**功能：** 格式化得分为一位小数

**实现：** `numScore.toFixed(1)`

**处理逻辑：**
- 如果得分为 `null`、`undefined`、`"—"` 或空字符串，返回 `"—"`
- 如果无法解析为数字，返回 `"—"`
- 否则返回格式化为一位小数的字符串（如：`"23.0"`）

**使用场景：** 前端渲染得分时使用

## 八、数据一致性验证

### 8.1 字段对应关系验证

**AI返回 → 数据库存储：**
- ✅ `comparisonTable[].scores[学校名]` → `AI评估_{指标名}_得分`（Number类型）
- ✅ `comparisonTable[].explanations[学校名]` → `AI评估_{指标名}_说明`（String类型）
- ✅ `totalScores[学校名]` → `AI评估_总分`（Number类型）
- ✅ `summary[学校名]` → `AI评估_最终总结_JSON`（String类型，JSON格式）
- ⚠️ `summary.conclusion` → 不存储（对比时生成）

**数据库存储 → AI返回格式：**
- ✅ 所有字段可以完整转换回AI返回格式
- ✅ 前端渲染代码无需修改，直接使用转换后的数据
- ✅ 自动修复数据不一致和JSON格式错误

### 8.2 数据格式验证

- ✅ 得分格式：
  - 数据库存储：数字类型（Number）
  - 前端显示：使用 `formatScore()` 格式化为一位小数（23.0, 16.0）
- ✅ 说明格式：纯文本，概括性描述
- ✅ JSON格式：
  - 使用 `safeSaveJSONString()` 安全保存
  - 标准JSON格式，包含 `totalScore`, `strengths`, `characteristics`, `suitableFor`
  - 支持自动修复格式错误

### 8.3 前端渲染一致性

前端期望的数据结构：
```javascript
{
  comparisonTable: [
    {
      dimension: "学术卓越",
      indicator: "课程与融合",
      weight: 25,
      scores: { "学校名": 23.0 },
      explanations: { "学校名": "说明文字" }
    },
    // ... 其他9个指标
  ],
  totalScores: { "学校名": 78.0 },
  summary: {
    "学校名": {
      totalScore: 78.0,
      strengths: "...",
      characteristics: "...",
      suitableFor: "..."
    },
    conclusion: "..."  // 可选，对比时生成
  }
}
```

**结论：** ✅ 数据结构完全对应，可以保持一致性

