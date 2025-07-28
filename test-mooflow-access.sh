#!/bin/bash

echo "=== MooFlow 应用访问测试 ==="
echo ""

# 测试主域名访问
echo "1. 测试主域名访问..."
if curl -s -o /dev/null -w "%{http_code}" http://mooyu.cc:3001 | grep -q "200"; then
    echo "✅ http://mooyu.cc:3001 - 正常"
else
    echo "❌ http://mooyu.cc:3001 - 无法访问"
fi

# 测试子域名访问
echo ""
echo "2. 测试子域名访问..."
if curl -s -o /dev/null -w "%{http_code}" http://flow.mooyu.cc | grep -q "200"; then
    echo "✅ http://flow.mooyu.cc - 正常"
else
    echo "❌ http://flow.mooyu.cc - 无法访问"
fi

# 测试 DNS 解析
echo ""
echo "3. 测试 DNS 解析..."
if nslookup flow.mooyu.cc > /dev/null 2>&1; then
    echo "✅ DNS 解析正常"
    nslookup flow.mooyu.cc | grep "Address:"
else
    echo "❌ DNS 解析失败"
fi

echo ""
echo "=== 推荐访问地址 ==="
echo "🌐 正式访问：http://flow.mooyu.cc"
echo "🔧 备用访问：http://mooyu.cc:3001" 