import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { JWTPayload, AuthenticatedUser } from '../types/index.js'
import { logger } from '../utils/logger.js'

/**
 * 扩展Express Request接口，添加用户信息
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

/**
 * JWT认证中间件
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization
    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: '缺少认证token',
        error: { code: 'MISSING_TOKEN' }
      })
      return
    }

    // 验证token格式
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader

    if (!token) {
      res.status(401).json({
        success: false,
        message: '无效的token格式',
        error: { code: 'INVALID_TOKEN_FORMAT' }
      })
      return
    }

    // 验证并解析token
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload
      
      // 检查token是否过期
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        res.status(401).json({
          success: false,
          message: 'Token已过期',
          error: { code: 'TOKEN_EXPIRED' }
        })
        return
      }

      // 将用户信息添加到请求对象
      req.user = {
        userId: decoded.userId,
        username: decoded.username
      }

      logger.debug(`用户认证成功: ${decoded.username}`)
      next()
    } catch (jwtError) {
      logger.warn('JWT验证失败:', jwtError)
      res.status(401).json({
        success: false,
        message: 'Token验证失败',
        error: { code: 'INVALID_TOKEN' }
      })
    }
  } catch (error) {
    logger.error('认证中间件错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: { code: 'INTERNAL_ERROR' }
    })
  }
}

/**
 * 可选认证中间件（不强制要求登录）
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader

      if (token) {
        try {
          const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload
          
          if (decoded.exp && Date.now() < decoded.exp * 1000) {
            req.user = {
              userId: decoded.userId,
              username: decoded.username
            }
            logger.debug(`可选认证成功: ${decoded.username}`)
          }
        } catch (jwtError) {
          // 可选认证失败时不阻止请求继续
          logger.debug('可选认证失败，继续处理请求')
        }
      }
    }

    next()
  } catch (error) {
    logger.error('可选认证中间件错误:', error)
    next() // 继续处理请求
  }
}