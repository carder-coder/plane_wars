# 飞机大战网络化增强版

基于原有单机飞机大战游戏，实现了多人在线对战功能的完整网络化游戏系统。

## 🎯 项目概述

本项目将原有的单机飞机大战游戏扩展为支持多人在线对战的网络游戏，包含：

- **用户认证系统** - 注册、登录、会话管理
- **房间管理系统** - 创建房间、加入房间、实时匹配
- **网络对战功能** - 实时多人游戏同步
- **完整的服务端架构** - Express + Socket.IO + PostgreSQL + Redis

## 🏗️ 系统架构

```
前端 (React + TypeScript)
├── 用户界面层 (React组件)
├── 状态管理层 (Zustand)
├── 网络通信层 (Socket.IO Client + HTTP Client)
└── 游戏逻辑层 (游戏引擎)

后端 (Node.js + Express)
├── API接口层 (REST API)
├── 实时通信层 (Socket.IO)
├── 业务逻辑层 (服务层)
├── 数据访问层 (PostgreSQL + Redis)
└── 认证授权层 (JWT)
```

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- PostgreSQL >= 12
- Redis >= 6
- npm >= 8.0.0

### 1. 安装依赖

```bash
# 安装前端依赖
cd airplane-battle
npm install

# 安装后端依赖
cd ../airplane-battle-server
npm install
```

### 2. 配置环境

复制并配置后端环境变量：

```bash
cd airplane-battle-server
cp .env.example .env
```

编辑 `.env` 文件，配置数据库和Redis连接信息：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=airplane_battle
DB_USER=postgres
DB_PASSWORD=your_password

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT密钥
JWT_SECRET=your-super-secret-key
```

### 3. 初始化数据库

```bash
# 运行数据库迁移
npm run db:migrate

# 可选：添加测试用户数据
npm run db:seed
```

### 4. 启动服务

```bash
# 启动后端服务器 (端口 3001)
cd airplane-battle-server
npm run dev

# 启动前端开发服务器 (端口 5173)
cd ../airplane-battle
npm run dev
```

### 5. 访问游戏

打开浏览器访问 `http://localhost:5173`

## 🎮 游戏功能

### 核心功能

1. **用户系统**
   - 用户注册与登录
   - 用户资料管理
   - 等级和经验系统

2. **房间系统**
   - 创建公开/私人房间
   - 房间列表浏览
   - 快速匹配功能

3. **游戏对战**
   - 实时双人对战
   - 飞机放置阶段
   - 回合制攻击系统
   - 胜负判定

4. **网络功能**
   - 实时状态同步
   - 断线重连支持
   - 观战功能

### 游戏规则

1. 每位玩家在10x10网格中放置一架飞机
2. 飞机由机头、机翅、机身、机尾组成
3. 轮流攻击对方网格
4. 首先击中对方机头的玩家获胜

## 🛠️ 技术栈

### 前端
- **React 19** - 用户界面框架
- **TypeScript** - 类型安全的JavaScript
- **Zustand** - 轻量级状态管理
- **Ant Design** - UI组件库
- **Socket.IO Client** - WebSocket客户端
- **Vite** - 构建工具

### 后端
- **Node.js** - JavaScript运行时
- **Express** - Web应用框架
- **Socket.IO** - 实时通信
- **PostgreSQL** - 关系型数据库
- **Redis** - 内存数据库/缓存
- **JWT** - 身份认证
- **bcrypt** - 密码加密

## 📁 项目结构

```
airplane-battle/                 # 前端项目
├── src/
│   ├── components/              # React组件
│   ├── store/                   # 状态管理
│   ├── types/                   # 类型定义
│   ├── utils/                   # 工具函数
│   └── ...
└── package.json

airplane-battle-server/          # 后端项目
├── src/
│   ├── controllers/             # 控制器
│   ├── services/                # 业务逻辑
│   ├── models/                  # 数据模型
│   ├── routes/                  # 路由定义
│   ├── middlewares/             # 中间件
│   ├── database/                # 数据库相关
│   ├── config/                  # 配置文件
│   └── types/                   # 类型定义
└── package.json
```

## 🔧 开发指南

### API接口

#### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/profile` - 获取用户资料

#### 房间接口
- `GET /api/rooms` - 获取房间列表
- `POST /api/rooms` - 创建房间
- `POST /api/rooms/join` - 加入房间
- `DELETE /api/rooms/:id/leave` - 离开房间

### WebSocket事件

#### 房间事件
- `JOIN_ROOM` - 加入房间
- `LEAVE_ROOM` - 离开房间
- `PLAYER_JOINED` - 玩家加入通知
- `PLAYER_LEFT` - 玩家离开通知

#### 游戏事件
- `PLACE_AIRPLANE` - 放置飞机
- `ATTACK` - 发起攻击
- `ATTACK_RESULT` - 攻击结果
- `GAME_END` - 游戏结束

## 🧪 测试

```bash
# 运行前端测试
cd airplane-battle
npm test

# 运行后端测试
cd airplane-battle-server
npm test
```

## 📦 部署

### Docker部署 (推荐)

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d
```

### 手动部署

1. 构建前端
```bash
cd airplane-battle
npm run build
```

2. 配置生产环境变量

3. 启动后端服务
```bash
cd airplane-battle-server
npm start
```

## 🐛 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查PostgreSQL服务是否启动
   - 验证数据库连接配置

2. **Redis连接失败**
   - 检查Redis服务是否启动
   - 验证Redis连接配置

3. **WebSocket连接失败**
   - 检查防火墙设置
   - 确认CORS配置正确

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🔗 相关链接

- [React 文档](https://react.dev/)
- [Socket.IO 文档](https://socket.io/docs/v4/)
- [Express 文档](https://expressjs.com/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)

---

**注意：** 这是一个演示项目，包含了完整的网络化游戏架构设计和实现。可以作为学习多人在线游戏开发的参考。