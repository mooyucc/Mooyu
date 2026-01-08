// School Insight 前端逻辑

const API_BASE = window.location.origin;

// 状态管理
let allSchools = [];
let selectedSchoolIds = new Set();
let selectedSchoolsMap = new Map(); // 存储选中的学校对象，确保所有选中的学校都能显示
let currentView = 'list'; // 'list' 或 'compare'
let cachedBasicCompareData = null; // 缓存基础对比数据
let cachedScoringData = null; // 缓存AI评分数据
let currentCompareMode = 'basic'; // 'basic' 或 'scoring'
let evaluationTimerInterval = null; // 评估计时器定时器ID
let evaluationStartTime = null; // 评估开始时间

// DOM 元素
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const schoolsGrid = document.getElementById('schoolsGrid');
const clearResultsContainer = document.getElementById('clearResultsContainer');
const clearResultsBtn = document.getElementById('clearResultsBtn');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const evaluationProcess = document.getElementById('evaluationProcess');
const evaluationSteps = document.getElementById('evaluationSteps');
const evaluationProgressFill = document.getElementById('evaluationProgressFill');
const evaluationProgressText = document.getElementById('evaluationProgressText');
const evaluationCurrentStep = document.getElementById('evaluationCurrentStep');
const evaluationLiveLog = document.getElementById('evaluationLiveLog');
const evaluationTimerText = document.getElementById('evaluationTimerText');
const schoolsListView = document.getElementById('schoolsListView');
const compareView = document.getElementById('compareView');
const compareBar = document.getElementById('compareBar');
const selectedSchools = document.getElementById('selectedSchools');
const compareBtn = document.getElementById('compareBtn');
const basicCompareBtn = document.getElementById('basicCompareBtn');
const clearBtn = document.getElementById('clearBtn');
const backToSearchBtn = document.getElementById('backToSearchBtn');
const compareTable = document.getElementById('compareTable');
const schoolModal = document.getElementById('schoolModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const searchSection = document.querySelector('.search-section');
const pageTitle = document.querySelector('.page-title');
const modalSchoolName = document.getElementById('modalSchoolName');
const modalSchoolSubtitle = document.getElementById('modalSchoolSubtitle');
const modalBody = document.getElementById('modalBody');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始状态：隐藏学校列表，只显示搜索框和提示
    schoolsGrid.style.display = 'none';
    loadingState.style.display = 'none';
    showEmptyState('', true); // 显示初始提示
    updateClearButtonVisibility(); // 检查并更新清空按钮显示状态
    setupEventListeners();
    setupCommentListeners(); // 初始化评论功能
});

// 设置事件监听器
function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    // 监听输入框内容变化，显示/隐藏清空按钮
    searchInput.addEventListener('input', updateClearButtonVisibility);
    // 清空搜索按钮点击事件
    clearSearchBtn.addEventListener('click', clearSearch);
    // 清空搜索结果按钮点击事件
    clearResultsBtn.addEventListener('click', clearSearchResults);
    compareBtn.addEventListener('click', handleCompareScoring);
    basicCompareBtn.addEventListener('click', handleBasicCompare);
    clearBtn.addEventListener('click', clearSelection);
    backToSearchBtn.addEventListener('click', backToSearch);
    
    // 弹窗关闭事件
    modalCloseBtn.addEventListener('click', closeModal);
    schoolModal.addEventListener('click', (e) => {
        if (e.target === schoolModal) {
            closeModal();
        }
    });
    
    // ESC键关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && schoolModal.classList.contains('active')) {
            closeModal();
        }
    });
}

// 更新清空按钮的显示状态
function updateClearButtonVisibility() {
    if (searchInput.value.trim().length > 0) {
        clearSearchBtn.classList.add('visible');
    } else {
        clearSearchBtn.classList.remove('visible');
    }
}

// 清空搜索框文字（只清空输入框，不重置页面）
function clearSearch() {
    searchInput.value = '';
    updateClearButtonVisibility();
}

// 清空搜索结果
function clearSearchResults() {
    allSchools = [];
    schoolsGrid.style.display = 'none';
    clearResultsContainer.style.display = 'none';
    // 移除适用范围提醒（如果存在）
    const existingNotice = document.getElementById('searchResultsScopeNotice');
    if (existingNotice) {
        existingNotice.remove();
    }
    showEmptyState('', true);
    searchInput.value = '';
    updateClearButtonVisibility();
}

// 加载学校列表
async function loadSchools(searchTerm = '') {
    showLoading(true);
    try {
        const url = searchTerm 
            ? `${API_BASE}/api/schools?search=${encodeURIComponent(searchTerm)}`
            : `${API_BASE}/api/schools`;
        
        const response = await fetch(url);
        
        // 检查响应状态
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }
        
        // 检查内容类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('服务器返回非JSON响应:', text.substring(0, 200));
            throw new Error('服务器返回格式错误');
        }
        
        const data = await response.json();
        
        allSchools = data.schools || [];
        
        // 如果有可能的学校名称列表，过滤掉大学相关的学校，然后显示选择界面
        if (data.possibleSchoolNames && data.possibleSchoolNames.length > 0) {
            // 过滤掉大学相关的学校名称（但保留附属学校）
            const filteredNames = data.possibleSchoolNames.filter(name => {
                if (!name) return false;
                const lowerName = name.toLowerCase();
                // 排除包含大学相关关键词的学校名称
                const universityKeywords = ['大学', '本科', '硕士', '博士', 'university', 'college', '研究生院', '研究院'];
                // 但保留附属学校（如"清华大学附属中学"、"清华大学附属小学"）
                if (lowerName.includes('附属') || lowerName.includes('附属中学') || lowerName.includes('附属小学') || 
                    lowerName.includes('附中') || lowerName.includes('附小') || lowerName.includes('实验学校')) {
                    return true;
                }
                return !universityKeywords.some(keyword => lowerName.includes(keyword));
            });
            
            if (filteredNames.length > 0) {
                showSchoolNameSelection(filteredNames, searchTerm);
            } else {
                showEmptyState('未找到符合条件的学校（本工具仅支持搜索幼儿园、小学、初中、高中）', false);
            }
        } else {
            renderSchools(allSchools);
        }
    } catch (error) {
        console.error('加载学校列表失败:', error);
        showError('加载学校列表失败，请稍后重试');
    } finally {
        showLoading(false);
    }
}

// 处理搜索
function handleSearch() {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        // 如果搜索框为空，显示初始提示
        showEmptyState('', true);
        schoolsGrid.style.display = 'none';
        clearResultsContainer.style.display = 'none';
        return;
    }
    
    loadSchools(searchTerm);
}

// 显示学校名称选择界面
function showSchoolNameSelection(possibleSchoolNames, searchTerm) {
    schoolsGrid.style.display = 'none';
    clearResultsContainer.style.display = 'none';
    emptyState.style.display = 'none';
    
    // 移除旧的适用范围提醒（如果存在）
    const existingNotice = document.getElementById('searchResultsScopeNotice');
    if (existingNotice) {
        existingNotice.remove();
    }
    
    // 创建选择界面HTML
    let html = '<div class="school-name-selection" style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); max-width: 600px; margin: 0 auto;">';
    html += `<h3 style="font-size: 20px; color: #333333; margin-bottom: 16px;">找到多个可能的学校，请选择正确的学校：</h3>`;
    html += `<p style="color: #666666; margin-bottom: 16px; font-size: 14px;">搜索词："${escapeHtml(searchTerm)}"</p>`;
    // 添加适用范围提醒
    html += '<div style="background: #E8F4F8; border: 1px solid #B3D9E6; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px;">';
    html += '<div style="color: #1E88E5; font-size: 20px; flex-shrink: 0; margin-top: 2px;">ℹ️</div>';
    html += '<div style="flex: 1; color: #0D47A1; font-size: 14px; line-height: 1.6; font-weight: 500;">';
    html += '<strong style="color: #1565C0;">适用范围说明：</strong>本工具仅针对大学教育以下的学校，包括幼儿园、小学、初中、高中。大学及以上不在本工具的搜索范围内。';
    html += '</div></div>';
    html += '<div class="school-name-list" style="display: flex; flex-direction: column; gap: 12px;">';
    
    possibleSchoolNames.forEach((schoolName, index) => {
        html += `
            <button class="school-name-option" 
                    data-school-name="${escapeHtml(schoolName)}"
                    onclick="selectSchoolName('${escapeHtml(schoolName)}')"
                    style="padding: 16px; background: #F9FAFB; border: 2px solid #E5E7EB; border-radius: 12px; text-align: left; cursor: pointer; transition: all 0.3s; font-size: 16px; color: #333333;">
                ${escapeHtml(schoolName)}
            </button>
        `;
    });
    
    html += '</div>';
    html += '<button onclick="hideSchoolNameSelection()" style="margin-top: 24px; padding: 12px 24px; background: transparent; color: #666666; border: 2px solid #E5E7EB; border-radius: 12px; cursor: pointer; font-size: 14px;">取消</button>';
    html += '</div>';
    
    // 将选择界面插入到emptyState的位置
    const emptyStateContainer = emptyState.parentElement;
    const selectionDiv = document.createElement('div');
    selectionDiv.id = 'schoolNameSelection';
    selectionDiv.innerHTML = html;
    selectionDiv.style.display = 'block';
    
    // 如果已存在选择界面，先移除
    const existingSelection = document.getElementById('schoolNameSelection');
    if (existingSelection) {
        existingSelection.remove();
    }
    
    emptyStateContainer.appendChild(selectionDiv);
    
    // 添加悬停效果
    setTimeout(() => {
        const options = selectionDiv.querySelectorAll('.school-name-option');
        options.forEach(option => {
            option.addEventListener('mouseenter', function() {
                this.style.borderColor = '#F75C62';
                this.style.background = '#FFF5F5';
            });
            option.addEventListener('mouseleave', function() {
                this.style.borderColor = '#E5E7EB';
                this.style.background = '#F9FAFB';
            });
        });
    }, 0);
}

// 隐藏学校名称选择界面
function hideSchoolNameSelection() {
    const selectionDiv = document.getElementById('schoolNameSelection');
    if (selectionDiv) {
        selectionDiv.remove();
    }
    showEmptyState('', true);
}

// 选择学校名称并创建学校记录
async function selectSchoolName(schoolName) {
    // 立即关闭选择弹窗，避免残留遮挡
    hideSchoolNameSelection();
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/api/schools/create-from-name`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ schoolName: schoolName })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('服务器返回非JSON响应:', text.substring(0, 200));
            throw new Error('服务器返回格式错误');
        }
        
        const data = await response.json();
        
        if (data.school) {
            // 隐藏选择界面
            hideSchoolNameSelection();
            
            // 重新加载学校列表
            await loadSchools(schoolName);
            
            // 显示成功消息
            if (data.message === '学校创建成功') {
                // 可以显示一个提示，但不需要alert
                console.log('学校创建成功:', data.school.name);
            }
        } else {
            alert('创建学校失败：' + (data.message || '未知错误'));
        }
    } catch (error) {
        console.error('创建学校失败:', error);
        alert('创建学校失败，请稍后重试');
    } finally {
        showLoading(false);
    }
}

// 渲染学校列表
function renderSchools(schools) {
    // 隐藏学校名称选择界面
    hideSchoolNameSelection();
    
    if (schools.length === 0) {
        schoolsGrid.style.display = 'none';
        clearResultsContainer.style.display = 'none';
        // 移除适用范围提醒（如果存在）
        const existingNotice = document.getElementById('searchResultsScopeNotice');
        if (existingNotice) {
            existingNotice.remove();
        }
        showEmptyState('未找到相关学校，请尝试其他关键词');
        return;
    }

    schoolsGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    clearResultsContainer.style.display = 'block'; // 显示清空按钮
    
    // 移除旧的适用范围提醒（如果存在）
    const existingNotice = document.getElementById('searchResultsScopeNotice');
    if (existingNotice) {
        existingNotice.remove();
    }
    
    // 同步更新已选中学校的信息（如果它们在新结果中）
    selectedSchoolIds.forEach(id => {
        const school = schools.find(s => s._id === id);
        if (school) {
            selectedSchoolsMap.set(id, school); // 更新为最新的学校信息
        }
    });
    
    schoolsGrid.innerHTML = schools.map(school => `
        <div class="school-card ${selectedSchoolIds.has(school._id) ? 'selected' : ''}" 
             data-school-id="${school._id}"
             onclick="showSchoolModal('${school._id}')">
            <h3>${escapeHtml(school.name || '未知学校')}</h3>
            <div class="school-info">${escapeHtml(school.schoolType || school.nature || '类型未知')}</div>
            ${school.coveredStages ? `<div class="school-info">涵盖学段: ${escapeHtml(school.coveredStages)}</div>` : ''}
            <div class="compare-checkbox" onclick="event.stopPropagation()">
                <input type="checkbox" 
                       id="checkbox-${school._id}" 
                       ${selectedSchoolIds.has(school._id) ? 'checked' : ''}
                       onchange="toggleSchoolSelection('${school._id}')">
                <label for="checkbox-${school._id}">加入对比</label>
            </div>
            <div class="comment-section" onclick="event.stopPropagation()">
                <button class="comment-btn" onclick="showCommentsModal('${school._id}', '${escapeHtml(school.name || '未知学校')}')">
                    评论 <span class="comment-count" id="comment-count-${school._id}">(0)</span>
                </button>
            </div>
        </div>
    `).join('');
    
    // 加载每个学校的评论数量
    schools.forEach(school => {
        loadCommentCount(school._id);
    });
}

// 切换学校选择
function toggleSchoolSelection(schoolId) {
    if (selectedSchoolIds.has(schoolId)) {
        selectedSchoolIds.delete(schoolId);
        selectedSchoolsMap.delete(schoolId); // 同时从Map中移除
    } else {
        if (selectedSchoolIds.size >= 3) {
            alert('最多只能选择3所学校进行AI评估对比');
            // 取消复选框选中状态
            const checkbox = document.getElementById(`checkbox-${schoolId}`);
            if (checkbox) checkbox.checked = false;
            return;
        }
        selectedSchoolIds.add(schoolId);
        // 保存学校对象到Map中，确保即使allSchools更新也能显示
        const school = allSchools.find(s => s._id === schoolId);
        if (school) {
            selectedSchoolsMap.set(schoolId, school);
        }
    }
    
    updateCompareBar();
    renderSchools(allSchools); // 重新渲染以更新选中状态
}

// 更新对比操作栏
function updateCompareBar() {
    if (selectedSchoolIds.size === 0) {
        compareBar.classList.remove('active');
        return;
    }

    compareBar.classList.add('active');
    
    // 更新选中的学校标签 - 从selectedSchoolsMap中获取所有选中的学校
    const selectedSchoolsList = Array.from(selectedSchoolIds)
        .map(id => selectedSchoolsMap.get(id))
        .filter(Boolean); // 过滤掉undefined的值
    
    selectedSchools.innerHTML = selectedSchoolsList.map(school => `
        <div class="selected-school-tag">
            <span>${escapeHtml(school.name)}</span>
            <button class="remove-btn" onclick="removeSchoolFromCompare('${school._id}')">×</button>
        </div>
    `).join('');
    
    // 更新对比按钮
    compareBtn.textContent = `AI评估 (${selectedSchoolIds.size})`;
    compareBtn.disabled = selectedSchoolIds.size < 2;
    basicCompareBtn.disabled = selectedSchoolIds.size < 2;
}

// 从对比中移除学校
function removeSchoolFromCompare(schoolId) {
    selectedSchoolIds.delete(schoolId);
    selectedSchoolsMap.delete(schoolId); // 同时从Map中移除
    cachedBasicCompareData = null; // 清除缓存（选择改变）
    cachedScoringData = null; // 清除缓存（选择改变）
    updateCompareBar();
    renderSchools(allSchools);
}

// 清空选择
function clearSelection() {
    selectedSchoolIds.clear();
    selectedSchoolsMap.clear(); // 同时清空Map
    cachedBasicCompareData = null; // 清空缓存
    cachedScoringData = null; // 清空缓存
    updateCompareBar();
    renderSchools(allSchools);
}

// 处理对比（默认使用基础对比）
async function handleCompare(useScoring = false) {
    if (selectedSchoolIds.size < 2) {
        alert('至少需要选择2所学校进行对比');
        return;
    }

    // 生成当前选择的学校ID的缓存键
    const currentIdsKey = Array.from(selectedSchoolIds).sort().join(',');
    
    // 检查是否需要重新获取数据
    const needFetchBasic = !cachedBasicCompareData || cachedBasicCompareData.idsKey !== currentIdsKey;
    const needFetchScoring = !cachedScoringData || cachedScoringData.idsKey !== currentIdsKey;
    
    showLoading(true);
    try {
        // 如果需要基础对比数据且缓存中没有，则获取
        if (!useScoring && needFetchBasic) {
            const response = await fetch(`${API_BASE}/api/schools/compare`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    schoolIds: Array.from(selectedSchoolIds)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('服务器返回非JSON响应:', text.substring(0, 200));
                throw new Error('服务器返回格式错误');
            }

            const data = await response.json();
            if (data.schools) {
                cachedBasicCompareData = {
                    schools: data.schools,
                    idsKey: currentIdsKey
                };
            } else {
                alert('对比失败，请稍后重试');
                showLoading(false);
                return;
            }
        }
        
        // 如果需要AI评分数据且缓存中没有，则获取（使用流式版本）
        if (useScoring && needFetchScoring) {
            await handleCompareScoringStream(currentIdsKey);
        }
        
        // 渲染对应的视图
        if (useScoring && cachedScoringData) {
            currentCompareMode = 'scoring';
            renderScoringCompare(cachedScoringData.schools, cachedScoringData.scoring, cachedScoringData.warning);
        } else if (cachedBasicCompareData) {
            currentCompareMode = 'basic';
            renderCompareTable(cachedBasicCompareData.schools);
        }
        
        switchToCompareView();
        updateCompareViewButtons();
    } catch (error) {
        console.error('对比失败:', error);
        alert('对比失败，请稍后重试');
    } finally {
        showLoading(false);
    }
}

// 渲染对比表格
function renderCompareTable(schools) {
    const categories = [
        {
            name: '基本信息',
            fields: [
                { key: 'sequenceNumber', label: '序号' },
                { key: 'name', label: '学校名称' },
                { key: 'website', label: '网址', isLink: true },
                { key: 'country', label: '国家' },
                { key: 'city', label: '城市' },
                { key: 'schoolType', label: '学校类型' },
                { key: 'coveredStages', label: '涵盖学段' }
            ]
        },
        {
            name: 'IB课程',
            fields: [
                { key: 'ibPYP', label: 'IB PYP国际文凭小学项目' },
                { key: 'ibMYP', label: 'IB MYP国际文凭中学项目' },
                { key: 'ibDP', label: 'IB DP国际文凭大学预科项目' },
                { key: 'ibCP', label: 'IB CP国际文凭职业相关课程' }
            ]
        },
        {
            name: '其他课程',
            fields: [
                { key: 'aLevel', label: 'A-Level英国高中水平证书' },
                { key: 'ap', label: 'AP美国大学先修课程' },
                { key: 'canadian', label: '加拿大课程' },
                { key: 'australian', label: '澳大利亚课程' },
                { key: 'igcse', label: 'IGCSE国际普通中学教育文凭' },
                { key: 'otherCourses', label: '其他课程' }
            ]
        }
    ];

    let tableHTML = '<table>';
    
    // 表头
    tableHTML += '<thead><tr><th>分类/子类</th>';
    schools.forEach(school => {
        tableHTML += `<th>${escapeHtml(school.name || '未知学校')}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    // 表格内容
    categories.forEach(category => {
        // 分类标题行
        tableHTML += `<tr><td class="category-header" colspan="${schools.length + 1}">${escapeHtml(category.name)}</td></tr>`;
        
        // 子类数据行
        category.fields.forEach(field => {
            tableHTML += `<tr><td>${escapeHtml(field.label)}</td>`;
            schools.forEach(school => {
                const value = school[field.key];
                let displayValue = '';
                let cellClass = '';
                
                // 判断是否为布尔类型字段（学段设置、课程等）
                const isBooleanField = ['kindergarten', 'primary', 'juniorHigh', 'seniorHigh', 
                    'ibPYP', 'ibMYP', 'ibDP', 'ibCP', 'aLevel', 'ap', 'canadian', 'australian', 'igcse'].includes(field.key);
                
                if (value) {
                    if (field.isLink && value) {
                        // 如果是网址，显示为链接
                        const url = value.startsWith('http://') || value.startsWith('https://') 
                            ? value 
                            : `https://${value}`;
                        displayValue = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color: #F75C62; text-decoration: none; word-break: break-all;">${escapeHtml(value)}</a>`;
                    } else if (isBooleanField) {
                        // 布尔类型字段：如果值为"有"或包含"有"，显示为绿色勾选
                        const valueStr = String(value).toLowerCase();
                        if (valueStr === '有' || valueStr.includes('有') || valueStr === 'yes' || valueStr === 'true') {
                            displayValue = '有';
                            cellClass = 'boolean-true';
                        } else {
                            displayValue = '无';
                            cellClass = 'boolean-false';
                        }
                    } else {
                        displayValue = escapeHtml(String(value));
                    }
                } else {
                    if (isBooleanField) {
                        displayValue = '无';
                        cellClass = 'boolean-false';
                    } else {
                        displayValue = '—';
                    }
                }
                
                tableHTML += `<td${cellClass ? ` class="${cellClass}"` : ''}>${displayValue}</td>`;
            });
            tableHTML += '</tr>';
        });
    });

    tableHTML += '</tbody></table>';
    compareTable.innerHTML = tableHTML;
}

// 渲染评分对比结果
function renderScoringCompare(schools, scoringData, warning) {
    let html = '';
    
    // 如果API返回了错误或原始内容
    if (scoringData.error || scoringData.rawContent) {
        html = `<div style="padding: 40px; text-align: center;">
            <h3 style="color: #F75C62; margin-bottom: 16px;">评分生成失败</h3>
            <p style="color: #666666; margin-bottom: 20px;">${scoringData.error || 'API返回格式异常'}</p>
            ${scoringData.rawContent ? `<pre style="text-align: left; background: #f5f5f5; padding: 20px; border-radius: 8px; overflow-x: auto;">${escapeHtml(scoringData.rawContent)}</pre>` : ''}
            <button class="back-btn" onclick="switchToBasicCompare()" style="margin-top: 20px;">返回基础对比</button>
        </div>`;
        compareTable.innerHTML = html;
        return;
    }
    
    // 显示警告信息（如果学校性质不一致）
    if (warning && warning.type === 'nature_inconsistency') {
        html += `<div style="background: #FFF4E6; border-left: 4px solid #FF9800; padding: 16px 20px; margin-bottom: 24px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
            <div style="display: flex; align-items: flex-start;">
                <svg style="width: 24px; height: 24px; color: #FF9800; margin-right: 12px; flex-shrink: 0; margin-top: 2px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <div style="flex: 1;">
                    <p style="color: #E65100; font-weight: 600; margin: 0 0 4px 0; font-size: 15px;">⚠️ 评分提示</p>
                    <p style="color: #BF360C; margin: 0; line-height: 1.6; font-size: 14px;">${escapeHtml(warning.message)}</p>
                </div>
            </div>
        </div>`;
    }
    
    // 显示量化对比表
    if (scoringData.comparisonTable && scoringData.comparisonTable.length > 0) {
        html += '<h2 style="margin-bottom: 24px; color: #333333;">量化对比表（模拟评分）</h2>';
        html += '<div class="scoring-table-container" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); margin-bottom: 32px; padding: 24px;">';
        html += '<table class="scoring-table" style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr>';
        html += '<th style="background: #F75C62; color: white; padding: 16px; text-align: left; min-width: 150px;">评估维度</th>';
        html += '<th style="background: #F75C62; color: white; padding: 16px; text-align: left; min-width: 200px;">指标名称（转换后）</th>';
        html += '<th style="background: #F75C62; color: white; padding: 16px; text-align: center; min-width: 80px;">权重</th>';
        schools.forEach(school => {
            html += `<th style="background: #F75C62; color: white; padding: 16px; text-align: center; min-width: 150px;">${escapeHtml(school.name)}</th>`;
        });
        html += '<th style="background: #F75C62; color: white; padding: 16px; text-align: left; min-width: 300px;">评分说明</th>';
        html += '</tr></thead><tbody>';
        
        let currentDimension = '';
        scoringData.comparisonTable.forEach(row => {
            if (row.dimension !== currentDimension) {
                currentDimension = row.dimension;
                html += `<tr><td colspan="${schools.length + 4}" style="background: #F9FAFB; padding: 12px 16px; font-weight: 600; color: #333333; border-bottom: 2px solid #E5E7EB;">${escapeHtml(row.dimension)}</td></tr>`;
            }
            html += '<tr>';
            html += `<td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;"></td>`;
            html += `<td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">${escapeHtml(row.indicator)}</td>`;
            html += `<td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; text-align: center;">${row.weight}%</td>`;
            schools.forEach(school => {
                const score = row.scores && row.scores[school.name] ? row.scores[school.name] : '—';
                // 对于单项指标，使用权重作为满分来计算星级
                const maxScore = row.weight || 100;
                html += `<td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; text-align: center; font-weight: 500; overflow: visible; position: relative;">${formatScore(score, maxScore)}</td>`;
            });
            let explanationsHtml = '';
            if (row.explanations) {
                schools.forEach((school, index) => {
                    if (row.explanations[school.name]) {
                        if (index > 0) {
                            explanationsHtml += '<div style="margin-top: 12px;"></div>';
                        }
                        explanationsHtml += `<div style="margin-bottom: 8px;"><strong style="color: #333333;">${escapeHtml(school.name)}：</strong><span style="color: #666666;">${escapeHtml(row.explanations[school.name])}</span></div>`;
                    }
                });
            }
            html += `<td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; color: #666666; font-size: 14px; line-height: 1.6;">${explanationsHtml || '—'}</td>`;
            html += '</tr>';
        });
        
        // 总分行
        if (scoringData.totalScores) {
            html += '<tr style="background: #FFF5F5; font-weight: 600;">';
            html += '<td colspan="3" style="padding: 16px; border-top: 2px solid #F75C62; border-bottom: 2px solid #F75C62;">总分</td>';
            schools.forEach(school => {
                const totalScore = scoringData.totalScores[school.name] || '—';
                html += `<td style="padding: 16px; text-align: center; border-top: 2px solid #F75C62; border-bottom: 2px solid #F75C62; color: #F75C62; font-size: 18px;">${formatScore(totalScore)}</td>`;
            });
            html += '<td style="padding: 16px; border-top: 2px solid #F75C62; border-bottom: 2px solid #F75C62;"></td>';
            html += '</tr>';
        }
        
        html += '</tbody></table>';
        html += '</div>';
    }
    
    // 显示最终总结与选择建议
    if (scoringData.summary) {
        html += '<h2 style="margin-bottom: 24px; color: #333333;">最终总结与选择建议</h2>';
        html += '<div class="summary-container" style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">';
        
        schools.forEach(school => {
            const schoolSummary = scoringData.summary[school.name];
            if (schoolSummary) {
                // 优先使用 totalScores 中的值，确保与表格中的总分一致
                const totalScore = scoringData.totalScores && scoringData.totalScores[school.name] !== undefined
                    ? scoringData.totalScores[school.name]
                    : schoolSummary.totalScore;
                
                html += `<div style="margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid #E5E7EB;">`;
                html += `<h3 style="color: #F75C62; margin-bottom: 16px; font-size: 20px;">${escapeHtml(school.name)}</h3>`;
                html += `<div style="margin-bottom: 12px;"><strong style="color: #333333;">总分：</strong><span style="color: #F75C62; font-size: 24px; font-weight: 600;">${formatScore(totalScore, 100)}</span></div>`;
                if (schoolSummary.strengths) {
                    html += `<div style="margin-bottom: 12px;"><strong style="color: #333333;">优势：</strong><span style="color: #666666;">${escapeHtml(schoolSummary.strengths)}</span></div>`;
                }
                if (schoolSummary.characteristics) {
                    html += `<div style="margin-bottom: 12px;"><strong style="color: #333333;">特点：</strong><span style="color: #666666;">${escapeHtml(schoolSummary.characteristics)}</span></div>`;
                }
                if (schoolSummary.suitableFor) {
                    html += `<div><strong style="color: #333333;">适合的家庭类型：</strong><span style="color: #666666;">${escapeHtml(schoolSummary.suitableFor)}</span></div>`;
                }
                html += `</div>`;
            }
        });
        
        if (scoringData.summary.conclusion) {
            const sanitizedConclusion = sanitizeTextRemoveScores(scoringData.summary.conclusion);
            html += `<div style="padding-top: 24px; border-top: 2px solid #F75C62;">`;
            html += `<h4 style="color: #333333; margin-bottom: 16px; font-size: 18px;">核心结论和建议</h4>`;
            html += `<p style="color: #666666; line-height: 1.8;">${escapeHtml(sanitizedConclusion)}</p>`;
            html += `</div>`;
        }
        
        html += '</div>';
    }
    
    compareTable.innerHTML = html;
}

// 切换到对比视图
function switchToCompareView() {
    currentView = 'compare';
    schoolsListView.style.display = 'none';
    if (searchSection) searchSection.style.display = 'none';
    if (pageTitle) pageTitle.style.display = 'none';
    compareView.classList.add('active');
    compareBar.classList.remove('active');
    updateCompareViewButtons();
}

// 更新对比视图按钮显示
function updateCompareViewButtons() {
    const scoringBtn = document.getElementById('scoringCompareBtn');
    const backToBasicBtn = document.getElementById('backToBasicBtn');
    
    if (currentCompareMode === 'scoring') {
        // 显示AI评分视图时，显示"返回基础对比"按钮，隐藏"AI评分对比"按钮
        if (scoringBtn) scoringBtn.style.display = 'none';
        if (backToBasicBtn) backToBasicBtn.style.display = 'inline-block';
    } else {
        // 显示基础对比视图时，显示"AI评分对比"按钮，隐藏"返回基础对比"按钮
        if (scoringBtn) scoringBtn.style.display = 'inline-block';
        if (backToBasicBtn) backToBasicBtn.style.display = 'none';
    }
}

// 返回搜索视图
function backToSearch() {
    currentView = 'list';
    schoolsListView.style.display = 'block';
    if (searchSection) searchSection.style.display = 'flex'; // 使用 flex 以保持居中布局
    if (pageTitle) pageTitle.style.display = 'block';
    compareView.classList.remove('active');
    
    // 如果有之前的搜索结果，重新渲染学校列表
    if (allSchools && allSchools.length > 0) {
        renderSchools(allSchools);
    }
    
    // 如果有选中的学校，显示对比栏
    if (selectedSchoolIds.size > 0) {
        updateCompareBar();
    }
}

// 显示/隐藏加载状态
function showLoading(show) {
    if (show) {
        loadingState.style.display = 'block';
        schoolsGrid.style.display = 'none';
        emptyState.style.display = 'none';
        clearResultsContainer.style.display = 'none';
        evaluationProcess.style.display = 'none';
    } else {
        loadingState.style.display = 'none';
        evaluationProcess.style.display = 'none';
    }
}

// 更新计时器显示
function updateEvaluationTimer() {
    if (!evaluationStartTime || !evaluationTimerText) return;
    
    const elapsed = Math.floor((Date.now() - evaluationStartTime) / 1000); // 经过的秒数
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    evaluationTimerText.textContent = formattedTime;
}

// 显示/隐藏评估过程
function showEvaluationProcess(show) {
    if (show) {
        evaluationProcess.style.display = 'block';
        loadingState.style.display = 'none';
        schoolsGrid.style.display = 'none';
        emptyState.style.display = 'none';
        clearResultsContainer.style.display = 'none';
        evaluationSteps.innerHTML = '';
        evaluationProgressFill.style.width = '0%';
        if (evaluationProgressText) evaluationProgressText.textContent = '0%';
        if (evaluationCurrentStep) evaluationCurrentStep.textContent = '准备开始...';
        if (evaluationLiveLog) evaluationLiveLog.innerHTML = '';
        
        // 启动计时器
        evaluationStartTime = Date.now();
        if (evaluationTimerText) evaluationTimerText.textContent = '00:00';
        if (evaluationTimerInterval) {
            clearInterval(evaluationTimerInterval);
        }
        evaluationTimerInterval = setInterval(updateEvaluationTimer, 1000);
    } else {
        evaluationProcess.style.display = 'none';
        
        // 停止计时器
        if (evaluationTimerInterval) {
            clearInterval(evaluationTimerInterval);
            evaluationTimerInterval = null;
        }
        evaluationStartTime = null;
    }
}

// 添加评估步骤
function addEvaluationStep(type, message, data = null) {
    // 如果是评估指标事件，只更新当前步骤文本和进度条，不创建卡片
    if (type === 'evaluating' && data && data.dimension && data.indicator) {
        // 更新当前步骤显示
        if (evaluationCurrentStep) {
            evaluationCurrentStep.textContent = `AI正在评估 ${data.dimension}部分的${data.indicator}...`;
        }
        
        // 更新进度条（根据指标进度）
        if (data.progress) {
            const [current, total] = data.progress.split('/').map(Number);
            const baseProgress = 50; // thinking阶段的基础进度
            const evaluatingProgress = 30; // evaluating阶段的进度范围
            const progress = baseProgress + Math.floor((current / total) * evaluatingProgress);
            evaluationProgressFill.style.width = `${progress}%`;
            if (evaluationProgressText) {
                evaluationProgressText.textContent = `${progress}%`;
            }
        }
        return;
    }
    
    // 不再创建彩色步骤卡片，只更新当前步骤文本和进度条
    const displayMessage = message;
    
    if (evaluationCurrentStep) {
        evaluationCurrentStep.textContent = displayMessage;
    }
    
    // 更新进度条
    updateEvaluationProgress(type);
}

// 更新评估进度条
function updateEvaluationProgress(type) {
    let progress = 0;
    if (type === 'start') progress = 10;
    else if (type === 'step') progress = 30;
    else if (type === 'thinking') progress = 50;
    else if (type === 'evaluating') progress = 80;
    else if (type === 'complete') progress = 100;
    else if (type === 'error') progress = 0;
    
    evaluationProgressFill.style.width = `${progress}%`;
    if (evaluationProgressText) {
        evaluationProgressText.textContent = type === 'error' ? '出错' : `${progress}%`;
    }
}

// 追加实时分析日志（灰色小字）
function appendEvaluationLiveLog(event) {
    if (!evaluationLiveLog || !event || !event.message) return;
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const line = document.createElement('div');
    line.className = 'evaluation-live-log-line';
    line.textContent = `[${time}] ${event.message}`;
    evaluationLiveLog.appendChild(line);
    // 限制最大行数，防止无限增长
    const maxLines = 80;
    while (evaluationLiveLog.children.length > maxLines) {
        evaluationLiveLog.removeChild(evaluationLiveLog.firstChild);
    }
    // 自动滚动到底部
    evaluationLiveLog.scrollTop = evaluationLiveLog.scrollHeight;
}

// 流式处理AI评分对比
async function handleCompareScoringStream(idsKey) {
    return new Promise((resolve, reject) => {
        showEvaluationProcess(true);
        
        // 使用 fetch + ReadableStream 来处理 SSE
        fetch(`${API_BASE}/api/schools/compare-scoring-stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                schoolIds: Array.from(selectedSchoolIds)
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let isComplete = false;
            
            function readStream() {
                reader.read().then(({ done, value }) => {
                    if (value) {
                        buffer += decoder.decode(value, { stream: true });
                    }
                    
                    // 处理完整的行
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // 保留最后不完整的行
                    
                    lines.forEach(line => {
                        if (line.trim() && line.startsWith('data: ')) {
                            try {
                                const event = JSON.parse(line.substring(6));
                                handleEvaluationEvent(event);
                                appendEvaluationLiveLog(event);
                            } catch (e) {
                                console.error('解析SSE事件失败:', e, line);
                            }
                        }
                    });
                    
                    if (done) {
                        // 处理最后剩余的数据
                        if (buffer.trim()) {
                            const lines = buffer.split('\n');
                            lines.forEach(line => {
                                if (line.trim() && line.startsWith('data: ')) {
                                    try {
                                        const event = JSON.parse(line.substring(6));
                                        handleEvaluationEvent(event);
                                        appendEvaluationLiveLog(event);
                                    } catch (e) {
                                        console.error('解析最后SSE事件失败:', e, line);
                                    }
                                }
                            });
                        }
                        // 如果流结束但还没有收到complete事件，可能是连接问题
                        if (!isComplete) {
                            console.warn('流已结束但未收到完成事件');
                            showEvaluationProcess(false);
                            reject(new Error('评估过程中断，请重试'));
                        }
                        return;
                    }
                    
                    readStream();
                }).catch(err => {
                    console.error('读取流失败:', err);
                    showEvaluationProcess(false);
                    reject(err);
                });
            }
            
            function handleEvaluationEvent(event) {
                switch (event.type) {
                case 'start':
                    addEvaluationStep('start', event.message, event.data);
                    break;
                case 'step':
                    addEvaluationStep('step', event.message, event.data);
                    break;
                case 'thinking':
                    addEvaluationStep('thinking', event.message, event.data);
                    break;
                case 'evaluating':
                    addEvaluationStep('evaluating', event.message, event.data);
                    break;
                case 'complete':
                    if (isComplete) return; // 防止重复处理
                    isComplete = true;
                    addEvaluationStep('complete', event.message);
                    if (event.data && event.data.schools && event.data.scoring) {
                        cachedScoringData = {
                            schools: event.data.schools,
                            scoring: event.data.scoring,
                            warning: event.data.warning,
                            idsKey: idsKey
                        };
                        setTimeout(() => {
                            showEvaluationProcess(false);
                            resolve();
                        }, 1000);
                    } else {
                        showEvaluationProcess(false);
                        reject(new Error('评估完成但数据不完整'));
                    }
                    break;
                case 'error':
                    if (isComplete) return; // 防止重复处理
                    isComplete = true;
                    addEvaluationStep('error', event.message);
                    showEvaluationProcess(false);
                    reject(new Error(event.message));
                    break;
                }
            }
            
            readStream();
        })
        .catch(err => {
            console.error('请求失败:', err);
            showEvaluationProcess(false);
            reject(err);
        });
    });
}

// 显示空状态
function showEmptyState(message, isInitial = false) {
    const emptyStateTitle = document.getElementById('emptyStateTitle');
    const emptyStateMessage = document.getElementById('emptyStateMessage');
    
    if (emptyStateTitle && emptyStateMessage) {
        if (isInitial) {
            // 初始状态：隐藏文字，只显示 AI 图标
            emptyStateTitle.textContent = '';
            emptyStateMessage.textContent = '';
            emptyStateTitle.style.display = 'none';
            emptyStateMessage.style.display = 'none';
        } else {
            // 搜索结果为空：显示提示文字
            emptyStateTitle.style.display = 'block';
            emptyStateMessage.style.display = 'block';
            emptyStateTitle.textContent = message || '未找到相关学校';
            emptyStateMessage.textContent = '请尝试其他关键词或联系管理员添加学校信息';
        }
    } else {
        // 兼容旧版本
        const titleText = isInitial ? '' : escapeHtml(message || '未找到相关学校');
        const messageText = isInitial ? '' : '请尝试其他关键词或联系管理员添加学校信息';
        emptyState.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
                <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"/>
                <path d="M16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"/>
            </svg>
            ${titleText ? `<h3>${titleText}</h3>` : '<h3 style="display:none;"></h3>'}
            ${messageText ? `<p>${messageText}</p>` : '<p style="display:none;"></p>'}
        `;
    }
    emptyState.style.display = 'block';
    schoolsGrid.style.display = 'none';
    clearResultsContainer.style.display = 'none';
}

// 显示错误
function showError(message) {
    showEmptyState(message);
}

// HTML 转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 移除文本中的分数字样（如“86.3分”），避免在总结中出现具体分数
function sanitizeTextRemoveScores(text) {
    if (!text || typeof text !== 'string') return '';
    let sanitized = text;
    // 移除“数字+分”或“数字 分”形式
    sanitized = sanitized.replace(/\d+(\.\d+)?\s*分/g, '');
    // 移除空括号
    sanitized = sanitized.replace(/（\s*）/g, '').replace(/\(\s*\)/g, '');
    // 合并多余空格
    sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();
    return sanitized;
}

// 将分数转换为星级（Rating）
// 使用5星制（支持半星），基于总分100分的比例
function scoreToRating(score, maxScore = 100) {
    if (score === null || score === undefined || score === '—' || score === '') {
        return null;
    }
    const numScore = typeof score === 'number' ? score : parseFloat(score);
    if (isNaN(numScore)) {
        return null;
    }
    
    // 计算相对于满分100的百分比
    const percentage = (numScore / maxScore) * 100;
    
    // 将百分比转换为星级（5星制，支持半星）
    // 每5分一个等级，支持半星以增加区分度
    // 5星：95-100分（优秀）
    // 4.5星：90-94分
    // 4星：85-89分
    // 3.5星：80-84分
    // 3星：75-79分（良好）
    // 2.5星：70-74分
    // 2星：65-69分
    // 1.5星：60-64分（中等）
    // 1星：55-59分
    // 0.5星：50-54分
    // 0星：0-49分（一般及以下）
    if (percentage >= 95) return 5;
    if (percentage >= 90) return 4.5;
    if (percentage >= 85) return 4;
    if (percentage >= 80) return 3.5;
    if (percentage >= 75) return 3;
    if (percentage >= 70) return 2.5;
    if (percentage >= 65) return 2;
    if (percentage >= 60) return 1.5;
    if (percentage >= 55) return 1;
    if (percentage >= 50) return 0.5;
    return 0;
}

// 格式化分数显示为星级（支持半星）
function formatScore(score, maxScore = 100) {
    if (score === null || score === undefined || score === '—' || score === '') {
        return '—';
    }
    const numScore = typeof score === 'number' ? score : parseFloat(score);
    if (isNaN(numScore)) {
        return '—';
    }
    
    // 获取星级（可能包含小数，如4.5）
    const rating = scoreToRating(numScore, maxScore);
    if (rating === null) {
        return '—';
    }
    
    // 生成星级HTML（支持半星）
    let starsHtml = '<span class="rating-stars" title="' + numScore.toFixed(1) + '分">';
    const fullStars = Math.floor(rating);
    const hasHalfStar = (rating % 1) !== 0;
    
    // 显示完整星
    for (let i = 1; i <= fullStars; i++) {
        starsHtml += '<span class="star star-filled">★</span>';
    }
    
    // 显示半星（使用两个重叠的元素，左边实心，右边空心）
    if (hasHalfStar) {
        starsHtml += '<span class="star star-half"><span class="star-half-filled">★</span><span class="star-half-empty">☆</span></span>';
    }
    
    // 显示空星
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 1; i <= emptyStars; i++) {
        starsHtml += '<span class="star star-empty">☆</span>';
    }
    
    // 显示星级文字（如果是整数则显示整数，否则显示小数）
    const ratingText = rating % 1 === 0 ? rating : rating.toFixed(1);
    starsHtml += '<span class="rating-text">' + ratingText + '星</span></span>';
    
    return starsHtml;
}

// 显示学校详情弹窗
async function showSchoolModal(schoolId) {
    try {
        // 从已加载的学校列表中查找
        let school = allSchools.find(s => s._id === schoolId);
        
        // 检查数据是否完整（必须包含课程字段）
        const requiredFields = ['ibPYP', 'ibMYP', 'ibDP', 'ibCP'];
        const hasAllFields = school && requiredFields.every(field => school.hasOwnProperty(field));
        
        // 如果没找到或数据不完整，从API获取完整数据
        if (!school || !hasAllFields) {
            const response = await fetch(`${API_BASE}/api/schools/${schoolId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('服务器返回非JSON响应:', text.substring(0, 200));
                throw new Error('服务器返回格式错误');
            }
            
            const data = await response.json();
            school = data;
            
            // 更新 allSchools 中的学校数据，确保后续使用完整数据
            const index = allSchools.findIndex(s => s._id === schoolId);
            if (index !== -1) {
                allSchools[index] = school;
            }
        }
        
        if (!school) {
            alert('无法加载学校信息');
            return;
        }
        
        renderModalContent(school);
        schoolModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // 防止背景滚动
    } catch (error) {
        console.error('加载学校详情失败:', error);
        alert('加载学校详情失败，请稍后重试');
    }
}

// 关闭弹窗
function closeModal() {
    schoolModal.classList.remove('active');
    document.body.style.overflow = ''; // 恢复滚动
}

// 渲染弹窗内容
function renderModalContent(school) {
    modalSchoolName.textContent = school.name || '未知学校';
    
    // 设置副标题
    const subtitleParts = [];
    if (school.schoolType || school.nature) subtitleParts.push(school.schoolType || school.nature);
    if (school.coveredStages) subtitleParts.push(school.coveredStages);
    modalSchoolSubtitle.textContent = subtitleParts.join(' · ') || '';
    
    // 定义信息分类
    const categories = [
        {
            title: '基本信息',
            items: [
                { label: '学校名称', key: 'name' },
                { label: '网址', key: 'website', isLink: true, alwaysShow: true },
                { label: '学校类型', key: 'schoolType' },
                { label: '涵盖学段', key: 'coveredStages' },
                { label: '隶属教育集团', key: 'affiliatedGroup', alwaysShow: true, isClickable: true }
            ]
        },
        {
            title: '地理位置',
            items: [
                { label: '国家', key: 'country' },
                { label: '城市', key: 'city' }
            ]
        },
        {
            title: '学段设置',
            items: [
                { label: '幼儿园', key: 'kindergarten' },
                { label: '小学', key: 'primary' },
                { label: '初中', key: 'juniorHigh' },
                { label: '高中', key: 'seniorHigh' }
            ]
        },
        {
            title: 'IB课程',
            items: [
                { label: 'IB PYP国际文凭小学项目', key: 'ibPYP' },
                { label: 'IB MYP国际文凭中学项目', key: 'ibMYP' },
                { label: 'IB DP国际文凭大学预科项目', key: 'ibDP' },
                { label: 'IB CP国际文凭职业相关课程', key: 'ibCP' }
            ]
        },
        {
            title: '其他课程',
            items: [
                { label: 'A-Level英国高中水平证书', key: 'aLevel' },
                { label: 'AP美国大学先修课程', key: 'ap' },
                { label: '加拿大课程', key: 'canadian' },
                { label: '澳大利亚课程', key: 'australian' },
                { label: 'IGCSE国际普通中学教育文凭', key: 'igcse' },
                { label: '其他课程', key: 'otherCourses' }
            ]
        }
    ];
    
    // 生成HTML
    let html = '';
    categories.forEach(category => {
        const items = category.items.filter(item => {
            // 如果设置了alwaysShow，即使值为空也显示
            if (item.alwaysShow) {
                return true;
            }
            // 兼容旧字段：如果 key 是 schoolType，优先读取 schoolType，如果不存在则读取 nature
            let value = school[item.key];
            if (item.key === 'schoolType' && !value) {
                value = school.nature;
            }
            return value !== undefined && value !== null && value !== '';
        });
        
        if (items.length === 0) return; // 跳过没有数据的分类
        
        html += `<div class="info-section">`;
        html += `<div class="section-title">${escapeHtml(category.title)}</div>`;
        html += `<div class="info-grid">`;
        
        items.forEach(item => {
            // 兼容旧字段：如果 key 是 schoolType，优先读取 schoolType，如果不存在则读取 nature
            let value = school[item.key];
            if (item.key === 'schoolType' && !value) {
                value = school.nature;
            }
            let displayValue = '';
            let valueClass = '';
            
            // 判断是否为布尔类型字段（学段设置、课程等）
            const isBooleanField = ['kindergarten', 'primary', 'juniorHigh', 'seniorHigh', 
                'ibPYP', 'ibMYP', 'ibDP', 'ibCP', 'aLevel', 'ap', 'canadian', 'australian', 'igcse'].includes(item.key);
            
            if (value) {
                if (item.isLink && value) {
                    // 如果是网址，显示为链接
                    const url = value.startsWith('http://') || value.startsWith('https://') 
                        ? value 
                        : `https://${value}`;
                    displayValue = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color: #F75C62; text-decoration: none; word-break: break-all;">${escapeHtml(value)}</a>`;
                } else if (item.isClickable && item.key === 'affiliatedGroup') {
                    // 如果是可点击的教育集团字段，显示为可点击链接
                    displayValue = `<a href="#" class="affiliated-group-link" data-group="${escapeHtml(value)}" style="color: #F75C62; text-decoration: none; cursor: pointer; word-break: break-all;">${escapeHtml(value)}</a>`;
                } else if (isBooleanField) {
                    // 布尔类型字段：如果值为"有"或包含"有"，显示为绿色勾选
                    const valueStr = String(value).toLowerCase();
                    if (valueStr === '有' || valueStr.includes('有') || valueStr === 'yes' || valueStr === 'true') {
                        displayValue = '有';
                        valueClass = 'boolean-true';
                    } else {
                        displayValue = '无';
                        valueClass = 'boolean-false';
                    }
                } else {
                    displayValue = escapeHtml(String(value));
                }
            } else {
                if (isBooleanField) {
                    displayValue = '无';
                    valueClass = 'boolean-false';
                } else {
                    displayValue = '—';
                    valueClass = 'empty';
                }
            }
            
            html += `
                <div class="info-item">
                    <div class="info-item-label">${escapeHtml(item.label)}</div>
                    <div class="info-item-value ${valueClass}">${displayValue}</div>
                </div>
            `;
        });
        
        html += `</div></div>`;
    });
    
    modalBody.innerHTML = html || '<div class="info-section"><p style="text-align:center;color:#999;">暂无详细信息</p></div>';
    
    // 绑定教育集团链接点击事件
    const groupLinks = modalBody.querySelectorAll('.affiliated-group-link');
    groupLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const groupName = link.getAttribute('data-group');
            if (groupName && groupName !== '无' && groupName !== '') {
                await loadSchoolsByGroup(groupName);
                closeModal(); // 关闭弹窗，显示搜索结果
            }
        });
    });
}

// 根据教育集团加载学校列表
async function loadSchoolsByGroup(groupName) {
    showLoading(true);
    try {
        const encodedGroupName = encodeURIComponent(groupName);
        const url = `${API_BASE}/api/schools/by-group/${encodedGroupName}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('服务器返回非JSON响应:', text.substring(0, 200));
            throw new Error('服务器返回格式错误');
        }
        
        const data = await response.json();
        
        allSchools = data.schools || [];
        
        // 更新搜索框显示教育集团名称
        searchInput.value = groupName;
        updateClearButtonVisibility();
        
        // 渲染学校列表
        renderSchools(allSchools);
        
        // 如果有结果，滚动到列表顶部
        if (allSchools.length > 0) {
            schoolsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
    } catch (error) {
        console.error('加载教育集团学校列表失败:', error);
        showError('加载学校列表失败，请稍后重试');
    } finally {
        showLoading(false);
    }
}

// 验证学校类型和学段
async function validateSchoolsForComparison() {
    if (selectedSchoolIds.size < 2) {
        return { valid: false, error: '至少需要选择2所学校进行对比' };
    }
    
    // 获取选中的学校数据
    let selectedSchools = Array.from(selectedSchoolIds).map(id => {
        // 优先从selectedSchoolsMap获取，如果没有则从allSchools获取
        return selectedSchoolsMap.get(id) || allSchools.find(s => s._id === id);
    }).filter(school => school); // 过滤掉未找到的学校
    
    // 如果有学校数据缺失，尝试从API获取
    const missingIds = Array.from(selectedSchoolIds).filter(id => {
        return !selectedSchools.find(s => s._id === id);
    });
    
    if (missingIds.length > 0) {
        try {
            const fetchPromises = missingIds.map(async (id) => {
                try {
                    const response = await fetch(`${API_BASE}/api/schools/${id}`);
                    if (response.ok) {
                        const data = await response.json();
                        return data;
                    }
                } catch (e) {
                    console.error(`获取学校 ${id} 失败:`, e);
                }
                return null;
            });
            
            const fetchedSchools = await Promise.all(fetchPromises);
            selectedSchools = selectedSchools.concat(fetchedSchools.filter(s => s));
        } catch (error) {
            console.error('获取学校数据失败:', error);
        }
    }
    
    if (selectedSchools.length < 2) {
        return { valid: false, error: '无法获取学校信息，请重新选择' };
    }
    
    // 检查学校类型是否一致
    const schoolTypes = selectedSchools.map(s => s.schoolType || s.nature || '').filter(t => t);
    const uniqueTypes = [...new Set(schoolTypes)];
    
    if (uniqueTypes.length > 1) {
        // 学校类型不一致，需要用户确认
        return {
            valid: false,
            needsConfirm: true,
            type: 'schoolType',
            message: `您选择的学校类型不一致：\n\n${selectedSchools.map(s => `• ${s.name || '未知学校'}：${s.schoolType || s.nature || '类型未知'}`).join('\n')}\n\n⚠️ 重要提醒：\n本评价体系更适合提供了国际课程的学校，不同类型学校的教育理念、课程体系、培养目标等可能存在较大差异，AI评估对比结果可能不够准确，建议选择相同类型的学校进行对比。\n\n是否仍要继续进行AI评估对比？`,
            schools: selectedSchools
        };
    }
    
    // 检查学段是否有重叠
    const stages = ['kindergarten', 'primary', 'juniorHigh', 'seniorHigh'];
    const schoolStages = selectedSchools.map(school => {
        const schoolStageList = [];
        stages.forEach(stage => {
            if (school[stage] === '有') {
                schoolStageList.push(stage);
            }
        });
        return schoolStageList;
    });
    
    // 检查是否有任何重叠
    let hasOverlap = false;
    for (let i = 0; i < schoolStages.length; i++) {
        for (let j = i + 1; j < schoolStages.length; j++) {
            const stages1 = schoolStages[i];
            const stages2 = schoolStages[j];
            // 检查两个学校的学段是否有交集
            if (stages1.some(s => stages2.includes(s))) {
                hasOverlap = true;
                break;
            }
        }
        if (hasOverlap) break;
    }
    
    if (!hasOverlap) {
        // 学段无重叠，不能进行对比
        const stageNames = {
            'kindergarten': '幼儿园',
            'primary': '小学',
            'juniorHigh': '初中',
            'seniorHigh': '高中'
        };
        
        const stageInfo = selectedSchools.map(school => {
            const schoolStages = [];
            stages.forEach(stage => {
                if (school[stage] === '有') {
                    schoolStages.push(stageNames[stage]);
                }
            });
            return `• ${school.name || '未知学校'}：${schoolStages.length > 0 ? schoolStages.join('、') : '无学段信息'}`;
        }).join('\n');
        
        return {
            valid: false,
            needsConfirm: false,
            type: 'stages',
            message: `您选择的学校涵盖学段没有任何重叠：\n\n${stageInfo}\n\n❌ 无法进行对比：\n由于所选学校的涵盖学段完全不同（例如：一个是初中和高中，一个是大学），无法进行有效的对比评估。\n\n请重新选择涵盖相同学段的学校进行对比。`,
            schools: selectedSchools
        };
    }
    
    return { valid: true };
}

// 显示确认弹窗
function showConfirmModal(message, onConfirm, onCancel) {
    // 创建弹窗HTML
    const modalHTML = `
        <div class="modal-overlay active" id="confirmModal" style="z-index: 2000;">
            <div class="modal-container" style="max-width: 600px;">
                <div class="modal-header">
                    <h2 style="margin: 0;">⚠️ 提醒</h2>
                </div>
                <div class="modal-body">
                    <div style="white-space: pre-line; line-height: 1.8; color: #333333; font-size: 15px;">
                        ${escapeHtml(message)}
                    </div>
                </div>
                <div style="padding: 24px 32px; border-top: 1px solid #E5E7EB; display: flex; justify-content: flex-end; gap: 12px;">
                    <button id="confirmCancelBtn" style="padding: 12px 24px; background: transparent; color: #666666; border: 2px solid #E5E7EB; border-radius: 12px; font-size: 16px; font-weight: 500; cursor: pointer; transition: all 0.3s;">
                        取消
                    </button>
                    <button id="confirmOkBtn" style="padding: 12px 24px; background: #F75C62; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 500; cursor: pointer; transition: background 0.3s;">
                        继续评估
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 移除已存在的确认弹窗
    const existingModal = document.getElementById('confirmModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('confirmModal');
    document.body.style.overflow = 'hidden';
    
    // 绑定事件
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    
    const closeModal = () => {
        modal.remove();
        document.body.style.overflow = '';
    };
    
    okBtn.addEventListener('click', () => {
        closeModal();
        if (onConfirm) onConfirm();
    });
    
    cancelBtn.addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
            if (onCancel) onCancel();
        }
    });
    
    // ESC键关闭
    const escHandler = (e) => {
        if (e.key === 'Escape' && document.getElementById('confirmModal')) {
            closeModal();
            if (onCancel) onCancel();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// 显示错误弹窗
function showErrorModal(message) {
    // 创建弹窗HTML
    const modalHTML = `
        <div class="modal-overlay active" id="errorModal" style="z-index: 2000;">
            <div class="modal-container" style="max-width: 600px;">
                <div class="modal-header">
                    <h2 style="margin: 0;">❌ 无法进行对比</h2>
                </div>
                <div class="modal-body">
                    <div style="white-space: pre-line; line-height: 1.8; color: #333333; font-size: 15px;">
                        ${escapeHtml(message)}
                    </div>
                </div>
                <div style="padding: 24px 32px; border-top: 1px solid #E5E7EB; display: flex; justify-content: flex-end;">
                    <button id="errorOkBtn" style="padding: 12px 24px; background: #F75C62; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 500; cursor: pointer; transition: background 0.3s;">
                        我知道了
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 移除已存在的错误弹窗
    const existingModal = document.getElementById('errorModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('errorModal');
    document.body.style.overflow = 'hidden';
    
    // 绑定事件
    const okBtn = document.getElementById('errorOkBtn');
    
    const closeModal = () => {
        modal.remove();
        document.body.style.overflow = '';
    };
    
    okBtn.addEventListener('click', closeModal);
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // ESC键关闭
    const escHandler = (e) => {
        if (e.key === 'Escape' && document.getElementById('errorModal')) {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// AI评分对比
async function handleCompareScoring() {
    // 保存按钮原始状态
    const originalText = compareBtn.textContent;
    const wasDisabled = compareBtn.disabled;
    
    // 先进行验证
    const validation = await validateSchoolsForComparison();
    
    if (!validation.valid) {
        if (validation.error) {
            alert(validation.error);
            return;
        }
        
        if (validation.needsConfirm) {
            // 需要用户确认（学校类型不一致）
            return new Promise((resolve) => {
                showConfirmModal(validation.message, async () => {
                    // 用户确认继续
                    compareBtn.textContent = '评估中...';
                    compareBtn.disabled = true;
                    
                    try {
                        await handleCompare(true);
                    } finally {
                        // 恢复按钮状态
                        compareBtn.textContent = originalText;
                        compareBtn.disabled = wasDisabled || selectedSchoolIds.size < 2;
                    }
                    resolve();
                }, () => {
                    // 用户取消
                    resolve();
                });
            });
        } else {
            // 不能进行对比（学段无重叠）
            showErrorModal(validation.message);
            return;
        }
    }
    
    // 验证通过，继续评估
    compareBtn.textContent = '评估中...';
    compareBtn.disabled = true;
    
    try {
        await handleCompare(true);
    } finally {
        // 恢复按钮状态
        compareBtn.textContent = originalText;
        compareBtn.disabled = wasDisabled || selectedSchoolIds.size < 2;
    }
}

// 基础对比
async function handleBasicCompare() {
    await handleCompare(false);
}

// 切换到基础对比（在对比视图内切换）
async function switchToBasicCompare() {
    // 如果基础对比数据已缓存，直接使用
    if (cachedBasicCompareData) {
        currentCompareMode = 'basic';
        renderCompareTable(cachedBasicCompareData.schools);
        updateCompareViewButtons();
    } else {
        // 如果没有缓存，调用handleCompare获取基础对比数据
        await handleCompare(false);
    }
}

// ==================== 评论功能 ====================

// 评论相关 DOM 元素（延迟初始化，在 DOMContentLoaded 后获取）
let commentsModal, commentsModalCloseBtn, commentsModalTitle, commentsModalSubtitle;
let commentsList, addCommentBtn, commentInputModal, commentInputModalCloseBtn;
let commentInputModalTitle, commentContent, commentAuthor, commentCharCount;
let commentSubmitBtn, commentCancelBtn;

// 当前查看评论的学校ID
let currentCommentSchoolId = null;
let currentCommentSchoolName = null;

// 初始化评论功能事件监听
function setupCommentListeners() {
    // 获取评论相关 DOM 元素
    commentsModal = document.getElementById('commentsModal');
    commentsModalCloseBtn = document.getElementById('commentsModalCloseBtn');
    commentsModalTitle = document.getElementById('commentsModalTitle');
    commentsModalSubtitle = document.getElementById('commentsModalSubtitle');
    commentsList = document.getElementById('commentsList');
    addCommentBtn = document.getElementById('addCommentBtn');
    commentInputModal = document.getElementById('commentInputModal');
    commentInputModalCloseBtn = document.getElementById('commentInputModalCloseBtn');
    commentInputModalTitle = document.getElementById('commentInputModalTitle');
    commentContent = document.getElementById('commentContent');
    commentAuthor = document.getElementById('commentAuthor');
    commentCharCount = document.getElementById('commentCharCount');
    commentSubmitBtn = document.getElementById('commentSubmitBtn');
    commentCancelBtn = document.getElementById('commentCancelBtn');
    
    // 设置事件监听
    if (commentsModalCloseBtn) {
        commentsModalCloseBtn.addEventListener('click', closeCommentsModal);
    }
    if (commentInputModalCloseBtn) {
        commentInputModalCloseBtn.addEventListener('click', closeCommentInputModal);
    }
    if (commentCancelBtn) {
        commentCancelBtn.addEventListener('click', closeCommentInputModal);
    }
    if (addCommentBtn) {
        addCommentBtn.addEventListener('click', () => {
            if (currentCommentSchoolId) {
                showCommentInputModal(currentCommentSchoolId, currentCommentSchoolName);
            }
        });
    }
    if (commentContent) {
        commentContent.addEventListener('input', updateCommentCharCount);
        commentContent.addEventListener('input', validateCommentInput);
    }
    if (commentSubmitBtn) {
        commentSubmitBtn.addEventListener('click', submitComment);
    }
    if (commentsModal) {
        commentsModal.addEventListener('click', (e) => {
            if (e.target === commentsModal) {
                closeCommentsModal();
            }
        });
    }
    if (commentInputModal) {
        commentInputModal.addEventListener('click', (e) => {
            if (e.target === commentInputModal) {
                closeCommentInputModal();
            }
        });
    }
    
    // ESC键关闭评论弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (commentsModal && commentsModal.classList.contains('active')) {
                closeCommentsModal();
            }
            if (commentInputModal && commentInputModal.classList.contains('active')) {
                closeCommentInputModal();
            }
        }
    });
}

// 加载学校评论数量
async function loadCommentCount(schoolId) {
    try {
        const url = `${API_BASE}/api/schools/${schoolId}/comments/count`;
        const response = await fetch(url);
        
        if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                const countElement = document.getElementById(`comment-count-${schoolId}`);
                if (countElement) {
                    countElement.textContent = `(${data.count})`;
                }
            } else {
                console.warn('评论数量API返回非JSON格式');
            }
        } else {
            console.warn('加载评论数量失败:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('加载评论数量失败:', error);
    }
}

// 显示评论弹窗
async function showCommentsModal(schoolId, schoolName) {
    currentCommentSchoolId = schoolId;
    currentCommentSchoolName = schoolName;
    
    if (commentsModalTitle) {
        commentsModalTitle.textContent = '评论';
    }
    if (commentsModalSubtitle) {
        commentsModalSubtitle.textContent = schoolName;
    }
    
    // 重置评论数量显示
    const commentsCountElement = document.getElementById('commentsCount');
    if (commentsCountElement) {
        commentsCountElement.textContent = '评论 · 加载中...';
    }
    
    commentsModal.classList.add('active');
    commentsList.innerHTML = '<div class="comments-loading">加载中...</div>';
    
    await loadComments(schoolId);
}

// 关闭评论弹窗
function closeCommentsModal() {
    commentsModal.classList.remove('active');
    currentCommentSchoolId = null;
    currentCommentSchoolName = null;
}

// 加载评论列表
async function loadComments(schoolId) {
    try {
        const url = `${API_BASE}/api/schools/${schoolId}/comments`;
        console.log('加载评论，URL:', url);
        
        const response = await fetch(url);
        
        console.log('评论API响应状态:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorMessage = '加载评论失败';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                const text = await response.text();
                console.error('服务器返回错误:', text);
                errorMessage = `加载评论失败: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('服务器返回非JSON响应:', text.substring(0, 200));
            throw new Error('服务器返回格式错误');
        }
        
        const comments = await response.json();
        console.log('成功加载评论，数量:', comments.length);
        
        // 更新评论数量显示
        const commentsCountElement = document.getElementById('commentsCount');
        if (commentsCountElement) {
            commentsCountElement.textContent = `评论 · ${comments.length}`;
        }
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="comments-empty">暂无评论，快来发表第一条评论吧！</div>';
            return;
        }
        
        commentsList.innerHTML = comments.map(comment => {
            const time = formatCommentTime(comment.createdAt);
            const author = comment.author || '匿名用户';
            const avatarText = getAvatarText(author);
            const avatarClass = author === '匿名用户' ? 'default' : '';
            const likes = comment.likes || 0;
            const commentId = comment._id;
            const replies = comment.replies || [];
            
            // 生成回复HTML
            const repliesHtml = replies.length > 0 ? `
                <div class="comment-replies">
                    ${replies.map(reply => {
                        const replyTime = formatCommentTime(reply.createdAt);
                        const replyAuthor = reply.author || '匿名用户';
                        const replyAvatarText = getAvatarText(replyAuthor);
                        const replyLikes = reply.likes || 0;
                        return `
                            <div class="comment-reply-item" data-reply-id="${reply._id}">
                                <div class="comment-reply-avatar">${replyAvatarText}</div>
                                <div class="comment-reply-main">
                                    <div class="comment-reply-header">
                                        <span class="comment-reply-author">${escapeHtml(replyAuthor)}</span>
                                    </div>
                                    <div class="comment-reply-meta">
                                        <span class="comment-time">${replyTime}</span>
                                    </div>
                                    <div class="comment-reply-content">${escapeHtml(reply.content)}</div>
                                    <div class="comment-reply-actions">
                                        <button class="comment-reply-action-btn like-reply-btn" data-reply-id="${reply._id}">
                                            <span class="icon">${replyLikes > 0 ? '❤️' : '🤍'}</span>
                                            <span class="like-count">${replyLikes > 0 ? replyLikes : ''}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : '';
            
            return `
                <div class="comment-item" data-comment-id="${commentId}">
                    <div class="comment-avatar ${avatarClass}">${avatarText}</div>
                    <div class="comment-main">
                        <div class="comment-header">
                            <span class="comment-author">${escapeHtml(author)}</span>
                        </div>
                        <div class="comment-meta">
                            <span class="comment-time">${time}</span>
                        </div>
                        <div class="comment-content">${escapeHtml(comment.content)}</div>
                        <div class="comment-actions">
                            <button class="comment-action-btn like-comment-btn" data-comment-id="${commentId}">
                                <span class="icon">${likes > 0 ? '❤️' : '🤍'}</span>
                                <span class="like-count">${likes > 0 ? likes : ''}</span>
                            </button>
                            <button class="comment-action-btn reply-comment-btn" data-comment-id="${commentId}">
                                回复
                            </button>
                        </div>
                        ${repliesHtml}
                    </div>
                </div>
            `;
        }).join('');
        
        // 绑定点赞和回复事件
        attachCommentEventListeners();
        
        // 更新评论数量
        if (currentCommentSchoolId === schoolId) {
            loadCommentCount(schoolId);
        }
    } catch (error) {
        console.error('加载评论失败:', error);
        console.error('错误详情:', error.message, error.stack);
        commentsList.innerHTML = `<div class="comments-empty">加载评论失败，请稍后重试<br><small style="color: #999; margin-top: 8px; display: block;">${escapeHtml(error.message)}</small></div>`;
    }
}

// 格式化评论时间
function formatCommentTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (years > 0) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } else if (months > 0 || days > 7) {
        return `${date.getMonth() + 1}-${String(date.getDate()).padStart(2, '0')}`;
    } else if (days > 0) {
        return `${days}天前`;
    } else if (hours > 0) {
        return `${hours}小时前`;
    } else if (minutes > 0) {
        return `${minutes}分钟前`;
    } else {
        return '刚刚';
    }
}

// 获取头像文字（取昵称的第一个字符或前两个字符）
function getAvatarText(author) {
    if (!author || author === '匿名用户') {
        return '匿';
    }
    // 如果是中文，取第一个字符；如果是英文，取前两个字符
    const firstChar = author.charAt(0);
    if (/[\u4e00-\u9fa5]/.test(firstChar)) {
        return firstChar;
    } else {
        return author.substring(0, 2).toUpperCase();
    }
}

// 绑定评论事件监听器（点赞、回复）
function attachCommentEventListeners() {
    // 点赞评论
    document.querySelectorAll('.like-comment-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const commentId = btn.getAttribute('data-comment-id');
            await toggleLikeComment(commentId, btn);
        });
    });
    
    // 点赞回复
    document.querySelectorAll('.like-reply-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const replyId = btn.getAttribute('data-reply-id');
            await toggleLikeReply(replyId, btn);
        });
    });
    
    // 回复评论
    document.querySelectorAll('.reply-comment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const commentId = btn.getAttribute('data-comment-id');
            showReplyModal(commentId);
        });
    });
}

// 切换评论点赞
async function toggleLikeComment(commentId, buttonElement) {
    try {
        const response = await fetch(`${API_BASE}/api/comments/${commentId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userIdentifier: getUserId() // 使用localStorage存储的用户标识
            })
        });
        
        if (!response.ok) {
            throw new Error('点赞失败');
        }
        
        const data = await response.json();
        
        // 更新按钮显示
        const icon = buttonElement.querySelector('.icon');
        const countSpan = buttonElement.querySelector('.like-count');
        
        if (data.hasLiked) {
            icon.textContent = '❤️';
            buttonElement.classList.add('liked');
            countSpan.textContent = data.likes > 0 ? data.likes : '';
        } else {
            icon.textContent = '🤍';
            buttonElement.classList.remove('liked');
            countSpan.textContent = data.likes > 0 ? data.likes : '';
        }
    } catch (error) {
        console.error('点赞失败:', error);
        alert('点赞失败，请稍后重试');
    }
}

// 切换回复点赞
async function toggleLikeReply(replyId, buttonElement) {
    try {
        const response = await fetch(`${API_BASE}/api/comments/${replyId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userIdentifier: getUserId()
            })
        });
        
        if (!response.ok) {
            throw new Error('点赞失败');
        }
        
        const data = await response.json();
        
        // 更新按钮显示
        const icon = buttonElement.querySelector('.icon');
        const countSpan = buttonElement.querySelector('.like-count');
        
        if (data.hasLiked) {
            icon.textContent = '❤️';
            buttonElement.classList.add('liked');
            countSpan.textContent = data.likes > 0 ? data.likes : '';
        } else {
            icon.textContent = '🤍';
            buttonElement.classList.remove('liked');
            countSpan.textContent = data.likes > 0 ? data.likes : '';
        }
    } catch (error) {
        console.error('点赞失败:', error);
    }
}

// 获取用户标识（用于点赞去重）
function getUserId() {
    let userId = localStorage.getItem('commentUserId');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('commentUserId', userId);
    }
    return userId;
}

// 显示回复弹窗
function showReplyModal(commentId) {
    if (!currentCommentSchoolId) {
        alert('无法获取学校信息');
        return;
    }
    
    // 使用现有的评论输入弹窗，但修改标题和提交逻辑
    if (commentInputModalTitle) {
        commentInputModalTitle.textContent = '回复评论';
    }
    
    // 保存当前回复的评论ID
    commentInputModal.setAttribute('data-reply-to-comment-id', commentId);
    
    // 清空输入
    if (commentContent) {
        commentContent.value = '';
    }
    if (commentAuthor) {
        const savedAuthor = localStorage.getItem('commentAuthor');
        commentAuthor.value = savedAuthor || '';
    }
    
    updateCommentCharCount();
    validateCommentInput();
    
    commentInputModal.classList.add('active');
    
    if (commentContent) {
        setTimeout(() => commentContent.focus(), 100);
    }
}

// 显示发表评论弹窗
function showCommentInputModal(schoolId, schoolName) {
    currentCommentSchoolId = schoolId;
    currentCommentSchoolName = schoolName;
    
    if (commentInputModalTitle) {
        // schoolName 已经在调用时转义过了，这里直接使用
        commentInputModalTitle.textContent = `为"${schoolName}"发表评论`;
    }
    
    // 恢复用户昵称（如果有）
    const savedAuthor = localStorage.getItem('commentAuthor');
    if (savedAuthor && commentAuthor) {
        commentAuthor.value = savedAuthor;
    }
    
    // 清空评论内容
    if (commentContent) {
        commentContent.value = '';
    }
    
    updateCommentCharCount();
    validateCommentInput();
    
    commentInputModal.classList.add('active');
    
    // 聚焦到评论输入框
    if (commentContent) {
        setTimeout(() => commentContent.focus(), 100);
    }
}

// 关闭发表评论弹窗
function closeCommentInputModal() {
    commentInputModal.classList.remove('active');
    // 清除回复标记
    commentInputModal.removeAttribute('data-reply-to-comment-id');
    // 恢复标题
    if (commentInputModalTitle) {
        commentInputModalTitle.textContent = '发表评论';
    }
}

// 更新字数统计
function updateCommentCharCount() {
    if (!commentContent || !commentCharCount) return;
    
    const length = commentContent.value.length;
    commentCharCount.textContent = length;
    
    const charCountElement = commentCharCount.parentElement;
    if (length > 180) {
        charCountElement.classList.add('warning');
    } else {
        charCountElement.classList.remove('warning');
    }
}

// 验证评论输入
function validateCommentInput() {
    if (!commentContent || !commentSubmitBtn) return;
    
    const content = commentContent.value.trim();
    const isValid = content.length >= 1 && content.length <= 200;
    
    commentSubmitBtn.disabled = !isValid;
}

// 提交评论
async function submitComment() {
    if (!commentContent) return;
    
    const content = commentContent.value.trim();
    const author = commentAuthor ? commentAuthor.value.trim() : '';
    
    if (content.length < 1 || content.length > 200) {
        alert('评论内容必须在1-200字之间');
        return;
    }
    
    // 保存用户昵称
    if (author && commentAuthor) {
        localStorage.setItem('commentAuthor', author);
    }
    
    // 禁用提交按钮
    commentSubmitBtn.disabled = true;
    commentSubmitBtn.textContent = '提交中...';
    
    try {
        // 检查是否是回复
        const replyToCommentId = commentInputModal.getAttribute('data-reply-to-comment-id');
        
        let url, requestBody;
        
        if (replyToCommentId) {
            // 回复评论
            if (!currentCommentSchoolId) {
                throw new Error('无法获取学校信息');
            }
            url = `${API_BASE}/api/comments/${replyToCommentId}/reply`;
            requestBody = {
                content: content,
                author: author || undefined,
                schoolId: currentCommentSchoolId
            };
        } else {
            // 发表新评论
            if (!currentCommentSchoolId) {
                throw new Error('无法获取学校信息');
            }
            url = `${API_BASE}/api/schools/${currentCommentSchoolId}/comments`;
            requestBody = {
                content: content,
                author: author || undefined
            };
        }
        
        console.log('提交评论，URL:', url);
        console.log('请求体:', requestBody);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('提交评论响应状态:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorMessage = '提交失败';
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.errors?.[0]?.msg || errorMessage;
                } else {
                    const text = await response.text();
                    console.error('服务器返回错误:', text);
                    errorMessage = `提交失败: ${response.status} ${response.statusText}`;
                }
            } catch (e) {
                console.error('解析错误响应失败:', e);
                errorMessage = `提交失败: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('服务器返回非JSON响应:', text.substring(0, 200));
            throw new Error('服务器返回格式错误');
        }
        
        const result = await response.json();
        console.log('提交成功:', result);
        
        // 提交成功
        closeCommentInputModal();
        
        // 清除回复标记
        commentInputModal.removeAttribute('data-reply-to-comment-id');
        
        // 刷新评论列表（会自动更新评论数量显示）
        if (commentsModal && commentsModal.classList.contains('active')) {
            await loadComments(currentCommentSchoolId);
        } else {
            // 如果评论弹窗没有打开，只更新评论数量
            loadCommentCount(currentCommentSchoolId);
        }
        
    } catch (error) {
        console.error('提交失败:', error);
        console.error('错误详情:', error.message, error.stack);
        alert(`提交失败: ${error.message}\n请检查网络连接或稍后重试`);
    } finally {
        // 恢复提交按钮
        commentSubmitBtn.disabled = false;
        commentSubmitBtn.textContent = '提交';
    }
}

// 全局函数（供 HTML 调用）
window.toggleSchoolSelection = toggleSchoolSelection;
window.removeSchoolFromCompare = removeSchoolFromCompare;
window.showSchoolModal = showSchoolModal;
window.handleCompareScoring = handleCompareScoring;
window.handleCompare = handleCompare;
window.switchToBasicCompare = switchToBasicCompare;
window.selectSchoolName = selectSchoolName;
window.hideSchoolNameSelection = hideSchoolNameSelection;
window.showCommentsModal = showCommentsModal;

