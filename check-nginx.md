# Nginx 配置检查指南

## 常见问题及解决方案

### 1. 端口被占用
```bash
# 检查端口占用
netstat -tlnp | grep :80
netstat -tlnp | grep :443

# 释放端口
sudo fuser -k 80/tcp
sudo fuser -k 443/tcp
```

### 2. 配置文件语法错误
```bash
# 测试配置文件语法
nginx -t

# 查看详细配置
nginx -T
```

### 3. 权限问题
```bash
# 检查 Nginx 用户
id nginx

# 设置正确的权限
sudo chown -R nginx:nginx /var/log/nginx
sudo chown -R nginx:nginx /var/cache/nginx
```

### 4. SELinux 问题
```bash
# 检查 SELinux 状态
sestatus

# 临时禁用 SELinux（仅用于测试）
sudo setenforce 0

# 永久禁用 SELinux
sudo sed -i 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config
```

### 5. 防火墙问题
```bash
# 检查防火墙状态
firewall-cmd --state

# 开放端口
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
```

## 诊断步骤

1. **上传诊断脚本到服务器**：
```bash
scp diagnose-nginx.sh root@122.51.133.41:/root/Mooyu/
```

2. **在服务器上运行诊断**：
```bash
ssh root@122.51.133.41
cd /root/Mooyu
chmod +x diagnose-nginx.sh
bash diagnose-nginx.sh
```

3. **如果诊断发现问题，运行修复脚本**：
```bash
chmod +x fix-nginx.sh
bash fix-nginx.sh
```

## 手动修复步骤

### 步骤 1：停止所有 Nginx 进程
```bash
systemctl stop nginx
pkill nginx
```

### 步骤 2：检查配置文件
```bash
nginx -t
```

### 步骤 3：检查端口占用
```bash
netstat -tlnp | grep :80
netstat -tlnp | grep :443
```

### 步骤 4：检查日志
```bash
tail -20 /var/log/nginx/error.log
journalctl -xeu nginx.service --no-pager | tail -20
```

### 步骤 5：重新启动
```bash
systemctl start nginx
systemctl status nginx
```

## 常见错误及解决方案

### 错误 1：bind() to 0.0.0.0:80 failed (98: Address already in use)
**解决方案**：
```bash
# 查找占用端口的进程
sudo lsof -i :80
# 杀死进程
sudo kill -9 <PID>
```

### 错误 2：nginx: [emerg] open() "/var/log/nginx/error.log" failed (13: Permission denied)
**解决方案**：
```bash
# 创建日志目录并设置权限
sudo mkdir -p /var/log/nginx
sudo chown nginx:nginx /var/log/nginx
sudo chmod 755 /var/log/nginx
```

### 错误 3：nginx: [emerg] "server" directive is not allowed here
**解决方案**：
检查配置文件语法，确保 server 块在 http 块内。

### 错误 4：nginx: [emerg] unknown directive "proxy_pass"
**解决方案**：
确保在 http 块中包含了必要的模块：
```nginx
http {
    include /etc/nginx/mime.types;
    include /etc/nginx/conf.d/*.conf;
}
```

## 测试访问

修复完成后，测试访问：
```bash
# 本地测试
curl http://localhost

# 检查服务状态
systemctl status nginx

# 检查端口监听
netstat -tlnp | grep nginx
``` 