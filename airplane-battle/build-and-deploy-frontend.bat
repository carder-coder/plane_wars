@echo off
REM 飞机大战前端 - Windows 构建并部署到 Linux 脚本

echo ========================================
echo 飞机大战前端构建部署脚本
echo ========================================

REM 设置变量
set APP_DIR=%~dp0
set SERVER_USER=airplane
set SERVER_HOST=120.26.106.214
set SERVER_PATH=/var/www/airplane-battle

echo.
echo [1/6] 清理旧构建文件...
if exist "dist" rmdir /s /q "dist"

REM echo.
REM echo [2/6] 安装依赖...
REM call npm install
REM 
REM REM 检查关键依赖
REM echo 检查关键依赖...
REM npm list terser >nul 2>&1
REM if errorlevel 1 (
REM     echo 安装 terser 依赖...
REM     call npm install terser --save-dev
REM )

echo.
echo [3/6] 运行环境检查...
call npm run check-env

echo.
echo [4/6] 构建前端应用...
call npm run build

if not exist "dist" (
    echo 错误：构建失败，未生成dist目录
    pause
    exit /b 1
)

echo.
echo [5/6] 准备部署文件...
if exist "deploy-frontend" rmdir /s /q "deploy-frontend"
mkdir deploy-frontend

REM 复制构建产物和配置文件
xcopy "dist" "deploy-frontend\dist\" /e /i /q
copy "package.json" "deploy-frontend\"
copy "nginx-production.conf" "deploy-frontend\nginx.conf"
copy "apache.conf" "deploy-frontend\" 2>nul
copy "scripts\deploy-frontend.sh" "deploy-frontend\" 2>nul
copy ".env.production" "deploy-frontend\"

echo.
echo [6/6] 打包部署文件...
cd deploy-frontend
tar -czf ../airplane-battle-frontend.tar.gz .
cd ..

echo.
echo ========================================
echo 前端构建完成！
echo.
echo 部署文件已打包为: airplane-battle-frontend.tar.gz
echo 构建产物大小:
dir /s "dist"
echo.
echo 请执行以下命令将文件上传到服务器:
echo scp airplane-battle-frontend.tar.gz %SERVER_USER%@%SERVER_HOST%:/tmp/
echo.
echo 然后在服务器上执行:
echo sudo mkdir -p %SERVER_PATH%
echo cd /tmp
echo tar -xzf airplane-battle-frontend.tar.gz
echo sudo cp -r dist/* %SERVER_PATH%/
echo sudo chown -R www-data:www-data %SERVER_PATH%
echo sudo chmod 755 deploy-frontend.sh
echo sudo ./deploy-frontend.sh
echo ========================================

REM 清理临时文件
rmdir /s /q "deploy-frontend"

pause