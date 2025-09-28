import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'

// PostgreSQL服务
import { UserService as PGUserService } from './userService.js'
import { RoomService as PGRoomService } from './roomService.js'

// MongoDB服务
import { MongoUserService } from './mongoUserService.js'
import { MongoRoomService } from './mongoRoomService.js'
import { MongoGameService } from './mongoGameService.js'

/**
 * 数据库类型枚举
 */
export enum DatabaseType {
  POSTGRESQL = 'postgresql',
  MONGODB = 'mongodb'
}

/**
 * 服务工厂类
 * 根据配置自动选择使用PostgreSQL或MongoDB服务
 */
export class ServiceFactory {
  private static databaseType: DatabaseType = DatabaseType.POSTGRESQL // 默认使用PostgreSQL

  /**
   * 设置数据库类型
   */
  public static setDatabaseType(type: DatabaseType): void {
    this.databaseType = type
    logger.info(`数据库类型设置为: ${type}`)
  }

  /**
   * 获取当前数据库类型
   */
  public static getDatabaseType(): DatabaseType {
    return this.databaseType
  }

  /**
   * 从环境变量获取数据库类型
   */
  public static initFromConfig(): void {
    const dbType = process.env.DATABASE_TYPE?.toLowerCase()
    
    switch (dbType) {
      case 'mongodb':
      case 'mongo':
        this.setDatabaseType(DatabaseType.MONGODB)
        break
      case 'postgresql':
      case 'postgres':
      case 'pg':
        this.setDatabaseType(DatabaseType.POSTGRESQL)
        break
      default:
        // 如果没有配置，根据是否有MongoDB配置来判断
        if (config.mongodb && config.mongodb.host) {
          this.setDatabaseType(DatabaseType.MONGODB)
        } else {
          this.setDatabaseType(DatabaseType.POSTGRESQL)
        }
        break
    }
  }

  /**
   * 获取用户服务
   */
  public static getUserService() {
    switch (this.databaseType) {
      case DatabaseType.MONGODB:
        return MongoUserService
      case DatabaseType.POSTGRESQL:
      default:
        return PGUserService
    }
  }

  /**
   * 获取房间服务
   */
  public static getRoomService() {
    switch (this.databaseType) {
      case DatabaseType.MONGODB:
        return MongoRoomService
      case DatabaseType.POSTGRESQL:
      default:
        return PGRoomService
    }
  }

  /**
   * 获取游戏服务
   */
  public static getGameService() {
    switch (this.databaseType) {
      case DatabaseType.MONGODB:
        return MongoGameService
      case DatabaseType.POSTGRESQL:
      default:
        // PostgreSQL版本的游戏服务（如果存在）
        throw new Error('PostgreSQL游戏服务暂未实现')
    }
  }

  /**
   * 检查数据库连接
   */
  public static async testConnection(): Promise<boolean> {
    try {
      switch (this.databaseType) {
        case DatabaseType.MONGODB:
          const { mongoDatabase } = await import('../models/index.js')
          return await mongoDatabase.testConnection()
        case DatabaseType.POSTGRESQL:
        default:
          const { database } = await import('../database/connection.js')
          return await database.testConnection()
      }
    } catch (error) {
      logger.error('数据库连接测试失败:', error)
      return false
    }
  }

  /**
   * 初始化数据库连接
   */
  public static async initializeDatabase(): Promise<void> {
    try {
      switch (this.databaseType) {
        case DatabaseType.MONGODB:
          const { mongoDatabase, initializeIndexes } = await import('../models/index.js')
          await mongoDatabase.connect()
          await initializeIndexes()
          logger.info('MongoDB初始化完成')
          break
        case DatabaseType.POSTGRESQL:
        default:
          const { database } = await import('../database/connection.js')
          await database.testConnection()
          logger.info('PostgreSQL连接验证完成')
          break
      }
    } catch (error) {
      logger.error('数据库初始化失败:', error)
      throw error
    }
  }

  /**
   * 关闭数据库连接
   */
  public static async closeDatabase(): Promise<void> {
    try {
      switch (this.databaseType) {
        case DatabaseType.MONGODB:
          const { mongoDatabase } = await import('../models/index.js')
          await mongoDatabase.disconnect()
          logger.info('MongoDB连接已关闭')
          break
        case DatabaseType.POSTGRESQL:
        default:
          const { database } = await import('../database/connection.js')
          await database.close()
          logger.info('PostgreSQL连接已关闭')
          break
      }
    } catch (error) {
      logger.error('关闭数据库连接失败:', error)
      throw error
    }
  }

  /**
   * 获取数据库统计信息
   */
  public static async getDatabaseStats(): Promise<any> {
    try {
      switch (this.databaseType) {
        case DatabaseType.MONGODB:
          const { getDatabaseStats } = await import('../models/index.js')
          return await getDatabaseStats()
        case DatabaseType.POSTGRESQL:
        default:
          const { database } = await import('../database/connection.js')
          const results = await Promise.all([
            database.query('SELECT COUNT(*) FROM users'),
            database.query('SELECT COUNT(*) FROM rooms'),
            database.query('SELECT COUNT(*) FROM games'),
            database.query('SELECT COUNT(*) FROM user_sessions')
          ])
          
          return {
            users: parseInt(results[0].rows[0].count),
            rooms: parseInt(results[1].rows[0].count),
            games: parseInt(results[2].rows[0].count),
            sessions: parseInt(results[3].rows[0].count),
            timestamp: new Date()
          }
      }
    } catch (error) {
      logger.error('获取数据库统计失败:', error)
      throw error
    }
  }

  /**
   * 执行数据库迁移
   */
  public static async runMigrations(): Promise<void> {
    try {
      switch (this.databaseType) {
        case DatabaseType.MONGODB:
          logger.info('MongoDB不需要运行传统迁移')
          break
        case DatabaseType.POSTGRESQL:
        default:
          const { Migration } = await import('../database/migrate.js')
          await Migration.runMigrations()
          logger.info('PostgreSQL迁移完成')
          break
      }
    } catch (error) {
      logger.error('数据库迁移失败:', error)
      throw error
    }
  }
}

// 导出便捷的服务访问器
export const UserService = ServiceFactory.getUserService()
export const RoomService = ServiceFactory.getRoomService()

// 游戏服务需要特殊处理，因为PostgreSQL版本可能不存在
export const getGameService = () => ServiceFactory.getGameService()

// 初始化工厂
ServiceFactory.initFromConfig()