import { 
  AirplanePosition, 
  Coordinate, 
  CellType, 
  Orientation 
} from '../types'

/**
 * 创建默认的飞机位置
 */
export function createDefaultAirplane(): AirplanePosition {
  return {
    head: { x: -1, y: -1 },
    body: [],
    wings: [],
    tail: [],
    orientation: Orientation.VERTICAL,
    isPlaced: false
  }
}

/**
 * 根据机头位置和朝向生成完整的飞机位置
 * 飞机形状：
 * 垂直:   水平:
 *   □     □□□□□□□□□□
 * □□□     □
 * □□□     □
 *  □
 *  □
 *  □
 *  □
 *  □
 *  □
 */
export function generateAirplanePosition(
  headX: number, 
  headY: number, 
  orientation: Orientation
): AirplanePosition | null {
  const airplane: AirplanePosition = {
    head: { x: headX, y: headY },
    body: [],
    wings: [],
    tail: [],
    orientation,
    isPlaced: false
  }

  try {
    if (orientation === Orientation.VERTICAL) {
      // 垂直放置
      // 检查边界
      if (headY + 9 >= 10 || headX - 1 < 0 || headX + 1 >= 10) {
        return null
      }

      // 机翅 (第2、3行)
      airplane.wings = [
        { x: headX - 1, y: headY + 1 }, // 左翼
        { x: headX, y: headY + 1 },     // 中心
        { x: headX + 1, y: headY + 1 }, // 右翼
        { x: headX - 1, y: headY + 2 }, // 左翼
        { x: headX, y: headY + 2 },     // 中心
        { x: headX + 1, y: headY + 2 }  // 右翼
      ]

      // 机身 (第4、5、6行)
      airplane.body = [
        { x: headX, y: headY + 3 },
        { x: headX, y: headY + 4 },
        { x: headX, y: headY + 5 }
      ]

      // 机尾 (第7、8、9行)
      airplane.tail = [
        { x: headX, y: headY + 6 },
        { x: headX, y: headY + 7 },
        { x: headX, y: headY + 8 }
      ]
    } else {
      // 水平放置
      // 检查边界
      if (headX + 9 >= 10 || headY - 1 < 0 || headY + 1 >= 10) {
        return null
      }

      // 机翅 (第2、3列)
      airplane.wings = [
        { x: headX + 1, y: headY - 1 }, // 上翼
        { x: headX + 1, y: headY },     // 中心
        { x: headX + 1, y: headY + 1 }, // 下翼
        { x: headX + 2, y: headY - 1 }, // 上翼
        { x: headX + 2, y: headY },     // 中心
        { x: headX + 2, y: headY + 1 }  // 下翼
      ]

      // 机身 (第4、5、6列)
      airplane.body = [
        { x: headX + 3, y: headY },
        { x: headX + 4, y: headY },
        { x: headX + 5, y: headY }
      ]

      // 机尾 (第7、8、9列)
      airplane.tail = [
        { x: headX + 6, y: headY },
        { x: headX + 7, y: headY },
        { x: headX + 8, y: headY }
      ]
    }

    return airplane
  } catch (error) {
    console.error('生成飞机位置失败:', error)
    return null
  }
}

/**
 * 验证飞机放置是否有效
 */
export function validateAirplanePlacement(
  grid: CellType[][],
  airplane: AirplanePosition
): boolean {
  if (!airplane.isPlaced && airplane.head.x === -1) {
    return false
  }

  const allCoordinates = [
    airplane.head,
    ...airplane.wings,
    ...airplane.body,
    ...airplane.tail
  ]

  // 检查是否超出边界
  for (const coord of allCoordinates) {
    if (coord.x < 0 || coord.x >= 10 || coord.y < 0 || coord.y >= 10) {
      return false
    }
  }

  // 检查是否与已有飞机重叠
  for (const coord of allCoordinates) {
    if (grid[coord.y][coord.x] !== CellType.EMPTY) {
      return false
    }
  }

  return true
}

/**
 * 获取飞机所有坐标
 */
export function getAllAirplaneCoordinates(airplane: AirplanePosition): Coordinate[] {
  return [
    airplane.head,
    ...airplane.wings,
    ...airplane.body,
    ...airplane.tail
  ]
}

/**
 * 检查坐标是否为飞机的一部分
 */
export function isAirplanePart(airplane: AirplanePosition, coord: Coordinate): string | null {
  if (airplane.head.x === coord.x && airplane.head.y === coord.y) {
    return 'head'
  }
  
  if (airplane.wings.some(w => w.x === coord.x && w.y === coord.y)) {
    return 'wings'
  }
  
  if (airplane.body.some(b => b.x === coord.x && b.y === coord.y)) {
    return 'body'
  }
  
  if (airplane.tail.some(t => t.x === coord.x && t.y === coord.y)) {
    return 'tail'
  }
  
  return null
}