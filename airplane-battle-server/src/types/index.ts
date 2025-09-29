// 导出所有类型定义
export * from './user.js'
export * from './game.js'
export * from './room.js'
export * from './socket.js'

/**
 * API响应基础接口
 */
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: {
    code: string
    details?: any
  }
}

/**
 * 分页查询参数接口
 */
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * MongoDB连接配置接口
 */
export interface MongoDBConfig {
  host: string
  port: number
  database: string
  username?: string
  password?: string
  authSource?: string
  ssl?: boolean
  replicaSet?: string
}

/**
 * Redis连接配置接口
 */
export interface RedisConfig {
  host: string
  port: number
  password?: string
  db?: number
}

/**
 * JWT配置接口
 */
export interface JWTConfig {
  secret: string
  expiresIn: string
  refreshExpiresIn: string
}

/**
 * 服务器配置接口
 */
export interface ServerConfig {
  port: number
  nodeEnv: string
  mongodb: MongoDBConfig
  redis: RedisConfig
  jwt: JWTConfig
  allowedOrigins: string[]
  logLevel: string
  maxRooms: number
  maxPlayersPerRoom: number
  roomTimeout: number
}