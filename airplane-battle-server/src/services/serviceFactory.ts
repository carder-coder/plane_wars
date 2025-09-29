import { logger } from '../utils/logger.js'

// MongoDB服务
import { MongoUserService } from './mongoUserService.js'
import { MongoRoomService } from './mongoRoomService.js'
import { MongoGameService } from './mongoGameService.js'

/**
 * 服务工厂类
 * 统一使用MongoDB服务
 */
export class ServiceFactory {
  /**
   * 初始化配置
   */
  public static initFromConfig(): void {
    logger.info('使用MongoDB作为数据库')
  }

  /**
   * 获取用户服务
   */
  public static getUserService() {
    return MongoUserService
  }

  /**
   * 获取房间服务
   */
  public static getRoomService() {
    return MongoRoomService
  }

  /**
   * 获取游戏服务
   */
  public static getGameService() {
    return MongoGameService
  }

  /**
   * 检查数据库连接
   */
  public static async testConnection(): Promise<boolean> {
    try {
      const { mongoDatabase } = await import('../models/index.js')
      return await mongoDatabase.testConnection()
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
      const { mongoDatabase, initializeIndexes } = await import('../models/index.js')
      await mongoDatabase.connect()
      await initializeIndexes()
      logger.info('MongoDB初始化完成')
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
      const { mongoDatabase } = await import('../models/index.js')
      await mongoDatabase.disconnect()
      logger.info('MongoDB连接已关闭')
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
      const { getDatabaseStats } = await import('../models/index.js')
      return await getDatabaseStats()
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
      logger.info('MongoDB不需要运行传统迁移')
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