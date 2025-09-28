import React from 'react'
import { Button, Select, Space, Divider } from 'antd'
import { 
  PlayCircleOutlined, 
  ReloadOutlined, 
  PauseCircleOutlined,
  SettingOutlined,
  RobotOutlined,
  UserOutlined
} from '@ant-design/icons'
import { GameMode, GamePhase } from '../../types'
import './ControlPanel.css'

const { Option } = Select

interface ControlPanelProps {
  gameMode: GameMode
  gamePhase: GamePhase
  currentPlayer: 1 | 2
  onStartGame: (mode: GameMode) => void
  onResetGame: () => void
  onConfirmPlacement: () => void
  canConfirmPlacement: boolean
  isGameInProgress: boolean
  turnCount: number
}

/**
 * 控制面板组件
 */
export const ControlPanel: React.FC<ControlPanelProps> = ({
  gameMode,
  gamePhase,
  currentPlayer,
  onStartGame,
  onResetGame,
  onConfirmPlacement,
  canConfirmPlacement,
  isGameInProgress,
  turnCount
}) => {
  const [selectedMode, setSelectedMode] = React.useState<GameMode>(GameMode.PVP)

  const handleGameModeChange = (mode: GameMode) => {
    setSelectedMode(mode)
  }

  const handleStartGame = () => {
    onStartGame(selectedMode)
  }

  const getGameModeIcon = (mode: GameMode) => {
    return mode === GameMode.PVE ? <RobotOutlined /> : <UserOutlined />
  }

  const getGameModeText = (mode: GameMode) => {
    return mode === GameMode.PVE ? '人机对战' : '双人对战'
  }

  const getCurrentPlayerText = () => {
    if (gameMode === GameMode.PVE && currentPlayer === 2) {
      return 'AI玩家'
    }
    return `玩家${currentPlayer}`
  }

  const getGamePhaseText = () => {
    switch (gamePhase) {
      case GamePhase.PLACEMENT:
        return '飞机放置阶段'
      case GamePhase.BATTLE:
        return '战斗阶段'
      case GamePhase.FINISHED:
        return '游戏结束'
      default:
        return '准备中'
    }
  }

  return (
    <div className="control-panel">
      <div className="control-panel__header">
        <h2 className="control-panel__title">
          <SettingOutlined /> 游戏控制
        </h2>
      </div>

      <div className="control-panel__section">
        <h3 className="control-panel__section-title">游戏设置</h3>
        
        <div className="control-panel__field">
          <label className="control-panel__label">游戏模式:</label>
          <Select
            value={selectedMode}
            onChange={handleGameModeChange}
            disabled={isGameInProgress}
            style={{ width: '100%' }}
          >
            <Option value={GameMode.PVP}>
              <UserOutlined /> 双人对战
            </Option>
            <Option value={GameMode.PVE}>
              <RobotOutlined /> 人机对战
            </Option>
          </Select>
        </div>

        <div className="control-panel__actions">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStartGame}
              disabled={isGameInProgress}
              block
            >
              开始新游戏
            </Button>
            
            <Button
              icon={<ReloadOutlined />}
              onClick={onResetGame}
              block
            >
              重置游戏
            </Button>

            {gamePhase === GamePhase.PLACEMENT && (
              <Button
                type="primary"
                onClick={onConfirmPlacement}
                disabled={!canConfirmPlacement}
                block
              >
                确认飞机放置
              </Button>
            )}
          </Space>
        </div>
      </div>

      <Divider />

      <div className="control-panel__section">
        <h3 className="control-panel__section-title">游戏状态</h3>
        
        <div className="control-panel__status">
          <div className="control-panel__status-item">
            <span className="control-panel__status-label">当前模式:</span>
            <span className="control-panel__status-value">
              {getGameModeIcon(gameMode)} {getGameModeText(gameMode)}
            </span>
          </div>

          <div className="control-panel__status-item">
            <span className="control-panel__status-label">游戏阶段:</span>
            <span className="control-panel__status-value">
              {getGamePhaseText()}
            </span>
          </div>

          {gamePhase === GamePhase.BATTLE && (
            <>
              <div className="control-panel__status-item">
                <span className="control-panel__status-label">当前回合:</span>
                <span className="control-panel__status-value">
                  {getCurrentPlayerText()}
                </span>
              </div>

              <div className="control-panel__status-item">
                <span className="control-panel__status-label">回合数:</span>
                <span className="control-panel__status-value">
                  {turnCount}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <Divider />

      <div className="control-panel__section">
        <h3 className="control-panel__section-title">游戏说明</h3>
        <div className="control-panel__instructions">
          <ul>
            <li>🛩️ 机头 - 被击中游戏结束</li>
            <li>✈️ 机翅 - 飞机翅膀部分</li>
            <li>🚁 机身 - 飞机身体部分</li>
            <li>🛫 机尾 - 飞机尾部</li>
            <li>💥 击中 - 攻击命中目标</li>
            <li>❌ 未中 - 攻击未命中</li>
          </ul>
        </div>
      </div>
    </div>
  )
}