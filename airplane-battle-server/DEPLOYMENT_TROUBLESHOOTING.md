# 生产环境部署问题诊断与解决方案

## 🚨 当前问题诊断

根据PM2日志显示的错误信息：
```
Error: Cannot find package 'express' imported from /opt/airplane-battle/dist/server.js
```

### 问题原因分析

1. **依赖缺失**：生产环境的`node_modules`目录中缺少关键依赖包
2. **package.json不一致**：可能使用了过时的package.json配置
3. **安装过程失败**：之前的依赖安装可能没有完全成功

## 🔧 解决方案

### 方案1：紧急修复（推荐）

在服务器上执行紧急修复脚本：

```bash
cd /opt/airplane-battle
chmod +x emergency-fix.sh
./emergency-fix.sh
```

该脚本会：
- 停止当前PM2进程
- 清理旧的node_modules和package-lock.json
- 重新安装所有生产依赖
- 验证关键模块
- 测试应用启动
- 重启PM2服务

### 方案2：手动修复

如果自动脚本失败，可以手动执行：

```bash
# 1. 停止服务
pm2 stop airplane-battle-server
pm2 delete airplane-battle-server

# 2. 清理依赖
rm -rf node_modules package-lock.json

# 3. 重新安装
npm install --omit=dev

# 4. 验证依赖
npm list express mongoose socket.io

# 5. 重启服务
pm2 start ecosystem.config.cjs --env production
```

### 方案3：重新部署

如果以上方案都失败，进行完整重新部署：

```bash
# 1. 备份当前配置
cp .env .env.backup

# 2. 重新上传部署包
# 在Windows环境执行: build-and-deploy.bat

# 3. 在服务器执行
cd /opt/airplane-battle
tar -xzf airplane-battle-deploy.tar.gz
chmod +x deploy-check.sh emergency-fix.sh
./deploy-check.sh
```

## 📋 验证步骤

修复完成后，使用以下命令验证：

```bash
# 检查PM2状态
pm2 status

# 查看日志
pm2 logs airplane-battle-server

# 测试服务响应
curl http://localhost:3001/health

# 检查依赖
npm list --depth=0
```

## 🔍 预期结果

修复成功后，应该看到：

```
# PM2状态
┌─────┬────────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id  │ name                   │ mode     │ ↺    │ status    │ cpu      │ memory   │
├─────┼────────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0   │ airplane-battle-server │ cluster  │ 0    │ online    │ 0%       │ XX.X mb  │
└─────┴────────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘

# 应用日志
[INFO] 使用MongoDB作为数据库
[INFO] MongoDB连接成功
[INFO] MongoDB初始化完成
[INFO] 服务器已启动 - http://localhost:3001
```

## 🚀 预防措施

为避免未来出现类似问题：

1. **使用锁定文件**：确保package-lock.json被正确部署
2. **依赖验证**：部署前验证所有关键依赖
3. **渐进部署**：先在测试环境验证再部署到生产
4. **监控告警**：设置服务健康检查和告警

## 📞 联系支持

如果问题持续存在，请提供以下信息：
- PM2日志：`pm2 logs`
- 依赖列表：`npm list --depth=0`
- Node.js版本：`node -v`
- 环境变量：检查.env文件配置

---

*最后更新：2025-09-29*