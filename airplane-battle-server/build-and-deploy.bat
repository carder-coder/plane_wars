@echo off
REM 飞机大战服务端 - Windows 构建并部署到 Linux 脚本

echo ========================================
echo 飞机大战服务端构建部署脚本
echo ========================================

REM 设置变量
set APP_DIR=%~dp0
set SERVER_USER=airplane
set SERVER_HOST=120.26.106.214
set SERVER_PATH=/opt/airplane-battle

echo.
echo [1/5] 清理旧构建文件...
if exist "dist" rmdir /s /q "dist"

echo.
echo [2/5] 安装依赖...
call npm install

echo.
echo [3/5] 构建应用...
call npm run build

if not exist "dist" (
    echo 错误：构建失败，未生成dist目录
    pause
    exit /b 1
)

echo.
echo [4/5] 准备部署文件...
if exist "deploy-temp" rmdir /s /q "deploy-temp"
mkdir deploy-temp

REM 复制必要文件
xcopy "dist" "deploy-temp\dist\" /e /i /q
copy "package.production.json" "deploy-temp\package.json"
copy ".env.example" "deploy-temp\.env.example"
copy ".env.production" "deploy-temp\.env"
copy "ecosystem.config.cjs" "deploy-temp\ecosystem.config.cjs"
copy "scripts\deploy-check.sh" "deploy-temp\deploy-check.sh"
copy "scripts\emergency-fix.sh" "deploy-temp\emergency-fix.sh"
copy "scripts\network-fix.sh" "deploy-temp\network-fix.sh"
copy "scripts\cors-fix.sh" "deploy-temp\cors-fix.sh"

REM 为生产环境生成 package-lock.json
echo 正在生成生产环境依赖锁定文件...
cd deploy-temp
call npm install --package-lock-only --omit=dev
cd ..

echo.
echo [5/5] 打包部署文件...
cd deploy-temp
tar -czf ../airplane-battle-deploy.tar.gz .
cd ..

echo.
echo ========================================
echo 构建完成！
echo.
echo 部署文件已打包为: airplane-battle-deploy.tar.gz
echo.
echo 请执行以下命令将文件上传到服务器:
echo scp airplane-battle-deploy.tar.gz %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/
echo.
echo 然后在服务器上执行:
echo cd %SERVER_PATH%
echo tar -xzf airplane-battle-deploy.tar.gz
echo chmod +x deploy-check.sh emergency-fix.sh network-fix.sh cors-fix.sh
echo.
echo 如果遇到依赖缺失错误（Cannot find package）：
echo ./emergency-fix.sh
echo.
echo 如果遇到网络访问问题（外部无法访问）：
echo ./network-fix.sh
echo.
echo 如果遇到CORS跨域问题（前端无法访问API）：
echo ./cors-fix.sh
echo.
echo 正常部署流程:
echo ./deploy-check.sh
echo.
echo 注意: 如果遇到MongoDB索引冲突错误，请执行:
echo npm run mongo:fix-indexes
echo.
echo # 或直接使用原有部署脚本
echo # ./deploy.sh deploy
echo ========================================

REM 清理临时文件
rmdir /s /q "deploy-temp"

pause