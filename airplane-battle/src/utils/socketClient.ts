import { io, Socket } from 'socket.io-client'
import { MessageType, SocketMessage, ConnectionStatus, SocketError, SocketAuthStatus } from '../types/network'
import { logger } from './logger'

/**
 * WebSocket客户端管理器
 */
export class SocketClient {
  private socket: Socket | null = null
  private isConnecting = false
  private messageHandlers = new Map<MessageType, Set<Function>>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private authErrorHandler: ((error: SocketError) => void) | null = null
  private authStatus: SocketAuthStatus = SocketAuthStatus.DISCONNECTED

  /**
   * 连接到服务器
   */
  public async connect(serverUrl: string, token: string): Promise<boolean> {
    try {
      if (this.socket?.connected) {
        logger.warn('Socket已连接，无需重复连接')
        return true
      }

      if (this.isConnecting) {
        logger.warn('Socket正在连接中...')
        return false
      }

      this.isConnecting = true
      this.authStatus = SocketAuthStatus.CONNECTING
      logger.info(`正在连接到服务器: ${serverUrl}`)

      this.socket = io(serverUrl, {
        auth: {
          token
        },
        transports: ['websocket'],
        timeout: 10000,
        forceNew: true
      })

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.isConnecting = false
          this.authStatus = SocketAuthStatus.AUTH_FAILED
          this.handleAuthError({
            code: 'CONNECTION_ERROR',
            message: '连接超时'
          })
          reject(new Error('连接超时'))
        }, 10000)

        this.socket!.on('connect', () => {
          clearTimeout(timeout)
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.authStatus = SocketAuthStatus.AUTHENTICATING
          logger.info('Socket连接成功')
          
          // 发送认证消息
          this.socket!.emit('authenticate', { token })
        })

        this.socket!.on('authenticated', (data) => {
          this.authStatus = SocketAuthStatus.AUTHENTICATED
          logger.info('Socket认证成功:', data)
          resolve(true)
        })

        this.socket!.on('auth_failed', (error) => {
          clearTimeout(timeout)
          this.isConnecting = false
          this.authStatus = SocketAuthStatus.AUTH_FAILED
          
          const authError: SocketError = {
            code: 'AUTH_FAILED',
            message: error.message || '认证失败',
            details: error
          }
          
          logger.error('Socket认证失败:', authError)
          this.handleAuthError(authError)
          reject(authError)
        })

        this.socket!.on('connect_error', (error) => {
          clearTimeout(timeout)
          this.isConnecting = false
          this.authStatus = SocketAuthStatus.AUTH_FAILED
          
          const connectionError: SocketError = {
            code: 'CONNECTION_ERROR',
            message: '连接失败',
            details: error
          }
          
          logger.error('Socket连接错误:', connectionError)
          this.handleAuthError(connectionError)
          reject(connectionError)
        })

        this.socket!.on('disconnect', (reason) => {
          this.authStatus = SocketAuthStatus.DISCONNECTED
          logger.warn('Socket断开连接:', reason)
          this.handleDisconnect(reason)
        })

        this.socket!.on('error', (error) => {
          logger.error('Socket错误:', error)
          
          // 如果是认证相关错误，特殊处理
          if (error.code && ['AUTH_FAILED', 'TOKEN_EXPIRED', 'MISSING_TOKEN'].includes(error.code)) {
            this.authStatus = SocketAuthStatus.AUTH_FAILED
            this.handleAuthError(error as SocketError)
          }
        })

        // 设置消息监听器
        this.setupMessageListeners()
      })
    } catch (error) {
      this.isConnecting = false
      this.authStatus = SocketAuthStatus.AUTH_FAILED
      logger.error('Socket连接失败:', error)
      throw error
    }
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
      this.authStatus = SocketAuthStatus.DISCONNECTED
      this.messageHandlers.clear()
      this.authErrorHandler = null
      this.isConnecting = false
      this.reconnectAttempts = 0
      logger.info('Socket已断开连接并清理所有状态')
    }
  }

  /**
   * 发送消息
   */
  public sendMessage(type: MessageType, payload?: any): void {
    if (!this.socket?.connected) {
      logger.error('Socket未连接，无法发送消息')
      return
    }

    const message: SocketMessage = {
      type,
      payload,
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    }

    this.socket.emit(type, message)
    logger.debug(`发送消息: ${type}`, payload)
  }

  /**
   * 添加消息监听器
   */
  public onMessage(type: MessageType, handler: Function): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set())
    }
    this.messageHandlers.get(type)!.add(handler)
  }

  /**
   * 移除消息监听器
   */
  public offMessage(type: MessageType, handler: Function): void {
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * 加入房间
   */
  public joinRoom(roomId: string, password?: string): void {
    this.sendMessage(MessageType.JOIN_ROOM, { roomId, password })
  }

  /**
   * 离开房间
   */
  public leaveRoom(): void {
    this.sendMessage(MessageType.LEAVE_ROOM)
  }

  /**
   * 放置飞机
   */
  public placeAirplane(headX: number, headY: number, orientation: 'horizontal' | 'vertical'): void {
    this.sendMessage(MessageType.PLACE_AIRPLANE, { headX, headY, orientation })
  }

  /**
   * 发起攻击
   */
  public attack(x: number, y: number): void {
    this.sendMessage(MessageType.ATTACK, { coordinate: { x, y } })
  }

  /**
   * 切换玩家准备状态
   */
  public toggleReady(isReady: boolean): void {
    this.sendMessage(MessageType.PLAYER_READY, { isReady })
  }

  /**
   * 发送聊天消息
   */
  public sendChatMessage(message: string): void {
    this.sendMessage(MessageType.CHAT_MESSAGE, { message, timestamp: new Date() })
  }

  /**
   * 获取连接状态
   */
  public getConnectionStatus(): ConnectionStatus {
    if (!this.socket) return ConnectionStatus.DISCONNECTED
    if (this.socket.connected) return ConnectionStatus.CONNECTED
    if (this.isConnecting) return ConnectionStatus.CONNECTING
    return ConnectionStatus.DISCONNECTED
  }

  /**
   * 获取认证状态
   */
  public getAuthStatus(): SocketAuthStatus {
    return this.authStatus
  }

  /**
   * 设置认证错误处理器
   */
  public setAuthErrorHandler(handler: (error: SocketError) => void): void {
    this.authErrorHandler = handler
  }

  /**
   * 处理认证错误
   */
  private handleAuthError(error: SocketError): void {
    if (this.authErrorHandler) {
      this.authErrorHandler(error)
    } else {
      logger.error('未设置认证错误处理器:', error)
    }
  }

  /**
   * 检查是否已连接
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  /**
   * 设置消息监听器
   */
  private setupMessageListeners(): void {
    if (!this.socket) return

    // 监听所有消息类型
    Object.values(MessageType).forEach(messageType => {
      this.socket!.on(messageType, (message: SocketMessage) => {
        logger.debug(`收到消息: ${messageType}`, message.payload)
        this.handleMessage(messageType, message)
      })
    })
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(type: MessageType, message: SocketMessage): void {
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.payload)
        } catch (error) {
          logger.error(`消息处理器错误 ${type}:`, error)
        }
      })
    }
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(reason: string): void {
    if (reason === 'io server disconnect') {
      // 服务器主动断开，不尝试重连
      logger.info('服务器主动断开连接')
      return
    }

    // 尝试重连
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      
      logger.info(`${delay}ms后尝试第${this.reconnectAttempts}次重连...`)
      
      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect()
        }
      }, delay)
    } else {
      logger.error('达到最大重连次数，停止重连')
    }
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// 导出单例实例
export const socketClient = new SocketClient()