import { Game, Room, User, IGame } from '../models/index.js'
import { logger } from '../utils/logger.js'
import { 
  GamePhase, 
  ApiResponse,
  AirplanePosition,
  Coordinate,
  PaginatedResponse
} from '../types/index.js'
import { MongoUserService } from './mongoUserService.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * 游戏服务类（MongoDB版本）
 */
export class MongoGameService {
  /**
   * 创建新游戏
   */
  public static async createGame(
    roomId: string,
    player1Id: string,
    player2Id: string
  ): Promise<ApiResponse<any>> {
    try {
      // 验证房间存在
      const room = await Room.findOne({ roomId })
      if (!room) {
        return {
          success: false,
          message: '房间不存在',
          error: { code: 'ROOM_NOT_FOUND' }
        }
      }

      // 验证玩家存在
      const [player1, player2] = await Promise.all([
        User.findOne({ userId: player1Id, isActive: true }),
        User.findOne({ userId: player2Id, isActive: true })
      ])

      if (!player1 || !player2) {
        return {
          success: false,
          message: '玩家不存在',
          error: { code: 'PLAYER_NOT_FOUND' }
        }
      }

      const gameId = uuidv4()
      
      const newGame = new Game({
        gameId,
        roomId,
        player1Id,
        player2Id,
        currentPhase: 'placement',
        turnCount: 0,
        attackHistory: [],
        startedAt: new Date()
      })

      await newGame.save()

      // 更新房间状态
      room.status = 'playing'
      await room.save()

      logger.info(`游戏创建成功: ${gameId}`)

      return {
        success: true,
        message: '游戏创建成功',
        data: newGame.toJSON()
      }
    } catch (error) {
      logger.error('创建游戏失败:', error)
      return {
        success: false,
        message: '创建游戏失败',
        error: { code: 'CREATE_GAME_FAILED' }
      }
    }
  }

  /**
   * 放置飞机
   */
  public static async placePlane(
    gameId: string,
    playerId: string,
    airplane: AirplanePosition
  ): Promise<ApiResponse<any>> {
    try {
      const game = await Game.findOne({ gameId })
      if (!game) {
        return {
          success: false,
          message: '游戏不存在',
          error: { code: 'GAME_NOT_FOUND' }
        }
      }

      // 验证玩家权限
      if (game.player1Id !== playerId && game.player2Id !== playerId) {
        return {
          success: false,
          message: '无权限操作此游戏',
          error: { code: 'NO_PERMISSION' }
        }
      }

      // 放置飞机
      const success = game.placePlane(playerId, airplane)
      if (!success) {
        return {
          success: false,
          message: '飞机放置失败',
          error: { code: 'PLACE_PLANE_FAILED' }
        }
      }

      await game.save()

      logger.info(`玩家 ${playerId} 在游戏 ${gameId} 中放置飞机`)

      return {
        success: true,
        message: '飞机放置成功',
        data: {
          gamePhase: game.currentPhase,
          currentPlayer: game.currentPlayer,
          bothPlayersReady: game.bothPlayersPlaced
        }
      }
    } catch (error) {
      logger.error('放置飞机失败:', error)
      return {
        success: false,
        message: '放置飞机失败',
        error: { code: 'PLACE_PLANE_FAILED' }
      }
    }
  }

  /**
   * 执行攻击
   */
  public static async attack(
    gameId: string,
    attackerId: string,
    coordinate: Coordinate
  ): Promise<ApiResponse<any>> {
    try {
      const game = await Game.findOne({ gameId })
      if (!game) {
        return {
          success: false,
          message: '游戏不存在',
          error: { code: 'GAME_NOT_FOUND' }
        }
      }

      // 执行攻击
      const result = game.attack(attackerId, coordinate)
      if (!result) {
        return {
          success: false,
          message: '攻击失败',
          error: { code: 'ATTACK_FAILED' }
        }
      }

      await game.save()

      // 如果游戏结束，更新玩家统计
      if (game.currentPhase === 'finished' && game.winnerId) {
        const winnerId = game.winnerId
        const loserId = winnerId === game.player1Id ? game.player2Id : game.player1Id
        
        // 更新胜者和败者的统计
        await Promise.all([
          MongoUserService.updateGameStats(winnerId, true, 15),
          MongoUserService.updateGameStats(loserId, false, 5)
        ])

        // 更新房间状态
        const room = await Room.findOne({ roomId: game.roomId })
        if (room) {
          room.status = 'finished'
          await room.save()
        }
      }

      logger.info(`玩家 ${attackerId} 攻击 (${coordinate.x},${coordinate.y}): ${result}`)

      return {
        success: true,
        message: '攻击成功',
        data: {
          result,
          coordinate,
          currentPlayer: game.currentPlayer,
          gamePhase: game.currentPhase,
          winnerId: game.winnerId,
          turnCount: game.turnCount
        }
      }
    } catch (error) {
      logger.error('攻击失败:', error)
      return {
        success: false,
        message: '攻击失败',
        error: { code: 'ATTACK_FAILED' }
      }
    }
  }

  /**
   * 获取游戏状态
   */
  public static async getGameState(gameId: string): Promise<ApiResponse<any>> {
    try {
      const game = await Game.findOne({ gameId })
      if (!game) {
        return {
          success: false,
          message: '游戏不存在',
          error: { code: 'GAME_NOT_FOUND' }
        }
      }

      // 获取玩家信息
      const [player1, player2] = await Promise.all([
        User.findOne({ userId: game.player1Id }, 'username displayName'),
        User.findOne({ userId: game.player2Id }, 'username displayName')
      ])

      const gameState = {
        gameId: game.gameId,
        roomId: game.roomId,
        currentPhase: game.currentPhase,
        currentPlayer: game.currentPlayer,
        turnCount: game.turnCount,
        winnerId: game.winnerId,
        startedAt: game.startedAt,
        finishedAt: game.finishedAt,
        gameDuration: game.gameDuration,
        players: {
          player1: {
            userId: game.player1Id,
            username: player1?.username,
            displayName: player1?.displayName,
            airplanePlaced: game.player1Airplane?.isPlaced || false
          },
          player2: {
            userId: game.player2Id,
            username: player2?.username,
            displayName: player2?.displayName,
            airplanePlaced: game.player2Airplane?.isPlaced || false
          }
        },
        attackHistory: game.attackHistory
      }

      return {
        success: true,
        message: '获取游戏状态成功',
        data: gameState
      }
    } catch (error) {
      logger.error('获取游戏状态失败:', error)
      return {
        success: false,
        message: '获取游戏状态失败'
      }
    }
  }

  /**
   * 获取玩家游戏历史
   */
  public static async getPlayerGameHistory(
    playerId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const games = await Game.findPlayerGames(playerId, page, limit)
      const totalGames = await Game.countDocuments({
        $or: [
          { player1Id: playerId },
          { player2Id: playerId }
        ]
      })

      // 获取对手信息
      const gamesWithOpponents = await Promise.all(
        games.map(async (game) => {
          const opponentId = game.player1Id === playerId ? game.player2Id : game.player1Id
          const opponent = await User.findOne({ userId: opponentId }, 'username displayName')
          
          return {
            gameId: game.gameId,
            opponentId,
            opponentUsername: opponent?.username,
            opponentDisplayName: opponent?.displayName,
            isWinner: game.winnerId === playerId,
            currentPhase: game.currentPhase,
            turnCount: game.turnCount,
            gameDuration: game.gameDuration,
            startedAt: game.startedAt,
            finishedAt: game.finishedAt
          }
        })
      )

      const totalPages = Math.ceil(totalGames / limit)

      return {
        success: true,
        message: '获取游戏历史成功',
        data: {
          items: gamesWithOpponents,
          total: totalGames,
          page,
          limit,
          totalPages
        }
      }
    } catch (error) {
      logger.error('获取游戏历史失败:', error)
      return {
        success: false,
        message: '获取游戏历史失败'
      }
    }
  }

  /**
   * 获取玩家统计信息
   */
  public static async getPlayerStats(playerId: string): Promise<ApiResponse<any>> {
    try {
      const stats = await Game.getPlayerStats(playerId)
      
      if (stats.length === 0) {
        return {
          success: true,
          message: '获取玩家统计成功',
          data: {
            totalGames: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            averageDuration: 0,
            averageTurns: 0
          }
        }
      }

      const stat = stats[0]
      const winRate = stat.totalGames > 0 ? (stat.wins / stat.totalGames) * 100 : 0

      return {
        success: true,
        message: '获取玩家统计成功',
        data: {
          totalGames: stat.totalGames,
          wins: stat.wins,
          losses: stat.totalGames - stat.wins,
          winRate: Math.round(winRate * 100) / 100,
          averageDuration: Math.round(stat.averageDuration || 0),
          averageTurns: Math.round(stat.averageTurns || 0)
        }
      }
    } catch (error) {
      logger.error('获取玩家统计失败:', error)
      return {
        success: false,
        message: '获取玩家统计失败'
      }
    }
  }

  /**
   * 获取活跃游戏列表
   */
  public static async getActiveGames(): Promise<ApiResponse<any[]>> {
    try {
      const games = await Game.findActiveGames()
      
      const gamesWithPlayers = await Promise.all(
        games.map(async (game) => {
          const [player1, player2] = await Promise.all([
            User.findOne({ userId: game.player1Id }, 'username displayName'),
            User.findOne({ userId: game.player2Id }, 'username displayName')
          ])

          return {
            gameId: game.gameId,
            roomId: game.roomId,
            currentPhase: game.currentPhase,
            currentPlayer: game.currentPlayer,
            turnCount: game.turnCount,
            startedAt: game.startedAt,
            players: {
              player1: {
                userId: game.player1Id,
                username: player1?.username,
                displayName: player1?.displayName
              },
              player2: {
                userId: game.player2Id,
                username: player2?.username,
                displayName: player2?.displayName
              }
            }
          }
        })
      )

      return {
        success: true,
        message: '获取活跃游戏列表成功',
        data: gamesWithPlayers
      }
    } catch (error) {
      logger.error('获取活跃游戏列表失败:', error)
      return {
        success: false,
        message: '获取活跃游戏列表失败'
      }
    }
  }

  /**
   * 强制结束游戏（管理员功能）
   */
  public static async forceEndGame(
    gameId: string,
    reason: string = '管理员强制结束'
  ): Promise<ApiResponse> {
    try {
      const game = await Game.findOne({ gameId })
      if (!game) {
        return {
          success: false,
          message: '游戏不存在',
          error: { code: 'GAME_NOT_FOUND' }
        }
      }

      if (game.currentPhase === 'finished') {
        return {
          success: false,
          message: '游戏已结束',
          error: { code: 'GAME_ALREADY_FINISHED' }
        }
      }

      // 强制结束游戏
      game.currentPhase = 'finished'
      game.finishedAt = new Date()
      if (game.startedAt) {
        game.gameDuration = Math.floor((game.finishedAt.getTime() - game.startedAt.getTime()) / 1000)
      }

      await game.save()

      // 更新房间状态
      const room = await Room.findOne({ roomId: game.roomId })
      if (room) {
        room.status = 'finished'
        await room.save()
      }

      logger.info(`游戏 ${gameId} 被强制结束: ${reason}`)

      return {
        success: true,
        message: '游戏已强制结束'
      }
    } catch (error) {
      logger.error('强制结束游戏失败:', error)
      return {
        success: false,
        message: '强制结束游戏失败'
      }
    }
  }

  /**
   * 投降
   */
  public static async surrender(gameId: string, playerId: string): Promise<ApiResponse> {
    try {
      const game = await Game.findOne({ gameId })
      if (!game) {
        return {
          success: false,
          message: '游戏不存在',
          error: { code: 'GAME_NOT_FOUND' }
        }
      }

      // 验证玩家权限
      if (game.player1Id !== playerId && game.player2Id !== playerId) {
        return {
          success: false,
          message: '无权限操作此游戏',
          error: { code: 'NO_PERMISSION' }
        }
      }

      if (game.currentPhase === 'finished') {
        return {
          success: false,
          message: '游戏已结束',
          error: { code: 'GAME_ALREADY_FINISHED' }
        }
      }

      // 设置对方为获胜者
      const winnerId = game.player1Id === playerId ? game.player2Id : game.player1Id
      
      game.currentPhase = 'finished'
      game.winnerId = winnerId
      game.finishedAt = new Date()
      if (game.startedAt) {
        game.gameDuration = Math.floor((game.finishedAt.getTime() - game.startedAt.getTime()) / 1000)
      }

      await game.save()

      // 更新玩家统计
      await Promise.all([
        MongoUserService.updateGameStats(winnerId, true, 10),
        MongoUserService.updateGameStats(playerId, false, 0)
      ])

      // 更新房间状态
      const room = await Room.findOne({ roomId: game.roomId })
      if (room) {
        room.status = 'finished'
        await room.save()
      }

      logger.info(`玩家 ${playerId} 在游戏 ${gameId} 中投降`)

      return {
        success: true,
        message: '投降成功',
        data: {
          winnerId,
          gamePhase: 'finished'
        }
      }
    } catch (error) {
      logger.error('投降失败:', error)
      return {
        success: false,
        message: '投降失败'
      }
    }
  }

  /**
   * 清理过期游戏
   */
  public static async cleanupExpiredGames(): Promise<ApiResponse<number>> {
    try {
      const expiryTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24小时前
      
      // 查找过期的游戏
      const expiredGames = await Game.find({
        updatedAt: { $lt: expiryTime },
        $or: [
          { currentPhase: GamePhase.FINISHED },
          { currentPhase: GamePhase.WAITING },
          { currentPhase: GamePhase.PLACEMENT }
        ]
      })

      // 删除过期游戏
      const deletedCount = await Game.deleteMany({
        _id: { $in: expiredGames.map(g => g._id) }
      })

      logger.info(`清理了 ${deletedCount.deletedCount} 个过期游戏`)

      return {
        success: true,
        message: '过期游戏清理完成',
        data: deletedCount.deletedCount
      }
    } catch (error) {
      logger.error('清理过期游戏失败:', error)
      return {
        success: false,
        message: '清理过期游戏失败',
        error: { code: 'CLEANUP_GAMES_FAILED' }
      }
    }
  }

  /**
   * 批量更新游戏状态
   */
  public static async batchUpdateGameStatus(): Promise<ApiResponse<number>> {
    try {
      // 查找需要更新的游戏（超过一定时间未活动的进行中游戏）
      const inactiveThreshold = new Date(Date.now() - 30 * 60 * 1000) // 30分钟前
      
      const games = await Game.find({
        currentPhase: GamePhase.BATTLE,
        startedAt: { $lt: inactiveThreshold }
      })

      // 更新每个游戏的状态
      const updatedCount = await Promise.all(
        games.map(async (game: IGame) => {
          // 检查是否真的处于非活跃状态
          // 这里可以根据具体需求实现更复杂的逻辑
          game.currentPhase = GamePhase.FINISHED
          await game.save()
          return game._id
        })
      )

      logger.info(`批量更新了 ${updatedCount.length} 个游戏状态`)

      return {
        success: true,
        message: '游戏状态批量更新完成',
        data: updatedCount.length
      }
    } catch (error) {
      logger.error('批量更新游戏状态失败:', error)
      return {
        success: false,
        message: '批量更新游戏状态失败',
        error: { code: 'BATCH_UPDATE_GAMES_FAILED' }
      }
    }
  }

  /**
   * 获取游戏历史记录
   */
  public static async getGameHistory(
    playerId: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<ApiResponse<any>> {
    try {
      const games = await Game.findPlayerGames(playerId, page, limit)
      
      const history = games.map(game => ({
        gameId: game.gameId,
        roomId: game.roomId,
        phase: game.currentPhase,
        winnerId: game.winnerId,
        startedAt: game.startedAt,
        finishedAt: game.finishedAt
      }))
      
      return {
        success: true,
        message: '获取游戏历史记录成功',
        data: {
          items: history,
          page,
          limit,
          total: history.length
        }
      }
    } catch (error) {
      logger.error('获取游戏历史记录失败:', error)
      return {
        success: false,
        message: '获取游戏历史记录失败',
        error: { code: 'GET_GAME_HISTORY_FAILED' }
      }
    }
  }
}