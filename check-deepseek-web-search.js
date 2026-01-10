/**
 * Deepseek API 联网搜索功能检查脚本
 * 
 * 此脚本用于测试 Deepseek API 是否支持联网搜索功能
 */

const DEEPSEEK_API_KEY = 'sk-d78c307ad1a84e488f19e87d59107c2e';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * 测试 Deepseek API 是否支持联网搜索
 */
async function testDeepseekWebSearch() {
    console.log('='.repeat(60));
    console.log('Deepseek API 联网搜索功能检查');
    console.log('='.repeat(60));
    console.log('');

    // 测试 1: 检查当前模型 (deepseek-chat) 是否支持 enable_search 参数
    console.log('测试 1: 尝试在 deepseek-chat 模型中启用联网搜索...');
    try {
        const response1 = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'user',
                        content: '请搜索"上海民办学校"的最新信息，并告诉我搜索结果。'
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000,
                enable_search: true  // 尝试启用联网搜索
            })
        });

        const data1 = await response1.json();
        console.log('响应状态:', response1.status);
        console.log('响应内容:', JSON.stringify(data1, null, 2));
        
        if (response1.ok) {
            console.log('✓ deepseek-chat 模型可能支持 enable_search 参数');
        } else {
            console.log('✗ deepseek-chat 模型不支持 enable_search 参数');
            console.log('错误信息:', data1.error?.message || '未知错误');
        }
    } catch (error) {
        console.log('✗ 测试失败:', error.message);
    }

    console.log('');
    console.log('-'.repeat(60));
    console.log('');

    // 测试 2: 检查是否支持其他联网搜索参数
    console.log('测试 2: 尝试其他可能的联网搜索参数...');
    const possibleParams = [
        { web_search: true },
        { use_web_search: true },
        { search_enabled: true },
        { enable_web_search: true }
    ];

    for (const params of possibleParams) {
        try {
            const response = await fetch(DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'user',
                            content: '请搜索"上海民办学校"的最新信息。'
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 500,
                    ...params
                })
            });

            const data = await response.json();
            if (response.ok) {
                console.log(`✓ 参数 ${JSON.stringify(params)} 可能被支持`);
            } else {
                console.log(`✗ 参数 ${JSON.stringify(params)} 不被支持:`, data.error?.message || '未知错误');
            }
        } catch (error) {
            console.log(`✗ 参数 ${JSON.stringify(params)} 测试失败:`, error.message);
        }
    }

    console.log('');
    console.log('-'.repeat(60));
    console.log('');

    // 测试 3: 检查模型列表，看是否有支持联网搜索的模型
    console.log('测试 3: 检查可用的模型列表...');
    try {
        const modelsResponse = await fetch('https://api.deepseek.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            }
        });

        if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            console.log('可用模型列表:');
            if (modelsData.data && Array.isArray(modelsData.data)) {
                modelsData.data.forEach(model => {
                    console.log(`  - ${model.id}`);
                });
            } else {
                console.log('  无法获取模型列表');
            }
        } else {
            console.log('✗ 无法获取模型列表:', modelsResponse.status);
        }
    } catch (error) {
        console.log('✗ 获取模型列表失败:', error.message);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('检查完成');
    console.log('='.repeat(60));
    console.log('');
    console.log('总结:');
    console.log('1. 根据搜索结果，Deepseek API 的联网搜索功能主要支持 deepseek-r1 模型');
    console.log('2. 当前代码使用的是 deepseek-chat 模型，可能不支持联网搜索');
    console.log('3. 联网搜索功能可能需要通过特定平台（如阿里云、腾讯云）使用');
    console.log('4. 建议：');
    console.log('   - 如果测试显示不支持，考虑集成搜索引擎 API（如百度、Google）');
    console.log('   - 或者切换到支持联网搜索的模型（如 deepseek-r1）');
    console.log('   - 或者使用支持网络搜索的其他 AI 模型');
}

// 运行测试
testDeepseekWebSearch().catch(console.error);
