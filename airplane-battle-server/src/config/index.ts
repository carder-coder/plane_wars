import dotenv from 'dotenv'
import { ServerConfig } from '../types/index.js'

// 加载环境变量
dotenv.config()

/**
 * 服务器配置
 */
export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'airplane_battle',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production'
  },
  
  mongodb: {
    host: process.env.MONGO_HOST || 'localhost',
    port: parseInt(process.env.MONGO_PORT || '27017'),
    database: process.env.MONGO_DATABASE || 'airplane_battle',
    username: process.env.MONGO_USERNAME || '',
    password: process.env.MONGO_PASSWORD || '',
    authSource: process.env.MONGO_AUTH_SOURCE || 'admin',
    ssl: process.env.MONGO_SSL === 'true',
    replicaSet: process.env.MONGO_REPLICA_SET || undefined
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: 0
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  logLevel: process.env.LOG_LEVEL || 'debug',
  maxRooms: parseInt(process.env.MAX_ROOMS || '100'),
  maxPlayersPerRoom: parseInt(process.env.MAX_PLAYERS_PER_ROOM || '2'),
  roomTimeout: parseInt(process.env.ROOM_TIMEOUT || '1800000') // 30分钟
}