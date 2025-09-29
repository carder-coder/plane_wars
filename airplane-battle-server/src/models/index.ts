// 导出所有MongoDB模型
export { User, IUser } from './User.js'
export { Room, IRoom, IRoomMember } from './Room.js'
export { Game, IGame, ICoordinate, IAirplanePosition, IAttackRecord } from './Game.js'
export { UserSession, IUserSession } from './UserSession.js'

// 导出数据库连接
export { mongoDatabase, mongoose } from '../database/mongoConnection.js'

/**
 * 初始化所有数据库索引
 */
export async function initializeIndexes(): Promise<void> {
  const { User } = await import('./User.js')
  const { Room } = await import('./Room.js')
  const { Game } = await import('./Game.js')
  const { UserSession } = await import('./UserSession.js')
  
  try {
    console.log('开始创建数据库索引...')
    
    // 创建用户索引
    try {
      await User.createIndexes()
      console.log('✓ 用户索引创建完成')
    } catch (error: any) {
      if (error.code === 85) { // IndexOptionsConflict
        console.log('✓ 用户索引已存在（跳过冒突）')
      } else {
        throw error
      }
    }
    
    // 创建房间索引
    try {
      await Room.createIndexes()
      console.log('✓ 房间索引创建完成')
    } catch (error: any) {
      if (error.code === 85) { // IndexOptionsConflict
        console.log('✓ 房间索引已存在（跳过冒突）')
      } else {
        throw error
      }
    }
    
    // 创建游戏索引
    try {
      await Game.createIndexes() 
      console.log('✓ 游戏索引创建完成')
    } catch (error: any) {
      if (error.code === 85) { // IndexOptionsConflict
        console.log('✓ 游戏索引已存在（跳过冗突）')
      } else {
        throw error
      }
    }
    
    // 创建用户会话索引
    try {
      await UserSession.createIndexes()
      console.log('✓ 用户会话索引创建完成')
    } catch (error: any) {
      if (error.code === 85) { // IndexOptionsConflict
        console.log('✓ 用户会话索引已存在（跳过冒突）')
      } else {
        throw error
      }
    }
    
    console.log('所有数据库索引创建完成')
  } catch (error) {
    console.error('创建数据库索引失败:', error)
    throw error
  }
}

/**
 * 删除所有集合（用于测试）
 */
export async function dropAllCollections(): Promise<void> {
  const { mongoose } = await import('../database/mongoConnection.js')
  
  try {
    const collections = await mongoose.connection.db?.listCollections().toArray()
    
    for (const collection of collections || []) {
      await mongoose.connection.db?.dropCollection(collection.name)
      console.log(`✓ 删除集合: ${collection.name}`)
    }
    
    console.log('所有集合删除完成')
  } catch (error) {
    console.error('删除集合失败:', error)
    throw error
  }
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats(): Promise<any> {
  const { User } = await import('./User.js')
  const { Room } = await import('./Room.js')
  const { Game } = await import('./Game.js')
  const { UserSession } = await import('./UserSession.js')
  
  try {
    const [userCount, roomCount, gameCount, sessionCount] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      Game.countDocuments(),
      UserSession.countDocuments()
    ])
    
    return {
      users: userCount,
      rooms: roomCount,
      games: gameCount,
      sessions: sessionCount,
      timestamp: new Date()
    }
  } catch (error) {
    console.error('获取数据库统计信息失败:', error)
    throw error
  }
}