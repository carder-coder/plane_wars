#!/bin/bash

# 飞机大战前端部署脚本
# 用于在 Debian 12 系统上部署前端应用

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
APP_NAME="airplane-battle-frontend"
WEB_ROOT="/var/www/airplane-battle"
NGINX_SITE="/etc/nginx/sites-available/airplane-battle"
NGINX_ENABLED="/etc/nginx/sites-enabled/airplane-battle"
BACKUP_DIR="/opt/backups/frontend"

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

# 检查权限
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要 root 权限运行，请使用 sudo"
        exit 1
    fi
}

# 安装必要软件
install_dependencies() {
    log_step "检查并安装必要软件..."
    
    # 更新包列表
    apt-get update
    
    # 安装 Nginx
    if ! command -v nginx &> /dev/null; then
        log_info "安装 Nginx..."
        apt-get install -y nginx
    else
        log_info "Nginx 已安装"
    fi
    
    # 安装其他工具
    apt-get install -y curl wget unzip
    
    log_info "依赖安装完成"
}

# 创建备份
create_backup() {
    if [[ -d "$WEB_ROOT" ]]; then
        log_step "创建前端文件备份..."
        
        local timestamp=$(date +%Y%m%d_%H%M%S)
        mkdir -p "$BACKUP_DIR"
        
        tar -czf "$BACKUP_DIR/frontend_$timestamp.tar.gz" -C "$WEB_ROOT" .
        log_info "备份完成: frontend_$timestamp.tar.gz"
    fi
}

# 部署前端文件
deploy_frontend() {
    log_step "部署前端文件..."
    
    # 创建 web 根目录
    mkdir -p "$WEB_ROOT"
    
    # 检查是否存在构建产物
    if [[ ! -d "dist" ]]; then
        log_error "未找到 dist 目录，请先在 Windows 环境构建"
        exit 1
    fi
    
    # 复制文件
    cp -r dist/* "$WEB_ROOT/"
    
    # 设置权限
    chown -R www-data:www-data "$WEB_ROOT"
    chmod -R 755 "$WEB_ROOT"
    
    log_info "前端文件部署完成"
}

# 配置 Nginx
configure_nginx() {
    log_step "配置 Nginx..."
    
    # 复制 Nginx 配置
    if [[ -f "nginx.conf" ]]; then
        cp nginx.conf "$NGINX_SITE"
        log_info "Nginx 配置文件已复制"
    else
        log_warn "未找到 nginx.conf，请手动配置"
        return 1
    fi
    
    # 启用站点
    if [[ ! -L "$NGINX_ENABLED" ]]; then
        ln -s "$NGINX_SITE" "$NGINX_ENABLED"
        log_info "Nginx 站点已启用"
    fi
    
    # 禁用默认站点
    if [[ -L "/etc/nginx/sites-enabled/default" ]]; then
        rm "/etc/nginx/sites-enabled/default"
        log_info "默认站点已禁用"
    fi
    
    # 测试配置
    if nginx -t; then
        log_info "Nginx 配置测试通过"
    else
        log_error "Nginx 配置测试失败"
        exit 1
    fi
    
    # 重启 Nginx
    systemctl restart nginx
    systemctl enable nginx
    
    log_info "Nginx 配置完成"
}

# 配置防火墙
configure_firewall() {
    log_step "配置防火墙..."
    
    # 检查是否安装了 ufw
    if command -v ufw &> /dev/null; then
        ufw allow 'Nginx Full'
        ufw allow ssh
        log_info "防火墙规则已配置"
    else
        log_warn "未检测到 ufw，请手动配置防火墙开放 80 和 443 端口"
    fi
}

# 优化系统性能
optimize_system() {
    log_step "优化系统性能..."
    
    # 创建 Nginx 优化配置
    cat > /etc/nginx/conf.d/optimization.conf << 'EOF'
# 性能优化配置
worker_processes auto;
worker_connections 1024;

# 启用文件缓存
open_file_cache max=1000 inactive=20s;
open_file_cache_valid 30s;
open_file_cache_min_uses 2;
open_file_cache_errors on;

# 启用 sendfile
sendfile on;
tcp_nopush on;
tcp_nodelay on;

# 设置缓冲区大小
client_body_buffer_size 128k;
client_max_body_size 10m;
client_header_buffer_size 1k;
large_client_header_buffers 4 4k;
output_buffers 1 32k;
postpone_output 1460;
EOF
    
    log_info "系统优化完成"
}

# 设置监控
setup_monitoring() {
    log_step "设置基础监控..."
    
    # 创建日志轮转配置
    cat > /etc/logrotate.d/airplane-battle << 'EOF'
/var/log/nginx/airplane-battle.*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data adm
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
EOF
    
    # 创建健康检查脚本
    cat > /usr/local/bin/check-frontend-health.sh << 'EOF'
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health)
if [ "$response" != "200" ]; then
    echo "Frontend health check failed: $response"
    systemctl restart nginx
fi
EOF
    
    chmod +x /usr/local/bin/check-frontend-health.sh
    
    # 添加到 crontab (每5分钟检查一次)
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/check-frontend-health.sh") | crontab -
    
    log_info "监控设置完成"
}

# 显示部署信息
show_deployment_info() {
    log_step "部署信息："
    
    echo "========================================"
    echo "前端部署完成！"
    echo ""
    echo "Web 根目录: $WEB_ROOT"
    echo "Nginx 配置: $NGINX_SITE"
    echo ""
    echo "访问地址:"
    echo "  HTTP:  http://$(hostname -I | awk '{print $1}')"
    echo "  本地:  http://localhost"
    echo ""
    echo "常用命令:"
    echo "  重启 Nginx:    sudo systemctl restart nginx"
    echo "  查看状态:      sudo systemctl status nginx"
    echo "  查看日志:      sudo tail -f /var/log/nginx/error.log"
    echo "  健康检查:      curl http://localhost/health"
    echo ""
    echo "配置文件位置:"
    echo "  Nginx 配置:    $NGINX_SITE"
    echo "  访问日志:      /var/log/nginx/access.log"
    echo "  错误日志:      /var/log/nginx/error.log"
    echo "========================================"
}

# 主函数
main() {
    log_info "开始部署飞机大战前端应用..."
    
    check_permissions
    install_dependencies
    create_backup
    deploy_frontend
    configure_nginx
    configure_firewall
    optimize_system
    setup_monitoring
    show_deployment_info
    
    log_info "前端部署完成！"
}

# 处理参数
case "${1:-deploy}" in
    deploy)
        main
        ;;
    backup)
        create_backup
        ;;
    restart)
        systemctl restart nginx
        log_info "Nginx 已重启"
        ;;
    status)
        systemctl status nginx
        ;;
    logs)
        tail -f /var/log/nginx/error.log
        ;;
    *)
        echo "用法: $0 {deploy|backup|restart|status|logs}"
        exit 1
        ;;
esac