// 滚动时改变头部样式
document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (!header) return;
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
});

// 平滑滚动
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// 添加动画效果
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
        }
    });
}, observerOptions);

document.querySelectorAll('.feature').forEach(feature => {
    observer.observe(feature);
});

// 页面切换逻辑
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    document.getElementById(pageId).style.display = 'block';
    
    // 触发页面显示事件
    const event = new Event('show');
    document.getElementById(pageId).dispatchEvent(event);
}

// 首页 -> MooFlow页
const gotoMooflow = document.getElementById('goto-mooflow');
if (gotoMooflow) {
    gotoMooflow.addEventListener('click', () => showPage('page-mooflow'));
}

// 首页Download Moo按钮 -> 登录页
const homeDownloadLink = document.getElementById('home-download-link');
if (homeDownloadLink) {
    homeDownloadLink.addEventListener('click', (e) => {
        e.preventDefault();
        showPage('page-login');
    });
}

// MooFlow页logo -> 首页
const logoToHome = document.getElementById('logo-to-home');
if (logoToHome) {
    logoToHome.addEventListener('click', () => showPage('page-home'));
}

// 下载页logo -> 首页
const logoToHome2 = document.getElementById('logo-to-home2');
if (logoToHome2) {
    logoToHome2.addEventListener('click', () => showPage('page-home'));
}

// 登录页logo -> 首页
const logoToHome3 = document.getElementById('logo-to-home3');
if (logoToHome3) {
    logoToHome3.addEventListener('click', () => showPage('page-home'));
}

// 注册页logo -> 首页
const logoToHome4 = document.getElementById('logo-to-home4');
if (logoToHome4) {
    logoToHome4.addEventListener('click', () => showPage('page-home'));
}

// 登录页 -> 注册页
const gotoRegister = document.getElementById('goto-register');
if (gotoRegister) {
    gotoRegister.addEventListener('click', (e) => {
        e.preventDefault();
        showPage('page-register');
    });
}

// 默认显示首页
if (document.getElementById('page-home')) {
    showPage('page-home');
}

// 图片预览功能
document.addEventListener('DOMContentLoaded', function() {
    // 获取模态框元素
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');
    const closeBtn = document.querySelector('.modal-close');

    // 获取所有功能卡片中的图片
    const featureImages = document.querySelectorAll('.feature-image img');

    // 为每个图片添加点击事件
    if (featureImages && featureImages.length > 0 && modal && modalImg && closeBtn) {
        featureImages.forEach(img => {
            img.addEventListener('click', function() {
                modal.style.display = 'block';
                modalImg.src = this.src;
                // 禁用滚动
                document.body.style.overflow = 'hidden';
            });
        });

        // 点击关闭按钮关闭模态框
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
            // 恢复滚动
            document.body.style.overflow = 'auto';
        });

        // 点击模态框背景关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });

        // 按ESC键关闭模态框
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }
});

// 轮播功能
document.addEventListener('DOMContentLoaded', function() {
    const carouselContainer = document.querySelector('.carousel-container');
    if (!carouselContainer) return;

    const slides = carouselContainer.querySelectorAll('.carousel-slide');
    const prevBtn = carouselContainer.querySelector('.carousel-prev');
    const nextBtn = carouselContainer.querySelector('.carousel-next');
    let currentSlide = 0;
    let autoPlayInterval;
    let isTransitioning = false;

    function showSlide(index) {
        if (isTransitioning) return;
        isTransitioning = true;
        
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });

        // 等待过渡动画完成
        setTimeout(() => {
            isTransitioning = false;
        }, 2000); // 与CSS中的过渡时间保持一致
    }

    function nextSlide() {
        if (isTransitioning) return;
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }

    function prevSlide() {
        if (isTransitioning) return;
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(currentSlide);
    }

    function startAutoPlay() {
        autoPlayInterval = setInterval(() => {
            if (!isTransitioning) {
                nextSlide();
            }
        }, 7000);
    }

    function stopAutoPlay() {
        clearInterval(autoPlayInterval);
    }

    // 鼠标悬停时暂停自动轮播
    carouselContainer.addEventListener('mouseenter', stopAutoPlay);
    carouselContainer.addEventListener('mouseleave', startAutoPlay);

    prevBtn.addEventListener('click', () => {
        if (!isTransitioning) {
            stopAutoPlay();
            prevSlide();
            startAutoPlay();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (!isTransitioning) {
            stopAutoPlay();
            nextSlide();
            startAutoPlay();
        }
    });

    // 保持原有的图片点击放大功能
    carouselContainer.addEventListener('click', function(e) {
        // 如果点击的是控制按钮，不触发放大预览
        if (e.target.classList.contains('carousel-prev') || 
            e.target.classList.contains('carousel-next')) {
            return;
        }
        
        // 获取当前显示的图片
        const activeSlide = carouselContainer.querySelector('.carousel-slide.active');
        if (activeSlide) {
            const modal = document.getElementById('image-modal');
            const modalImg = document.getElementById('modal-image');
            modal.style.display = 'block';
            modalImg.src = activeSlide.src;
        }
    });

    // 开始自动轮播
    startAutoPlay();
}); 

// 登录页面相关功能
document.addEventListener('DOMContentLoaded', function() {
    // 获取所有登录按钮
    const loginButtons = document.querySelectorAll('.login-btn');
    
    // 为每个登录按钮添加点击事件
    loginButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            // 隐藏所有页面
            document.querySelectorAll('.page').forEach(page => {
                page.style.display = 'none';
            });
            // 显示登录页面
            const pageLogin = document.getElementById('page-login');
            if (pageLogin) {
                pageLogin.style.display = 'block';
            }
        });
    });

    // 返回首页的logo点击事件
    const logoToHome3 = document.getElementById('logo-to-home3');
    if (logoToHome3) {
        logoToHome3.addEventListener('click', function(e) {
            e.preventDefault();
            // 隐藏所有页面
            document.querySelectorAll('.page').forEach(page => {
                page.style.display = 'none';
            });
            // 显示首页
            document.getElementById('page-home').style.display = 'block';
        });
    }

    // 登录表单提交
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // 这里添加实际的登录逻辑
            console.log('登录尝试:', { email, password });
            
            // 模拟登录成功
            // 在实际应用中，这里应该调用后端API
            setTimeout(() => {
                alert('登录成功！');
                // 登录成功后可以跳转到其他页面
                // window.location.href = '/dashboard';
            }, 1000);
        });
    }
}); 

// 用户认证相关函数
const API_BASE_URL = 'http://localhost:3000/api';

// 显示错误消息
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.querySelector('.login-form').prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

// 处理注册表单提交
document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    if (password !== confirmPassword) {
        showError('两次输入的密码不一致');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // 保存token和用户信息
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // 跳转到首页
            showPage('page-home');
        } else {
            showError(data.message || '注册失败');
        }
    } catch (error) {
        showError('网络错误，请稍后重试');
    }
});

// 处理登录表单提交
document.querySelector('#page-login .login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // 保存token和用户信息
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // 根据用户角色跳转到不同页面
            if (data.user.role === 'admin') {
                showPage('page-admin');
                await loadUsers();
            } else {
                showPage('page-home');
            }
        } else {
            showError(data.message || '登录失败');
        }
    } catch (error) {
        showError('网络错误，请稍后重试');
    }
});

// 检查用户是否已登录
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        // 用户已登录，可以在这里更新UI
        const userData = JSON.parse(user);
        console.log('用户已登录:', userData);
    }
}

// 页面加载时检查登录状态
document.addEventListener('DOMContentLoaded', checkAuth);

// 更新登录按钮文本
function updateLoginButton() {
    const token = localStorage.getItem('token');
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        if (token) {
            loginBtn.textContent = '退出';
            loginBtn.onclick = () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                showPage('page-home');
            };
        } else {
            loginBtn.textContent = '登录';
            loginBtn.onclick = () => showPage('page-login');
        }
    }
}

// 监听页面切换事件
document.addEventListener('DOMContentLoaded', () => {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.addEventListener('show', updateLoginButton);
    });
});

// 更新用户统计
function updateUserStats(users) {
    const totalUsers = users.length;
    const adminCount = users.filter(user => user.role === 'admin').length;
    
    document.getElementById('total-users').textContent = totalUsers;
    document.getElementById('admin-count').textContent = adminCount;
}

// 导出用户数据为CSV
function exportUsersToCSV(users) {
    // CSV头部
    const headers = ['ID', '姓名', '邮箱', '角色', '注册时间'];
    const csvContent = [headers.join(',')];
    
    // 添加用户数据
    users.forEach(user => {
        const row = [
            user._id,
            user.name || '-',
            user.email,
            user.role,
            new Date(user.createdAt).toLocaleString()
        ].map(field => `"${field}"`).join(',');
        csvContent.push(row);
    });
    
    // 创建下载链接
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 修改loadUsers函数
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showError('请先登录管理员账户');
                showPage('page-login');
                return;
            }
            throw new Error('获取用户列表失败');
        }
        
        const users = await response.json();
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';
        
        // 更新用户统计
        updateUserStats(users);
        
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user._id}</td>
                <td>${user.name || '-'}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${new Date(user.createdAt).toLocaleString()}</td>
                <td>
                    <button class="delete-user-btn" data-id="${user._id}">删除</button>
                </td>
            `;
            usersList.appendChild(row);
        });
    } catch (error) {
        showError(error.message);
    }
}

// 添加导出按钮事件监听
document.getElementById('export-users')?.addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取用户数据失败');
        }
        
        const users = await response.json();
        exportUsersToCSV(users);
    } catch (error) {
        showError(error.message);
    }
});

// 删除用户
async function deleteUser(userId) {
    if (!confirm('确定要删除这个用户吗？')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('删除用户失败');
        }
        
        await loadUsers();
        showError('用户已删除', 'success');
    } catch (error) {
        showError(error.message);
    }
}

// 管理员页面事件监听
document.getElementById('refresh-users')?.addEventListener('click', loadUsers);
document.getElementById('admin-logout')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showPage('page-login');
});

// 删除用户按钮事件委托
document.getElementById('users-list')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-user-btn')) {
        deleteUser(e.target.dataset.id);
    }
});

// 修改登录成功处理
async function handleLoginSuccess(userData) {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData.user));
    updateLoginButton();
    
    if (userData.user.role === 'admin') {
        showPage('page-admin');
        await loadUsers();
    } else {
        showPage('page-home');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 支持多个同名id的按钮（如介绍页和下载页）
    const downloadWFAppleBtns = document.querySelectorAll('#DownloadWFApple');
    downloadWFAppleBtns.forEach(downloadWFApple => {
        downloadWFApple.addEventListener('click', function(e) {
            const token = localStorage.getItem('token');
            if (!token) {
                e.preventDefault();
                // 创建提示泡泡
                let tip = document.createElement('div');
                tip.className = 'login-tip-pop';
                tip.textContent = '请先登录';
                // 定位到按钮旁边
                const rect = downloadWFApple.getBoundingClientRect();
                tip.style.position = 'absolute';
                tip.style.left = rect.left + window.scrollX + 'px';
                tip.style.top = (rect.bottom + window.scrollY + 8) + 'px';
                tip.style.zIndex = 9999;
                tip.style.background = 'rgba(34,34,34,0.85)';
                tip.style.color = '#fff';
                tip.style.padding = '6px 16px';
                tip.style.borderRadius = '16px';
                tip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                tip.style.fontSize = '14px';
                tip.style.pointerEvents = 'none';
                tip.style.border = '1px solid rgba(255,255,255,0.3)';
                document.body.appendChild(tip);
                setTimeout(() => {
                    tip.remove();
                }, 2000);
            }
        });
    });
}); 