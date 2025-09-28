import mongoose from 'mongoose'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'

/**
 * MongoDB数据库连接管理器
 */
export class MongoDatabase {
  private static instance: MongoDatabase
  private isConnected: boolean = false

  private constructor() {}

  /**
   * 获取数据库实例（单例模式）
   */
  public static getInstance(): MongoDatabase {
    if (!MongoDatabase.instance) {
      MongoDatabase.instance = new MongoDatabase()
    }
    return MongoDatabase.instance
  }

  /**
   * 连接MongoDB数据库
   */
  public async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.debug('MongoDB已连接，跳过重复连接')
        return
      }

      const mongoUri = this.buildConnectionString()
      
      await mongoose.connect(mongoUri, {
        maxPoolSize: 20, // 最大连接池大小
        serverSelectionTimeoutMS: 5000, // 服务器选择超时
        socketTimeoutMS: 45000, // Socket超时
        bufferCommands: false, // 禁用mongoose缓冲
        bufferMaxEntries: 0, // 禁用mongoose缓冲
      })

      this.isConnected = true
      
      // 监听连接事件
      mongoose.connection.on('connected', () => {
        logger.info('MongoDB连接已建立')
      })

      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB连接错误:', error)
        this.isConnected = false
      })

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB连接已断开')
        this.isConnected = false
      })

      // 进程退出时关闭连接
      process.on('SIGINT', async () => {
        await this.disconnect()
        process.exit(0)
      })

      logger.info('MongoDB连接成功')
    } catch (error) {
      logger.error('MongoDB连接失败:', error)
      throw error
    }
  }

  /**
   * 断开数据库连接
   */
  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect()
      this.isConnected = false
      logger.info('MongoDB连接已关闭')
    } catch (error) {
      logger.error('MongoDB断开连接失败:', error)
      throw error
    }
  }

  /**
   * 测试数据库连接
   */
  public async testConnection(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect()
      }
      
      await mongoose.connection.db.admin().ping()
      logger.info('MongoDB连接测试成功')
      return true
    } catch (error) {
      logger.error('MongoDB连接测试失败:', error)
      return false
    }
  }

  /**
   * 获取连接状态
   */
  public getConnectionState(): number {
    return mongoose.connection.readyState
  }

  /**
   * 构建连接字符串
   */
  private buildConnectionString(): string {
    const {
      host,
      port,
      database,
      username,
      password,
      authSource = 'admin',
      ssl = false,
      replicaSet
    } = config.mongodb

    let uri = 'mongodb://'
    
    if (username && password) {
      uri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
    }
    
    uri += `${host}:${port}/${database}`
    
    const options: string[] = []
    if (authSource) options.push(`authSource=${authSource}`)
    if (ssl) options.push('ssl=true')
    if (replicaSet) options.push(`replicaSet=${replicaSet}`)
    
    if (options.length > 0) {
      uri += '?' + options.join('&')
    }
    
    return uri
  }

  /**
   * 执行聚合查询
   */
  public async aggregate<T>(collection: string, pipeline: any[]): Promise<T[]> {
    try {
      const result = await mongoose.connection.db
        .collection(collection)
        .aggregate(pipeline)
        .toArray()
      return result as T[]
    } catch (error) {
      logger.error(`聚合查询失败 [${collection}]:`, error)
      throw error
    }
  }

  /**
   * 获取原生MongoDB客户端
   */
  public getClient() {
    return mongoose.connection.getClient()
  }

  /**
   * 获取原生数据库对象
   */
  public getDatabase() {
    return mongoose.connection.db
  }
}

// 导出数据库实例
export const mongoDatabase = MongoDatabase.getInstance()

// 导出mongoose连接
export { mongoose }