import { Router } from 'express'
import { AuthController } from '../controllers/authController.js'
import { authenticate } from '../middlewares/auth.js'
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
 * @route GET /api/auth/register
 * @desc 获取注册表单信息（用于API测试）
 * @access Public
 */
authRouter.get(
  '/register',
  (_req, res) => {
    res.json({
      success: true,
      message: '注册接口可用，请使用POST方法',
      data: {
        method: 'POST',
        endpoint: '/api/auth/register',
        requiredFields: ['username', 'email', 'password', 'displayName'],
        example: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          displayName: '测试用户'
        }
      }
    })
  }
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