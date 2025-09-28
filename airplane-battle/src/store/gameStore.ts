import { create } from 'zustand'
import { 
  GameState, 
  PlayerState, 
  GamePhase, 
  GameMode, 
  CellType,
  Coordinate,
  Orientation,
  GameActionResult
} from '../types'
import { 
  createDefaultAirplane, 
  generateAirplanePosition, 
  validateAirplanePlacement,
  getAllAirplaneCoordinates
} from '../utils/airplaneUtils'
import { processAttack, checkGameEnd } from '../utils/gameLogic'

/**
 * 创建默认玩家状态
 */
function createDefaultPlayer(id: 1 | 2, isAI: boolean = false): PlayerState {
  return {
    id,
    name: isAI ? `AI玩家${id}` : `玩家${id}`,
    grid: Array(10).fill(null).map(() => Array(10).fill(CellType.EMPTY)),
    airplane: createDefaultAirplane(),
    attackHistory: [],
    isAI,
    isReady: false
  }
}

/**
 * 创建初始游戏状态
 */
function createInitialGameState(): GameState {
  return {
    currentPhase: GamePhase.PLACEMENT,
    currentPlayer: 1,
    gameMode: GameMode.PVP,
    players: {
      player1: createDefaultPlayer(1),
      player2: createDefaultPlayer(2)
    },
    winner: null,
    turnCount: 0,
    gameStartTime: Date.now()
  }
}

/**
 * 游戏状态管理接口
 */
interface GameStore extends GameState {
  // 游戏控制方法
  startNewGame: (mode: GameMode) => void
  resetGame: () => void
  
  // 飞机放置相关
  placeAirplane: (playerId: 1 | 2, headX: number, headY: number, orientation: Orientation) => GameActionResult
  removeAirplane: (playerId: 1 | 2) => void
  confirmPlacement: (playerId: 1 | 2) => GameActionResult
  
  // 攻击相关
  attack: (coordinate: Coordinate) => GameActionResult
  
  // 游戏流程控制
  switchToNextPlayer: () => void
  switchToBattlePhase: () => void
  endGame: (winner: 1 | 2) => void
  
  // 辅助方法
  getCurrentPlayerState: () => PlayerState
  getOpponentPlayerState: () => PlayerState
  canPlaceAirplane: (playerId: 1 | 2, headX: number, headY: number, orientation: Orientation) => boolean
}

/**
 * 游戏状态管理Store
 */
export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialGameState(),

  // 开始新游戏
  startNewGame: (mode: GameMode) => {
    const newState = createInitialGameState()
    newState.gameMode = mode
    
    // 如果是人机模式，设置玩家2为AI
    if (mode === GameMode.PVE) {
      newState.players.player2 = createDefaultPlayer(2, true)
    }
    
    set(newState)
  },

  // 重置游戏
  resetGame: () => {
    set(createInitialGameState())
  },

  // 放置飞机
  placeAirplane: (playerId: 1 | 2, headX: number, headY: number, orientation: Orientation) => {
    const state = get()
    const player = state.players[`player${playerId}` as keyof typeof state.players]
    
    // 生成飞机位置
    const airplanePosition = generateAirplanePosition(headX, headY, orientation)
    if (!airplanePosition) {
      return {
        success: false,
        message: '飞机放置位置无效，超出边界'
      }
    }

    // 验证放置是否有效
    if (!validateAirplanePlacement(player.grid, airplanePosition)) {
      return {
        success: false,
        message: '飞机放置位置无效'
      }
    }

    // 清除之前的飞机位置
    if (player.airplane.isPlaced) {
      const oldCoords = getAllAirplaneCoordinates(player.airplane)
      oldCoords.forEach(coord => {
        if (coord.x >= 0 && coord.y >= 0) {
          player.grid[coord.y][coord.x] = CellType.EMPTY
        }
      })
    }

    // 在网格上放置新飞机
    player.grid[airplanePosition.head.y][airplanePosition.head.x] = CellType.HEAD
    airplanePosition.wings.forEach(coord => {
      player.grid[coord.y][coord.x] = CellType.WINGS
    })
    airplanePosition.body.forEach(coord => {
      player.grid[coord.y][coord.x] = CellType.BODY
    })
    airplanePosition.tail.forEach(coord => {
      player.grid[coord.y][coord.x] = CellType.TAIL
    })

    // 更新飞机位置
    airplanePosition.isPlaced = true
    player.airplane = airplanePosition

    set({ ...state })

    return {
      success: true,
      message: '飞机放置成功'
    }
  },

  // 移除飞机
  removeAirplane: (playerId: 1 | 2) => {
    const state = get()
    const player = state.players[`player${playerId}` as keyof typeof state.players]
    
    if (player.airplane.isPlaced) {
      const coords = getAllAirplaneCoordinates(player.airplane)
      coords.forEach(coord => {
        if (coord.x >= 0 && coord.y >= 0) {
          player.grid[coord.y][coord.x] = CellType.EMPTY
        }
      })
      
      player.airplane = createDefaultAirplane()
      player.isReady = false
    }

    set({ ...state })
  },

  // 确认飞机放置
  confirmPlacement: (playerId: 1 | 2) => {
    const state = get()
    const player = state.players[`player${playerId}` as keyof typeof state.players]
    
    if (!player.airplane.isPlaced) {
      return {
        success: false,
        message: '请先放置飞机'
      }
    }

    player.isReady = true

    // 检查是否所有玩家都准备就绪
    if (state.players.player1.isReady && state.players.player2.isReady) {
      state.currentPhase = GamePhase.BATTLE
      state.currentPlayer = 1
    }

    set({ ...state })

    return {
      success: true,
      message: '飞机放置确认成功'
    }
  },

  // 攻击
  attack: (coordinate: Coordinate) => {
    const state = get()
    
    if (state.currentPhase !== GamePhase.BATTLE) {
      return {
        success: false,
        message: '当前不在战斗阶段'
      }
    }

    const currentPlayer = state.players[`player${state.currentPlayer}` as keyof typeof state.players]
    const targetPlayer = state.players[`player${state.currentPlayer === 1 ? 2 : 1}` as keyof typeof state.players]

    // 处理攻击
    const attackResult = processAttack(targetPlayer, coordinate)
    
    if (!attackResult.success) {
      return attackResult
    }

    // 更新回合数
    state.turnCount++

    // 检查游戏是否结束
    if (attackResult.gameEnded) {
      state.currentPhase = GamePhase.FINISHED
      state.winner = state.currentPlayer
      state.gameEndTime = Date.now()
    } else {
      // 切换到下一个玩家
      state.currentPlayer = state.currentPlayer === 1 ? 2 : 1
    }

    set({ ...state })

    return attackResult
  },

  // 切换到下一个玩家
  switchToNextPlayer: () => {
    const state = get()
    state.currentPlayer = state.currentPlayer === 1 ? 2 : 1
    set({ ...state })
  },

  // 切换到战斗阶段
  switchToBattlePhase: () => {
    const state = get()
    state.currentPhase = GamePhase.BATTLE
    state.currentPlayer = 1
    set({ ...state })
  },

  // 结束游戏
  endGame: (winner: 1 | 2) => {
    const state = get()
    state.currentPhase = GamePhase.FINISHED
    state.winner = winner
    state.gameEndTime = Date.now()
    set({ ...state })
  },

  // 获取当前玩家状态
  getCurrentPlayerState: () => {
    const state = get()
    return state.players[`player${state.currentPlayer}` as keyof typeof state.players]
  },

  // 获取对手玩家状态
  getOpponentPlayerState: () => {
    const state = get()
    const opponentId = state.currentPlayer === 1 ? 2 : 1
    return state.players[`player${opponentId}` as keyof typeof state.players]
  },

  // 检查是否可以放置飞机
  canPlaceAirplane: (playerId: 1 | 2, headX: number, headY: number, orientation: Orientation) => {
    const state = get()
    const player = state.players[`player${playerId}` as keyof typeof state.players]
    
    const airplanePosition = generateAirplanePosition(headX, headY, orientation)
    if (!airplanePosition) {
      return false
    }

    return validateAirplanePlacement(player.grid, airplanePosition)
  }
}))