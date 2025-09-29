import { useEffect, useState } from 'react'
import { ConfigProvider, Button, Space } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { GameContainer } from './components/GameContainer/GameContainer'
import { SoundTestPage } from './components/SoundTestPage'
import { AudioDebugTest } from './components/AudioDebugTest'
import { LoginPanel } from './components/LoginPanel/LoginPanel'
import { MainMenu } from './components/MainMenu/MainMenu'
import { RoomListPanel } from './components/RoomListPanel/RoomListPanel'
import { GameLobby } from './components/GameLobby/GameLobby'
import { useGameStore } from './store/gameStore'
import { useNetworkStore } from './store/networkStore'
import './App.css'

/**
 * 主应用组件
 */
function App() {
  const initializeSoundSystem = useGameStore(state => state.initializeSoundSystem)
  const { initialize, isAuthenticated, currentView } = useNetworkStore()
  const [currentPage, setCurrentPage] = useState<'game' | 'test' | 'debug'>('game')
  const [showDebugButtons, setShowDebugButtons] = useState(false)

  useEffect(() => {
    // 初始化音效系统
    initializeSoundSystem()
    
    // 初始化网络状态
    initialize()
  }, [])

  // 渲染主要内容
  const renderMainContent = () => {
    // 如果是调试模式，显示调试页面
    if (isAuthenticated && currentPage !== 'game') {
      switch (currentPage) {
        case 'test':
          return <SoundTestPage />
        case 'debug':
          return <AudioDebugTest />
        default:
          break
      }
    }

    // 根据认证状态和当前视图渲染对应组件
    if (!isAuthenticated) {
      return <LoginPanel />
    }

    switch (currentView) {
      case 'mainMenu':
        return <MainMenu />
      case 'roomList':
        return <RoomListPanel />
      case 'gameLobby':
        return <GameLobby />
      case 'game':
        return <GameContainer />
      default:
        return <MainMenu />
    }
  }

  return (
    <ConfigProvider locale={zhCN}>
      <div className="app">
        {renderMainContent()}
        
        {/* 调试按钮（仅在登录后显示） */}
        {isAuthenticated && (
          <>
            {/* 调试按钮切换 */}
            <div style={{ 
              position: 'fixed', 
              top: '10px', 
              right: '10px', 
              zIndex: 1000
            }}>
              <Button 
                size="small"
                onClick={() => setShowDebugButtons(!showDebugButtons)}
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  border: '1px solid #d9d9d9'
                }}
              >
                {showDebugButtons ? '隐藏调试' : '显示调试'}
              </Button>
            </div>
            
            {/* 调试页面切换按钮 */}
            {showDebugButtons && (
              <div style={{ 
                position: 'fixed', 
                top: '50px', 
                right: '10px', 
                zIndex: 1000,
                background: 'rgba(255,255,255,0.9)',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d9d9d9'
              }}>
                <Space direction="vertical" size="small">
                  <Button 
                    type={currentPage === 'game' ? 'primary' : 'default'}
                    onClick={() => setCurrentPage('game')}
                    size="small"
                    block
                  >
                    游戏
                  </Button>
                  <Button 
                    type={currentPage === 'test' ? 'primary' : 'default'}
                    onClick={() => setCurrentPage('test')}
                    size="small"
                    block
                  >
                    音效测试
                  </Button>
                  <Button 
                    type={currentPage === 'debug' ? 'primary' : 'default'}
                    onClick={() => setCurrentPage('debug')}
                    size="small"
                    block
                  >
                    音频调试
                  </Button>
                </Space>
              </div>
            )}
          </>
        )}
      </div>
    </ConfigProvider>
  )
}

export default App