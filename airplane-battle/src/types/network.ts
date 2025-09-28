/**
 * 网络相关类型定义
 */

/**
 * 用户认证状态
 */
export interface AuthState {
  isAuthenticated: boolean
  user: UserProfile | null
  token: string | null
  refreshToken: string | null
}

/**
 * 用户资料
 */
export interface UserProfile {
  userId: string
  username: string
  displayName?: string
  level: number
  experience: number
  wins: number
  losses: number
  rating: number
  avatarUrl?: string
}

/**
 * 网络连接状态
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * 网络状态
 */
export interface NetworkState {
  status: ConnectionStatus
  isOnline: boolean
  lastConnected?: Date
  error?: string
}

/**
 * 房间状态
 */
export interface RoomState {
  currentRoom: RoomInfo | null
  roomList: RoomListItem[]
  isJoining: boolean
  error?: string
}

/**
 * 房间信息
 */
export interface RoomInfo {
  roomId: string
  roomName: string
  roomType: 'public' | 'private'
  currentPlayers: number
  maxPlayers: number
  status: 'waiting' | 'playing' | 'finished'
  hostUserId: string
  players: PlayerInfo[]
}

/**
 * 房间列表项
 */
export interface RoomListItem {
  roomId: string
  roomName: string
  roomType: 'public' | 'private'
  currentPlayers: number
  maxPlayers: number
  status: 'waiting' | 'playing' | 'finished'
  hostUsername: string
  createdAt: Date
  needPassword: boolean
}

/**
 * 玩家信息
 */
export interface PlayerInfo {
  userId: string
  username: string
  displayName?: string
  isReady: boolean
  isConnected: boolean
}

/**
 * API响应基础接口
 */
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: {
    code: string
    details?: any
  }
}

/**
 * WebSocket消息类型
 */
export enum MessageType {
  // 房间相关
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  ROOM_JOINED = 'ROOM_JOINED',
  ROOM_LEFT = 'ROOM_LEFT',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  
  // 游戏相关
  GAME_START = 'GAME_START',
  GAME_END = 'GAME_END',
  PLACE_AIRPLANE = 'PLACE_AIRPLANE',
  AIRPLANE_PLACED = 'AIRPLANE_PLACED',
  ATTACK = 'ATTACK',
  ATTACK_RESULT = 'ATTACK_RESULT',
  
  // 系统相关
  ERROR = 'ERROR',
  HEARTBEAT = 'HEARTBEAT'
}

/**
 * WebSocket消息基础结构
 */
export interface SocketMessage {
  type: MessageType
  payload?: any
  timestamp: number
  messageId: string
}