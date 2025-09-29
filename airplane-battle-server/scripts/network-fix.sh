#!/bin/bash

# 网络访问修复脚本
# 修复服务器监听地址和路由配置问题

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

# 检查当前网络配置
check_network_config() {
    log_step "检查当前网络配置..."
    
    # 检查服务器是否运行
    if pm2 list | grep -q "airplane-battle-server.*online"; then
        log_info "服务器正在运行"
        
        # 检查监听端口
        local listen_info=$(netstat -anlp | grep 3001 || echo "未找到监听端口")
        log_info "当前监听状态: $listen_info"
        
        # 测试本地访问
        if curl -s http://127.0.0.1:3001/health >/dev/null 2>&1; then
            log_info "本地健康检查通过"
        else
            log_warn "本地健康检查失败"
        fi
        
        # 测试API访问
        local api_test=$(curl -s http://127.0.0.1:3001/api/auth/register || echo "API测试失败")
        log_info "API测试结果: $api_test"
    else
        log_warn "服务器未运行"
    fi
}

# 重启服务器以应用修复
restart_server() {
    log_step "重启服务器应用修复..."
    
    # 停止服务
    if pm2 list | grep -q "airplane-battle-server"; then
        pm2 stop airplane-battle-server
        pm2 delete airplane-battle-server
        log_info "已停止旧服务"
    fi
    
    # 检查dist文件
    if [[ ! -f "dist/server.js" ]]; then
        log_error "dist/server.js 不存在，请确保已部署最新代码"
        exit 1
    fi
    
    # 重新启动
    if [[ -f "ecosystem.config.cjs" ]]; then
        pm2 start ecosystem.config.cjs --env production
    else
        pm2 start dist/server.js --name airplane-battle-server
    fi
    
    log_info "服务器已重启"
}

# 验证修复效果
verify_fix() {
    log_step "验证修复效果..."
    
    # 等待服务启动
    sleep 10
    
    # 检查PM2状态
    pm2 status
    
    # 检查监听状态
    log_info "检查监听状态..."
    netstat -anlp | grep 3001
    
    # 测试健康检查
    log_info "测试健康检查..."
    if curl -s http://127.0.0.1:3001/health; then
        echo
        log_info "✓ 本地健康检查通过"
    else
        log_error "✗ 本地健康检查失败"
    fi
    
    # 测试API访问
    log_info "测试API访问..."
    if curl -s http://127.0.0.1:3001/api/auth/register; then
        echo
        log_info "✓ API访问正常"
    else
        log_error "✗ API访问失败"
    fi
    
    # 获取服务器外部IP
    local external_ip=$(curl -s ifconfig.me || echo "无法获取外部IP")
    log_info "服务器外部IP: $external_ip"
    
    # 测试外部访问
    if [[ "$external_ip" != "无法获取外部IP" ]]; then
        log_info "测试外部访问..."
        if timeout 10s curl -s http://$external_ip:3001/health >/dev/null 2>&1; then
            log_info "✓ 外部访问正常"
        else
            log_warn "✗ 外部访问失败，可能需要检查防火墙设置"
            log_warn "请确保防火墙允许3001端口访问"
        fi
    fi
}

# 显示防火墙配置建议
show_firewall_suggestions() {
    log_step "防火墙配置建议..."
    
    echo "如果外部访问仍然失败，请检查以下配置："
    echo
    echo "1. 阿里云安全组规则:"
    echo "   - 登录阿里云控制台"
    echo "   - 进入ECS实例管理"
    echo "   - 配置安全组，添加入方向规则:"
    echo "     协议类型: TCP"
    echo "     端口范围: 3001/3001"
    echo "     授权对象: 0.0.0.0/0"
    echo
    echo "2. 服务器防火墙 (iptables/ufw):"
    echo "   sudo ufw allow 3001"
    echo "   # 或者"
    echo "   sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT"
    echo
    echo "3. 检查nginx代理配置 (如果使用):"
    echo "   确保nginx正确代理到3001端口"
}

# 主函数
main() {
    log_info "开始网络访问修复..."
    
    # 检查当前目录
    if [[ ! -f "package.json" ]]; then
        log_error "请在项目根目录执行此脚本"
        exit 1
    fi
    
    check_network_config
    restart_server
    verify_fix
    show_firewall_suggestions
    
    log_info "修复完成！"
    log_info "如果外部访问仍有问题，请检查防火墙配置"
}

# 执行主函数
main "$@"