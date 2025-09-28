import { Server as SocketServer, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'
import { redis } from '../database/redis.js'
import { JWTPayload, MessageType, BaseMessage, ErrorMessage } from '../types/index.js'
import { RoomService } from './roomService.js'

/**
 * Socket连接信息接口
 */
interface SocketConnection {
  socketId: string
  userId: string
  username: string
  roomId?: string
  connectedAt: Date
}

/**
 * Socket.IO服务管理器
 */
export class SocketManager {
  private io: SocketServer
  private connections: Map<string, SocketConnection> = new Map()
  private userSockets: Map<string, Set<string>> = new Map() // userId -> socketIds

  constructor(io: SocketServer) {
    this.io = io
    this.setupSocketHandlers()
  }

  /**
   * 设置Socket事件处理器
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`新的Socket连接: ${socket.id}`)

      // 设置Socket中间件
      this.setupSocketMiddlewares(socket)

      // 认证处理
      socket.on('authenticate', (data) => this.handleAuthentication(socket, data))

      // 房间相关事件
      socket.on(MessageType.JOIN_ROOM, (data) => this.handleJoinRoom(socket, data))
      socket.on(MessageType.LEAVE_ROOM, (data) => this.handleLeaveRoom(socket, data))

      // 游戏相关事件
      socket.on(MessageType.PLACE_AIRPLANE, (data) => this.handlePlaceAirplane(socket, data))
      socket.on(MessageType.CONFIRM_PLACEMENT, (data) => this.handleConfirmPlacement(socket, data))
      socket.on(MessageType.ATTACK, (data) => this.handleAttack(socket, data))

      // 系统事件
      socket.on(MessageType.HEARTBEAT, (data) => this.handleHeartbeat(socket, data))
      socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason))
      socket.on('error', (error) => this.handleError(socket, error))
    })
  }

  /**
   * 设置Socket中间件
   */
  private setupSocketMiddlewares(socket: Socket): void {
    // 错误处理中间件
    socket.use((packet, next) => {
      try {
        // 验证消息格式
        const [eventName, data] = packet
        if (typeof eventName !== 'string') {
          throw new Error('事件名称必须是字符串')
        }

        next()
      } catch (error) {
        logger.error(`Socket中间件错误 ${socket.id}:`, error)
        this.sendError(socket, 'INVALID_MESSAGE', error.message)
        next(new Error('消息格式错误'))
      }
    })
  }

  /**
   * 处理认证
   */
  private async handleAuthentication(socket: Socket, data: any): Promise<void> {
    try {
      const { token } = data

      if (!token) {
        this.sendError(socket, 'MISSING_TOKEN', '缺少认证token')
        return
      }

      // 验证JWT token
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload

      // 检查token是否过期
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        this.sendError(socket, 'TOKEN_EXPIRED', 'Token已过期')
        return
      }

      // 保存连接信息
      const connection: SocketConnection = {
        socketId: socket.id,
        userId: decoded.userId,
        username: decoded.username,
        connectedAt: new Date()
      }

      this.connections.set(socket.id, connection)

      // 添加到用户Socket映射
      if (!this.userSockets.has(decoded.userId)) {
        this.userSockets.set(decoded.userId, new Set())
      }
      this.userSockets.get(decoded.userId)!.add(socket.id)

      // 缓存用户在线状态
      await redis.sAdd('online:users', decoded.userId)
      await redis.setJSON(`session:${decoded.userId}`, {
        userId: decoded.userId,
        username: decoded.username,
        socketId: socket.id,
        connectedAt: connection.connectedAt
      }, 24 * 60 * 60) // 24小时过期

      logger.info(`用户认证成功: ${decoded.username} (${socket.id})`)

      // 发送认证成功响应
      this.sendMessage(socket, 'authenticated', {
        success: true,
        user: {
          userId: decoded.userId,
          username: decoded.username
        }
      })
    } catch (error) {
      logger.error(`认证失败 ${socket.id}:`, error)
      this.sendError(socket, 'AUTH_FAILED', '认证失败')
    }
  }

  /**
   * 处理加入房间
   */
  private async handleJoinRoom(socket: Socket, data: any): Promise<void> {
    try {
      const connection = this.connections.get(socket.id)
      if (!connection) {
        this.sendError(socket, 'NOT_AUTHENTICATED', '未认证的连接')
        return
      }

      const { roomId, password } = data

      // 使用房间服务加入房间
      const joinResult = await RoomService.joinRoom(connection.userId, { roomId, password })
      
      if (!joinResult.success) {
        this.sendError(socket, 'JOIN_ROOM_FAILED', joinResult.message)
        return
      }

      // 加入Socket房间
      socket.join(roomId)
      connection.roomId = roomId

      // 通知房间内其他用户
      this.broadcastToRoom(roomId, MessageType.PLAYER_JOINED, {
        userId: connection.userId,
        username: connection.username
      }, socket.id)

      logger.info(`用户 ${connection.username} 加入房间 ${roomId}`)

      // 发送房间信息给新加入的用户
      this.sendMessage(socket, MessageType.ROOM_JOINED, {
        room: joinResult.data,
        message: '成功加入房间'
      })
    } catch (error) {
      logger.error(`加入房间失败 ${socket.id}:`, error)
      this.sendError(socket, 'JOIN_ROOM_FAILED', '加入房间失败')
    }
  }

  /**
   * 处理离开房间
   */
  private async handleLeaveRoom(socket: Socket, data: any): Promise<void> {
    try {
      const connection = this.connections.get(socket.id)
      if (!connection) {
        this.sendError(socket, 'NOT_AUTHENTICATED', '未认证的连接')
        return
      }

      // TODO: 实现房间离开逻辑
      logger.info(`用户 ${connection.username} 离开房间`)
      
      this.sendMessage(socket, MessageType.ROOM_LEFT, {
        message: '已离开房间'
      })
    } catch (error) {
      logger.error(`离开房间失败 ${socket.id}:`, error)
      this.sendError(socket, 'LEAVE_ROOM_FAILED', '离开房间失败')
    }
  }

  /**
   * 处理放置飞机
   */
  private async handlePlaceAirplane(socket: Socket, data: any): Promise<void> {
    try {
      const connection = this.connections.get(socket.id)
      if (!connection) {
        this.sendError(socket, 'NOT_AUTHENTICATED', '未认证的连接')
        return
      }

      const { headX, headY, orientation } = data

      // TODO: 实现飞机放置逻辑
      logger.info(`用户 ${connection.username} 放置飞机: (${headX}, ${headY}) ${orientation}`)

      this.sendMessage(socket, MessageType.AIRPLANE_PLACED, {
        success: true,
        message: '飞机放置成功'
      })
    } catch (error) {
      logger.error(`放置飞机失败 ${socket.id}:`, error)
      this.sendError(socket, 'PLACE_AIRPLANE_FAILED', '放置飞机失败')
    }
  }

  /**
   * 处理确认放置
   */
  private async handleConfirmPlacement(socket: Socket, data: any): Promise<void> {
    try {
      const connection = this.connections.get(socket.id)
      if (!connection) {
        this.sendError(socket, 'NOT_AUTHENTICATED', '未认证的连接')
        return
      }

      // TODO: 实现确认放置逻辑
      logger.info(`用户 ${connection.username} 确认飞机放置`)

      this.sendMessage(socket, MessageType.PLACEMENT_CONFIRMED, {
        success: true,
        message: '飞机放置已确认'
      })
    } catch (error) {
      logger.error(`确认放置失败 ${socket.id}:`, error)
      this.sendError(socket, 'CONFIRM_PLACEMENT_FAILED', '确认放置失败')
    }
  }

  /**
   * 处理攻击
   */
  private async handleAttack(socket: Socket, data: any): Promise<void> {
    try {
      const connection = this.connections.get(socket.id)
      if (!connection) {
        this.sendError(socket, 'NOT_AUTHENTICATED', '未认证的连接')
        return
      }

      const { coordinate } = data

      // TODO: 实现攻击逻辑
      logger.info(`用户 ${connection.username} 攻击坐标: (${coordinate.x}, ${coordinate.y})`)

      this.sendMessage(socket, MessageType.ATTACK_RESULT, {
        attacker: connection.username,
        coordinate,
        result: 'miss', // 临时结果
        gameEnded: false
      })
    } catch (error) {
      logger.error(`攻击失败 ${socket.id}:`, error)
      this.sendError(socket, 'ATTACK_FAILED', '攻击失败')
    }
  }

  /**
   * 处理心跳
   */
  private async handleHeartbeat(socket: Socket, data: any): Promise<void> {
    try {
      const connection = this.connections.get(socket.id)
      if (connection) {
        // 更新在线状态
        await redis.expire(`session:${connection.userId}`, 24 * 60 * 60)
        
        this.sendMessage(socket, MessageType.HEARTBEAT, {
          timestamp: Date.now()
        })
      }
    } catch (error) {
      logger.error(`心跳处理失败 ${socket.id}:`, error)
    }
  }

  /**
   * 处理断开连接
   */
  private async handleDisconnect(socket: Socket, reason: string): Promise<void> {
    try {
      const connection = this.connections.get(socket.id)
      
      if (connection) {
        logger.info(`用户 ${connection.username} 断开连接: ${reason}`)

        // 从用户Socket映射中移除
        const userSocketSet = this.userSockets.get(connection.userId)
        if (userSocketSet) {
          userSocketSet.delete(socket.id)
          if (userSocketSet.size === 0) {
            this.userSockets.delete(connection.userId)
            // 用户完全离线，从在线列表中移除
            await redis.sRem('online:users', connection.userId)
            await redis.del(`session:${connection.userId}`)
          }
        }

        // TODO: 处理房间相关清理
        if (connection.roomId) {
          // 通知房间内其他用户该用户已离开
          this.broadcastToRoom(connection.roomId, MessageType.PLAYER_LEFT, {
            userId: connection.userId,
            username: connection.username
          }, socket.id)
        }

        // 移除连接记录
        this.connections.delete(socket.id)
      }
    } catch (error) {
      logger.error(`处理断开连接失败 ${socket.id}:`, error)
    }
  }

  /**
   * 处理错误
   */
  private handleError(socket: Socket, error: Error): void {
    logger.error(`Socket错误 ${socket.id}:`, error)
    this.sendError(socket, 'SOCKET_ERROR', error.message)
  }

  /**
   * 发送消息到指定Socket
   */
  private sendMessage(socket: Socket, type: string, payload: any): void {
    const message: BaseMessage = {
      type: type as MessageType,
      payload,
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    }
    
    socket.emit(type, message)
  }

  /**
   * 发送错误消息
   */
  private sendError(socket: Socket, code: string, message: string): void {
    const errorMessage: ErrorMessage = {
      type: MessageType.ERROR,
      payload: {
        code,
        message
      },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    }
    
    socket.emit(MessageType.ERROR, errorMessage)
  }

  /**
   * 向房间广播消息
   */
  public broadcastToRoom(roomId: string, type: MessageType, payload: any, excludeSocketId?: string): void {
    const message: BaseMessage = {
      type,
      payload,
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    }

    const room = this.io.to(roomId)
    if (excludeSocketId) {
      room.except(excludeSocketId)
    }
    room.emit(type, message)

    logger.debug(`向房间 ${roomId} 广播消息: ${type}`)
  }

  /**
   * 向用户发送消息（所有该用户的Socket连接）
   */
  public sendToUser(userId: string, type: MessageType, payload: any): void {
    const userSocketSet = this.userSockets.get(userId)
    if (!userSocketSet) {
      logger.warn(`用户 ${userId} 不在线`)
      return
    }

    const message: BaseMessage = {
      type,
      payload,
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    }

    userSocketSet.forEach(socketId => {
      this.io.to(socketId).emit(type, message)
    })

    logger.debug(`向用户 ${userId} 发送消息: ${type}`)
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取在线用户数量
   */
  public getOnlineUserCount(): number {
    return this.userSockets.size
  }

  /**
   * 获取连接统计信息
   */
  public getStats(): object {
    return {
      totalConnections: this.connections.size,
      onlineUsers: this.userSockets.size,
      rooms: this.io.sockets.adapter.rooms.size
    }
  }
}