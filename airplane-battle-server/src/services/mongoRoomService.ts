import { v4 as uuidv4 } from 'uuid'
import { Room, User, IRoomMember } from '../models/index.js'
import { redis } from '../database/redis.js'
import { logger } from '../utils/logger.js'
import { 
  RoomDetails, 
  CreateRoomRequest, 
  JoinRoomRequest,
  RoomListItem,
  RoomType,
  RoomStatus,
  ApiResponse,
  PaginatedResponse 
} from '../types/index.js'
import { Orientation } from '../types/game.js'

/**
 * 房间服务类（MongoDB版本）
 */
export class MongoRoomService {
  /**
   * 创建房间
   */
  public static async createRoom(
    hostUserId: string, 
    data: CreateRoomRequest
  ): Promise<ApiResponse<any>> {
    try {
      const { roomName, roomType, password } = data

      // 验证用户存在
      const host = await User.findOne({ userId: hostUserId, isActive: true })
      if (!host) {
        return {
          success: false,
          message: '用户不存在',
          error: { code: 'USER_NOT_FOUND' }
        }
      }

      const roomId = uuidv4()
      
      const newRoom = new Room({
        roomId,
        roomName,
        roomType,
        password: roomType === RoomType.PRIVATE ? password : undefined,
        maxPlayers: 2,
        currentPlayers: 0,
        status: RoomStatus.WAITING,
        hostUserId,
        members: [],
        createdAt: new Date(),
        updatedAt: new Date()
      })

      await newRoom.save()

      // 缓存房间信息
      await redis.setJSON(`room:${roomId}`, newRoom.toJSON(), 60 * 60) // 1小时过期

      logger.info(`房间创建成功: ${roomName} (${roomId})`)

      return {
        success: true,
        message: '房间创建成功',
        data: newRoom.toJSON()
      }
    } catch (error) {
      logger.error('创建房间失败:', error)
      return {
        success: false,
        message: '创建房间失败',
        error: { code: 'CREATE_ROOM_FAILED' }
      }
    }
  }

  /**
   * 加入房间
   */
  public static async joinRoom(
    userId: string,
    data: JoinRoomRequest
  ): Promise<ApiResponse<RoomDetails>> {
    try {
      const { roomId, password } = data

      // 验证用户存在
      const user = await User.findOne({ userId, isActive: true })
      if (!user) {
        return {
          success: false,
          message: '用户不存在',
          error: { code: 'USER_NOT_FOUND' }
        }
      }

      // 查找房间
      const room = await Room.findOne({ roomId })
      if (!room) {
        return {
          success: false,
          message: '房间不存在',
          error: { code: 'ROOM_NOT_FOUND' }
        }
      }

      // 检查房间状态
      if (room.status !== RoomStatus.WAITING) {
        return {
          success: false,
          message: '房间不可加入',
          error: { code: 'ROOM_NOT_AVAILABLE' }
        }
      }

      // 检查房间是否已满
      if (room.isFull) {
        return {
          success: false,
          message: '房间已满',
          error: { code: 'ROOM_FULL' }
        }
      }

      // 检查密码（私人房间）
      if (room.roomType === RoomType.PRIVATE && room.password !== password) {
        return {
          success: false,
          message: '房间密码错误',
          error: { code: 'WRONG_PASSWORD' }
        }
      }

      // 添加成员
      const success = room.addMember(userId)
      if (!success) {
        return {
          success: false,
          message: '加入房间失败',
          error: { code: 'JOIN_ROOM_FAILED' }
        }
      }

      await room.save()

      // 获取房间详情
      const roomDetails = await this.getRoomDetails(roomId)

      // 更新缓存
      await redis.setJSON(`room:${roomId}`, roomDetails, 60 * 60)

      logger.info(`用户 ${userId} 加入房间 ${roomId}`)

      return {
        success: true,
        message: '加入房间成功',
        data: roomDetails!
      }
    } catch (error) {
      logger.error('加入房间失败:', error)
      return {
        success: false,
        message: '加入房间失败',
        error: { code: 'JOIN_ROOM_FAILED' }
      }
    }
  }

  /**
   * 离开房间
   */
  public static async leaveRoom(roomId: string, userId: string): Promise<ApiResponse> {
    try {
      const room = await Room.findOne({ roomId })
      if (!room) {
        return {
          success: false,
          message: '房间不存在',
          error: { code: 'ROOM_NOT_FOUND' }
        }
      }

      const success = room.removeMember(userId)
      if (!success) {
        return {
          success: false,
          message: '您不在该房间中',
          error: { code: 'NOT_IN_ROOM' }
        }
      }

      await room.save()

      // 清除缓存
      await redis.del(`room:${roomId}`)

      logger.info(`用户 ${userId} 离开房间 ${roomId}`)

      return {
        success: true,
        message: '离开房间成功'
      }
    } catch (error) {
      logger.error('离开房间失败:', error)
      return {
        success: false,
        message: '离开房间失败',
        error: { code: 'LEAVE_ROOM_FAILED' }
      }
    }
  }

  /**
   * 设置玩家准备状态
   */
  public static async setPlayerReady(
    roomId: string, 
    userId: string, 
    isReady: boolean
  ): Promise<ApiResponse> {
    try {
      const room = await Room.findOne({ roomId })
      if (!room) {
        return {
          success: false,
          message: '房间不存在',
          error: { code: 'ROOM_NOT_FOUND' }
        }
      }

      const success = room.setMemberReady(userId, isReady)
      if (!success) {
        return {
          success: false,
          message: '您不在该房间中',
          error: { code: 'NOT_IN_ROOM' }
        }
      }

      await room.save()

      // 检查是否可以开始游戏
      if (room.areAllMembersReady()) {
        room.startGame()
        await room.save()
      }

      // 更新缓存
      await redis.del(`room:${roomId}`)

      logger.info(`用户 ${userId} 在房间 ${roomId} 设置准备状态: ${isReady}`)

      return {
        success: true,
        message: '准备状态设置成功'
      }
    } catch (error) {
      logger.error('设置准备状态失败:', error)
      return {
        success: false,
        message: '设置准备状态失败'
      }
    }
  }

  /**
   * 获取房间列表
   */
  public static async getRoomList(
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<RoomListItem>>> {
    try {
      const rooms = await Room.findWaitingRooms(page, limit)
      const totalRooms = await Room.countDocuments({ status: RoomStatus.WAITING })

      // 获取房主信息
      const roomsWithHost = await Promise.all(
        rooms.map(async (room) => {
          const host = await User.findOne({ userId: room.hostUserId }, 'username')
          
          return {
            roomId: room.roomId,
            roomName: room.roomName,
            roomType: room.roomType,
            currentPlayers: room.currentPlayers,
            maxPlayers: room.maxPlayers,
            status: room.status,
            hostUsername: host?.username || 'Unknown',
            createdAt: room.createdAt,
            needPassword: room.needPassword || false
          } as RoomListItem
        })
      )

      const totalPages = Math.ceil(totalRooms / limit)

      return {
        success: true,
        message: '获取房间列表成功',
        data: {
          items: roomsWithHost,
          total: totalRooms,
          page,
          limit,
          totalPages
        }
      }
    } catch (error) {
      logger.error('获取房间列表失败:', error)
      return {
        success: false,
        message: '获取房间列表失败',
        error: { code: 'GET_ROOM_LIST_FAILED' }
      }
    }
  }

  /**
   * 获取房间详情
   */
  public static async getRoomDetails(roomId: string): Promise<RoomDetails | null> {
    try {
      // 先尝试从缓存获取
      const cached = await redis.getJSON<RoomDetails>(`room:${roomId}`)
      if (cached) {
        return cached
      }

      // 从数据库获取房间信息
      const room = await Room.findOne({ roomId })
      if (!room) {
        return null
      }

      // 获取成员信息
      const memberUsers = await Promise.all(
        room.members.map(async (member: IRoomMember) => {
          const user = await User.findOne({ userId: member.userId }, 'username displayName')
          return {
            userId: member.userId,
            username: user?.username || 'Unknown',
            displayName: user?.displayName,
            grid: Array(10).fill(null).map(() => Array(10).fill('empty')),
            airplane: {
              head: { x: -1, y: -1 },
              body: [],
              wings: [],
              tail: [],
              orientation: Orientation.HORIZONTAL,
              isPlaced: false
            },
            attackHistory: [],
            isReady: member.isReady,
            isConnected: false,
            joinedAt: member.joinedAt
          }
        })
      )

      const roomDetails: RoomDetails = {
        room_id: room.roomId,
        room_name: room.roomName,
        room_type: room.roomType === 'public' ? RoomType.PUBLIC : RoomType.PRIVATE,
        password: room.password,
        max_players: room.maxPlayers,
        current_players: room.currentPlayers,
        status: room.status === 'waiting' ? RoomStatus.WAITING : 
                room.status === 'playing' ? RoomStatus.PLAYING : RoomStatus.FINISHED,
        host_user_id: room.hostUserId,
        created_at: room.createdAt,
        updated_at: room.updatedAt,
        players: memberUsers
      }

      // 缓存房间详情
      await redis.setJSON(`room:${roomId}`, roomDetails, 60 * 60)

      return roomDetails
    } catch (error) {
      logger.error('获取房间详情失败:', error)
      return null
    }
  }

  /**
   * 获取用户所在的房间
   */
  public static async getUserRooms(userId: string): Promise<ApiResponse<any[]>> {
    try {
      const rooms = await Room.findUserRooms(userId)
      
      const roomsWithDetails = await Promise.all(
        rooms.map(async (room) => {
          const host = await User.findOne({ userId: room.hostUserId }, 'username')
          return {
            ...room.toJSON(),
            hostUsername: host?.username || 'Unknown'
          }
        })
      )

      return {
        success: true,
        message: '获取用户房间成功',
        data: roomsWithDetails
      }
    } catch (error) {
      logger.error('获取用户房间失败:', error)
      return {
        success: false,
        message: '获取用户房间失败'
      }
    }
  }

  /**
   * 删除房间（房主权限）
   */
  public static async deleteRoom(roomId: string, userId: string): Promise<ApiResponse> {
    try {
      const room = await Room.findOne({ roomId })
      if (!room) {
        return {
          success: false,
          message: '房间不存在',
          error: { code: 'ROOM_NOT_FOUND' }
        }
      }

      // 检查是否为房主
      if (room.hostUserId !== userId) {
        return {
          success: false,
          message: '只有房主可以删除房间',
          error: { code: 'NOT_HOST' }
        }
      }

      // 删除房间
      await Room.findByIdAndDelete(room._id)

      // 清除缓存
      await redis.del(`room:${roomId}`)

      logger.info(`房间删除成功: ${roomId}`)

      return {
        success: true,
        message: '房间删除成功'
      }
    } catch (error) {
      logger.error('删除房间失败:', error)
      return {
        success: false,
        message: '删除房间失败'
      }
    }
  }

  /**
   * 踢出玩家（房主权限）
   */
  public static async kickPlayer(
    roomId: string, 
    hostUserId: string, 
    targetUserId: string
  ): Promise<ApiResponse> {
    try {
      const room = await Room.findOne({ roomId })
      if (!room) {
        return {
          success: false,
          message: '房间不存在',
          error: { code: 'ROOM_NOT_FOUND' }
        }
      }

      // 检查是否为房主
      if (room.hostUserId !== hostUserId) {
        return {
          success: false,
          message: '只有房主可以踢出玩家',
          error: { code: 'NOT_HOST' }
        }
      }

      // 不能踢出自己
      if (hostUserId === targetUserId) {
        return {
          success: false,
          message: '不能踢出自己',
          error: { code: 'CANNOT_KICK_SELF' }
        }
      }

      const success = room.removeMember(targetUserId)
      if (!success) {
        return {
          success: false,
          message: '目标玩家不在房间中',
          error: { code: 'PLAYER_NOT_IN_ROOM' }
        }
      }

      await room.save()

      // 清除缓存
      await redis.del(`room:${roomId}`)

      logger.info(`玩家 ${targetUserId} 被踢出房间 ${roomId}`)

      return {
        success: true,
        message: '玩家踢出成功'
      }
    } catch (error) {
      logger.error('踢出玩家失败:', error)
      return {
        success: false,
        message: '踢出玩家失败'
      }
    }
  }
}