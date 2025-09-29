import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { config } from './config/index.js'
import { logger } from './utils/logger.js'
import { database } from './database/connection.js'
import { redis } from './database/redis.js'
import { Migration } from './database/migrate.js'
import { 
  errorHandler, 
  notFoundHandler, 
  requestLogger, 
  generalRateLimit,
  corsOptions 
} from './middlewares/index.js'
import { SocketManager } from './services/socketManager.js'
import { authRouter } from './routes/auth.js'
import { userRouter } from './routes/users.js'
import { roomRouter } from './routes/rooms.js'

/**
 * 主服务器类
 */
export class Server {
  private app: express.Application
  private httpServer: ReturnType<typeof createServer>
  private io: SocketServer
  private socketManager: SocketManager | null = null

  constructor() {
    this.app = express()
    this.httpServer = createServer(this.app)
    this.io = new SocketServer(this.httpServer, {
      cors: corsOptions,
      pingTimeout: 60000,
      pingInterval: 25000
    })

    this.setupMiddlewares()
    this.setupRoutes()
    this.setupSocketIO()
    this.setupErrorHandling()
  }

  /**
   * 设置中间件
   */
  private setupMiddlewares(): void {
    // 安全中间件
    this.app.use(helmet({
      contentSecurityPolicy: false, // 关闭CSP以支持Socket.IO
      crossOriginEmbedderPolicy: false
    }))

    // CORS中间件
    this.app.use(cors(corsOptions))

    // 请求解析中间件
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))

    // 日志中间件
    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'))
    }
    this.app.use(requestLogger)

    // 限流中间件
    this.app.use(generalRateLimit)

    // 健康检查
    this.app.get('/health', (_req, res) => {
      res.json({
        success: true,
        message: '服务器运行正常',
        data: {
          timestamp: new Date().toISOString(),
          environment: config.nodeEnv,
          version: '1.0.0'
        }
      })
    })
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // API路由前缀
    const apiPrefix = '/api'

    // 认证路由
    this.app.use(`${apiPrefix}/auth`, authRouter)
    
    // 用户路由
    this.app.use(`${apiPrefix}/users`, userRouter)
    
    // 房间路由
    this.app.use(`${apiPrefix}/rooms`, roomRouter)

    // Socket统计信息路由
    this.app.get(`${apiPrefix}/stats`, (_req, res) => {
      res.json({
        success: true,
        message: '服务器统计信息',
        data: this.socketManager ? this.socketManager.getStats() : {}
      })
    })

    // TODO: 在这里添加更多路由
    // this.app.use(`${apiPrefix}/rooms`, roomRoutes)
    // this.app.use(`${apiPrefix}/games`, gameRoutes)

    // 临时路由用于测试
    this.app.get(`${apiPrefix}/test`, (_req, res) => {
      res.json({
        success: true,
        message: 'API正常工作',
        data: {
          timestamp: new Date().toISOString()
        }
      })
    })
  }

  /**
   * 设置Socket.IO
   */
  private setupSocketIO(): void {
    // 初始化Socket管理器
    this.socketManager = new SocketManager(this.io)
    logger.info('Socket.IO管理器已初始化')
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    // 404处理
    this.app.use(notFoundHandler)

    // 全局错误处理
    this.app.use(errorHandler)

    // 未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝:', { reason, promise })
    })

    // 未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error)
      process.exit(1)
    })

    // 优雅关闭
    process.on('SIGTERM', () => {
      logger.info('收到SIGTERM信号，开始优雅关闭...')
      this.shutdown()
    })

    process.on('SIGINT', () => {
      logger.info('收到SIGINT信号，开始优雅关闭...')
      this.shutdown()
    })
  }

  /**
   * 初始化数据库连接
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // 测试数据库连接
      const isConnected = await database.testConnection()
      if (!isConnected) {
        throw new Error('数据库连接失败')
      }

      // 运行数据库迁移
      await Migration.runMigrations()
      
      logger.info('数据库初始化完成')
    } catch (error) {
      logger.error('数据库初始化失败:', error)
      throw error
    }
  }

  /**
   * 初始化Redis连接
   */
  private async initializeRedis(): Promise<void> {
    try {
      await redis.connect()
      logger.info('Redis连接初始化完成')
    } catch (error) {
      logger.error('Redis连接初始化失败:', error)
      throw error
    }
  }

  /**
   * 启动服务器
   */
  public async start(): Promise<void> {
    try {
      // 初始化数据库
      await this.initializeDatabase()

      // 初始化Redis
      await this.initializeRedis()

      // 启动HTTP服务器
      this.httpServer.listen(config.port, () => {
        logger.info(`服务器已启动 - http://localhost:${config.port}`)
        logger.info(`环境: ${config.nodeEnv}`)
        logger.info(`允许的域名: ${config.allowedOrigins.join(', ')}`)
      })
    } catch (error) {
      logger.error('服务器启动失败:', error)
      process.exit(1)
    }
  }

  /**
   * 优雅关闭服务器
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('正在关闭服务器...')

      // 关闭HTTP服务器
      this.httpServer.close(() => {
        logger.info('HTTP服务器已关闭')
      })

      // 关闭Socket.IO
      this.io.close(() => {
        logger.info('Socket.IO服务已关闭')
      })

      // 关闭数据库连接
      await database.close()

      // 关闭Redis连接
      await redis.disconnect()

      logger.info('服务器已优雅关闭')
      process.exit(0)
    } catch (error) {
      logger.error('服务器关闭时发生错误:', error)
      process.exit(1)
    }
  }

  /**
   * 获取Express应用实例
   */
  public getApp(): express.Application {
    return this.app
  }

  /**
   * 获取Socket.IO实例
   */
  public getIO(): SocketServer {
    return this.io
  }
}

// 如果直接运行此文件，启动服务器
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new Server()
  server.start().catch((error) => {
    logger.error('启动服务器失败:', error)
    process.exit(1)
  })
}