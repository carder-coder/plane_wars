import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { User, UserSession, IUser } from '../models/index.js'
import { redis } from '../database/redis.js'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'
import { 
  UserProfile, 
  RegisterRequest, 
  LoginRequest, 
  LoginResponse,
  JWTPayload,
  ApiResponse 
} from '../types/index.js'

/**
 * 用户服务类（MongoDB版本）
 */
export class MongoUserService {
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

      // 检查用户名和邮箱是否已存在
      const existingUser = await User.findOne({
        $or: [
          { username },
          { email }
        ]
      })

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
      const newUser = new User({
        userId,
        username,
        email,
        passwordHash,
        displayName: displayName || username,
        level: 1,
        experience: 0,
        wins: 0,
        losses: 0,
        rating: 1000,
        isActive: true,
        createdAt: new Date()
      })

      await newUser.save()

      const userProfile: UserProfile = {
        userId: newUser.userId,
        username: newUser.username,
        displayName: newUser.displayName,
        level: newUser.level,
        experience: newUser.experience,
        wins: newUser.wins,
        losses: newUser.losses,
        rating: newUser.rating,
        avatarUrl: newUser.avatarUrl
      }

      logger.info(`新用户注册成功: ${username}`)

      return {
        success: true,
        message: '注册成功',
        data: userProfile
      }
    } catch (error) {
      logger.error('用户注册失败:', error)
      
      // 处理Mongoose唯一约束错误
      if (error instanceof Error && 'code' in error && error.code === 11000) {
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
      const user = await User.findByUsername(username)
      if (!user) {
        return {
          success: false,
          message: '用户名或密码错误',
        }
      }

      // 检查账户是否激活
      if (!user.isActive) {
        return {
          success: false,
          message: '账户已被禁用',
        }
      }

      // 验证密码
      if (!user.passwordHash) {
        return {
          success: false,
          message: '用户名或密码错误',
        }
      }
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
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
      user.lastLogin = new Date()
      await user.save()

      // 保存refresh token到数据库
      await this.saveRefreshToken(user.userId, refreshToken)

      // 缓存用户会话信息
      await redis.setJSON(`session:${user.userId}`, {
        userId: user.userId,
        username: user.username,
        loginTime: new Date().toISOString()
      }, 24 * 60 * 60) // 24小时过期

      const userProfile: UserProfile = {
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        level: user.level,
        experience: user.experience,
        wins: user.wins,
        losses: user.losses,
        rating: user.rating,
        avatarUrl: user.avatarUrl
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
      const user = await User.findOne({ userId: decoded.userId, isActive: true })
      if (!user) {
        return {
          success: false,
          message: '用户不存在或已被禁用'
        }
      }

      // 验证refresh token是否在数据库中存在
      const tokenExists = await this.verifyRefreshToken(user.userId, refreshToken)
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
      await this.updateRefreshToken(user.userId, refreshToken, newRefreshToken)

      const userProfile: UserProfile = {
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        level: user.level,
        experience: user.experience,
        wins: user.wins,
        losses: user.losses,
        rating: user.rating,
        avatarUrl: user.avatarUrl
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
        await UserSession.findOneAndUpdate(
          { userId, refreshToken },
          { isActive: false }
        )
      } else {
        // 停用该用户的所有会话
        await UserSession.deactivateUserSessions(userId)
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
      const user = await User.findOne({ userId, isActive: true })
      if (!user) {
        return {
          success: false,
          message: '用户不存在',
          error: { code: 'USER_NOT_FOUND' }
        }
      }

      const userProfile: UserProfile = {
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        level: user.level,
        experience: user.experience,
        wins: user.wins,
        losses: user.losses,
        rating: user.rating,
        avatarUrl: user.avatarUrl
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
   * 更新用户资料
   */
  public static async updateUserProfile(
    userId: string, 
    updates: Partial<{ displayName: string; avatarUrl: string }>
  ): Promise<ApiResponse<UserProfile>> {
    try {
      const user = await User.findOne({ userId, isActive: true })
      if (!user) {
        return {
          success: false,
          message: '用户不存在',
          error: { code: 'USER_NOT_FOUND' }
        }
      }

      // 更新字段
      if (updates.displayName !== undefined) {
        user.displayName = updates.displayName
      }
      if (updates.avatarUrl !== undefined) {
        user.avatarUrl = updates.avatarUrl
      }

      await user.save()

      const userProfile: UserProfile = {
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        level: user.level,
        experience: user.experience,
        wins: user.wins,
        losses: user.losses,
        rating: user.rating,
        avatarUrl: user.avatarUrl
      }

      return {
        success: true,
        message: '用户资料更新成功',
        data: userProfile
      }
    } catch (error) {
      logger.error('更新用户资料失败:', error)
      return {
        success: false,
        message: '更新用户资料失败'
      }
    }
  }

  /**
   * 获取排行榜
   */
  public static async getLeaderboard(limit: number = 10): Promise<ApiResponse<UserProfile[]>> {
    try {
      const users = await User.getLeaderboard(limit)
      
      const leaderboard: UserProfile[] = users.map((user: IUser) => ({
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        level: user.level,
        experience: user.experience,
        wins: user.wins,
        losses: user.losses,
        rating: user.rating,
        avatarUrl: user.avatarUrl
      }))

      return {
        success: true,
        message: '获取排行榜成功',
        data: leaderboard
      }
    } catch (error) {
      logger.error('获取排行榜失败:', error)
      return {
        success: false,
        message: '获取排行榜失败'
      }
    }
  }

  /**
   * 更新用户游戏统计
   */
  public static async updateGameStats(
    userId: string, 
    isWin: boolean, 
    experienceGain: number = 10
  ): Promise<ApiResponse> {
    try {
      const user = await User.findOne({ userId, isActive: true })
      if (!user) {
        return {
          success: false,
          message: '用户不存在',
          error: { code: 'USER_NOT_FOUND' }
        }
      }

      // 使用模型方法更新统计
      user.updateStats(isWin, experienceGain)
      await user.save()

      logger.info(`用户游戏统计更新: ${userId}, 胜利: ${isWin}, 经验: ${experienceGain}`)

      return {
        success: true,
        message: '游戏统计更新成功'
      }
    } catch (error) {
      logger.error('更新游戏统计失败:', error)
      return {
        success: false,
        message: '更新游戏统计失败'
      }
    }
  }

  /**
   * 生成访问令牌
   */
  private static generateAccessToken(user: any): string {
    const payload: JWTPayload = {
      userId: user.userId,
      username: user.username,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1小时
    }

    return jwt.sign(payload, config.jwt.secret)
  }

  /**
   * 生成刷新令牌
   */
  private static generateRefreshToken(user: any): string {
    const payload: JWTPayload = {
      userId: user.userId,
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
      const sessionId = uuidv4()
      // const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7天后过期
      
      await UserSession.createSession(sessionId, userId, refreshToken, 7 * 24 * 60 * 60)
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
      const session = await UserSession.findByRefreshToken(refreshToken)
      return !!session && session.userId === userId && session.isValid()
    } catch (error) {
      logger.error('验证refresh token失败:', error)
      return false
    }
  }

  /**
   * 更新刷新令牌
   */
  private static async updateRefreshToken(
    _userId: string, 
    oldToken: string, 
    newToken: string
  ): Promise<void> {
    try {
      await UserSession.refreshSession(oldToken, newToken, 7 * 24 * 60 * 60)
    } catch (error) {
      logger.error('更新refresh token失败:', error)
      throw error
    }
  }
}