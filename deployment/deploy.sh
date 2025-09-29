#!/bin/bash

# 应用部署脚本
# 用于部署飞机大战游戏服务端到Debian 12系统

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
APP_NAME="airplane-battle"
APP_USER="airplane"
APP_DIR="/opt/airplane-battle"
REPO_URL="https://github.com/carder-coder/airplane-battle-server.git"
BRANCH="main"

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

# 检查参数
if [[ $# -lt 1 ]]; then
    echo "用法: $0 <command> [options]"
    echo "命令:"
    echo "  deploy [branch]     - 部署应用"
    echo "  update [branch]     - 更新应用"
    echo "  rollback            - 回滚到上一版本"
    echo "  start               - 启动应用"
    echo "  stop                - 停止应用"
    echo "  restart             - 重启应用"
    echo "  status              - 查看应用状态"
    echo "  logs                - 查看应用日志"
    echo "  backup              - 备份数据库"
    echo "  restore <file>      - 恢复数据库"
    exit 1
fi

COMMAND=$1
BRANCH=${2:-$BRANCH}

# 检查用户权限
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        log_error "请不要使用root用户运行此脚本"
        exit 1
    fi
    
    # 检查sudo权限
    if ! sudo -n true 2>/dev/null; then
        log_error "需要sudo权限执行此脚本"
        exit 1
    fi
}

# 创建备份
create_backup() {
    local backup_dir="/opt/backups/airplane-battle"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    log_step "创建备份..."
    
    sudo mkdir -p "$backup_dir"
    
    # 备份应用代码
    if [[ -d "$APP_DIR" ]]; then
        sudo tar -czf "$backup_dir/app_$timestamp.tar.gz" -C "$APP_DIR" .
        log_info "应用代码备份完成: app_$timestamp.tar.gz"
    fi
    
    # 备份数据库
    backup_database "$backup_dir" "$timestamp"
}

# 备份数据库
backup_database() {
    local backup_dir=$1
    local timestamp=$2
    
    log_step "备份MongoDB数据库..."
    
    # MongoDB备份
    sudo -u "$APP_USER" mongodump --host localhost:27017 \
        --db airplane_battle \
        --out "$backup_dir/mongodb_$timestamp"
    
    # 压缩备份
    sudo tar -czf "$backup_dir/mongodb_$timestamp.tar.gz" \
        -C "$backup_dir" "mongodb_$timestamp"
    sudo rm -rf "$backup_dir/mongodb_$timestamp"
    
    log_info "数据库备份完成: mongodb_$timestamp.tar.gz"
}

# 克隆或更新代码
update_code() {
    log_step "更新应用代码..."
    
    if [[ ! -d "$APP_DIR" ]]; then
        # 首次部署，克隆代码
        sudo -u "$APP_USER" git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
        log_info "代码克隆完成"
    else
        # 更新代码
        cd "$APP_DIR"
        sudo -u "$APP_USER" git fetch origin
        sudo -u "$APP_USER" git checkout "$BRANCH"
        sudo -u "$APP_USER" git pull origin "$BRANCH"
        log_info "代码更新完成"
    fi
}

# 安装依赖
install_dependencies() {
    log_step "安装应用依赖..."
    
    cd "$APP_DIR"
    
    # 安装npm依赖
    sudo -u "$APP_USER" npm ci --only=production
    
    log_info "依赖安装完成"
}

# 构建应用
build_application() {
    log_step "构建应用..."
    
    cd "$APP_DIR"
    
    # TypeScript编译
    sudo -u "$APP_USER" npm run build
    
    log_info "应用构建完成"
}

# 配置环境变量
setup_environment() {
    log_step "配置环境变量..."
    
    local env_file="$APP_DIR/.env"
    
    if [[ ! -f "$env_file" ]]; then
        # 复制环境变量模板
        sudo -u "$APP_USER" cp "$APP_DIR/.env.example" "$env_file"
        
        log_warn "请编辑 $env_file 配置环境变量"
        log_warn "然后重新运行部署命令"
        exit 1
    fi
    
    log_info "环境变量配置完成"
}

# 数据库迁移
run_migrations() {
    log_step "执行数据库迁移..."
    
    cd "$APP_DIR"
    
    # 测试数据库连接
    sudo -u "$APP_USER" npm run mongo:test
    
    # 初始化索引
    sudo -u "$APP_USER" npm run mongo:indexes
    
    log_info "数据库迁移完成"
}

# 启动应用
start_application() {
    log_step "启动应用..."
    
    cd "$APP_DIR"
    
    # 使用PM2启动
    sudo -u "$APP_USER" pm2 start ecosystem.config.js --env production
    
    # 保存PM2配置
    sudo -u "$APP_USER" pm2 save
    
    # 启用系统服务
    sudo systemctl enable airplane-battle
    sudo systemctl start airplane-battle
    
    log_info "应用启动完成"
}

# 停止应用
stop_application() {
    log_step "停止应用..."
    
    # 停止系统服务
    sudo systemctl stop airplane-battle || true
    
    # 停止PM2进程
    sudo -u "$APP_USER" pm2 stop all || true
    
    log_info "应用停止完成"
}

# 重启应用
restart_application() {
    log_step "重启应用..."
    
    stop_application
    sleep 2
    start_application
    
    log_info "应用重启完成"
}

# 查看应用状态
show_status() {
    log_step "查看应用状态..."
    
    echo "=== 系统服务状态 ==="
    sudo systemctl status airplane-battle --no-pager || true
    
    echo ""
    echo "=== PM2进程状态 ==="
    sudo -u "$APP_USER" pm2 status || true
    
    echo ""
    echo "=== 端口监听状态 ==="
    sudo netstat -tlnp | grep :3001 || true
    
    echo ""
    echo "=== 最近日志 ==="
    sudo tail -20 /var/log/airplane-battle/combined.log || true
}

# 查看日志
show_logs() {
    log_step "查看应用日志..."
    
    if [[ -f "/var/log/airplane-battle/combined.log" ]]; then
        sudo tail -f /var/log/airplane-battle/combined.log
    else
        sudo -u "$APP_USER" pm2 logs
    fi
}

# 回滚应用
rollback_application() {
    log_step "回滚应用..."
    
    # 查找最新的备份
    local backup_dir="/opt/backups/airplane-battle"
    local latest_backup=$(sudo find "$backup_dir" -name "app_*.tar.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [[ -z "$latest_backup" ]]; then
        log_error "未找到备份文件"
        exit 1
    fi
    
    log_info "使用备份文件: $latest_backup"
    
    # 停止应用
    stop_application
    
    # 备份当前版本
    create_backup
    
    # 恢复备份
    sudo rm -rf "$APP_DIR"
    sudo mkdir -p "$APP_DIR"
    sudo tar -xzf "$latest_backup" -C "$APP_DIR"
    sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    
    # 启动应用
    start_application
    
    log_info "应用回滚完成"
}

# 恢复数据库
restore_database() {
    local backup_file=$1
    
    if [[ -z "$backup_file" ]]; then
        log_error "请指定备份文件"
        exit 1
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "备份文件不存在: $backup_file"
        exit 1
    fi
    
    log_step "恢复数据库..."
    
    # 停止应用
    stop_application
    
    # 备份当前数据库
    backup_database "/opt/backups/airplane-battle" "before_restore_$(date +%Y%m%d_%H%M%S)"
    
    # 解压备份文件
    local temp_dir="/tmp/mongodb_restore_$$"
    mkdir -p "$temp_dir"
    tar -xzf "$backup_file" -C "$temp_dir"
    
    # 恢复数据库
    sudo -u "$APP_USER" mongorestore --host localhost:27017 \
        --db airplane_battle \
        --drop \
        "$temp_dir/mongodb_"*/airplane_battle
    
    # 清理临时文件
    rm -rf "$temp_dir"
    
    # 启动应用
    start_application
    
    log_info "数据库恢复完成"
}

# 部署应用
deploy_application() {
    log_step "开始部署应用..."
    
    # 创建备份
    if [[ -d "$APP_DIR" ]]; then
        create_backup
    fi
    
    # 更新代码
    update_code
    
    # 安装依赖
    install_dependencies
    
    # 构建应用
    build_application
    
    # 配置环境
    setup_environment
    
    # 数据库迁移
    run_migrations
    
    # 启动应用
    restart_application
    
    # 检查状态
    sleep 5
    show_status
    
    log_info "应用部署完成！"
}

# 主函数
main() {
    check_permissions
    
    case $COMMAND in
        deploy)
            deploy_application
            ;;
        update)
            deploy_application
            ;;
        rollback)
            rollback_application
            ;;
        start)
            start_application
            ;;
        stop)
            stop_application
            ;;
        restart)
            restart_application
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        backup)
            create_backup
            ;;
        restore)
            restore_database "$2"
            ;;
        *)
            log_error "未知命令: $COMMAND"
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"