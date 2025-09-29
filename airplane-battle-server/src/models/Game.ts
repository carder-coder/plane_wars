import { Schema, model, Document, Model } from 'mongoose'

/**
 * 坐标接口
 */
export interface ICoordinate {
  x: number
  y: number
}

/**
 * 飞机位置接口
 */
export interface IAirplanePosition {
  head: ICoordinate
  body: ICoordinate[]
  wings: ICoordinate[]
  tail: ICoordinate[]
  orientation: 'horizontal' | 'vertical'
  isPlaced: boolean
}

/**
 * 攻击记录接口
 */
export interface IAttackRecord {
  coordinate: ICoordinate
  result: 'hit_head' | 'hit_body' | 'miss'
  timestamp: Date
  attackerId: string
}

// 定义实例方法的接口
export interface IGameMethods {
  placePlane(playerId: string, airplane: IAirplanePosition): boolean
  attack(attackerId: string, coordinate: ICoordinate): string | null
  validateAirplanePosition(airplane: IAirplanePosition): boolean
  coordinateEquals(coord1: ICoordinate, coord2: ICoordinate): boolean
  coordinateInArray(coordinate: ICoordinate, coordinates: ICoordinate[]): boolean
}

// 定义静态方法的接口
export interface GameModel extends Model<IGame, {}, IGameMethods> {
  findPlayerGames(playerId: string, page: number, limit: number): Promise<(IGame & IGameMethods)[]>
  findActiveGames(): Promise<(IGame & IGameMethods)[]>
  getPlayerStats(playerId: string): Promise<any[]>
}

/**
 * 游戏接口（MongoDB版本）
 */
export interface IGame extends Document, IGameMethods {
  gameId: string
  roomId: string
  player1Id: string
  player2Id: string
  winnerId?: string
  currentPhase: 'waiting' | 'placement' | 'battle' | 'finished'
  currentPlayer?: number
  turnCount: number
  gameDuration?: number
  player1Airplane?: IAirplanePosition
  player2Airplane?: IAirplanePosition
  attackHistory: IAttackRecord[]
  startedAt: Date
  finishedAt?: Date
  
  // 虚拟字段
  isFinished: boolean
  isInProgress: boolean
  bothPlayersPlaced: boolean
}

/**
 * 坐标Schema
 */
const coordinateSchema = new Schema<ICoordinate>({
  x: {
    type: Number,
    required: true,
    min: 0,
    max: 9
  },
  y: {
    type: Number,
    required: true,
    min: 0,
    max: 9
  }
}, { _id: false })

/**
 * 飞机位置Schema
 */
const airplanePositionSchema = new Schema<IAirplanePosition>({
  head: {
    type: coordinateSchema,
    required: true
  },
  body: {
    type: [coordinateSchema],
    required: true,
    validate: {
      validator: function(body: ICoordinate[]) {
        return body.length === 2 // 飞机身体必须有2个格子
      },
      message: '飞机身体必须包含2个坐标'
    }
  },
  wings: {
    type: [coordinateSchema],
    required: true,
    validate: {
      validator: function(wings: ICoordinate[]) {
        return wings.length === 2 // 飞机翅膀必须有2个格子
      },
      message: '飞机翅膀必须包含2个坐标'
    }
  },
  tail: {
    type: [coordinateSchema],
    required: true,
    validate: {
      validator: function(tail: ICoordinate[]) {
        return tail.length === 1 // 飞机尾巴必须有1个格子
      },
      message: '飞机尾巴必须包含1个坐标'
    }
  },
  orientation: {
    type: String,
    required: true,
    enum: ['horizontal', 'vertical']
  },
  isPlaced: {
    type: Boolean,
    default: false
  }
}, { _id: false })

/**
 * 攻击记录Schema
 */
const attackRecordSchema = new Schema<IAttackRecord>({
  coordinate: {
    type: coordinateSchema,
    required: true
  },
  result: {
    type: String,
    required: true,
    enum: ['hit_head', 'hit_body', 'miss']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  attackerId: {
    type: String,
    required: true
  }
}, { _id: false })

/**
 * 游戏Schema
 */
const gameSchema = new Schema<IGame>({
  gameId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  roomId: {
    type: String,
    required: true,
    index: true
  },
  player1Id: {
    type: String,
    required: true,
    index: true
  },
  player2Id: {
    type: String,
    required: true,
    index: true
  },
  winnerId: {
    type: String,
    index: true
  },
  currentPhase: {
    type: String,
    required: true,
    enum: ['waiting', 'placement', 'battle', 'finished'],
    default: 'waiting',
    index: true
  },
  currentPlayer: {
    type: Number,
    min: 1,
    max: 2,
    validate: {
      validator: function(player: number) {
        // 在战斗阶段必须有当前玩家
        if (this.currentPhase === 'battle') {
          return player === 1 || player === 2
        }
        return true
      },
      message: '战斗阶段必须指定当前玩家'
    }
  },
  turnCount: {
    type: Number,
    default: 0,
    min: 0
  },
  gameDuration: {
    type: Number,
    min: 0
  },
  player1Airplane: airplanePositionSchema,
  player2Airplane: airplanePositionSchema,
  attackHistory: [attackRecordSchema],
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  finishedAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: false,
  versionKey: false,
  toJSON: {
    transform: function(_doc, ret) {
      delete ret._id
      return ret
    }
  }
})

// 复合索引
gameSchema.index({ player1Id: 1, startedAt: -1 }) // 玩家1游戏历史
gameSchema.index({ player2Id: 1, startedAt: -1 }) // 玩家2游戏历史
gameSchema.index({ winnerId: 1, finishedAt: -1 }) // 胜利记录
gameSchema.index({ currentPhase: 1, startedAt: -1 }) // 游戏状态查询

// 虚拟字段
gameSchema.virtual('isFinished').get(function() {
  return this.currentPhase === 'finished'
})

gameSchema.virtual('isInProgress').get(function() {
  return this.currentPhase === 'battle'
})

gameSchema.virtual('bothPlayersPlaced').get(function() {
  return this.player1Airplane?.isPlaced && this.player2Airplane?.isPlaced
})

// 实例方法
gameSchema.methods.placePlane = function(playerId: string, airplane: IAirplanePosition): boolean {
  if (this.currentPhase !== 'placement') {
    return false
  }
  
  // 验证飞机位置的有效性
  if (!this.validateAirplanePosition(airplane)) {
    return false
  }
  
  if (playerId === this.player1Id) {
    this.player1Airplane = { ...airplane, isPlaced: true }
  } else if (playerId === this.player2Id) {
    this.player2Airplane = { ...airplane, isPlaced: true }
  } else {
    return false
  }
  
  // 如果两个玩家都放置了飞机，开始战斗
  if (this.bothPlayersPlaced) {
    this.currentPhase = 'battle'
    this.currentPlayer = 1 // 玩家1先开始
    this.startedAt = new Date()
  }
  
  return true
}

gameSchema.methods.attack = function(attackerId: string, coordinate: ICoordinate): string | null {
  if (this.currentPhase !== 'battle') {
    return null
  }
  
  // 验证是否是当前玩家的回合
  const isPlayer1Turn = this.currentPlayer === 1
  const isValidAttacker = (isPlayer1Turn && attackerId === this.player1Id) ||
                         (!isPlayer1Turn && attackerId === this.player2Id)
  
  if (!isValidAttacker) {
    return null
  }
  
  // 检查是否已经攻击过这个位置
  const alreadyAttacked = this.attackHistory.some((attack: IAttackRecord) => 
    attack.coordinate.x === coordinate.x && attack.coordinate.y === coordinate.y
  )
  
  if (alreadyAttacked) {
    return null
  }
  
  // 确定被攻击的飞机
  const targetAirplane = isPlayer1Turn ? this.player2Airplane : this.player1Airplane
  if (!targetAirplane) {
    return null
  }
  
  // 检查命中结果
  let result: 'hit_head' | 'hit_body' | 'miss' = 'miss'
  
  if (this.coordinateEquals(coordinate, targetAirplane.head)) {
    result = 'hit_head'
  } else if (this.coordinateInArray(coordinate, targetAirplane.body) ||
             this.coordinateInArray(coordinate, targetAirplane.wings) ||
             this.coordinateInArray(coordinate, targetAirplane.tail)) {
    result = 'hit_body'
  }
  
  // 记录攻击
  this.attackHistory.push({
    coordinate,
    result,
    timestamp: new Date(),
    attackerId
  })
  
  this.turnCount += 1
  
  // 检查游戏是否结束（命中机头）
  if (result === 'hit_head') {
    this.currentPhase = 'finished'
    this.winnerId = attackerId
    this.finishedAt = new Date()
    this.gameDuration = Math.floor((this.finishedAt.getTime() - this.startedAt.getTime()) / 1000)
  } else {
    // 切换玩家
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1
  }
  
  return result
}

gameSchema.methods.validateAirplanePosition = function(airplane: IAirplanePosition): boolean {
  // 检查所有坐标是否在有效范围内
  const allCoordinates = [
    airplane.head,
    ...airplane.body,
    ...airplane.wings,
    ...airplane.tail
  ]
  
  for (const coord of allCoordinates) {
    if (coord.x < 0 || coord.x > 9 || coord.y < 0 || coord.y > 9) {
      return false
    }
  }
  
  // 检查坐标是否重复
  const coordStrings = allCoordinates.map(coord => `${coord.x},${coord.y}`)
  const uniqueCoords = new Set(coordStrings)
  if (uniqueCoords.size !== allCoordinates.length) {
    return false
  }
  
  // 这里可以添加更多的飞机形状验证逻辑
  
  return true
}

gameSchema.methods.coordinateEquals = function(coord1: ICoordinate, coord2: ICoordinate): boolean {
  return coord1.x === coord2.x && coord1.y === coord2.y
}

gameSchema.methods.coordinateInArray = function(coordinate: ICoordinate, coordinates: ICoordinate[]): boolean {
  return coordinates.some(coord => this.coordinateEquals(coordinate, coord))
}

// 静态方法
gameSchema.statics.findPlayerGames = function(playerId: string, page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit
  return this.find({
    $or: [
      { player1Id: playerId },
      { player2Id: playerId }
    ]
  })
  .sort({ startedAt: -1 })
  .skip(skip)
  .limit(limit)
}

gameSchema.statics.findActiveGames = function() {
  return this.find({
    currentPhase: { $in: ['placement', 'battle'] }
  })
}

gameSchema.statics.getPlayerStats = function(playerId: string) {
  return this.aggregate([
    {
      $match: {
        $or: [
          { player1Id: playerId },
          { player2Id: playerId }
        ],
        currentPhase: 'finished'
      }
    },
    {
      $group: {
        _id: null,
        totalGames: { $sum: 1 },
        wins: {
          $sum: {
            $cond: [{ $eq: ['$winnerId', playerId] }, 1, 0]
          }
        },
        averageDuration: { $avg: '$gameDuration' },
        averageTurns: { $avg: '$turnCount' }
      }
    }
  ])
}

// 中间件
gameSchema.pre('save', function(next) {
  if (this.isNew) {
    this.startedAt = new Date()
  }
  next()
})

// 创建模型
export const Game = model<IGame, GameModel>('Game', gameSchema)