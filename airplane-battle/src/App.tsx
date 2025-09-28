import React, { useEffect, useState } from 'react'
import { ConfigProvider, Button, Space } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { GameContainer } from './components/GameContainer/GameContainer'
import { SoundTestPage } from './components/SoundTestPage'
import { AudioDebugTest } from './components/AudioDebugTest'
import { useGameStore } from './store/gameStore'
import './App.css'

/**
 * 主应用组件
 */
function App() {
  const initializeSoundSystem = useGameStore(state => state.initializeSoundSystem)
  const [currentPage, setCurrentPage] = useState<'game' | 'test' | 'debug'>('game')

  useEffect(() => {
    // 初始化音效系统
    initializeSoundSystem()
  }, [])

  return (
    <ConfigProvider locale={zhCN}>
      <div className="app">
        {/* 页面切换按钮 */}
        <div style={{ 
          position: 'fixed', 
          top: '10px', 
          right: '10px', 
          zIndex: 1000,
          background: 'rgba(255,255,255,0.9)',
          padding: '8px',
          borderRadius: '4px'
        }}>
          <Space>
            <Button 
              type={currentPage === 'game' ? 'primary' : 'default'}
              onClick={() => setCurrentPage('game')}
              size="small"
            >
              游戏
            </Button>
            <Button 
              type={currentPage === 'test' ? 'primary' : 'default'}
              onClick={() => setCurrentPage('test')}
              size="small"
            >
              音效测试
            </Button>
            <Button 
              type={currentPage === 'debug' ? 'primary' : 'default'}
              onClick={() => setCurrentPage('debug')}
              size="small"
            >
              音频调试
            </Button>
          </Space>
        </div>
        
        {/* 页面内容 */}
        {currentPage === 'game' ? <GameContainer /> : 
         currentPage === 'test' ? <SoundTestPage /> :
         <AudioDebugTest />}
      </div>
    </ConfigProvider>
  )
}

export default App