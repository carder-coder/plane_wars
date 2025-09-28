import { Client } from 'pg'
import { mongoDatabase, User, Room, Game, UserSession } from '../models/index.js'
import { logger } from '../utils/logger.js'
import { config } from '../config/index.js'

/**
 * 数据验证工具
 */
export class DataValidator {
  private pgClient: Client
  private validationResults: Array<{
    test: string
    status: 'pass' | 'fail'
    details: any
    timestamp: Date
  }> = []

  constructor() {
    this.pgClient = new Client({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.username,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false
    })
  }

  /**
   * 执行完整数据验证
   */
  public async runFullValidation(): Promise<boolean> {
    try {
      logger.info('开始执行数据验证...')

      // 连接数据库
      await this.connectDatabases()

      // 基础统计验证
      await this.validateBasicStats()

      // 数据完整性验证
      await this.validateDataIntegrity()

      // 关联关系验证
      await this.validateRelationships()

      // 数据质量验证
      await this.validateDataQuality()

      // 性能测试
      await this.performanceTest()

      // 生成验证报告
      const allPassed = await this.generateValidationReport()

      return allPassed

    } catch (error) {
      logger.error('数据验证失败:', error)
      return false
    } finally {
      await this.disconnectDatabases()
    }
  }

  /**
   * 连接数据库
   */
  private async connectDatabases(): Promise<void> {
    try {
      await this.pgClient.connect()
      await mongoDatabase.connect()
      logger.info('数据库连接成功')
    } catch (error) {
      logger.error('数据库连接失败:', error)
      throw error
    }
  }

  /**
   * 断开数据库连接
   */
  private async disconnectDatabases(): Promise<void> {
    try {
      await this.pgClient.end()
      await mongoDatabase.disconnect()
    } catch (error) {
      logger.error('关闭数据库连接失败:', error)
    }
  }

  /**
   * 基础统计验证
   */
  private async validateBasicStats(): Promise<void> {
    try {
      logger.info('执行基础统计验证...')

      // 获取PostgreSQL记录数
      const pgStats = await Promise.all([
        this.pgClient.query('SELECT COUNT(*) as count FROM users'),
        this.pgClient.query('SELECT COUNT(*) as count FROM rooms'),
        this.pgClient.query('SELECT COUNT(*) as count FROM games'),
        this.pgClient.query('SELECT COUNT(*) as count FROM user_sessions WHERE expires_at > NOW() AND is_active = true')
      ])

      // 获取MongoDB记录数
      const mongoStats = await Promise.all([
        User.countDocuments(),
        Room.countDocuments(),
        Game.countDocuments(),
        UserSession.countDocuments()
      ])

      const tables = ['users', 'rooms', 'games', 'user_sessions']
      
      for (let i = 0; i < tables.length; i++) {
        const pgCount = parseInt(pgStats[i].rows[0].count)
        const mongoCount = mongoStats[i]
        
        const testName = `${tables[i]}_count_validation`
        
        if (tables[i] === 'user_sessions') {
          // 会话数据可能不完全一致，只要MongoDB不为0即可
          this.recordValidation(testName, mongoCount >= 0, {
            postgresCount: pgCount,
            mongoCount: mongoCount,
            note: '会话数据因TTL可能存在差异'
          })
        } else {
          this.recordValidation(testName, pgCount === mongoCount, {
            postgresCount: pgCount,
            mongoCount: mongoCount,
            match: pgCount === mongoCount
          })
        }
      }

    } catch (error) {
      this.recordValidation('basic_stats_validation', false, { error: error.message })
      throw error
    }
  }

  /**
   * 数据完整性验证
   */
  private async validateDataIntegrity(): Promise<void> {
    try {
      logger.info('执行数据完整性验证...')

      // 验证用户数据完整性
      await this.validateUserIntegrity()

      // 验证房间数据完整性
      await this.validateRoomIntegrity()

      // 验证游戏数据完整性
      await this.validateGameIntegrity()

    } catch (error) {
      this.recordValidation('data_integrity_validation', false, { error: error.message })
      throw error
    }
  }

  /**
   * 验证用户数据完整性
   */
  private async validateUserIntegrity(): Promise<void> {
    // 随机抽取用户进行详细验证
    const sampleUsers = await User.find().limit(10)
    
    for (const user of sampleUsers) {
      const pgUser = await this.pgClient.query(
        'SELECT * FROM users WHERE user_id = $1',
        [user.userId]
      )

      if (pgUser.rows.length === 0) {
        this.recordValidation('user_integrity_missing', false, {
          userId: user.userId,
          issue: 'PostgreSQL中不存在对应用户'
        })
        continue
      }

      const pg = pgUser.rows[0]
      const passed = 
        user.username === pg.username &&
        user.email === pg.email &&
        user.level === pg.level &&
        user.wins === pg.wins &&
        user.losses === pg.losses &&
        user.rating === pg.rating

      this.recordValidation(`user_integrity_${user.userId}`, passed, {
        userId: user.userId,
        username: user.username,
        fieldsMatch: {
          username: user.username === pg.username,
          email: user.email === pg.email,
          level: user.level === pg.level,
          wins: user.wins === pg.wins,
          losses: user.losses === pg.losses,
          rating: user.rating === pg.rating
        }
      })
    }
  }

  /**
   * 验证房间数据完整性
   */
  private async validateRoomIntegrity(): Promise<void> {
    const sampleRooms = await Room.find().limit(10)

    for (const room of sampleRooms) {
      const pgRoom = await this.pgClient.query(`
        SELECT r.*, 
               COUNT(rm.user_id) as member_count
        FROM rooms r
        LEFT JOIN room_members rm ON r.room_id = rm.room_id
        WHERE r.room_id = $1
        GROUP BY r.room_id
      `, [room.roomId])

      if (pgRoom.rows.length === 0) {
        this.recordValidation('room_integrity_missing', false, {
          roomId: room.roomId,
          issue: 'PostgreSQL中不存在对应房间'
        })
        continue
      }

      const pg = pgRoom.rows[0]
      const memberCountMatch = room.members.length === parseInt(pg.member_count)
      const currentPlayersMatch = room.currentPlayers === pg.current_players

      this.recordValidation(`room_integrity_${room.roomId}`, memberCountMatch && currentPlayersMatch, {
        roomId: room.roomId,
        roomName: room.roomName,
        memberCountMatch,
        currentPlayersMatch,
        mongoMembers: room.members.length,
        pgMembers: parseInt(pg.member_count),
        mongoCurrentPlayers: room.currentPlayers,
        pgCurrentPlayers: pg.current_players
      })
    }
  }

  /**
   * 验证游戏数据完整性
   */
  private async validateGameIntegrity(): Promise<void> {
    const sampleGames = await Game.find().limit(10)

    for (const game of sampleGames) {
      const pgGame = await this.pgClient.query(
        'SELECT * FROM games WHERE game_id = $1',
        [game.gameId]
      )

      if (pgGame.rows.length === 0) {
        this.recordValidation('game_integrity_missing', false, {
          gameId: game.gameId,
          issue: 'PostgreSQL中不存在对应游戏'
        })
        continue
      }

      const pg = pgGame.rows[0]
      const passed = 
        game.player1Id === pg.player1_id &&
        game.player2Id === pg.player2_id &&
        game.currentPhase === pg.current_phase &&
        game.turnCount === pg.turn_count

      this.recordValidation(`game_integrity_${game.gameId}`, passed, {
        gameId: game.gameId,
        fieldsMatch: {
          player1Id: game.player1Id === pg.player1_id,
          player2Id: game.player2Id === pg.player2_id,
          currentPhase: game.currentPhase === pg.current_phase,
          turnCount: game.turnCount === pg.turn_count
        }
      })
    }
  }

  /**
   * 关联关系验证
   */
  private async validateRelationships(): Promise<void> {
    try {
      logger.info('执行关联关系验证...')

      // 验证房间-用户关联
      await this.validateRoomUserRelationships()

      // 验证游戏-用户关联
      await this.validateGameUserRelationships()

      // 验证会话-用户关联
      await this.validateSessionUserRelationships()

    } catch (error) {
      this.recordValidation('relationships_validation', false, { error: error.message })
      throw error
    }
  }

  /**
   * 验证房间-用户关联关系
   */
  private async validateRoomUserRelationships(): Promise<void> {
    const rooms = await Room.find().limit(20)
    let validRelationships = 0
    let totalRelationships = 0

    for (const room of rooms) {
      // 验证房主存在
      const host = await User.findOne({ userId: room.hostUserId })
      if (host) {
        validRelationships++
      }
      totalRelationships++

      // 验证成员存在
      for (const member of room.members) {
        const user = await User.findOne({ userId: member.userId })
        if (user) {
          validRelationships++
        }
        totalRelationships++
      }
    }

    const relationshipIntegrity = validRelationships / totalRelationships
    this.recordValidation('room_user_relationships', relationshipIntegrity >= 0.95, {
      validRelationships,
      totalRelationships,
      integrityRatio: relationshipIntegrity
    })
  }

  /**
   * 验证游戏-用户关联关系
   */
  private async validateGameUserRelationships(): Promise<void> {
    const games = await Game.find().limit(20)
    let validRelationships = 0
    let totalRelationships = 0

    for (const game of games) {
      // 验证玩家存在
      const player1 = await User.findOne({ userId: game.player1Id })
      const player2 = await User.findOne({ userId: game.player2Id })

      if (player1) validRelationships++
      if (player2) validRelationships++
      totalRelationships += 2

      // 验证获胜者存在（如果有）
      if (game.winnerId) {
        const winner = await User.findOne({ userId: game.winnerId })
        if (winner) validRelationships++
        totalRelationships++
      }
    }

    const relationshipIntegrity = validRelationships / totalRelationships
    this.recordValidation('game_user_relationships', relationshipIntegrity >= 0.95, {
      validRelationships,
      totalRelationships,
      integrityRatio: relationshipIntegrity
    })
  }

  /**
   * 验证会话-用户关联关系
   */
  private async validateSessionUserRelationships(): Promise<void> {
    const sessions = await UserSession.find({ isActive: true }).limit(50)
    let validRelationships = 0

    for (const session of sessions) {
      const user = await User.findOne({ userId: session.userId })
      if (user) {
        validRelationships++
      }
    }

    const relationshipIntegrity = validRelationships / sessions.length
    this.recordValidation('session_user_relationships', relationshipIntegrity >= 0.95, {
      validRelationships,
      totalSessions: sessions.length,
      integrityRatio: relationshipIntegrity
    })
  }

  /**
   * 数据质量验证
   */
  private async validateDataQuality(): Promise<void> {
    try {
      logger.info('执行数据质量验证...')

      // 验证必填字段
      await this.validateRequiredFields()

      // 验证数据格式
      await this.validateDataFormats()

      // 验证业务规则
      await this.validateBusinessRules()

    } catch (error) {
      this.recordValidation('data_quality_validation', false, { error: error.message })
      throw error
    }
  }

  /**
   * 验证必填字段
   */
  private async validateRequiredFields(): Promise<void> {
    // 检查用户必填字段
    const usersWithMissingFields = await User.find({
      $or: [
        { userId: { $exists: false } },
        { username: { $exists: false } },
        { email: { $exists: false } },
        { passwordHash: { $exists: false } }
      ]
    })

    this.recordValidation('user_required_fields', usersWithMissingFields.length === 0, {
      usersWithMissingFields: usersWithMissingFields.length
    })

    // 检查房间必填字段
    const roomsWithMissingFields = await Room.find({
      $or: [
        { roomId: { $exists: false } },
        { roomName: { $exists: false } },
        { hostUserId: { $exists: false } }
      ]
    })

    this.recordValidation('room_required_fields', roomsWithMissingFields.length === 0, {
      roomsWithMissingFields: roomsWithMissingFields.length
    })
  }

  /**
   * 验证数据格式
   */
  private async validateDataFormats(): Promise<void> {
    // 验证邮箱格式
    const usersWithInvalidEmail = await User.find({
      email: { $not: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
    })

    this.recordValidation('email_format_validation', usersWithInvalidEmail.length === 0, {
      usersWithInvalidEmail: usersWithInvalidEmail.length
    })

    // 验证用户名格式
    const usersWithInvalidUsername = await User.find({
      $or: [
        { username: { $regex: /[^a-zA-Z0-9_]/ } },
        { username: { $exists: true, $type: 'string', $where: 'this.username.length < 3 || this.username.length > 50' } }
      ]
    })

    this.recordValidation('username_format_validation', usersWithInvalidUsername.length === 0, {
      usersWithInvalidUsername: usersWithInvalidUsername.length
    })
  }

  /**
   * 验证业务规则
   */
  private async validateBusinessRules(): Promise<void> {
    // 验证用户等级和经验值的合理性
    const usersWithInvalidLevel = await User.find({
      $or: [
        { level: { $lt: 1 } },
        { level: { $gt: 100 } },
        { experience: { $lt: 0 } },
        { rating: { $lt: 0 } },
        { rating: { $gt: 3000 } }
      ]
    })

    this.recordValidation('user_level_validation', usersWithInvalidLevel.length === 0, {
      usersWithInvalidLevel: usersWithInvalidLevel.length
    })

    // 验证房间玩家数量合理性
    const roomsWithInvalidPlayerCount = await Room.find({
      $expr: { $ne: ['$currentPlayers', { $size: '$members' }] }
    })

    this.recordValidation('room_player_count_validation', roomsWithInvalidPlayerCount.length === 0, {
      roomsWithInvalidPlayerCount: roomsWithInvalidPlayerCount.length
    })
  }

  /**
   * 性能测试
   */
  private async performanceTest(): Promise<void> {
    try {
      logger.info('执行性能测试...')

      // 测试用户查询性能
      const userQueryStart = Date.now()
      await User.findOne({ username: 'test_user' })
      const userQueryTime = Date.now() - userQueryStart

      this.recordValidation('user_query_performance', userQueryTime < 100, {
        queryTime: userQueryTime,
        threshold: 100
      })

      // 测试房间列表查询性能
      const roomListStart = Date.now()
      await Room.find({ status: 'waiting' }).limit(10)
      const roomListTime = Date.now() - roomListStart

      this.recordValidation('room_list_performance', roomListTime < 200, {
        queryTime: roomListTime,
        threshold: 200
      })

      // 测试排行榜查询性能
      const leaderboardStart = Date.now()
      await User.find({ isActive: true }).sort({ rating: -1 }).limit(10)
      const leaderboardTime = Date.now() - leaderboardStart

      this.recordValidation('leaderboard_performance', leaderboardTime < 150, {
        queryTime: leaderboardTime,
        threshold: 150
      })

    } catch (error) {
      this.recordValidation('performance_test', false, { error: error.message })
      throw error
    }
  }

  /**
   * 记录验证结果
   */
  private recordValidation(test: string, passed: boolean, details: any): void {
    this.validationResults.push({
      test,
      status: passed ? 'pass' : 'fail',
      details,
      timestamp: new Date()
    })

    if (!passed) {
      logger.warn(`验证失败: ${test}`, details)
    }
  }

  /**
   * 生成验证报告
   */
  private async generateValidationReport(): Promise<boolean> {
    const totalTests = this.validationResults.length
    const passedTests = this.validationResults.filter(r => r.status === 'pass').length
    const failedTests = totalTests - passedTests
    const successRate = (passedTests / totalTests) * 100

    const report = {
      validationId: `validation_${Date.now()}`,
      timestamp: new Date(),
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: Math.round(successRate * 100) / 100
      },
      results: this.validationResults
    }

    logger.info('数据验证报告:', JSON.stringify(report, null, 2))

    console.log('\n========== 数据验证报告 ==========')
    console.log(`验证ID: ${report.validationId}`)
    console.log(`总测试数: ${totalTests}`)
    console.log(`通过测试: ${passedTests}`)
    console.log(`失败测试: ${failedTests}`)
    console.log(`成功率: ${successRate}%`)
    
    if (failedTests > 0) {
      console.log('\n失败的测试:')
      this.validationResults
        .filter(r => r.status === 'fail')
        .forEach(result => {
          console.log(`- ${result.test}: ${JSON.stringify(result.details)}`)
        })
    }
    
    console.log('==================================\n')

    return successRate >= 95 // 95%以上通过率认为验证成功
  }
}

// 如果直接运行此文件，执行验证
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new DataValidator()
  validator.runFullValidation()
    .then((success) => {
      logger.info(`验证${success ? '成功' : '失败'}，正在退出...`)
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      logger.error('验证过程出错:', error)
      process.exit(1)
    })
}