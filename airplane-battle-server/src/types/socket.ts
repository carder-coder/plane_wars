/**
 * WebSocket消息类型枚举
 */
export enum MessageType {
  // 房间相关
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  ROOM_JOINED = 'ROOM_JOINED',
  ROOM_LEFT = 'ROOM_LEFT',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  ROOM_UPDATED = 'ROOM_UPDATED',
  ROOM_DISSOLVED = 'ROOM_DISSOLVED',
  PLAYER_KICKED = 'PLAYER_KICKED',
  HOST_TRANSFERRED = 'HOST_TRANSFERRED',
  PLAYER_READY = 'PLAYER_READY',
  
  // 游戏相关
  GAME_START = 'GAME_START',
  GAME_END = 'GAME_END',
  PLACE_AIRPLANE = 'PLACE_AIRPLANE',
  AIRPLANE_PLACED = 'AIRPLANE_PLACED',
  CONFIRM_PLACEMENT = 'CONFIRM_PLACEMENT',
  PLACEMENT_CONFIRMED = 'PLACEMENT_CONFIRMED',
  ATTACK = 'ATTACK',
  ATTACK_RESULT = 'ATTACK_RESULT',
  TURN_CHANGE = 'TURN_CHANGE',
  
  // 系统相关
  ERROR = 'ERROR',
  HEARTBEAT = 'HEARTBEAT',
  DISCONNECT = 'DISCONNECT',
  RECONNECT = 'RECONNECT'
}

/**
 * WebSocket消息基础结构
 */
export interface BaseMessage {
  type: MessageType
  payload?: any
  timestamp: number
  messageId: string
}

/**
 * 错误消息接口
 */
export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR
  payload: {
    code: string
    message: string
    details?: any
  }
}

/**
 * 加入房间消息
 */
export interface JoinRoomMessage extends BaseMessage {
  type: MessageType.JOIN_ROOM
  payload: {
    roomId: string
    password?: string
  }
}

/**
 * 房间已加入消息
 */
export interface RoomJoinedMessage extends BaseMessage {
  type: MessageType.ROOM_JOINED
  payload: {
    room: any
    players: any[]
    gameState?: any
  }
}

/**
 * 放置飞机消息
 */
export interface PlaceAirplaneMessage extends BaseMessage {
  type: MessageType.PLACE_AIRPLANE
  payload: {
    headX: number
    headY: number
    orientation: 'horizontal' | 'vertical'
  }
}

/**
 * 攻击消息
 */
export interface AttackMessage extends BaseMessage {
  type: MessageType.ATTACK
  payload: {
    coordinate: {
      x: number
      y: number
    }
  }
}

/**
 * 攻击结果消息
 */
export interface AttackResultMessage extends BaseMessage {
  type: MessageType.ATTACK_RESULT
  payload: {
    attacker: string
    coordinate: {
      x: number
      y: number
    }
    result: 'hit_head' | 'hit_body' | 'miss'
    gameEnded: boolean
    winner?: string
    gameState: any
  }
}

/**
 * 联合消息类型
 */
export type SocketMessage = 
  | BaseMessage
  | ErrorMessage
  | JoinRoomMessage
  | RoomJoinedMessage
  | PlaceAirplaneMessage
  | AttackMessage
  | AttackResultMessage