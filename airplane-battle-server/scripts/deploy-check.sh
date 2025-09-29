#!/bin/bash

# 生产环境部署前置检查脚本
# 用于验证部署包的完整性和环境依赖

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

# 检查必要文件
check_required_files() {
    log_step "检查部署文件完整性..."
    
    local required_files=("package.json" "dist/server.js")
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_error "缺少必要文件:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        exit 1
    fi
    
    log_info "部署文件检查通过"
}

# 检查 Node.js 环境
check_node_environment() {
    log_step "检查 Node.js 环境..."
    
    # 检查 Node.js 版本
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    local node_version=$(node -v | sed 's/v//')
    local required_version="18.0.0"
    
    if ! printf '%s\n%s\n' "$required_version" "$node_version" | sort -C -V; then
        log_error "Node.js 版本过低，要求 >= $required_version，当前版本 $node_version"
        exit 1
    fi
    
    log_info "Node.js 环境检查通过 (版本: $node_version)"
}

# 安装依赖
install_dependencies() {
    log_step "安装生产依赖..."
    
    # 检查是否存在 package-lock.json
    if [[ ! -f "package-lock.json" ]]; then
        log_warn "未找到 package-lock.json，生成锁定文件..."
        npm install --package-lock-only --omit=dev
    fi
    
    # 使用 npm ci 进行干净安装
    if [[ -f "package-lock.json" ]]; then
        npm ci --omit=dev
    else
        log_warn "无法生成 package-lock.json，使用 npm install..."
        npm install --omit=dev
    fi
    
    log_info "依赖安装完成"
}

# 验证依赖
verify_dependencies() {
    log_step "验证关键依赖..."
    
    local critical_deps=("express" "mongoose" "socket.io" "jsonwebtoken")
    
    for dep in "${critical_deps[@]}"; do
        if ! npm list "$dep" --depth=0 &> /dev/null; then
            log_error "关键依赖缺失: $dep"
            exit 1
        fi
    done
    
    log_info "依赖验证通过"
}

# 检查环境配置
check_environment_config() {
    log_step "检查环境配置..."
    
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.example" ]]; then
            log_warn "未找到 .env 文件，从 .env.example 创建模板"
            cp .env.example .env
            log_warn "请编辑 .env 文件配置正确的环境变量"
        else
            log_error "未找到环境配置文件"
            exit 1
        fi
    fi
    
    log_info "环境配置检查完成"
}

# 主函数
main() {
    log_info "开始生产环境部署检查..."
    
    check_required_files
    check_node_environment
    install_dependencies
    verify_dependencies
    check_environment_config
    
    log_info "部署检查完成，可以启动应用！"
    log_info "使用以下命令启动应用:"
    log_info "  npm start"
    log_info "  # 或使用 PM2:"
    log_info "  pm2 start ecosystem.config.cjs --env production"
    log_info "pm2 status"
    log_info "pm2 logs"
    log_info "pm2 stop airplane-battle-server"
    log_info "pm2 delete airplane-battle-server"
}

# 运行主函数
main "$@"