import { 
  Coordinate, 
  Orientation, 
  PlayerState, 
  AttackRecord 
} from '../types'
import { 
  generateAirplanePosition, 
  validateAirplanePlacement 
} from './airplaneUtils'
import { getValidTargets } from './gameLogic'

/**
 * AI难度级别
 */
export enum AIDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium', 
  HARD = 'hard'
}

/**
 * AI攻击策略接口
 */
interface AIStrategy {
  selectTarget(playerState: PlayerState, opponentHistory: AttackRecord[]): Coordinate
}

/**
 * 随机攻击策略（简单AI）
 */
class RandomAttackStrategy implements AIStrategy {
  selectTarget(_playerState: PlayerState, opponentHistory: AttackRecord[]): Coordinate {
    const validTargets = getValidTargets(opponentHistory)
    
    if (validTargets.length === 0) {
      // 所有位置都已攻击，返回默认位置
      return { x: 0, y: 0 }
    }
    
    const randomIndex = Math.floor(Math.random() * validTargets.length)
    return validTargets[randomIndex]
  }
}

/**
 * 智能攻击策略（中等AI）
 */
class SmartAttackStrategy implements AIStrategy {
  private _lastHits: Coordinate[] = []
  
  selectTarget(_playerState: PlayerState, opponentHistory: AttackRecord[]): Coordinate {
    // 使用_lastHits变量以避免TS6133错误
    this._lastHits = opponentHistory
      .filter(attack => attack.result === 'hit_body' || attack.result === 'hit_head')
      .map(attack => attack.coordinate)
    
    const validTargets = getValidTargets(opponentHistory)
    
    if (validTargets.length === 0) {
      return { x: 0, y: 0 }
    }

    // 获取最近的命中位置
    const recentHits = this._lastHits.slice(-3) // 只考虑最近3次命中

    if (recentHits.length > 0) {
      // 有命中记录，尝试在附近攻击
      const target = this.getAdjacentTarget(recentHits, validTargets)
      if (target) {
        return target
      }
    }

    // 没有命中记录或附近没有有效目标，使用概率攻击
    return this.getProbabilityTarget(validTargets)
  }

  private getAdjacentTarget(hits: Coordinate[], validTargets: Coordinate[]): Coordinate | null {
    const lastHit = hits[hits.length - 1]
    
    // 检查四个相邻位置
    const adjacent = [
      { x: lastHit.x + 1, y: lastHit.y },
      { x: lastHit.x - 1, y: lastHit.y },
      { x: lastHit.x, y: lastHit.y + 1 },
      { x: lastHit.x, y: lastHit.y - 1 }
    ]

    for (const coord of adjacent) {
      if (validTargets.some(target => target.x === coord.x && target.y === coord.y)) {
        return coord
      }
    }

    return null
  }

  private getProbabilityTarget(validTargets: Coordinate[]): Coordinate {
    // 优先攻击中心区域
    const centerTargets = validTargets.filter(target => 
      target.x >= 2 && target.x <= 7 && target.y >= 2 && target.y <= 7
    )

    if (centerTargets.length > 0) {
      const randomIndex = Math.floor(Math.random() * centerTargets.length)
      return centerTargets[randomIndex]
    }

    // 没有中心目标，随机选择
    const randomIndex = Math.floor(Math.random() * validTargets.length)
    return validTargets[randomIndex]
  }
}

/**
 * 高级攻击策略（困难AI）
 */
class AdvancedAttackStrategy implements AIStrategy {
  private hitPattern: Map<string, number> = new Map()
  
  selectTarget(_playerState: PlayerState, opponentHistory: AttackRecord[]): Coordinate {
    const validTargets = getValidTargets(opponentHistory)
    
    if (validTargets.length === 0) {
      return { x: 0, y: 0 }
    }

    // 分析攻击模式
    this.analyzeHitPattern(opponentHistory)
    
    // 获取最近的命中位置
    const recentHits = opponentHistory
      .filter(attack => attack.result === 'hit_body')
      .map(attack => attack.coordinate)

    if (recentHits.length > 0) {
      // 尝试推测飞机方向并攻击机头
      const headTarget = this.predictAirplaneHead(recentHits, validTargets)
      if (headTarget) {
        return headTarget
      }
    }

    // 使用热力图选择最优目标
    return this.getHeatmapTarget(validTargets)
  }

  private analyzeHitPattern(history: AttackRecord[]): void {
    // 分析命中模式，更新热力图
    for (const attack of history) {
      const key = `${attack.coordinate.x},${attack.coordinate.y}`
      const current = this.hitPattern.get(key) || 0
      
      if (attack.result === 'hit_body') {
        this.hitPattern.set(key, current + 2)
      } else if (attack.result === 'miss') {
        this.hitPattern.set(key, current - 1)
      }
    }
  }

  private predictAirplaneHead(hits: Coordinate[], validTargets: Coordinate[]): Coordinate | null {
    if (hits.length < 2) {
      return null
    }

    // 分析命中点的模式来推测飞机方向
    const lastTwo = hits.slice(-2)
    const [hit1, hit2] = lastTwo

    // 判断是水平还是垂直方向
    let isHorizontal = false
    let isVertical = false

    if (hit1.y === hit2.y) {
      isHorizontal = true
    } else if (hit1.x === hit2.x) {
      isVertical = true
    }

    // 根据方向推测机头位置
    if (isHorizontal) {
      // 水平方向，机头可能在最左边
      const minX = Math.min(hit1.x, hit2.x)
      const headTarget = { x: minX - 1, y: hit1.y }
      
      if (validTargets.some(target => target.x === headTarget.x && target.y === headTarget.y)) {
        return headTarget
      }
    } else if (isVertical) {
      // 垂直方向，机头可能在最上边
      const minY = Math.min(hit1.y, hit2.y)
      const headTarget = { x: hit1.x, y: minY - 1 }
      
      if (validTargets.some(target => target.x === headTarget.x && target.y === headTarget.y)) {
        return headTarget
      }
    }

    return null
  }

  private getHeatmapTarget(validTargets: Coordinate[]): Coordinate {
    // 计算每个有效目标的得分
    let bestTarget = validTargets[0]
    let bestScore = -Infinity

    for (const target of validTargets) {
      const score = this.calculateTargetScore(target)
      if (score > bestScore) {
        bestScore = score
        bestTarget = target
      }
    }

    return bestTarget
  }

  private calculateTargetScore(target: Coordinate): number {
    let score = 0

    // 中心区域加分
    const centerDistance = Math.abs(target.x - 4.5) + Math.abs(target.y - 4.5)
    score += (9 - centerDistance) * 2

    // 基于历史模式的分数
    const key = `${target.x},${target.y}`
    score += this.hitPattern.get(key) || 0

    // 棋盘模式加分（飞机可能的位置）
    if ((target.x + target.y) % 2 === 0) {
      score += 1
    }

    return score
  }
}

/**
 * AI玩家类
 */
export class AIPlayer {
  private strategy: AIStrategy
  private difficulty: AIDifficulty

  constructor(difficulty: AIDifficulty = AIDifficulty.MEDIUM) {
    this.difficulty = difficulty
    this.strategy = this.createStrategy(difficulty)
  }

  private createStrategy(difficulty: AIDifficulty): AIStrategy {
    switch (difficulty) {
      case AIDifficulty.EASY:
        return new RandomAttackStrategy()
      case AIDifficulty.MEDIUM:
        return new SmartAttackStrategy()
      case AIDifficulty.HARD:
        return new AdvancedAttackStrategy()
      default:
        return new SmartAttackStrategy()
    }
  }

  /**
   * AI自动放置飞机
   */
  autoPlaceAirplane(playerState: PlayerState): { x: number; y: number; orientation: Orientation } | null {
    const maxAttempts = 100
    let attempts = 0

    while (attempts < maxAttempts) {
      // 随机选择位置和方向
      const x = Math.floor(Math.random() * 10)
      const y = Math.floor(Math.random() * 10)
      const orientation = Math.random() < 0.5 ? Orientation.HORIZONTAL : Orientation.VERTICAL

      // 生成飞机位置
      const airplanePosition = generateAirplanePosition(x, y, orientation)
      
      if (airplanePosition && validateAirplanePlacement(playerState.grid, airplanePosition)) {
        return { x, y, orientation }
      }

      attempts++
    }

    console.warn('AI无法找到有效的飞机放置位置')
    return null
  }

  /**
   * AI选择攻击目标
   */
  selectAttackTarget(playerState: PlayerState, opponentHistory: AttackRecord[]): Coordinate {
    return this.strategy.selectTarget(playerState, opponentHistory)
  }

  /**
   * 获取AI难度
   */
  getDifficulty(): AIDifficulty {
    return this.difficulty
  }

  /**
   * 设置AI难度
   */
  setDifficulty(difficulty: AIDifficulty): void {
    this.difficulty = difficulty
    this.strategy = this.createStrategy(difficulty)
  }
}