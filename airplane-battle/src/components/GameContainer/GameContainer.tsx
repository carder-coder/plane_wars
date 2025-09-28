import React, { useEffect, useCallback } from 'react'
import { message } from 'antd'
import { GameGrid } from '../GameGrid/GameGrid'
import { ControlPanel } from '../ControlPanel/ControlPanel'
import { StatusDisplay } from '../StatusDisplay/StatusDisplay'
import { useGameStore } from '../../store/gameStore'
import { GameMode, GamePhase, Orientation, SoundId } from '../../types'
import { AIPlayer, AIDifficulty } from '../../utils/aiPlayer'
import { soundManager } from '../../utils/soundManager'
import './GameContainer.css'

/**
 * 主游戏容器组件
 */
export const GameContainer: React.FC = () => {
  const {
    // 游戏状态
    currentPhase,
    currentPlayer,
    gameMode,
    players,
    winner,
    turnCount,
    soundSettings,
    
    // 游戏控制方法
    startNewGame,
    resetGame,
    placeAirplane,

    
    confirmPlacement,
    attack,
    updateSoundSettings,
    
    // 辅助方法
    getCurrentPlayerState,
    getOpponentPlayerState
  } = useGameStore()

  // AI玩家实例
  const aiPlayer = React.useRef<AIPlayer>(new AIPlayer(AIDifficulty.MEDIUM))

  // 处理开始新游戏
  const handleStartGame = useCallback((mode: GameMode) => {
    startNewGame(mode)
    message.success('新游戏已开始！')
    
    // 如果是人机模式，AI自动放置飞机
    if (mode === GameMode.PVE) {
      setTimeout(() => {
        const aiPlacement = aiPlayer.current.autoPlaceAirplane(players.player2)
        if (aiPlacement) {
          const result = placeAirplane(2, aiPlacement.x, aiPlacement.y, aiPlacement.orientation)
          if (result.success) {
            // AI确认放置
            setTimeout(() => {
              confirmPlacement(2)
              message.info('AI玩家已放置飞机')
            }, 500)
          }
        }
      }, 1000)
    }
  }, [startNewGame, placeAirplane, confirmPlacement, players.player2])

  // 处理重置游戏
  const handleResetGame = useCallback(() => {
    resetGame()
    message.info('游戏已重置')
  }, [resetGame])

  // 处理飞机放置
  const handleAirplanePlace = useCallback((playerId: 1 | 2) => 
    (x: number, y: number, orientation: Orientation) => {
      if (currentPhase !== GamePhase.PLACEMENT) {
        message.warning('当前不在飞机放置阶段')
        return
      }

      const result = placeAirplane(playerId, x, y, orientation)
      if (result.success) {
        message.success(result.message)
        // 播放放置音效在gameStore中已处理
      } else {
        message.error(result.message)
        // 播放错误音效
        soundManager.playSound(SoundId.BUTTON_CLICK, { volume: 0.3 })
      }
    }, [currentPhase, placeAirplane])

  // 处理确认飞机放置
  const handleConfirmPlacement = useCallback(() => {
    if (currentPhase !== GamePhase.PLACEMENT) {
      message.warning('当前不在飞机放置阶段')
      return
    }

    // 直接使用玄家1，因为这是人类玩家的确认操作
    const result = confirmPlacement(1)
    
    if (result.success) {
      message.success(result.message)
    } else {
      message.error(result.message)
    }
  }, [currentPhase, confirmPlacement])

  // 处理攻击
  const handleAttack = useCallback((x: number, y: number) => {
    if (currentPhase !== GamePhase.BATTLE) {
      message.warning('当前不在战斗阶段')
      return
    }

    const currentPlayerData = getCurrentPlayerState()
    
    // 如果当前是AI玩家，不允许手动攻击
    if (currentPlayerData.isAI) {
      return
    }

    const result = attack({ x, y })
    
    if (result.success) {
      if (result.attackResult === 'hit_head') {
        message.success('🎉 ' + result.message)
      } else if (result.attackResult === 'hit_body') {
        message.success('💥 ' + result.message)
      } else {
        message.info('🌊 ' + result.message)
      }
    } else {
      message.error(result.message)
    }
  }, [currentPhase, attack, getCurrentPlayerState])

  // AI自动攻击
  const handleAIAttack = useCallback(() => {
    if (currentPhase !== GamePhase.BATTLE) {
      return
    }

    const currentPlayerData = getCurrentPlayerState()
    const opponentData = getOpponentPlayerState()
    
    if (!currentPlayerData.isAI) {
      return
    }

    // AI选择攻击目标
    const target = aiPlayer.current.selectAttackTarget(currentPlayerData, opponentData.attackHistory)
    
    setTimeout(() => {
      const result = attack(target)
      
      if (result.success) {
        if (result.attackResult === 'hit_head') {
          message.success('🤖 AI: ' + result.message)
        } else if (result.attackResult === 'hit_body') {
          message.warning('🤖 AI: ' + result.message)
        } else {
          message.info('🤖 AI: ' + result.message)
        }
      }
    }, 1000) // AI思考时间
  }, [currentPhase, attack, getCurrentPlayerState, getOpponentPlayerState])

  // 监听游戏状态变化，处理AI回合
  useEffect(() => {
    if (currentPhase === GamePhase.BATTLE && gameMode === GameMode.PVE) {
      const currentPlayerData = getCurrentPlayerState()
      if (currentPlayerData.isAI && !winner) {
        handleAIAttack()
      }
    }
  }, [currentPhase, gameMode, currentPlayer, winner, handleAIAttack, getCurrentPlayerState])

  // 检查玩家1是否可以确认放置
  const canPlayer1ConfirmPlacement = 
    currentPhase === GamePhase.PLACEMENT && 
    players.player1.airplane.isPlaced && 
    !players.player1.isReady

  return (
    <div className="game-container">
      {/* 游戏标题 */}
      <div className="game-container__header">
        <h1 className="game-container__title">
          ✈️ 飞机大战游戏
        </h1>
        <p className="game-container__subtitle">
          策略对战，击中对方机头获胜！
        </p>
      </div>

      {/* 主游戏区域 */}
      <div className="game-container__main">
        {/* 左侧：玩家1区域 */}
        <div className="game-container__player-area">
          <GameGrid
            grid={players.player1.grid}
            isOwn={true}
            title="玩家1 (我的战场)"
            onAirplanePlace={handleAirplanePlace(1)}
            canPlaceAirplane={
              currentPhase === GamePhase.PLACEMENT && 
              !players.player1.isReady
            }
            disabled={currentPhase === GamePhase.FINISHED}
          />
        </div>

        {/* 中间：控制面板 */}
        <div className="game-container__control-area">
          <ControlPanel
            gameMode={gameMode}
            gamePhase={currentPhase}
            currentPlayer={currentPlayer}
            onStartGame={handleStartGame}
            onResetGame={handleResetGame}
            onConfirmPlacement={handleConfirmPlacement}
            canConfirmPlacement={canPlayer1ConfirmPlacement}
            isGameInProgress={currentPhase !== GamePhase.PLACEMENT || players.player1.isReady}
            turnCount={turnCount}
            soundSettings={soundSettings}
            onSoundSettingsChange={updateSoundSettings}
          />
          
          <StatusDisplay 
            gameState={{
              currentPhase,
              currentPlayer,
              gameMode,
              players,
              winner,
              turnCount,
              gameStartTime: Date.now(),
              gameEndTime: winner ? Date.now() : undefined,
              soundSettings,
              isMusicPlaying: false,
              currentMusic: null
            }}
          />
        </div>

        {/* 右侧：玩家2/敌方区域 */}
        <div className="game-container__player-area">
          <GameGrid
            grid={players.player2.grid}
            isOwn={false}
            title={gameMode === GameMode.PVE ? "AI玩家 (敌方战场)" : "玩家2 (敌方战场)"}
            onCellClick={handleAttack}
            disabled={
              currentPhase !== GamePhase.BATTLE || 
              currentPlayer !== 1 ||
              winner !== null
            }
          />
        </div>
      </div>

      {/* 游戏说明 */}
      <div className="game-container__footer">
        <div className="game-container__instructions">
          <h3>游戏说明:</h3>
          <ul>
            <li>1. 选择游戏模式并开始新游戏</li>
            <li>2. 在自己的网格中放置飞机（点击机头位置）</li>
            <li>3. 确认飞机放置后进入战斗阶段</li>
            <li>4. 轮流攻击对方网格，首先击中对方机头者获胜</li>
            <li>5. 飞机由机头、机翅、机身、机尾组成，击中机头即可获胜</li>
          </ul>
        </div>
      </div>
    </div>
  )
}