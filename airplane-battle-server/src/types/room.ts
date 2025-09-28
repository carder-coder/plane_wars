import { GameState, PlayerState, RoomType, RoomStatus } from './game.js'

/**
 * 房间接口
 */
export interface Room {
  room_id: string
  room_name: string
  room_type: RoomType
  password?: string
  max_players: number
  current_players: number
  status: RoomStatus
  host_user_id: string
  created_at: Date
  updated_at: Date
}

/**
 * 房间详细信息接口（包含游戏状态）
 */
export interface RoomDetails extends Room {
  players: PlayerState[]
  gameState?: GameState
}

/**
 * 创建房间请求接口
 */
export interface CreateRoomRequest {
  roomName: string
  roomType: RoomType
  password?: string
}

/**
 * 加入房间请求接口
 */
export interface JoinRoomRequest {
  roomId: string
  password?: string
}

/**
 * 房间列表项接口
 */
export interface RoomListItem {
  roomId: string
  roomName: string
  roomType: RoomType
  currentPlayers: number
  maxPlayers: number
  status: RoomStatus
  hostUsername: string
  createdAt: Date
  needPassword: boolean
}

/**
 * 房间成员接口
 */
export interface RoomMember {
  userId: string
  username: string
  displayName?: string
  isHost: boolean
  isReady: boolean
  isConnected: boolean
  joinedAt: Date
}