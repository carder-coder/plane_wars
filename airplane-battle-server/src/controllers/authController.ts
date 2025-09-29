import { Request, Response } from 'express'
import { UserService } from '../services/userService.js'
import { logger } from '../utils/logger.js'
import { RegisterRequest, LoginRequest } from '../types/index.js'

/**
 * 用户认证控制器
 */
export class AuthController {
  /**
   * 用户注册
   */
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const registerData: RegisterRequest = req.body
      const result = await UserService.register(registerData)
      
      const statusCode = result.success ? 201 : 400
      res.status(statusCode).json(result)
      
      if (result.success) {
        logger.info(`用户注册成功: ${registerData.username}`)
      } else {
        logger.warn(`用户注册失败: ${registerData.username} - ${result.message}`)
      }
    } catch (error) {
      logger.error('注册控制器错误:', error)
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: { code: 'INTERNAL_ERROR' }
      })
    }
  }

  /**
   * 用户登录
   */
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginRequest = req.body
      const result = await UserService.login(loginData)
      
      const statusCode = result.success ? 200 : 401
      res.status(statusCode).json(result)
      
      if (result.success) {
        logger.info(`用户登录成功: ${loginData.username}`)
      } else {
        logger.warn(`用户登录失败: ${loginData.username} - ${result.message}`)
      }
    } catch (error) {
      logger.error('登录控制器错误:', error)
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: { code: 'INTERNAL_ERROR' }
      })
    }
  }

  /**
   * 刷新访问令牌
   */
  public static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body
      
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: '缺少refresh token',
          error: { code: 'MISSING_REFRESH_TOKEN' }
        })
        return
      }

      const result = await UserService.refreshToken(refreshToken)
      
      const statusCode = result.success ? 200 : 401
      res.status(statusCode).json(result)
    } catch (error) {
      logger.error('刷新token控制器错误:', error)
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: { code: 'INTERNAL_ERROR' }
      })
    }
  }

  /**
   * 用户登出
   */
  public static async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      const { refreshToken } = req.body

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '未认证的用户',
          error: { code: 'UNAUTHORIZED' }
        })
        return
      }

      const result = await UserService.logout(userId, refreshToken)
      
      const statusCode = result.success ? 200 : 400
      res.status(statusCode).json(result)
      
      if (result.success) {
        logger.info(`用户登出成功: ${userId}`)
      }
    } catch (error) {
      logger.error('登出控制器错误:', error)
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: { code: 'INTERNAL_ERROR' }
      })
    }
  }

  /**
   * 获取当前用户信息
   */
  public static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '未认证的用户',
          error: { code: 'UNAUTHORIZED' }
        })
        return
      }

      const result = await UserService.getUserProfile(userId)
      
      const statusCode = result.success ? 200 : 404
      res.status(statusCode).json(result)
    } catch (error) {
      logger.error('获取用户资料控制器错误:', error)
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: { code: 'INTERNAL_ERROR' }
      })
    }
  }

  /**
   * 验证token有效性
   */
  public static async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      // 如果通过了认证中间件，说明token有效
      const user = req.user

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Token无效',
          error: { code: 'INVALID_TOKEN' }
        })
        return
      }

      res.json({
        success: true,
        message: 'Token有效',
        data: {
          userId: user.userId,
          username: user.username
        }
      })
    } catch (error) {
      logger.error('验证token控制器错误:', error)
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: { code: 'INTERNAL_ERROR' }
      })
    }
  }
}

/**
 * 用户管理控制器
 */
export class UserController {
  /**
   * 获取用户排行榜
   */
  public static async getLeaderboard(_req: Request, res: Response): Promise<void> {
    try {
      // TODO: 实现排行榜逻辑
      res.json({
        success: true,
        message: '获取排行榜成功',
        data: {
          leaderboard: [],
          total: 0
        }
      })
    } catch (error) {
      logger.error('获取排行榜错误:', error)
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: { code: 'INTERNAL_ERROR' }
      })
    }
  }

  /**
   * 获取在线用户列表
   */
  public static async getOnlineUsers(_req: Request, res: Response): Promise<void> {
    try {
      // TODO: 实现在线用户列表逻辑
      res.json({
        success: true,
        message: '获取在线用户成功',
        data: {
          onlineUsers: [],
          total: 0
        }
      })
    } catch (error) {
      logger.error('获取在线用户错误:', error)
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: { code: 'INTERNAL_ERROR' }
      })
    }
  }
}