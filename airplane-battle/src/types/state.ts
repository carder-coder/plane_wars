import { 
  CellType, 
  AirplanePosition, 
  AttackRecord, 
  GamePhase, 
  GameMode 
} from './game'

/**
 * 玩家状态接口
 * 包含单个玩家的所有游戏状态信息
 */
export interface PlayerState {
  id: number                      // 玩家ID (1 或 2)
  name: string                    // 玩家名称
  grid: CellType[][]              // 10x10 网格状态
  airplane: AirplanePosition      // 飞机位置信息
  attackHistory: AttackRecord[]   // 攻击历史记录
  isAI: boolean                   // 是否为AI玩家
  isReady: boolean                // 是否已准备就绪（飞机放置完成）
}

/**
 * 游戏状态接口
 * 包含完整的游戏状态信息
 */
export interface GameState {
  currentPhase: GamePhase         // 当前游戏阶段
  currentPlayer: 1 | 2            // 当前轮到的玩家
  gameMode: GameMode              // 游戏模式
  players: {
    player1: PlayerState
    player2: PlayerState
  }
  winner: 1 | 2 | null           // 获胜者 (null表示游戏未结束)
  turnCount: number               // 回合数
  gameStartTime: number           // 游戏开始时间戳
  gameEndTime?: number            // 游戏结束时间戳
}

/**
 * 游戏配置接口
 */
export interface GameConfig {
  gridSize: number                // 网格大小 (默认10)
  aiDifficulty: 'easy' | 'medium' | 'hard'  // AI难度
  enableSound: boolean            // 是否启用音效
  enableAnimation: boolean        // 是否启用动画
}

/**
 * 游戏操作结果接口
 */
export interface GameActionResult {
  success: boolean                // 操作是否成功
  message: string                 // 结果消息
  data?: any                      // 附加数据
}

/**
 * 游戏事件接口
 */
export interface GameEvent {
  type: 'attack' | 'place' | 'gameStart' | 'gameEnd' | 'turnChange'
  payload: any
  timestamp: number
}