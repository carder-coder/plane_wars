@echo off
echo === 手动部署加入房间修复 ===

echo.
echo 1. 检查编译结果...
if not exist "dist\server.js" (
    echo 错误: 编译输出不存在，请先运行 npm run build
    pause
    exit /b 1
)

echo.
echo 2. 创建部署包...
if exist "deploy-temp" rmdir /s /q "deploy-temp"
mkdir deploy-temp

echo 复制文件...
xcopy "dist" "deploy-temp\dist\" /e /i /q
copy ".env" "deploy-temp\.env"
copy "package.json" "deploy-temp\package.json"

echo.
echo 3. 打包文件...
cd deploy-temp
tar -czf ../airplane-battle-fix.tar.gz .
cd ..

echo.
echo 部署包已创建: airplane-battle-fix.tar.gz
echo.
echo 请手动执行以下步骤:
echo 1. 上传文件到服务器: 
echo    scp airplane-battle-fix.tar.gz root@120.26.106.214:/opt/airplane-battle/
echo.
echo 2. 在服务器上执行:
echo    cd /opt/airplane-battle
echo    tar -xzf airplane-battle-fix.tar.gz
echo    pm2 stop airplane-battle
echo    pm2 start dist/server.js --name airplane-battle
echo    pm2 logs airplane-battle
echo.

rmdir /s /q "deploy-temp"
pause