import React from 'react'
import { Alert, Progress, Tag, Timeline } from 'antd'
import { 
  TrophyOutlined, 
  FireOutlined, 
  ClockCircleOutlined,
  AimOutlined,
  RobotOutlined,
  UserOutlined
} from '@ant-design/icons'
import { GameState, AttackRecord, GamePhase } from '../../types'
import './StatusDisplay.css'

interface StatusDisplayProps {
  gameState: GameState
}

/**
 * 游戏状态显示组件
 */
export const StatusDisplay: React.FC<StatusDisplayProps> = ({ gameState }) => {
  const {
    currentPhase,
    currentPlayer,
    gameMode,
    players,
    winner,
    turnCount,
    gameStartTime,
    gameEndTime
  } = gameState

  // 计算游戏时长
  const getGameDuration = (): string => {
    const endTime = gameEndTime || Date.now()
    const duration = Math.floor((endTime - gameStartTime) / 1000)
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // 获取玩家标签
  const getPlayerTag = (playerId: 1 | 2) => {
    const player = players[`player${playerId}` as keyof typeof players]
    const isCurrentPlayer = playerId === currentPlayer
    const icon = player.isAI ? <RobotOutlined /> : <UserOutlined />
    
    return (
      <Tag
        color={isCurrentPlayer ? 'blue' : 'default'}
        icon={icon}
        className={isCurrentPlayer ? 'status-display__current-player' : ''}
      >
        {player.name}
      </Tag>
    )
  }

  // 获取准备状态
  const getReadyStatus = () => {
    const player1Ready = players.player1.isReady
    const player2Ready = players.player2.isReady
    
    return (
      <div className="status-display__ready-status">
        <div className="status-display__ready-item">
          <span>玩家1:</span>
          <Tag color={player1Ready ? 'green' : 'orange'}>
            {player1Ready ? '已准备' : '放置中'}
          </Tag>
        </div>
        <div className="status-display__ready-item">
          <span>玩家2:</span>
          <Tag color={player2Ready ? 'green' : 'orange'}>
            {player2Ready ? '已准备' : '放置中'}
          </Tag>
        </div>
      </div>
    )
  }

  // 获取攻击统计
  const getAttackStats = () => {
    const player1Attacks = players.player2.attackHistory
    const player2Attacks = players.player1.attackHistory

    const getPlayerStats = (attacks: AttackRecord[]) => {
      const total = attacks.length
      const hits = attacks.filter(a => a.result !== 'miss').length
      const hitRate = total > 0 ? Math.round((hits / total) * 100) : 0
      
      return { total, hits, hitRate }
    }

    const player1Stats = getPlayerStats(player1Attacks)
    const player2Stats = getPlayerStats(player2Attacks)

    return (
      <div className="status-display__attack-stats">
        <div className="status-display__player-stats">
          <h4>玩家1 攻击统计</h4>
          <div className="status-display__stats-row">
            <span>攻击次数: {player1Stats.total}</span>
            <span>命中次数: {player1Stats.hits}</span>
          </div>
          <Progress 
            percent={player1Stats.hitRate} 
            size="small" 
            status={player1Stats.hitRate > 50 ? 'success' : 'normal'}
            format={(percent) => `${percent}%`}
          />
        </div>
        
        <div className="status-display__player-stats">
          <h4>玩家2 攻击统计</h4>
          <div className="status-display__stats-row">
            <span>攻击次数: {player2Stats.total}</span>
            <span>命中次数: {player2Stats.hits}</span>
          </div>
          <Progress 
            percent={player2Stats.hitRate} 
            size="small" 
            status={player2Stats.hitRate > 50 ? 'success' : 'normal'}
            format={(percent) => `${percent}%`}
          />
        </div>
      </div>
    )
  }

  // 获取最近攻击历史
  const getRecentAttacks = () => {
    const allAttacks: (AttackRecord & { playerId: 1 | 2 })[] = [
      ...players.player1.attackHistory.map(attack => ({ ...attack, playerId: 2 as const })),
      ...players.player2.attackHistory.map(attack => ({ ...attack, playerId: 1 as const }))
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)

    if (allAttacks.length === 0) {
      return <div className="status-display__no-attacks">暂无攻击记录</div>
    }

    return (
      <Timeline className="status-display__timeline">
        {allAttacks.map((attack, index) => (
          <Timeline.Item
            key={index}
            color={attack.result === 'hit_head' ? 'red' : attack.result === 'hit_body' ? 'orange' : 'gray'}
            dot={attack.result === 'hit_head' ? <TrophyOutlined /> : attack.result === 'hit_body' ? <FireOutlined /> : <AimOutlined />}
          >
            <div className="status-display__attack-item">
              <div className="status-display__attack-header">
                {getPlayerTag(attack.playerId)}
                <span className="status-display__attack-coord">
                  ({attack.coordinate.x}, {attack.coordinate.y})
                </span>
              </div>
              <div className="status-display__attack-result">
                {attack.result === 'hit_head' && '击中机头！'}
                {attack.result === 'hit_body' && '击中飞机！'}
                {attack.result === 'miss' && '未击中'}
              </div>
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    )
  }

  // 获取当前状态消息
  const getCurrentStatusMessage = () => {
    if (currentPhase === GamePhase.FINISHED && winner) {
      const winnerPlayer = players[`player${winner}` as keyof typeof players]
      return (
        <Alert
          message="游戏结束"
          description={`🎉 ${winnerPlayer.name} 获胜！`}
          type="success"
          icon={<TrophyOutlined />}
          showIcon
        />
      )
    }

    if (currentPhase === GamePhase.PLACEMENT) {
      return (
        <Alert
          message="飞机放置阶段"
          description="请在网格中放置您的飞机"
          type="info"
          showIcon
        />
      )
    }

    if (currentPhase === GamePhase.BATTLE) {
      const currentPlayerData = players[`player${currentPlayer}` as keyof typeof players]
      return (
        <Alert
          message="战斗阶段"
          description={`轮到 ${currentPlayerData.name} 攻击`}
          type="warning"
          icon={<FireOutlined />}
          showIcon
        />
      )
    }

    return null
  }

  return (
    <div className="status-display">
      <div className="status-display__header">
        <h3 className="status-display__title">
          <ClockCircleOutlined /> 游戏状态
        </h3>
      </div>

      <div className="status-display__content">
        {/* 当前状态消息 */}
        <div className="status-display__section">
          {getCurrentStatusMessage()}
        </div>

        {/* 基本信息 */}
        <div className="status-display__section">
          <div className="status-display__info-grid">
            <div className="status-display__info-item">
              <span className="status-display__info-label">游戏时长:</span>
              <span className="status-display__info-value">{getGameDuration()}</span>
            </div>
            <div className="status-display__info-item">
              <span className="status-display__info-label">回合数:</span>
              <span className="status-display__info-value">{turnCount}</span>
            </div>
          </div>
        </div>

        {/* 玩家准备状态 */}
        {currentPhase === GamePhase.PLACEMENT && (
          <div className="status-display__section">
            <h4 className="status-display__section-title">准备状态</h4>
            {getReadyStatus()}
          </div>
        )}

        {/* 攻击统计 */}
        {currentPhase === GamePhase.BATTLE && (
          <div className="status-display__section">
            <h4 className="status-display__section-title">攻击统计</h4>
            {getAttackStats()}
          </div>
        )}

        {/* 最近攻击历史 */}
        {currentPhase === GamePhase.BATTLE && (
          <div className="status-display__section">
            <h4 className="status-display__section-title">攻击历史</h4>
            {getRecentAttacks()}
          </div>
        )}
      </div>
    </div>
  )
}