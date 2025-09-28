/**
 * 游戏格子类型枚举
 * 用于标识网格中每个格子的状态
 */
export enum CellType {
  EMPTY = 'empty',        // 空格子
  HEAD = 'head',          // 飞机头部
  BODY = 'body',          // 飞机机身
  WINGS = 'wings',        // 飞机机翅
  TAIL = 'tail',          // 飞机尾部
  HIT = 'hit',            // 被击中
  MISS = 'miss'           // 攻击未命中
}

/**
 * 坐标接口
 * 用于表示网格中的位置
 */
export interface Coordinate {
  x: number  // 0-9 横坐标
  y: number  // 0-9 纵坐标
}

/**
 * 飞机朝向枚举
 */
export enum Orientation {
  HORIZONTAL = 'horizontal', // 水平放置
  VERTICAL = 'vertical'      // 垂直放置
}

/**
 * 飞机位置接口
 * 定义飞机在网格中的完整位置信息
 */
export interface AirplanePosition {
  head: Coordinate         // 机头坐标
  body: Coordinate[]       // 机身坐标数组
  wings: Coordinate[]      // 机翅坐标数组  
  tail: Coordinate[]       // 机尾坐标数组
  orientation: Orientation // 飞机朝向
  isPlaced: boolean        // 是否已放置
}

/**
 * 攻击记录接口
 */
export interface AttackRecord {
  coordinate: Coordinate   // 攻击坐标
  result: AttackResult     // 攻击结果
  timestamp: number        // 攻击时间戳
}

/**
 * 攻击结果类型
 */
export type AttackResult = 'hit_head' | 'hit_body' | 'miss'

/**
 * 游戏阶段枚举
 */
export enum GamePhase {
  PLACEMENT = 'placement',  // 飞机放置阶段
  BATTLE = 'battle',        // 战斗阶段
  FINISHED = 'finished'     // 游戏结束
}

/**
 * 游戏模式枚举
 */
export enum GameMode {
  PVP = 'pvp',             // 玩家对战
  PVE = 'pve'              // 人机对战
}