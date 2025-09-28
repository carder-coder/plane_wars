import { createClient, RedisClientType } from 'redis'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'

/**
 * Redis缓存服务
 */
export class RedisService {
  private static instance: RedisService
  private client: RedisClientType

  private constructor() {
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port
      },
      password: config.redis.password,
      database: config.redis.db
    })

    // 监听连接事件
    this.client.on('connect', () => {
      logger.info('Redis连接已建立')
    })

    this.client.on('error', (err) => {
      logger.error('Redis连接错误:', err)
    })

    this.client.on('ready', () => {
      logger.info('Redis已准备就绪')
    })
  }

  /**
   * 获取Redis实例（单例模式）
   */
  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService()
    }
    return RedisService.instance
  }

  /**
   * 连接Redis
   */
  public async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect()
    }
  }

  /**
   * 断开Redis连接
   */
  public async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.disconnect()
    }
  }

  /**
   * 设置键值对
   */
  public async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value)
      } else {
        await this.client.set(key, value)
      }
      logger.debug(`Redis SET: ${key}`)
    } catch (error) {
      logger.error(`Redis SET错误 ${key}:`, error)
      throw error
    }
  }

  /**
   * 获取值
   */
  public async get(key: string): Promise<string | null> {
    try {
      const value = await this.client.get(key)
      logger.debug(`Redis GET: ${key} = ${value ? '有值' : '无值'}`)
      return value
    } catch (error) {
      logger.error(`Redis GET错误 ${key}:`, error)
      throw error
    }
  }

  /**
   * 删除键
   */
  public async del(key: string): Promise<void> {
    try {
      await this.client.del(key)
      logger.debug(`Redis DEL: ${key}`)
    } catch (error) {
      logger.error(`Redis DEL错误 ${key}:`, error)
      throw error
    }
  }

  /**
   * 检查键是否存在
   */
  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      logger.error(`Redis EXISTS错误 ${key}:`, error)
      throw error
    }
  }

  /**
   * 设置键的过期时间
   */
  public async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(key, seconds)
      logger.debug(`Redis EXPIRE: ${key} ${seconds}s`)
    } catch (error) {
      logger.error(`Redis EXPIRE错误 ${key}:`, error)
      throw error
    }
  }

  /**
   * 设置JSON对象
   */
  public async setJSON(key: string, value: any, ttl?: number): Promise<void> {
    const jsonString = JSON.stringify(value)
    await this.set(key, jsonString, ttl)
  }

  /**
   * 获取JSON对象
   */
  public async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key)
    if (!value) return null
    
    try {
      return JSON.parse(value) as T
    } catch (error) {
      logger.error(`Redis JSON解析错误 ${key}:`, error)
      return null
    }
  }

  /**
   * Hash操作：设置字段
   */
  public async hSet(key: string, field: string, value: string): Promise<void> {
    try {
      await this.client.hSet(key, field, value)
      logger.debug(`Redis HSET: ${key}.${field}`)
    } catch (error) {
      logger.error(`Redis HSET错误 ${key}.${field}:`, error)
      throw error
    }
  }

  /**
   * Hash操作：获取字段
   */
  public async hGet(key: string, field: string): Promise<string | undefined> {
    try {
      const value = await this.client.hGet(key, field)
      return value || undefined
    } catch (error) {
      logger.error(`Redis HGET错误 ${key}.${field}:`, error)
      throw error
    }
  }

  /**
   * Hash操作：获取所有字段
   */
  public async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hGetAll(key)
    } catch (error) {
      logger.error(`Redis HGETALL错误 ${key}:`, error)
      throw error
    }
  }

  /**
   * Hash操作：删除字段
   */
  public async hDel(key: string, field: string): Promise<void> {
    try {
      await this.client.hDel(key, field)
      logger.debug(`Redis HDEL: ${key}.${field}`)
    } catch (error) {
      logger.error(`Redis HDEL错误 ${key}.${field}:`, error)
      throw error
    }
  }

  /**
   * Set操作：添加成员
   */
  public async sAdd(key: string, member: string): Promise<void> {
    try {
      await this.client.sAdd(key, member)
      logger.debug(`Redis SADD: ${key} ${member}`)
    } catch (error) {
      logger.error(`Redis SADD错误 ${key}:`, error)
      throw error
    }
  }

  /**
   * Set操作：移除成员
   */
  public async sRem(key: string, member: string): Promise<void> {
    try {
      await this.client.sRem(key, member)
      logger.debug(`Redis SREM: ${key} ${member}`)
    } catch (error) {
      logger.error(`Redis SREM错误 ${key}:`, error)
      throw error
    }
  }

  /**
   * Set操作：获取所有成员
   */
  public async sMembers(key: string): Promise<string[]> {
    try {
      return await this.client.sMembers(key)
    } catch (error) {
      logger.error(`Redis SMEMBERS错误 ${key}:`, error)
      throw error
    }
  }

  /**
   * 获取原始Redis客户端（用于高级操作）
   */
  public getClient(): RedisClientType {
    return this.client
  }
}

// 导出Redis实例
export const redis = RedisService.getInstance()