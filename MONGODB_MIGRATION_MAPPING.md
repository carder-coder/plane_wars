# MongoDB迁移映射文档

## 概述
本文档详细描述了从PostgreSQL到MongoDB的数据迁移映射关系，包括表结构转换、数据类型映射、索引策略和迁移步骤。

## 数据库结构分析

### 现有PostgreSQL表结构

#### 1. users表
```sql
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url VARCHAR(500),
  level INTEGER DEFAULT 1,
  experience BIGINT DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  rating INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);
```

#### 2. rooms表
```sql
CREATE TABLE rooms (
  room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name VARCHAR(100) NOT NULL,
  room_type room_type NOT NULL DEFAULT 'public',
  password VARCHAR(50),
  max_players INTEGER NOT NULL DEFAULT 2,
  current_players INTEGER NOT NULL DEFAULT 0,
  status room_status NOT NULL DEFAULT 'waiting',
  host_user_id UUID NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. room_members表
```sql
CREATE TABLE room_members (
  room_id UUID NOT NULL REFERENCES rooms(room_id),
  user_id UUID NOT NULL REFERENCES users(user_id),
  player_number INTEGER NOT NULL CHECK (player_number IN (1, 2)),
  is_ready BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id),
  UNIQUE (room_id, player_number)
);
```

#### 4. games表
```sql
CREATE TABLE games (
  game_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(room_id),
  player1_id UUID NOT NULL REFERENCES users(user_id),
  player2_id UUID NOT NULL REFERENCES users(user_id),
  winner_id UUID REFERENCES users(user_id),
  current_phase game_phase NOT NULL DEFAULT 'waiting',
  current_player INTEGER CHECK (current_player IN (1, 2)),
  turn_count INTEGER DEFAULT 0,
  game_duration INTEGER,
  player1_airplane JSON,
  player2_airplane JSON,
  attack_history JSON,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE
);
```

#### 5. user_sessions表
```sql
CREATE TABLE user_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  refresh_token VARCHAR(500) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true
);
```

## MongoDB集合设计

### 1. users集合
```javascript
{
  _id: ObjectId,
  userId: String, // UUID from PostgreSQL
  username: String,
  email: String,
  passwordHash: String,
  displayName: String,
  avatarUrl: String,
  level: Number,
  experience: Number,
  wins: Number,
  losses: Number,
  rating: Number,
  isActive: Boolean,
  createdAt: Date,
  lastLogin: Date
}
```

### 2. rooms集合（嵌入room_members数据）
```javascript
{
  _id: ObjectId,
  roomId: String, // UUID from PostgreSQL
  roomName: String,
  roomType: String, // 'public' | 'private'
  password: String,
  maxPlayers: Number,
  currentPlayers: Number,
  status: String, // 'waiting' | 'playing' | 'finished'
  hostUserId: String, // reference to users.userId
  members: [
    {
      userId: String,
      playerNumber: Number,
      isReady: Boolean,
      joinedAt: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### 3. games集合
```javascript
{
  _id: ObjectId,
  gameId: String, // UUID from PostgreSQL
  roomId: String, // reference to rooms.roomId
  player1Id: String,
  player2Id: String,
  winnerId: String,
  currentPhase: String, // 'waiting' | 'placement' | 'battle' | 'finished'
  currentPlayer: Number,
  turnCount: Number,
  gameDuration: Number,
  player1Airplane: Object,
  player2Airplane: Object,
  attackHistory: Array,
  startedAt: Date,
  finishedAt: Date
}
```

### 4. userSessions集合
```javascript
{
  _id: ObjectId,
  sessionId: String, // UUID from PostgreSQL
  userId: String, // reference to users.userId
  refreshToken: String,
  ipAddress: String,
  userAgent: String,
  isActive: Boolean,
  createdAt: Date,
  expiresAt: Date // TTL index
}
```

## 数据类型映射表

| PostgreSQL类型 | MongoDB类型 | 转换说明 |
|----------------|-------------|----------|
| UUID | String | 保留UUID字符串格式 |
| VARCHAR | String | 直接映射 |
| INTEGER | Number | 直接映射 |
| BIGINT | Number | 直接映射 |
| BOOLEAN | Boolean | 直接映射 |
| TIMESTAMP WITH TIME ZONE | Date | 转换为Date对象 |
| JSON | Object/Array | 直接映射 |
| INET | String | 转换为IP地址字符串 |
| TEXT | String | 直接映射 |
| ENUM | String | 转换为字符串常量 |

## 索引设计策略

### users集合索引
```javascript
// 唯一索引
db.users.createIndex({ "userId": 1 }, { unique: true })
db.users.createIndex({ "username": 1 }, { unique: true })
db.users.createIndex({ "email": 1 }, { unique: true })

// 复合索引
db.users.createIndex({ "rating": -1, "createdAt": -1 }) // 排行榜查询
db.users.createIndex({ "isActive": 1, "lastLogin": -1 }) // 活跃用户查询
```

### rooms集合索引
```javascript
// 单字段索引
db.rooms.createIndex({ "roomId": 1 }, { unique: true })
db.rooms.createIndex({ "hostUserId": 1 })

// 复合索引
db.rooms.createIndex({ "status": 1, "createdAt": -1 }) // 房间列表查询
db.rooms.createIndex({ "roomType": 1, "status": 1 }) // 公共房间查询

// 嵌套文档索引
db.rooms.createIndex({ "members.userId": 1 }) // 用户房间查询
```

### games集合索引
```javascript
// 单字段索引
db.games.createIndex({ "gameId": 1 }, { unique: true })
db.games.createIndex({ "roomId": 1 })

// 复合索引
db.games.createIndex({ "player1Id": 1, "startedAt": -1 }) // 玩家游戏历史
db.games.createIndex({ "player2Id": 1, "startedAt": -1 }) // 玩家游戏历史
db.games.createIndex({ "winnerId": 1, "finishedAt": -1 }) // 胜利记录
db.games.createIndex({ "currentPhase": 1, "startedAt": -1 }) // 游戏状态查询
```

### userSessions集合索引
```javascript
// 唯一索引
db.userSessions.createIndex({ "sessionId": 1 }, { unique: true })
db.userSessions.createIndex({ "refreshToken": 1 }, { unique: true })

// 普通索引
db.userSessions.createIndex({ "userId": 1 })

// TTL索引（自动过期）
db.userSessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 })
```

## 关系映射策略

### 外键关系处理
| PostgreSQL关系 | MongoDB处理方式 | 说明 |
|----------------|-----------------|------|
| users.user_id → rooms.host_user_id | 保留userId字符串引用 | 通过应用层维护引用完整性 |
| rooms.room_id → room_members.room_id | 嵌入到rooms.members数组 | 一对多关系嵌入 |
| users.user_id → room_members.user_id | 保留userId字符串引用 | 通过应用层查找用户信息 |
| rooms.room_id → games.room_id | 保留roomId字符串引用 | 通过应用层维护引用完整性 |
| users.user_id → games.player1_id/player2_id | 保留userId字符串引用 | 通过应用层维护引用完整性 |

### 数据嵌入策略
1. **room_members → rooms.members**: 房间成员信息嵌入到房间文档中，因为：
   - 房间成员数量有限（通常2人）
   - 查询房间时经常需要成员信息
   - 可以减少联表查询

2. **保持独立集合的数据**:
   - users: 用户数据独立，被多处引用
   - games: 游戏记录独立，便于历史查询和统计
   - userSessions: 会话数据独立，便于管理和清理

## 迁移步骤规划

### 阶段1：准备阶段
1. 备份PostgreSQL数据库
2. 安装MongoDB环境
3. 创建MongoDB数据库和集合
4. 设置索引

### 阶段2：数据迁移
1. **用户数据迁移**
   - 导出users表数据
   - 转换数据格式
   - 导入到users集合

2. **房间数据迁移**
   - 联合查询rooms和room_members表
   - 合并数据为嵌入文档格式
   - 导入到rooms集合

3. **游戏数据迁移**
   - 导出games表数据
   - 转换JSON字段
   - 导入到games集合

4. **会话数据迁移**
   - 导出user_sessions表数据
   - 转换并设置TTL
   - 导入到userSessions集合

### 阶段3：验证阶段
1. 数据完整性检查
2. 索引性能测试
3. 应用功能测试

## 数据一致性保障

### 迁移期间数据同步
1. 停服迁移方案（推荐）
2. 实时同步方案（复杂）

### 数据验证规则
1. 记录数量对比
2. 关键字段校验
3. 关联关系验证
4. 业务逻辑测试

## 性能优化建议

### 查询优化
1. 合理使用复合索引
2. 避免全集合扫描
3. 利用聚合管道优化复杂查询

### 存储优化
1. 合理设计文档结构
2. 避免过深嵌套
3. 控制文档大小

### 内存优化
1. 合理配置连接池
2. 设置适当的缓存大小
3. 监控内存使用情况

## 风险评估和回滚策略

### 主要风险
1. 数据丢失风险
2. 性能下降风险
3. 应用兼容性风险

### 回滚策略
1. 保留PostgreSQL备份
2. 准备快速切换脚本
3. 制定紧急恢复流程

### 监控指标
1. 数据库响应时间
2. 错误率监控
3. 连接池状态
4. 内存使用率

## 迁移时间估算

| 阶段 | 预估时间 | 说明 |
|------|----------|------|
| 环境准备 | 2-4小时 | 环境搭建和配置 |
| 数据迁移 | 1-3小时 | 根据数据量确定 |
| 验证测试 | 2-4小时 | 全面功能验证 |
| 总计 | 5-11小时 | 建议预留缓冲时间 |

## 后续维护建议

### 定期维护任务
1. 索引重建和优化
2. 过期数据清理
3. 性能监控和调优

### 扩展性考虑
1. 分片策略规划
2. 副本集配置
3. 负载均衡策略