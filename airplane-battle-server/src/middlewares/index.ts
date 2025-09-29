import { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import { logger } from '../utils/logger.js'

/**
 * 错误处理中间件
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('服务器错误:', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    body: req.body,
    user: req.user
  })

  // 数据库错误
  if (error.code === '23505') { // PostgreSQL唯一约束错误
    res.status(409).json({
      success: false,
      message: '数据已存在',
      error: { code: 'DUPLICATE_ENTRY' }
    })
    return
  }

  // JWT错误
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Token无效',
      error: { code: 'INVALID_TOKEN' }
    })
    return
  }

  // 默认错误响应
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: { code: 'INTERNAL_ERROR' }
  })
}

/**
 * 404处理中间件
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.warn(`404错误: ${req.method} ${req.url}`)
  
  res.status(404).json({
    success: false,
    message: '请求的资源不存在',
    error: { code: 'NOT_FOUND' }
  })
}

/**
 * 请求日志中间件
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now()
  
  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.http(req.method, req.url, res.statusCode, duration)
  })

  next()
}

/**
 * 通用限流中间件
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每15分钟最多100个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
    error: { code: 'RATE_LIMIT_EXCEEDED' }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`通用限流触发: ${req.ip} ${req.method} ${req.url}`)
    res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试',
      error: { code: 'RATE_LIMIT_EXCEEDED' }
    })
  }
})

/**
 * 认证接口限流中间件
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 每15分钟最多5次登录尝试
  message: {
    success: false,
    message: '登录尝试过于频繁，请稍后再试',
    error: { code: 'AUTH_RATE_LIMIT_EXCEEDED' }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功的请求不计入限制
  handler: (req, res) => {
    logger.warn(`认证限流触发: ${req.ip} ${req.method} ${req.url}`)
    res.status(429).json({
      success: false,
      message: '登录尝试过于频繁，请稍后再试',
      error: { code: 'AUTH_RATE_LIMIT_EXCEEDED' }
    })
  }
})

/**
 * 游戏操作限流中间件
 */
export const gameRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 60, // 每分钟最多60个游戏操作
  message: {
    success: false,
    message: '游戏操作过于频繁，请稍后再试',
    error: { code: 'GAME_RATE_LIMIT_EXCEEDED' }
  },
  keyGenerator: (req) => {
    // 基于用户ID限流
    return req.user?.userId || req.ip || 'anonymous'
  },
  handler: (req, res) => {
    logger.warn(`游戏限流触发: ${req.user?.userId || req.ip} ${req.method} ${req.url}`)
    res.status(429).json({
      success: false,
      message: '游戏操作过于频繁，请稍后再试',
      error: { code: 'GAME_RATE_LIMIT_EXCEEDED' }
    })
  }
})

/**
 * CORS配置
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    // 允许的源列表（从配置获取）
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173']
    
    // 允许没有origin的请求（如移动应用）
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      logger.warn(`CORS拒绝来源: ${origin}`)
      callback(new Error('CORS策略不允许此来源'))
    }
  },
  credentials: true, // 允许发送凭据
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 预检请求缓存时间（24小时）
}