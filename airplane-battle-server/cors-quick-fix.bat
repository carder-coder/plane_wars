@echo off
echo === CORS跨域问题快速修复 ===

echo.
echo 1. 编译TypeScript代码...
call npm run build
if %errorlevel% neq 0 (
    echo 错误: TypeScript编译失败
    pause
    exit /b 1
)

echo.
echo 2. 上传修复后的文件到服务器...
scp .env dist/middlewares/index.js root@120.26.106.214:/opt/airplane-battle/
if %errorlevel% neq 0 (
    echo 错误: 文件传输失败
    pause
    exit /b 1
)

echo.
echo 3. 上传CORS修复脚本...
scp scripts/cors-fix.sh root@120.26.106.214:/opt/airplane-battle/scripts/
if %errorlevel% neq 0 (
    echo 错误: 脚本传输失败
    pause
    exit /b 1
)

echo.
echo 4. 远程执行CORS修复...
ssh root@120.26.106.214 "cd /opt/airplane-battle && chmod +x scripts/cors-fix.sh && ./scripts/cors-fix.sh"
if %errorlevel% neq 0 (
    echo 错误: CORS修复失败
    pause
    exit /b 1
)

echo.
echo === CORS修复完成 ===
echo 前端现在应该可以从 http://120.26.106.214:8081 访问API了
echo.
echo 已添加的CORS允许源:
echo - http://localhost:5173
echo - http://localhost:3000  
echo - http://120.26.106.214:8081
echo.
echo 如果仍有问题，请检查服务器日志:
echo ssh root@120.26.106.214 "pm2 logs airplane-battle"
pause