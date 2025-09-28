import { Router } from 'express'
import { AuthController, UserController } from '../controllers/authController.js'
import { authenticate, optionalAuth } from '../middlewares/auth.js'
import { validate, registerSchema, loginSchema } from '../middlewares/validation.js'
import { authRateLimit } from '../middlewares/index.js'

/**
 * 认证路由
 */
const authRouter = Router()

/**
 * @route POST /api/auth/register
 * @desc 用户注册
 * @access Public
 */
authRouter.post(
  '/register',
  authRateLimit,
  validate(registerSchema),
  AuthController.register
)

/**
 * @route POST /api/auth/login
 * @desc 用户登录
 * @access Public
 */
authRouter.post(
  '/login',
  authRateLimit,
  validate(loginSchema),
  AuthController.login
)

/**
 * @route POST /api/auth/refresh
 * @desc 刷新访问令牌
 * @access Public
 */
authRouter.post(
  '/refresh',
  AuthController.refreshToken
)

/**
 * @route POST /api/auth/logout
 * @desc 用户登出
 * @access Private
 */
authRouter.post(
  '/logout',
  authenticate,
  AuthController.logout
)

/**
 * @route GET /api/auth/profile
 * @desc 获取当前用户资料
 * @access Private
 */
authRouter.get(
  '/profile',
  authenticate,
  AuthController.getProfile
)

/**
 * @route GET /api/auth/verify
 * @desc 验证token有效性
 * @access Private
 */
authRouter.get(
  '/verify',
  authenticate,
  AuthController.verifyToken
)

export { authRouter }