#!/bin/bash

echo "=== CORS跨域问题修复脚本 ==="

# 检查当前工作目录
if [ ! -f "package.json" ]; then
    echo "错误: 请在项目根目录下运行此脚本"
    exit 1
fi

echo "1. 验证新的CORS配置..."
echo "当前ALLOWED_ORIGINS配置:"
grep "ALLOWED_ORIGINS" .env

echo ""
echo "2. 编译TypeScript代码..."
npm run build
if [ $? -ne 0 ]; then
    echo "错误: TypeScript编译失败"
    exit 1
fi

echo ""
echo "3. 停止当前运行的服务..."
pm2 stop airplane-battle 2>/dev/null || echo "未找到运行中的服务"

echo ""
echo "4. 启动更新后的服务..."
pm2 start dist/server.js --name airplane-battle
if [ $? -ne 0 ]; then
    echo "错误: 服务启动失败"
    exit 1
fi

echo ""
echo "5. 验证服务状态..."
pm2 status airplane-battle

echo ""
echo "6. 检查最新日志..."
pm2 logs airplane-battle --lines 10

echo ""
echo "=== CORS修复完成 ==="
echo "前端现在应该可以从 http://120.26.106.214:8081 访问API了"
echo "如果仍有问题，请检查:"
echo "- 防火墙设置是否允许3001端口"
echo "- 服务器是否正确监听0.0.0.0:3001"
echo "- 前端请求的URL是否正确"