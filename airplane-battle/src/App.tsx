import React from 'react'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { GameContainer } from './components/GameContainer/GameContainer'
import './App.css'

/**
 * 主应用组件
 */
function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <div className="app">
        <GameContainer />
      </div>
    </ConfigProvider>
  )
}

export default App