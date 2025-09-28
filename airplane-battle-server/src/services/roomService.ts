import { v4 as uuidv4 } from 'uuid'
import { database } from '../database/connection.js'
import { redis } from '../database/redis.js'
import { logger } from '../utils/logger.js'
import { 
  Room, 
  RoomDetails, 
  CreateRoomRequest, 
  JoinRoomRequest,
  RoomListItem,
  RoomType,
  RoomStatus,
  ApiResponse,
  PaginatedResponse 
} from '../types/index.js'

/**
 * 房间服务类
 */
export class RoomService {
  /**
   * 创建房间
   */
  public static async createRoom(
    hostUserId: string, 
    data: CreateRoomRequest
  ): Promise<ApiResponse<Room>> {
    try {
      const { roomName, roomType, password } = data
      const roomId = uuidv4()

      const query = `
        INSERT INTO rooms (
          room_id, room_name, room_type, password, host_user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
      `

      const result = await database.query(query, [
        roomId,
        roomName,
        roomType,
        roomType === RoomType.PRIVATE ? password : null,
        hostUserId
      ])

      const room = result.rows[0]

      // 缓存房间信息
      await redis.setJSON(`room:${roomId}`, room, 60 * 60) // 1小时过期

      logger.info(`房间创建成功: ${roomName} (${roomId})`)

      return {
        success: true,
        message: '房间创建成功',
        data: room
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

      // 查找房间
      const room = await this.findRoomById(roomId)
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
      if (room.current_players >= room.max_players) {
        return {
          success: false,
          message: '房间已满',
          error: { code: 'ROOM_FULL' }
        }
      }

      // 检查密码（私人房间）
      if (room.room_type === RoomType.PRIVATE && room.password !== password) {
        return {
          success: false,
          message: '房间密码错误',
          error: { code: 'WRONG_PASSWORD' }
        }
      }

      // 检查用户是否已在房间中
      const existingMember = await this.checkUserInRoom(roomId, userId)
      if (existingMember) {
        return {
          success: false,
          message: '您已在房间中',
          error: { code: 'ALREADY_IN_ROOM' }
        }
      }

      // 确定玩家编号
      const playerNumber = room.current_players + 1

      // 使用事务加入房间
      const roomDetails = await database.transaction(async (client) => {
        // 添加房间成员
        await client.query(`
          INSERT INTO room_members (room_id, user_id, player_number, joined_at)
          VALUES ($1, $2, $3, NOW())
        `, [roomId, userId, playerNumber])

        // 更新房间当前玩家数
        await client.query(`
          UPDATE rooms 
          SET current_players = current_players + 1, updated_at = NOW()
          WHERE room_id = $1
        `, [roomId])

        // 获取更新后的房间详情
        return await this.getRoomDetails(roomId)
      })

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
      const room = await this.findRoomById(roomId)
      if (!room) {
        return {
          success: false,
          message: '房间不存在',
          error: { code: 'ROOM_NOT_FOUND' }
        }
      }

      const isHost = room.host_user_id === userId

      await database.transaction(async (client) => {
        // 删除房间成员
        await client.query(`
          DELETE FROM room_members WHERE room_id = $1 AND user_id = $2
        `, [roomId, userId])

        // 更新房间当前玩家数
        await client.query(`
          UPDATE rooms 
          SET current_players = current_players - 1, updated_at = NOW()
          WHERE room_id = $1
        `, [roomId])

        // 如果是房主离开且房间内还有其他玩家，转移房主权限
        if (isHost && room.current_players > 1) {
          const newHostResult = await client.query(`
            SELECT user_id FROM room_members 
            WHERE room_id = $1 AND user_id != $2 
            ORDER BY joined_at ASC 
            LIMIT 1
          `, [roomId, userId])

          if (newHostResult.rows.length > 0) {
            const newHostId = newHostResult.rows[0].user_id
            await client.query(`
              UPDATE rooms SET host_user_id = $1 WHERE room_id = $2
            `, [newHostId, roomId])
          }
        }

        // 如果房间变空，标记为已结束
        if (room.current_players <= 1) {
          await client.query(`
            UPDATE rooms SET status = 'finished' WHERE room_id = $1
          `, [roomId])
        }
      })

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
   * 获取房间列表
   */
  public static async getRoomList(
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<RoomListItem>>> {
    try {
      const offset = (page - 1) * limit

      // 获取房间列表
      const roomsQuery = `
        SELECT 
          r.room_id,
          r.room_name,
          r.room_type,
          r.current_players,
          r.max_players,
          r.status,
          r.created_at,
          r.password IS NOT NULL as need_password,
          u.username as host_username
        FROM rooms r
        JOIN users u ON r.host_user_id = u.user_id
        WHERE r.status = 'waiting'
        ORDER BY r.created_at DESC
        LIMIT $1 OFFSET $2
      `

      const countQuery = `
        SELECT COUNT(*) FROM rooms WHERE status = 'waiting'
      `

      const [roomsResult, countResult] = await Promise.all([
        database.query(roomsQuery, [limit, offset]),
        database.query(countQuery)
      ])

      const rooms: RoomListItem[] = roomsResult.rows.map(row => ({
        roomId: row.room_id,
        roomName: row.room_name,
        roomType: row.room_type,
        currentPlayers: row.current_players,
        maxPlayers: row.max_players,
        status: row.status,
        hostUsername: row.host_username,
        createdAt: row.created_at,
        needPassword: row.need_password
      }))

      const total = parseInt(countResult.rows[0].count)
      const totalPages = Math.ceil(total / limit)

      return {
        success: true,
        message: '获取房间列表成功',
        data: {
          items: rooms,
          total,
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
      const roomQuery = `
        SELECT r.*, u.username as host_username
        FROM rooms r
        JOIN users u ON r.host_user_id = u.user_id
        WHERE r.room_id = $1
      `

      const membersQuery = `
        SELECT 
          rm.user_id,
          rm.player_number,
          rm.is_ready,
          rm.joined_at,
          u.username,
          u.display_name
        FROM room_members rm
        JOIN users u ON rm.user_id = u.user_id
        WHERE rm.room_id = $1
        ORDER BY rm.player_number
      `

      const [roomResult, membersResult] = await Promise.all([
        database.query(roomQuery, [roomId]),
        database.query(membersQuery, [roomId])
      ])

      if (roomResult.rows.length === 0) {
        return null
      }

      const room = roomResult.rows[0]
      const members = membersResult.rows

      const roomDetails: RoomDetails = {
        ...room,
        players: members.map(member => ({
          userId: member.user_id,
          username: member.username,
          displayName: member.display_name,
          grid: Array(10).fill(null).map(() => Array(10).fill('empty')),
          airplane: {
            head: { x: -1, y: -1 },
            body: [],
            wings: [],
            tail: [],
            orientation: 'horizontal',
            isPlaced: false
          },
          attackHistory: [],
          isReady: member.is_ready,
          isConnected: false,
          joinedAt: member.joined_at
        }))
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
   * 根据ID查找房间
   */
  private static async findRoomById(roomId: string): Promise<Room | null> {
    try {
      const result = await database.query('SELECT * FROM rooms WHERE room_id = $1', [roomId])
      return result.rows[0] || null
    } catch (error) {
      logger.error('查找房间失败:', error)
      return null
    }
  }

  /**
   * 检查用户是否在房间中
   */
  private static async checkUserInRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      const result = await database.query(
        'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
        [roomId, userId]
      )
      return result.rows.length > 0
    } catch (error) {
      logger.error('检查用户房间状态失败:', error)
      return false
    }
  }
}