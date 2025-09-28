import { Router } from 'express'
import { UserController } from '../controllers/authController.js'
import { authenticate, optionalAuth } from '../middlewares/auth.js'

/**
 * 用户路由
 */
const userRouter = Router()

/**
 * @route GET /api/users/leaderboard
 * @desc 获取用户排行榜
 * @access Public
 */
userRouter.get(
  '/leaderboard',
  optionalAuth,
  UserController.getLeaderboard
)

/**
 * @route GET /api/users/online
 * @desc 获取在线用户列表
 * @access Private
 */
userRouter.get(
  '/online',
  authenticate,
  UserController.getOnlineUsers
)

export { userRouter }