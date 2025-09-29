import pg from 'pg'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'

const { Pool } = pg

/**
 * PostgreSQL数据库连接池
 */
export class Database {
  private static instance: Database
  private pool: pg.Pool

  private constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.username,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: 20, // 最大连接数
      idleTimeoutMillis: 30000, // 空闲超时
      connectionTimeoutMillis: 2000, // 连接超时
    })

    // 监听连接事件
    this.pool.on('connect', (_client) => {
      logger.debug('数据库连接已建立')
    })

    this.pool.on('error', (err, _client) => {
      logger.error('数据库连接错误:', err)
    })
  }

  /**
   * 获取数据库实例（单例模式）
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  /**
   * 获取数据库连接池
   */
  public getPool(): pg.Pool {
    return this.pool
  }

  /**
   * 执行查询
   */
  public async query(text: string, params?: any[]): Promise<pg.QueryResult> {
    const start = Date.now()
    try {
      const result = await this.pool.query(text, params)
      const duration = Date.now() - start
      logger.debug(`SQL查询执行完成: ${text} - 耗时: ${duration}ms`)
      return result
    } catch (error) {
      logger.error(`SQL查询错误: ${text}`, error)
      throw error
    }
  }

  /**
   * 获取客户端连接（用于事务）
   */
  public async getClient(): Promise<pg.PoolClient> {
    return await this.pool.connect()
  }

  /**
   * 执行事务
   */
  public async transaction<T>(
    callback: (client: pg.PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient()
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * 测试数据库连接
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT NOW()')
      logger.info('数据库连接测试成功')
      return true
    } catch (error) {
      logger.error('数据库连接测试失败:', error)
      return false
    }
  }

  /**
   * 关闭数据库连接
   */
  public async close(): Promise<void> {
    await this.pool.end()
    logger.info('数据库连接已关闭')
  }
}

// 导出数据库实例
export const database = Database.getInstance()