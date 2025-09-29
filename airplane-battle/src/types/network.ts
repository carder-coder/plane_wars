/**
 * 网络相关类型定义
 */

/**
 * 认证状态枚举
 */
export enum AuthenticationStatus {
  CHECKING = 'checking',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  TOKEN_EXPIRED = 'token_expired',
  AUTH_FAILED = 'auth_failed'
}

/**
 * Socket认证状态枚举
 */
export enum SocketAuthStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  AUTHENTICATING = 'authenticating',
  AUTHENTICATED = 'authenticated',
  AUTH_FAILED = 'auth_failed'
}

/**
 * 用户认证状态
 */
export interface AuthState {
  isAuthenticated: boolean
  authenticationStatus: AuthenticationStatus
  user: UserProfile | null
  token: string | null
  refreshToken: string | null
  socketAuthStatus: SocketAuthStatus
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
  isInLobby: boolean
  lobbyPlayers: PlayerInfo[]
  roomFilters: RoomFilters
  error?: string
}

/**
 * 房间筛选器
 */
export interface RoomFilters {
  status?: 'waiting' | 'playing' | 'all'
  type?: 'public' | 'private' | 'all'
  searchText?: string
  sortBy?: 'createdAt' | 'playerCount'
  sortOrder?: 'asc' | 'desc'
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
  createdAt: Date
  needPassword: boolean
  isHost?: boolean
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
  hostDisplayName?: string
  hostLevel?: number
  hostRating?: number
  createdAt: Date
  needPassword: boolean
  memberDetails?: RoomMemberInfo[]
}

/**
 * 房间成员信息（用于房间列表）
 */
export interface RoomMemberInfo {
  userId: string
  username: string
  displayName?: string
  level: number
  rating: number
  avatarUrl?: string
  isReady: boolean
  isConnected: boolean
  isHost: boolean
  joinedAt: Date
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
  avatarUrl?: string
  level?: number
  rating?: number
  isHost?: boolean
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
 * Socket错误类型
 */
export interface SocketError {
  code: 'AUTH_FAILED' | 'TOKEN_EXPIRED' | 'MISSING_TOKEN' | 'CONNECTION_ERROR' | 'UNKNOWN_ERROR'
  message: string
  details?: any
}

/**
 * 用户友好的错误消息映射
 */
export const ERROR_MESSAGES = {
  AUTH_FAILED: '登录已过期，请重新登录',
  TOKEN_EXPIRED: '登录已过期，请重新登录',
  MISSING_TOKEN: '请先登录',
  CONNECTION_ERROR: '连接失败，请检查网络后重试',
  UNKNOWN_ERROR: '发生未知错误，请重试',
  LOGIN_FAILED: '登录失败，请检查用户名和密码',
  REGISTER_FAILED: '注册失败，请检查输入信息',
  NETWORK_ERROR: '网络错误，请检查网络连接'
} as const

/**
 * 错误通知类型
 */
export interface ErrorNotification {
  id?: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  showRetry?: boolean
  onRetry?: () => void
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
  PLAYER_READY = 'PLAYER_READY',
  ROOM_UPDATED = 'ROOM_UPDATED',
  ROOM_DISSOLVED = 'ROOM_DISSOLVED',
  PLAYER_KICKED = 'PLAYER_KICKED',
  HOST_TRANSFERRED = 'HOST_TRANSFERRED',
  
  // 游戏相关
  GAME_START = 'GAME_START',
  GAME_END = 'GAME_END',
  PLACE_AIRPLANE = 'PLACE_AIRPLANE',
  AIRPLANE_PLACED = 'AIRPLANE_PLACED',
  ATTACK = 'ATTACK',
  ATTACK_RESULT = 'ATTACK_RESULT',
  
  // 聊天相关
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  
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

/**
 * 房间创建请求数据
 */
export interface CreateRoomRequest {
  roomName: string
  roomType: 'public' | 'private'
  password?: string
  maxPlayers?: number
}

/**
 * 加入房间请求数据
 */
export interface JoinRoomRequest {
  roomId: string
  password?: string
}

/**
 * 聊天消息
 */
export interface ChatMessage {
  messageId: string
  userId: string
  username: string
  message: string
  timestamp: Date
  type: 'text' | 'system'
}

/**
 * 界面状态
 */
export type ViewState = 'login' | 'mainMenu' | 'roomList' | 'gameLobby' | 'game'