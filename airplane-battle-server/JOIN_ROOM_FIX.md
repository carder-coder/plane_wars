## 加入房间失败问题分析与解决方案

### 问题现象
客户端可以正常拉取房间列表，但点击加入房间时报错：`Socket错误: {code: 'JOIN_ROOM_FAILED', message: '房间不存在'}`

### 问题分析

1. **Socket消息格式问题**
   - 前端发送：完整的SocketMessage对象 `{type, payload: {roomId, password}, timestamp, messageId}`
   - 后端期望：直接的payload数据 `{roomId, password}`

2. **数据库查询问题**
   - roomId可能格式不匹配
   - MongoDB查询条件可能有问题

### 修复内容

#### 1. 后端Socket处理器修复 (`src/services/socketManager.ts`)
```typescript
// 处理前端发送的SocketMessage格式
let payload = data
if (data && typeof data === 'object' && 'type' in data && 'payload' in data) {
  payload = data.payload
}
const { roomId, password } = payload || {}
```

#### 2. 房间服务调试信息增强 (`src/services/mongoRoomService.ts`)
```typescript
// 添加详细日志记录
logger.info(`加入房间请求: userId=${userId}, roomId=${roomId}`)
logger.info(`查找房间: ${roomId}`)

// 调试：显示数据库中的所有房间
const allRooms = await Room.find({}, 'roomId roomName status').limit(10)
logger.info(`数据库中存在的房间:`, allRooms.map(r => ({ 
  roomId: r.roomId, 
  roomName: r.roomName, 
  status: r.status 
})))
```

#### 3. CORS配置修复 (`.env`)
```
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://120.26.106.214:8081
```

### 部署步骤

1. **编译代码**：
   ```bash
   npm run build
   ```

2. **创建部署包**：
   ```bash
   .\manual-deploy.bat
   ```

3. **上传到服务器**：
   ```bash
   # 使用你的SCP工具或FTP上传 airplane-battle-fix.tar.gz
   ```

4. **服务器部署**：
   ```bash
   cd /opt/airplane-battle
   tar -xzf airplane-battle-fix.tar.gz
   pm2 stop airplane-battle
   pm2 start dist/server.js --name airplane-battle
   pm2 logs airplane-battle --lines 50
   ```

### 验证步骤

1. **检查服务器日志**：
   ```bash
   pm2 logs airplane-battle --lines 20
   ```

2. **测试加入房间**：
   - 前端点击加入房间
   - 查看详细的调试日志
   - 确认roomId是否正确传递

3. **数据库验证**：
   ```bash
   # 在MongoDB中检查房间数据
   db.rooms.find({}, {roomId: 1, roomName: 1, status: 1}).limit(5)
   ```

### 预期结果

修复后应该看到详细的日志输出：
- 用户认证成功
- 接收到的消息格式和内容
- 房间查找过程
- 成功加入房间或具体的失败原因

如果问题仍然存在，日志将显示确切的失败点，便于进一步诊断。