#!/bin/bash

# 紧急修复脚本 - 解决生产环境依赖缺失问题
# 专门用于修复 "Cannot find package 'express'" 错误

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查当前状态
check_current_status() {
    log_step "检查当前状态..."
    
    if ! pm2 list | grep -q "airplane-battle-server"; then
        log_info "PM2进程未运行"
    else
        log_info "检测到PM2进程，正在停止..."
        pm2 stop airplane-battle-server || true
        pm2 delete airplane-battle-server || true
    fi
}

# 清理并重新安装依赖
fix_dependencies() {
    log_step "修复依赖问题..."
    
    # 删除旧的 node_modules 和 package-lock.json
    if [[ -d "node_modules" ]]; then
        log_info "删除旧的 node_modules..."
        rm -rf node_modules
    fi
    
    if [[ -f "package-lock.json" ]]; then
        log_info "删除旧的 package-lock.json..."
        rm -f package-lock.json
    fi
    
    # 检查 package.json
    if [[ ! -f "package.json" ]]; then
        log_error "package.json 文件不存在"
        exit 1
    fi
    
    # 显示依赖信息
    log_info "当前 package.json 依赖:"
    node -e "console.log(JSON.stringify(require('./package.json').dependencies, null, 2))"
    
    # 重新安装依赖
    log_info "重新安装生产依赖..."
    npm install --omit=dev --verbose
    
    log_info "依赖安装完成"
}

# 验证关键模块
verify_modules() {
    log_step "验证关键模块..."
    
    local critical_modules=("express" "mongoose" "socket.io" "dotenv" "jsonwebtoken")
    
    for module in "${critical_modules[@]}"; do
        if [[ -d "node_modules/$module" ]]; then
            log_info "✓ $module 已安装"
        else
            log_error "✗ $module 缺失"
            exit 1
        fi
    done
    
    log_info "所有关键模块验证通过"
}

# 测试应用启动
test_application() {
    log_step "测试应用启动..."
    
    # 检查编译后的文件
    if [[ ! -f "dist/server.js" ]]; then
        log_error "dist/server.js 不存在"
        exit 1
    fi
    
    # 尝试导入测试
    log_info "测试模块导入..."
    timeout 10s node -e "
        import('./dist/server.js').then(() => {
            console.log('模块导入成功');
            process.exit(0);
        }).catch((err) => {
            console.error('模块导入失败:', err.message);
            process.exit(1);
        });
    " || {
        log_error "应用启动测试失败"
        exit 1
    }
    
    log_info "应用启动测试通过"
}

# 重启PM2服务
restart_pm2() {
    log_step "重启PM2服务..."
    
    if [[ -f "ecosystem.config.cjs" ]]; then
        log_info "使用 ecosystem.config.cjs 启动..."
        pm2 start ecosystem.config.cjs --env production
    else
        log_info "直接启动应用..."
        pm2 start dist/server.js --name airplane-battle-server
    fi
    
    # 等待启动
    sleep 5
    
    # 检查状态
    pm2 status
    
    log_info "服务已重启"
}

# 主函数
main() {
    log_info "开始紧急修复依赖问题..."
    
    # 检查当前目录
    if [[ ! -f "package.json" ]]; then
        log_error "请在项目根目录执行此脚本"
        exit 1
    fi
    
    check_current_status
    fix_dependencies
    verify_modules
    test_application
    restart_pm2
    
    log_info "修复完成！"
    log_info "使用 'pm2 logs' 查看运行日志"
    log_info "使用 'pm2 status' 查看运行状态"
}

# 执行主函数
main "$@"