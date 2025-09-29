@echo off
echo === 房主自动加入房间修复部署 ===

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
tar -czf ../room-host-join-fix.tar.gz .
cd ..

echo.
echo 部署包已创建: room-host-join-fix.tar.gz
echo.
echo 修复内容:
echo - 房主创建房间时自动加入members数组
echo - 创建房间返回完整的房间详情（包含players数据）
echo - 修复addMember方法支持重复加入检查
echo.
echo 请手动执行以下步骤:
echo.
echo 1. 上传文件到服务器: 
echo    scp room-host-join-fix.tar.gz root@120.26.106.214:/opt/airplane-battle/
echo.
echo 2. 在服务器上执行:
echo    cd /opt/airplane-battle
echo    tar -xzf room-host-join-fix.tar.gz
echo    pm2 stop airplane-battle
echo    pm2 start dist/server.js --name airplane-battle
echo    pm2 logs airplane-battle --lines 20
echo.
echo 3. 测试验证:
echo    - 创建新房间（房主应自动加入）
echo    - 检查房间详情是否包含players数据
echo    - 测试准备按钮功能
echo.

rmdir /s /q "deploy-temp"
pause