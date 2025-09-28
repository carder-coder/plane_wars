#!/bin/bash

# Debian 12 系统初始化和部署脚本
# 适用于飞机大战游戏服务端部署

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "请不要使用root用户运行此脚本"
        exit 1
    fi
}

# 检查操作系统
check_os() {
    if [[ ! -f /etc/debian_version ]]; then
        log_error "此脚本仅支持Debian系统"
        exit 1
    fi
    
    local debian_version=$(cat /etc/debian_version)
    log_info "检测到Debian版本: $debian_version"
}

# 更新系统
update_system() {
    log_step "更新系统包..."
    
    sudo apt update
    sudo apt upgrade -y
    sudo apt autoremove -y
    
    log_info "系统更新完成"
}

# 安装基础依赖
install_dependencies() {
    log_step "安装基础依赖..."
    
    sudo apt install -y \
        curl \
        wget \
        git \
        build-essential \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        ufw \
        fail2ban \
        htop \
        vim \
        tmux \
        tree \
        unzip
    
    log_info "基础依赖安装完成"
}

# 安装Node.js
install_nodejs() {
    log_step "安装Node.js..."
    
    # 添加NodeSource仓库
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    
    sudo apt install -y nodejs
    
    # 验证安装
    local node_version=$(node --version)
    local npm_version=$(npm --version)
    
    log_info "Node.js安装完成: $node_version"
    log_info "npm版本: $npm_version"
    
    # 安装PM2
    sudo npm install -g pm2
    
    log_info "PM2安装完成"
}

# 安装MongoDB
install_mongodb() {
    log_step "安装MongoDB..."
    
    # 导入MongoDB公钥
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    
    # 添加MongoDB仓库
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    
    sudo apt update
    sudo apt install -y mongodb-org
    
    # 启动并启用MongoDB服务
    sudo systemctl start mongod
    sudo systemctl enable mongod
    
    log_info "MongoDB安装完成"
}

# 安装Redis
install_redis() {
    log_step "安装Redis..."
    
    sudo apt install -y redis-server
    
    # 配置Redis
    sudo sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
    
    # 重启Redis服务
    sudo systemctl restart redis-server
    sudo systemctl enable redis-server
    
    log_info "Redis安装完成"
}

# 安装Nginx
install_nginx() {
    log_step "安装Nginx..."
    
    sudo apt install -y nginx
    
    # 启动并启用Nginx服务
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    log_info "Nginx安装完成"
}

# 配置防火墙
configure_firewall() {
    log_step "配置防火墙..."
    
    # 启用UFW
    sudo ufw --force enable
    
    # 默认策略
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # 允许SSH
    sudo ufw allow ssh
    
    # 允许HTTP和HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # 允许应用端口（限制到本地）
    sudo ufw allow from 127.0.0.1 to any port 3001
    
    # 显示状态
    sudo ufw status verbose
    
    log_info "防火墙配置完成"
}

# 配置用户和目录
setup_app_user() {
    log_step "配置应用用户和目录..."
    
    local app_user="airplane"
    local app_dir="/opt/airplane-battle"
    
    # 创建应用用户
    if ! id "$app_user" &>/dev/null; then
        sudo useradd -r -m -s /bin/bash "$app_user"
        log_info "创建用户: $app_user"
    fi
    
    # 创建应用目录
    sudo mkdir -p "$app_dir"
    sudo chown "$app_user":"$app_user" "$app_dir"
    
    # 创建日志目录
    sudo mkdir -p /var/log/airplane-battle
    sudo chown "$app_user":"$app_user" /var/log/airplane-battle
    
    log_info "应用用户和目录配置完成"
}

# 配置系统服务
configure_systemd() {
    log_step "配置系统服务..."
    
    # 创建systemd服务文件
    sudo tee /etc/systemd/system/airplane-battle.service > /dev/null <<EOF
[Unit]
Description=Airplane Battle Game Server
Documentation=https://github.com/your-repo/airplane-battle
After=network.target mongod.service redis-server.service

[Service]
Type=forking
User=airplane
WorkingDirectory=/opt/airplane-battle
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 reload ecosystem.config.js --env production
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
PIDFile=/opt/airplane-battle/.pm2/pm2.pid
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    # 重载systemd配置
    sudo systemctl daemon-reload
    
    log_info "系统服务配置完成"
}

# 配置Nginx
configure_nginx() {
    log_step "配置Nginx..."
    
    # 删除默认配置
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # 创建应用配置
    sudo tee /etc/nginx/sites-available/airplane-battle > /dev/null <<EOF
upstream nodejs_backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002 backup;
}

server {
    listen 80;
    server_name _;
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # 限制请求体大小
    client_max_body_size 10M;
    
    # 代理配置
    location / {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://nodejs_backend/health;
        access_log off;
    }
    
    # 静态文件（如果需要）
    location /static/ {
        alias /opt/airplane-battle/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 访问日志
    access_log /var/log/nginx/airplane-battle.access.log;
    error_log /var/log/nginx/airplane-battle.error.log;
}
EOF
    
    # 启用站点
    sudo ln -sf /etc/nginx/sites-available/airplane-battle /etc/nginx/sites-enabled/
    
    # 测试配置
    sudo nginx -t
    
    # 重载Nginx
    sudo systemctl reload nginx
    
    log_info "Nginx配置完成"
}

# 配置MongoDB
configure_mongodb() {
    log_step "配置MongoDB..."
    
    # 备份原配置
    sudo cp /etc/mongod.conf /etc/mongod.conf.backup
    
    # 创建新配置
    sudo tee /etc/mongod.conf > /dev/null <<EOF
# MongoDB配置文件

# 存储配置
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

# 系统日志配置
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

# 网络配置
net:
  port: 27017
  bindIp: 127.0.0.1

# 进程管理
processManagement:
  timeZoneInfo: /usr/share/zoneinfo

# 安全配置
security:
  authorization: enabled

# 运维配置
operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp
EOF
    
    # 重启MongoDB
    sudo systemctl restart mongod
    
    log_info "MongoDB配置完成"
}

# 配置Redis
configure_redis() {
    log_step "配置Redis..."
    
    # 备份原配置
    sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup
    
    # 修改配置
    sudo sed -i 's/^# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
    sudo sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
    
    # 重启Redis
    sudo systemctl restart redis-server
    
    log_info "Redis配置完成"
}

# 配置日志轮转
configure_logrotate() {
    log_step "配置日志轮转..."
    
    sudo tee /etc/logrotate.d/airplane-battle > /dev/null <<EOF
/var/log/airplane-battle/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 airplane airplane
    postrotate
        systemctl reload airplane-battle || true
    endscript
}
EOF
    
    log_info "日志轮转配置完成"
}

# 安装监控工具
install_monitoring() {
    log_step "安装监控工具..."
    
    # 安装htop, iotop, nethogs
    sudo apt install -y htop iotop nethogs
    
    # 安装node_exporter（Prometheus监控）
    local node_exporter_version="1.6.1"
    cd /tmp
    wget "https://github.com/prometheus/node_exporter/releases/download/v${node_exporter_version}/node_exporter-${node_exporter_version}.linux-amd64.tar.gz"
    tar xvfz "node_exporter-${node_exporter_version}.linux-amd64.tar.gz"
    sudo mv "node_exporter-${node_exporter_version}.linux-amd64/node_exporter" /usr/local/bin/
    
    # 创建node_exporter用户
    sudo useradd -r -M -s /bin/false node_exporter
    
    # 创建systemd服务
    sudo tee /etc/systemd/system/node_exporter.service > /dev/null <<EOF
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl start node_exporter
    sudo systemctl enable node_exporter
    
    log_info "监控工具安装完成"
}

# 主函数
main() {
    log_info "开始Debian 12系统初始化和部署配置..."
    
    check_root
    check_os
    
    # 系统初始化
    update_system
    install_dependencies
    
    # 安装服务
    install_nodejs
    install_mongodb
    install_redis
    install_nginx
    
    # 配置系统
    configure_firewall
    setup_app_user
    configure_systemd
    
    # 配置服务
    configure_nginx
    configure_mongodb
    configure_redis
    
    # 其他配置
    configure_logrotate
    install_monitoring
    
    log_info "系统初始化完成！"
    log_info "接下来请："
    log_info "1. 部署应用代码到 /opt/airplane-battle"
    log_info "2. 配置环境变量文件"
    log_info "3. 初始化数据库"
    log_info "4. 启动应用服务"
}

# 运行主函数
main "$@"