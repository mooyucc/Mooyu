const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'mooflow'))); // 提供 mooFlow 静态文件

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'mooflow',
    timestamp: new Date().toISOString() 
  });
});

// 默认路由 - 返回 mooFlow 主页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'mooflow', 'index.html'));
});

// 处理所有其他路由，返回主页面（SPA 应用）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'mooflow', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MooFlow 服务器运行在端口 ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
}); 