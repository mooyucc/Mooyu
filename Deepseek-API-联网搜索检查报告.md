# Deepseek API 联网搜索功能检查报告

## 检查日期
2025年1月（基于当前代码和网络搜索结果）

## 检查结果总结

### 1. 当前配置
- **使用的模型**: `deepseek-chat`
- **API URL**: `https://api.deepseek.com/v1/chat/completions`
- **当前参数**: `temperature: 0.3`, `max_tokens: 4000`
- **未启用联网搜索参数**

### 2. Deepseek API 联网搜索功能现状

根据搜索结果和官方信息：

#### ✅ **支持联网搜索的模型**
- **deepseek-r1** 模型支持联网搜索功能
  - 在阿里云 LLM API 控制台可以启用"联网搜索"插件
  - 在腾讯云平台也支持联网搜索功能
  - 需要设置参数：`enable_search: true`
  - 使用夸克搜索返回摘要片段

#### ❌ **不支持联网搜索的模型**
- **deepseek-chat**（当前使用的模型）
- **deepseek-v2**
- **deepseek-v3**

### 3. 关键发现

1. **模型限制**
   - 联网搜索功能目前**仅支持 deepseek-r1 模型**
   - 当前代码使用的 `deepseek-chat` 模型**不支持联网搜索**

2. **平台限制**
   - 联网搜索功能主要在特定平台提供：
     - 阿里云 LLM API 控制台
     - 腾讯云平台
   - 直接调用 Deepseek 官方 API 可能不支持此功能

3. **功能状态**
   - 联网搜索功能目前处于**公测阶段**
   - 可能不稳定或有限制

### 4. 测试方法

已创建测试脚本：`check-deepseek-web-search.js`

运行测试：
```bash
node check-deepseek-web-search.js
```

测试脚本会：
1. 尝试在 `deepseek-chat` 模型中启用 `enable_search` 参数
2. 测试其他可能的联网搜索参数
3. 检查可用的模型列表

### 5. 解决方案建议

#### 方案一：切换到支持联网搜索的模型（推荐，如果可用）

如果您的 API 密钥支持 `deepseek-r1` 模型：

```javascript
// 修改 server.js 中的 callDeepseekAPI 函数
body: JSON.stringify({
    model: 'deepseek-r1',  // 切换到支持联网搜索的模型
    messages: [...],
    temperature: 0.3,
    max_tokens: 4000,
    enable_search: true  // 启用联网搜索
})
```

**注意**：
- 需要确认您的 API 密钥是否支持 `deepseek-r1` 模型
- 可能需要通过特定平台（阿里云/腾讯云）使用
- 功能可能处于公测阶段

#### 方案二：集成搜索引擎 API（最可靠）

在代码层面集成搜索引擎，在调用 AI 之前先搜索：

```javascript
// 1. 先通过搜索引擎查找官网
async function searchSchoolWebsite(schoolName) {
    // 使用百度搜索 API 或 Google Custom Search API
    const searchQuery = `${schoolName} 官网`;
    // 调用搜索引擎 API
    // 返回官网 URL
}

// 2. 将搜索结果传递给 AI
const website = await searchSchoolWebsite(schoolName);
const prompt = `请访问以下学校官网：${website} ...`;
```

**优点**：
- 不依赖 AI 模型的联网能力
- 可以控制搜索逻辑
- 更可靠和可预测

**需要**：
- 申请搜索引擎 API 密钥（百度、Google 等）
- 实现搜索引擎调用逻辑

#### 方案三：使用支持网络搜索的其他 AI 模型

考虑使用其他支持网络搜索的 AI 模型：
- OpenAI GPT-4（如果支持网络搜索）
- Claude（Anthropic）
- 其他支持工具调用的模型

### 6. 当前提示词的作用

**注意**：由于确认 Deepseek API 不支持联网搜索，三步搜索法提示词已被删除。现在提示词要求 AI 基于知识库和训练数据中的信息进行评估，并明确标注信息来源的局限性。

### 7. 建议行动

1. **立即行动**：
   - ✅ 运行测试脚本验证当前 API 是否支持联网搜索
   - ✅ 检查 API 密钥是否可以使用 `deepseek-r1` 模型

2. **短期方案**：
   - 如果测试显示不支持联网搜索，考虑集成搜索引擎 API
   - 在代码层面实现搜索引擎调用，然后将结果传递给 AI

3. **长期方案**：
   - 如果 `deepseek-r1` 可用，切换到该模型并启用联网搜索
   - 或者考虑使用其他支持网络搜索的 AI 服务

### 8. 测试结果记录

**测试日期**: 2025年1月

**测试结果**:
- ✅ API 接受 `enable_search: true` 参数（不报错）
- ❌ 但 AI 明确回复："由于我无法进行实时网络搜索"
- ❌ **结论：当前 Deepseek API 不支持联网搜索功能**

**可用模型**:
- `deepseek-chat`（当前使用）
- `deepseek-reasoner`
- ❌ 没有 `deepseek-r1` 模型（该模型可能只在特定平台提供）

**测试的联网搜索参数**:
- `enable_search: true` - 被接受但不生效
- `web_search: true` - 被接受但不生效
- `use_web_search: true` - 被接受但不生效
- `search_enabled: true` - 被接受但不生效
- `enable_web_search: true` - 被接受但不生效

**结论**: 
虽然 API 接受这些参数，但实际功能未启用。AI 明确表示无法进行实时网络搜索。

---

## 相关文件

- `check-deepseek-web-search.js` - 测试脚本
- `server.js` - 主服务器文件（包含 callDeepseekAPI 函数）
- `SchoolInsight-AI提示词说明.md` - AI 提示词文档
