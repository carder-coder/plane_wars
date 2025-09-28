import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { database } from '../database/connection.js'
import { redis } from '../database/redis.js'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'
import { 
  User, 
  UserProfile, 
  RegisterRequest, 
  LoginRequest, 
  LoginResponse,
  JWTPayload,
  ApiResponse 
} from '../types/index.js'

/**
 * 用户服务类
 */
export class UserService {
  /**
   * 密码加密轮数
   */
  private static readonly SALT_ROUNDS = 12

  /**
   * 用户注册
   */
  public static async register(data: RegisterRequest): Promise<ApiResponse<UserProfile>> {
    try {
      const { username, email, password, displayName } = data

      // 检查用户名是否已存在
      const existingUser = await this.findByUsernameOrEmail(username, email)
      if (existingUser) {
        return {
          success: false,
          message: '用户名或邮箱已存在',
          error: { code: 'USER_EXISTS' }
        }
      }

      // 加密密码
      const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS)

      // 创建用户
      const userId = uuidv4()
      const query = `
        INSERT INTO users (
          user_id, username, email, password_hash, display_name, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING user_id, username, email, display_name, level, experience, wins, losses, rating, created_at
      `

      const result = await database.query(query, [
        userId,
        username,
        email,
        passwordHash,
        displayName || username
      ])

      const newUser = result.rows[0]
      const userProfile: UserProfile = {
        userId: newUser.user_id,
        username: newUser.username,
        displayName: newUser.display_name,
        level: newUser.level,
        experience: newUser.experience,
        wins: newUser.wins,
        losses: newUser.losses,
        rating: newUser.rating
      }

      logger.info(`新用户注册成功: ${username}`)

      return {
        success: true,
        message: '注册成功',
        data: userProfile
      }
    } catch (error) {
      logger.error('用户注册失败:', error)
      
      // 处理数据库唯一约束错误
      if (error.code === '23505') {
        return {
          success: false,
          message: '用户名或邮箱已存在',
          error: { code: 'USER_EXISTS' }
        }
      }

      return {
        success: false,
        message: '注册失败',
        error: { code: 'REGISTRATION_FAILED' }
      }
    }
  }

  /**
   * 用户登录
   */
  public static async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const { username, password } = data

      // 查找用户
      const user = await this.findByUsername(username)
      if (!user) {
        return {
          success: false,
          message: '用户名或密码错误',
        }
      }

      // 检查账户是否激活
      if (!user.is_active) {
        return {
          success: false,
          message: '账户已被禁用',
        }
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password_hash)
      if (!isPasswordValid) {
        return {
          success: false,
          message: '用户名或密码错误',
        }
      }

      // 生成JWT tokens
      const accessToken = this.generateAccessToken(user)
      const refreshToken = this.generateRefreshToken(user)

      // 更新最后登录时间
      await database.query(
        'UPDATE users SET last_login = NOW() WHERE user_id = $1',
        [user.user_id]
      )

      // 保存refresh token到数据库
      await this.saveRefreshToken(user.user_id, refreshToken)

      // 缓存用户会话信息
      await redis.setJSON(`session:${user.user_id}`, {
        userId: user.user_id,
        username: user.username,
        loginTime: new Date().toISOString()
      }, 24 * 60 * 60) // 24小时过期

      const userProfile: UserProfile = {
        userId: user.user_id,
        username: user.username,
        displayName: user.display_name,
        level: user.level,
        experience: user.experience,
        wins: user.wins,
        losses: user.losses,
        rating: user.rating,
        avatarUrl: user.avatar_url
      }

      logger.info(`用户登录成功: ${username}`)

      return {
        success: true,
        message: '登录成功',
        data: {
          token: accessToken,
          refreshToken,
          user: userProfile
        }
      }
    } catch (error) {
      logger.error('用户登录失败:', error)
      return {
        success: false,
        message: '登录失败'
      }
    }
  }

  /**
   * 刷新访问令牌
   */
  public static async refreshToken(refreshToken: string): Promise<LoginResponse> {
    try {
      // 验证refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as JWTPayload

      // 查找用户
      const user = await this.findById(decoded.userId)
      if (!user || !user.is_active) {
        return {
          success: false,
          message: '用户不存在或已被禁用'
        }
      }

      // 验证refresh token是否在数据库中存在
      const tokenExists = await this.verifyRefreshToken(user.user_id, refreshToken)
      if (!tokenExists) {
        return {
          success: false,
          message: '无效的refresh token'
        }
      }

      // 生成新的tokens
      const newAccessToken = this.generateAccessToken(user)
      const newRefreshToken = this.generateRefreshToken(user)

      // 更新refresh token
      await this.updateRefreshToken(user.user_id, refreshToken, newRefreshToken)

      const userProfile: UserProfile = {
        userId: user.user_id,
        username: user.username,
        displayName: user.display_name,
        level: user.level,
        experience: user.experience,
        wins: user.wins,
        losses: user.losses,
        rating: user.rating,
        avatarUrl: user.avatar_url
      }

      return {
        success: true,
        message: 'Token刷新成功',
        data: {
          token: newAccessToken,
          refreshToken: newRefreshToken,
          user: userProfile
        }
      }
    } catch (error) {
      logger.error('Token刷新失败:', error)
      return {
        success: false,
        message: 'Token刷新失败'
      }
    }
  }

  /**
   * 用户登出
   */
  public static async logout(userId: string, refreshToken?: string): Promise<ApiResponse> {
    try {
      // 从Redis中删除会话
      await redis.del(`session:${userId}`)

      // 如果提供了refresh token，从数据库中删除
      if (refreshToken) {
        await database.query(
          'DELETE FROM user_sessions WHERE user_id = $1 AND refresh_token = $2',
          [userId, refreshToken]
        )
      } else {
        // 删除该用户的所有会话
        await database.query(
          'DELETE FROM user_sessions WHERE user_id = $1',
          [userId]
        )
      }

      logger.info(`用户登出: ${userId}`)

      return {
        success: true,
        message: '登出成功'
      }
    } catch (error) {
      logger.error('用户登出失败:', error)
      return {
        success: false,
        message: '登出失败'
      }
    }
  }

  /**
   * 获取用户资料
   */
  public static async getUserProfile(userId: string): Promise<ApiResponse<UserProfile>> {
    try {
      const user = await this.findById(userId)
      if (!user) {
        return {
          success: false,
          message: '用户不存在',
          error: { code: 'USER_NOT_FOUND' }
        }
      }

      const userProfile: UserProfile = {
        userId: user.user_id,
        username: user.username,
        displayName: user.display_name,
        level: user.level,
        experience: user.experience,
        wins: user.wins,
        losses: user.losses,
        rating: user.rating,
        avatarUrl: user.avatar_url
      }

      return {
        success: true,
        message: '获取用户资料成功',
        data: userProfile
      }
    } catch (error) {
      logger.error('获取用户资料失败:', error)
      return {
        success: false,
        message: '获取用户资料失败'
      }
    }
  }

  /**
   * 根据用户名查找用户
   */
  private static async findByUsername(username: string): Promise<User | null> {
    try {
      const result = await database.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      )
      return result.rows[0] || null
    } catch (error) {
      logger.error('查找用户失败:', error)
      return null
    }
  }

  /**
   * 根据用户ID查找用户
   */
  private static async findById(userId: string): Promise<User | null> {
    try {
      const result = await database.query(
        'SELECT * FROM users WHERE user_id = $1',
        [userId]
      )
      return result.rows[0] || null
    } catch (error) {
      logger.error('查找用户失败:', error)
      return null
    }
  }

  /**
   * 根据用户名或邮箱查找用户
   */
  private static async findByUsernameOrEmail(username: string, email: string): Promise<User | null> {
    try {
      const result = await database.query(
        'SELECT * FROM users WHERE username = $1 OR email = $2',
        [username, email]
      )
      return result.rows[0] || null
    } catch (error) {
      logger.error('查找用户失败:', error)
      return null
    }
  }

  /**
   * 生成访问令牌
   */
  private static generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.user_id,
      username: user.username,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1小时
    }

    return jwt.sign(payload, config.jwt.secret)
  }

  /**
   * 生成刷新令牌
   */
  private static generateRefreshToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.user_id,
      username: user.username,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7天
    }

    return jwt.sign(payload, config.jwt.secret)
  }

  /**
   * 保存刷新令牌
   */
  private static async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7天后过期
      
      await database.query(`
        INSERT INTO user_sessions (user_id, refresh_token, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          refresh_token = EXCLUDED.refresh_token,
          expires_at = EXCLUDED.expires_at,
          created_at = NOW()
      `, [userId, refreshToken, expiresAt])
    } catch (error) {
      logger.error('保存refresh token失败:', error)
      throw error
    }
  }

  /**
   * 验证刷新令牌
   */
  private static async verifyRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    try {
      const result = await database.query(`
        SELECT session_id FROM user_sessions 
        WHERE user_id = $1 AND refresh_token = $2 AND expires_at > NOW() AND is_active = true
      `, [userId, refreshToken])
      
      return result.rows.length > 0
    } catch (error) {
      logger.error('验证refresh token失败:', error)
      return false
    }
  }

  /**
   * 更新刷新令牌
   */
  private static async updateRefreshToken(
    userId: string, 
    oldToken: string, 
    newToken: string
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7天后过期
      
      await database.query(`
        UPDATE user_sessions 
        SET refresh_token = $1, expires_at = $2, created_at = NOW()
        WHERE user_id = $3 AND refresh_token = $4
      `, [newToken, expiresAt, userId, oldToken])
    } catch (error) {
      logger.error('更新refresh token失败:', error)
      throw error
    }
  }
}