import { Router } from 'express'
import { RoomController } from '../controllers/roomController.js'
import { authenticate } from '../middlewares/auth.js'
import { validate, createRoomSchema, joinRoomSchema } from '../middlewares/validation.js'
import { gameRateLimit } from '../middlewares/index.js'

/**
 * 房间路由
 */
const roomRouter = Router()

/**
 * @route GET /api/rooms
 * @desc 获取房间列表
 * @access Public
 */
roomRouter.get(
  '/',
  RoomController.getRoomList
)

/**
 * @route POST /api/rooms
 * @desc 创建房间
 * @access Private
 */
roomRouter.post(
  '/',
  authenticate,
  gameRateLimit,
  validate(createRoomSchema),
  RoomController.createRoom
)

/**
 * @route GET /api/rooms/:roomId
 * @desc 获取房间详情
 * @access Private
 */
roomRouter.get(
  '/:roomId',
  authenticate,
  RoomController.getRoomDetails
)

/**
 * @route POST /api/rooms/join
 * @desc 加入房间
 * @access Private
 */
roomRouter.post(
  '/join',
  authenticate,
  gameRateLimit,
  validate(joinRoomSchema),
  RoomController.joinRoom
)

/**
 * @route DELETE /api/rooms/:roomId/leave
 * @desc 离开房间
 * @access Private
 */
roomRouter.delete(
  '/:roomId/leave',
  authenticate,
  gameRateLimit,
  RoomController.leaveRoom
)

export { roomRouter }