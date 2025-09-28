/**
 * 游戏相关类型定义 - 与前端保持一致
 */

/**
 * 游戏格子类型枚举
 */
export enum CellType {
  EMPTY = 'empty',
  HEAD = 'head',
  BODY = 'body',
  WINGS = 'wings',
  TAIL = 'tail',
  HIT = 'hit',
  MISS = 'miss'
}

/**
 * 坐标接口
 */
export interface Coordinate {
  x: number  // 0-9
  y: number  // 0-9
}

/**
 * 飞机朝向枚举
 */
export enum Orientation {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical'
}

/**
 * 飞机位置接口
 */
export interface AirplanePosition {
  head: Coordinate
  body: Coordinate[]
  wings: Coordinate[]
  tail: Coordinate[]
  orientation: Orientation
  isPlaced: boolean
}

/**
 * 攻击记录接口
 */
export interface AttackRecord {
  coordinate: Coordinate
  result: AttackResult
  timestamp: number
}

/**
 * 攻击结果类型
 */
export type AttackResult = 'hit_head' | 'hit_body' | 'miss'

/**
 * 游戏阶段枚举
 */
export enum GamePhase {
  WAITING = 'waiting',      // 等待玩家加入
  PLACEMENT = 'placement',  // 飞机放置阶段
  BATTLE = 'battle',        // 战斗阶段
  FINISHED = 'finished'     // 游戏结束
}

/**
 * 房间类型枚举
 */
export enum RoomType {
  PUBLIC = 'public',
  PRIVATE = 'private'
}

/**
 * 房间状态枚举
 */
export enum RoomStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished'
}

/**
 * 玩家状态接口（服务端版本）
 */
export interface PlayerState {
  userId: string
  username: string
  displayName?: string
  grid: CellType[][]
  airplane: AirplanePosition
  attackHistory: AttackRecord[]
  isReady: boolean
  isConnected: boolean
  joinedAt: Date
}

/**
 * 游戏状态接口（服务端版本）
 */
export interface GameState {
  gameId: string
  roomId: string
  currentPhase: GamePhase
  currentPlayer: number  // 1 or 2
  players: {
    player1?: PlayerState
    player2?: PlayerState
  }
  winner?: number  // 1 or 2
  turnCount: number
  gameStartTime: Date
  gameEndTime?: Date
  lastActivity: Date
}