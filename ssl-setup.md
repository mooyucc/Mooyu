# SSL 证书配置（Let's Encrypt）

## 1. 安装 Certbot
```bash
# CentOS/RHEL
yum install -y epel-release
yum install -y certbot python3-certbot-nginx

# 或者使用 snap（推荐）
yum install -y snapd
systemctl enable --now snapd.socket
ln -s /var/lib/snapd/snap /snap
snap install core
snap refresh core
snap install --classic certbot
ln -s /snap/bin/certbot /usr/bin/certbot
```

## 2. 获取 SSL 证书
```bash
# 使用 Nginx 插件自动配置
certbot --nginx -d mooyu.cc -d www.mooyu.cc

# 或者仅获取证书
certbot certonly --nginx -d mooyu.cc -d www.mooyu.cc
```

## 3. 自动续期设置
```bash
# 测试自动续期
certbot renew --dry-run

# 添加到 crontab
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## 4. 验证证书状态
```bash
certbot certificates
```

## 5. 如果遇到问题，手动配置证书路径
编辑 Nginx 配置文件，确保证书路径正确：
```bash
nano /etc/nginx/conf.d/mooyu.conf
```

确保证书路径指向正确位置：
```nginx
ssl_certificate /etc/letsencrypt/live/mooyu.cc/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/mooyu.cc/privkey.pem;
``` 