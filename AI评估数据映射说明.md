# AI评估数据映射说明

本文档说明AI返回的数据结构与CSV存储字段、数据库字段以及前端渲染的对应关系。

## 一、AI返回的数据结构

AI返回的JSON格式如下：

```json
{
  "comparisonTable": [
    {
      "dimension": "科研",                    // 一级维度
      "indicator": "课程声誉与体系成熟度",      // 二级指标
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

## 二、CSV存储字段映射

### 2.1 二级指标字段映射表

| AI返回的indicator | CSV字段名（得分） | CSV字段名（说明） |
|------------------|-----------------|-----------------|
| 课程声誉与体系成熟度 | `AI评估_课程声誉与体系成熟度_得分` | `AI评估_课程声誉与体系成熟度_说明` |
| 教学成果与影响力 | `AI评估_教学成果与影响力_得分` | `AI评估_教学成果与影响力_说明` |
| 大学认可度 | `AI评估_大学认可度_得分` | `AI评估_大学认可度_说明` |
| 升学成果 | `AI评估_升学成果_得分` | `AI评估_升学成果_说明` |
| 师生比 | `AI评估_师生比_得分` | `AI评估_师生比_说明` |
| 教师教育背景与稳定性 | `AI评估_教师教育背景与稳定性_得分` | `AI评估_教师教育背景与稳定性_说明` |
| 国际教员比例 | `AI评估_国际教员比例_得分` | `AI评估_国际教员比例_说明` |
| 国际学生比例 | `AI评估_国际学生比例_得分` | `AI评估_国际学生比例_说明` |
| 国际研究网络 | `AI评估_国际研究网络_得分` | `AI评估_国际研究网络_说明` |
| 品牌与社区影响力 | `AI评估_品牌与社区影响力_得分` | `AI评估_品牌与社区影响力_说明` |

### 2.2 其他字段

| AI返回的字段 | CSV字段名 |
|------------|----------|
| `totalScores[学校名称]` | `AI评估_总分` |
| `summary[学校名称]` | `AI评估_最终总结_JSON`（JSON格式） |

## 三、数据转换逻辑

### 3.1 从AI返回数据保存到CSV/数据库

**步骤：**
1. 遍历 `comparisonTable` 数组
2. 对于每个学校，根据 `indicator` 名称找到对应的CSV字段
3. 将 `scores[学校名称]` 保存到对应的 `_得分` 字段
4. 将 `explanations[学校名称]` 保存到对应的 `_说明` 字段
5. 将 `totalScores[学校名称]` 保存到 `AI评估_总分`
6. 将 `summary[学校名称]` 对象序列化为JSON，保存到 `AI评估_最终总结_JSON`

**示例代码：**
```javascript
// 指标名称到CSV字段的映射
const indicatorToFieldMap = {
  '课程声誉与体系成熟度': '课程声誉与体系成熟度',
  '教学成果与影响力': '教学成果与影响力',
  '大学认可度': '大学认可度',
  '升学成果': '升学成果',
  '师生比': '师生比',
  '教师教育背景与稳定性': '教师教育背景与稳定性',
  '国际教员比例': '国际教员比例',
  '国际学生比例': '国际学生比例',
  '国际研究网络': '国际研究网络',
  '品牌与社区影响力': '品牌与社区影响力'
};

function saveAIScoringToCSV(schoolName, aiResult) {
  const schoolData = {};
  
  // 保存总分
  if (aiResult.totalScores && aiResult.totalScores[schoolName]) {
    schoolData['AI评估_总分'] = aiResult.totalScores[schoolName].toFixed(1);
  }
  
  // 保存各二级指标的得分和说明
  if (aiResult.comparisonTable) {
    aiResult.comparisonTable.forEach(row => {
      const indicator = row.indicator;
      const fieldBase = indicatorToFieldMap[indicator];
      
      if (fieldBase && row.scores && row.scores[schoolName] !== undefined) {
        schoolData[`AI评估_${fieldBase}_得分`] = parseFloat(row.scores[schoolName]).toFixed(1);
      }
      
      if (fieldBase && row.explanations && row.explanations[schoolName]) {
        schoolData[`AI评估_${fieldBase}_说明`] = row.explanations[schoolName];
      }
    });
  }
  
  // 保存最终总结
  if (aiResult.summary && aiResult.summary[schoolName]) {
    schoolData['AI评估_最终总结_JSON'] = JSON.stringify(aiResult.summary[schoolName]);
  }
  
  return schoolData;
}
```

### 3.2 从CSV/数据库读取数据转换为AI返回格式

**步骤：**
1. 读取学校的所有AI评估字段
2. 构建 `comparisonTable` 数组，按指标分组
3. 构建 `totalScores` 对象
4. 解析 `AI评估_最终总结_JSON`，构建 `summary` 对象

**示例代码：**
```javascript
function convertCSVToAIFormat(schools) {
  // 定义所有二级指标（按评估体系顺序）
  const indicators = [
    { dimension: '科研', indicator: '课程声誉与体系成熟度', weight: 25 },
    { dimension: '科研', indicator: '教学成果与影响力', weight: 20 },
    { dimension: '升学', indicator: '大学认可度', weight: 15 },
    { dimension: '升学', indicator: '升学成果', weight: 5 },
    { dimension: '教学', indicator: '师生比', weight: 10 },
    { dimension: '教学', indicator: '教师教育背景与稳定性', weight: 5 },
    { dimension: '国际化', indicator: '国际教员比例', weight: 5 },
    { dimension: '国际化', indicator: '国际学生比例', weight: 5 },
    { dimension: '国际化', indicator: '国际研究网络', weight: 5 },
    { dimension: '社会影响', indicator: '品牌与社区影响力', weight: 5 }
  ];
  
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
      
      if (school[scoreField]) {
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
    if (school['AI评估_总分']) {
      totalScores[school.name] = parseFloat(school['AI评估_总分']);
    }
  });
  
  // 读取最终总结
  schools.forEach(school => {
    if (school['AI评估_最终总结_JSON']) {
      try {
        summary[school.name] = JSON.parse(school['AI评估_最终总结_JSON']);
      } catch (e) {
        console.error('解析最终总结JSON失败:', e);
      }
    }
  });
  
  // 注意：conclusion是全局字段，只在对比时生成，不需要存储到单个学校的记录中
  // 如果需要在对比时显示conclusion，可以在对比时重新生成或从缓存中读取
  
  return {
    comparisonTable,
    totalScores,
    summary
  };
}
```

## 四、数据一致性检查

### 4.1 字段完整性
- ✅ 所有10个二级指标都有对应的 `_得分` 和 `_说明` 字段
- ✅ 总分字段：`AI评估_总分`
- ✅ 最终总结字段：`AI评估_最终总结_JSON`

### 4.2 数据格式一致性
- **得分格式**：所有得分都保留一位小数（如：23.0, 16.0）
- **说明格式**：纯文本，概括性描述，不包含第三级维度详情
- **JSON格式**：`AI评估_最终总结_JSON` 使用标准JSON格式

### 4.3 前端渲染一致性
前端从 `scoringData` 对象读取数据：
- `scoringData.comparisonTable` → 渲染对比表格
- `scoringData.totalScores` → 渲染总分行
- `scoringData.summary` → 渲染最终总结

**关键点：**
1. 从CSV/数据库读取数据后，必须转换为与AI返回相同的格式
2. 前端渲染代码不需要修改，因为它只依赖数据结构，不关心数据来源
3. 得分必须保留一位小数，使用 `formatScore()` 函数格式化

## 五、使用流程

### 5.1 首次评估（使用AI）
1. 调用AI API获取评估结果
2. 将结果保存到CSV/数据库
3. 返回给前端渲染

### 5.2 后续查询（使用缓存）
1. 检查CSV/数据库中是否有该学校的AI评估数据
2. 如果有，从CSV/数据库读取
3. 转换为AI返回格式
4. 返回给前端渲染（与AI返回的格式完全一致）

## 六、注意事项

1. **学校名称匹配**：确保CSV中的学校名称与AI返回的学校名称完全一致
2. **数据更新**：如果学校信息更新，可能需要重新评估
3. **空值处理**：如果某个字段为空，前端会显示"—"
4. **JSON解析错误**：解析 `AI评估_最终总结_JSON` 时要有错误处理
5. **conclusion字段**：`summary.conclusion` 是全局对比结论，只在多学校对比时生成，不需要存储到单个学校的记录中。如果需要在对比时显示，可以在对比时重新生成或从对比缓存中读取。

## 七、数据一致性验证

### 7.1 字段对应关系验证

**AI返回 → CSV存储：**
- ✅ `comparisonTable[].scores[学校名]` → `AI评估_{指标名}_得分`
- ✅ `comparisonTable[].explanations[学校名]` → `AI评估_{指标名}_说明`
- ✅ `totalScores[学校名]` → `AI评估_总分`
- ✅ `summary[学校名]` → `AI评估_最终总结_JSON`
- ⚠️ `summary.conclusion` → 不存储（对比时生成）

**CSV存储 → AI返回格式：**
- ✅ 所有字段可以完整转换回AI返回格式
- ✅ 前端渲染代码无需修改，直接使用转换后的数据

### 7.2 数据格式验证

- ✅ 得分格式：保留一位小数（23.0, 16.0）
- ✅ 说明格式：纯文本，概括性描述
- ✅ JSON格式：标准JSON，包含 strengths, characteristics, suitableFor

### 7.3 前端渲染一致性

前端期望的数据结构：
```javascript
{
  comparisonTable: [
    {
      dimension: "科研",
      indicator: "课程声誉与体系成熟度",
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

