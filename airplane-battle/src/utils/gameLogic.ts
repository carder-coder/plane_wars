import { 
  CellType, 
  Coordinate, 
  AttackResult, 
  AttackRecord,
  PlayerState,
  GameActionResult
} from '../types'
import { isAirplanePart } from './airplaneUtils'

/**
 * 处理攻击逻辑
 */
export function processAttack(
  targetPlayer: PlayerState,
  coordinate: Coordinate
): GameActionResult & { attackResult: AttackResult; gameEnded: boolean } {
  const { x, y } = coordinate
  
  // 检查坐标是否有效
  if (x < 0 || x >= 10 || y < 0 || y >= 10) {
    return {
      success: false,
      message: '攻击坐标无效',
      attackResult: 'miss',
      gameEnded: false
    }
  }

  // 检查是否已经攻击过该位置
  const alreadyAttacked = targetPlayer.attackHistory.some(
    attack => attack.coordinate.x === x && attack.coordinate.y === y
  )
  
  if (alreadyAttacked) {
    return {
      success: false,
      message: '该位置已经攻击过了',
      attackResult: 'miss',
      gameEnded: false
    }
  }

  // 检查该位置是否有飞机
  const airplanePart = isAirplanePart(targetPlayer.airplane, coordinate)
  
  let attackResult: AttackResult
  let gameEnded = false
  let message = ''

  if (airplanePart === 'head') {
    // 击中机头，游戏结束
    attackResult = 'hit_head'
    gameEnded = true
    message = '击落飞机！游戏结束！'
    // 更新网格状态
    targetPlayer.grid[y][x] = CellType.HIT
  } else if (airplanePart) {
    // 击中飞机其他部位
    attackResult = 'hit_body'
    message = '打中飞机！'
    // 更新网格状态
    targetPlayer.grid[y][x] = CellType.HIT
  } else {
    // 未击中
    attackResult = 'miss'
    message = '未打中飞机'
    // 更新网格状态
    targetPlayer.grid[y][x] = CellType.MISS
  }

  // 记录攻击历史
  const attackRecord: AttackRecord = {
    coordinate,
    result: attackResult,
    timestamp: Date.now()
  }
  
  targetPlayer.attackHistory.push(attackRecord)

  return {
    success: true,
    message,
    attackResult,
    gameEnded,
    data: attackRecord
  }
}

/**
 * 检查游戏是否结束
 */
export function checkGameEnd(player1: PlayerState, player2: PlayerState): {
  isEnded: boolean;
  winner: 1 | 2 | null;
} {
  // 检查玩家1的飞机头部是否被击中
  const player1HeadHit = player1.attackHistory.some(
    attack => attack.result === 'hit_head'
  )
  
  // 检查玩家2的飞机头部是否被击中
  const player2HeadHit = player2.attackHistory.some(
    attack => attack.result === 'hit_head'
  )

  if (player1HeadHit) {
    return { isEnded: true, winner: 2 }
  }
  
  if (player2HeadHit) {
    return { isEnded: true, winner: 1 }
  }

  return { isEnded: false, winner: null }
}

/**
 * 获取网格中被攻击的位置
 */
export function getAttackedPositions(attackHistory: AttackRecord[]): Set<string> {
  const attacked = new Set<string>()
  attackHistory.forEach(attack => {
    attacked.add(`${attack.coordinate.x},${attack.coordinate.y}`)
  })
  return attacked
}

/**
 * 检查位置是否已被攻击
 */
export function isPositionAttacked(
  attackHistory: AttackRecord[], 
  coordinate: Coordinate
): boolean {
  return attackHistory.some(
    attack => attack.coordinate.x === coordinate.x && attack.coordinate.y === coordinate.y
  )
}

/**
 * 获取有效的攻击目标（未被攻击的位置）
 */
export function getValidTargets(attackHistory: AttackRecord[]): Coordinate[] {
  const attacked = getAttackedPositions(attackHistory)
  const validTargets: Coordinate[] = []
  
  for (let x = 0; x < 10; x++) {
    for (let y = 0; y < 10; y++) {
      if (!attacked.has(`${x},${y}`)) {
        validTargets.push({ x, y })
      }
    }
  }
  
  return validTargets
}