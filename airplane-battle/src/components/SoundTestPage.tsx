import React, { useEffect, useState } from 'react'
import { Button, Card, Space, Typography, Alert, Row, Col, Divider } from 'antd'
import { SoundOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'
import { soundManager } from '../utils/soundManager'
import { SoundId } from '../types/sound'

const { Title, Paragraph, Text } = Typography

/**
 * 音效系统测试组件
 */
export const SoundTestPage: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [loadStats, setLoadStats] = useState<any>({})
  const [systemStatus, setSystemStatus] = useState<any>({})

  useEffect(() => {
    const initializeSystem = async () => {
      try {
        await soundManager.initialize()
        setIsInitialized(true)
        setInitError(null)
        
        // 更新状态
        const status = soundManager.getStatus()
        setSystemStatus(status)
        setLoadStats(status.loadStats)
        
        console.log('Sound system initialized for testing')
      } catch (error) {
        console.error('Failed to initialize sound system:', error)
        setInitError(error instanceof Error ? error.message : '初始化失败')
      }
    }

    initializeSystem()
  }, [])

  const testSound = (soundId: SoundId) => {
    console.log(`Testing sound: ${soundId}`)
    soundManager.testSound(soundId)
  }

  const testAllSounds = () => {
    const soundIds = [
      SoundId.BUTTON_CLICK,
      SoundId.ATTACK_LAUNCH,
      SoundId.HIT_BODY,
      SoundId.HIT_HEAD,
      SoundId.ATTACK_MISS,
      SoundId.AIRPLANE_CONFIRM,
      SoundId.GAME_START,
      SoundId.GAME_VICTORY,
      SoundId.GAME_DEFEAT
    ]
    
    soundManager.playSounds(soundIds, 500)
  }

  const playBackgroundMusic = () => {
    soundManager.playMusic(SoundId.GAME_BACKGROUND)
  }

  const stopBackgroundMusic = () => {
    soundManager.stopMusic()
  }

  if (initError) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="音效系统初始化失败"
          description={`错误信息: ${initError}`}
          type="error"
          showIcon
        />
        <Paragraph style={{ marginTop: '16px' }}>
          <Text type="secondary">
            这可能是因为缺少音频文件。请查看控制台了解详细错误信息。
          </Text>
        </Paragraph>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px' }}>正在初始化音效系统...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>
        <SoundOutlined /> 音效系统测试
      </Title>
      
      <Alert
        message="音效系统测试页面"
        description="此页面用于测试音效系统的各项功能。由于缺少实际音频文件，可能会有加载错误，但系统架构已完整实现。"
        type="info"
        showIcon
        style={{ marginBottom: '20px' }}
      />

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="系统状态" size="small">
            <div style={{ fontSize: '12px' }}>
              <div>初始化状态: {systemStatus.initialized ? '✅ 已初始化' : '❌ 未初始化'}</div>
              <div>当前音乐: {systemStatus.currentMusic || '无'}</div>
              <div>播放中音效: {systemStatus.playingCount || 0}</div>
              <div>加载统计: 总计 {loadStats.total || 0}, 已加载 {loadStats.loaded || 0}</div>
            </div>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title="背景音乐控制" size="small">
            <Space>
              <Button 
                icon={<PlayCircleOutlined />} 
                onClick={playBackgroundMusic}
                size="small"
              >
                播放背景音乐
              </Button>
              <Button 
                icon={<PauseCircleOutlined />} 
                onClick={stopBackgroundMusic}
                size="small"
              >
                停止背景音乐
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Title level={3}>UI音效测试</Title>
      <Space wrap>
        <Button onClick={() => testSound(SoundId.BUTTON_CLICK)}>
          按钮点击音效
        </Button>
      </Space>

      <Divider />

      <Title level={3}>游戏音效测试</Title>
      <Space wrap>
        <Button onClick={() => testSound(SoundId.ATTACK_LAUNCH)}>
          攻击发射
        </Button>
        <Button onClick={() => testSound(SoundId.HIT_BODY)}>
          击中机身
        </Button>
        <Button onClick={() => testSound(SoundId.HIT_HEAD)}>
          击中机头
        </Button>
        <Button onClick={() => testSound(SoundId.ATTACK_MISS)}>
          攻击miss
        </Button>
        <Button onClick={() => testSound(SoundId.AIRPLANE_CONFIRM)}>
          飞机确认
        </Button>
      </Space>

      <Divider />

      <Title level={3}>事件音效测试</Title>
      <Space wrap>
        <Button onClick={() => testSound(SoundId.GAME_START)}>
          游戏开始
        </Button>
        <Button onClick={() => testSound(SoundId.GAME_VICTORY)}>
          游戏胜利
        </Button>
        <Button onClick={() => testSound(SoundId.GAME_DEFEAT)}>
          游戏失败
        </Button>
      </Space>

      <Divider />

      <Title level={3}>批量测试</Title>
      <Button type="primary" onClick={testAllSounds}>
        测试所有音效（间隔播放）
      </Button>

      <Divider />

      <Alert
        message="使用说明"
        description={
          <ul>
            <li>点击各个按钮测试对应音效</li>
            <li>如果听不到声音，请检查浏览器音量设置</li>
            <li>某些浏览器需要用户交互后才能播放音频</li>
            <li>实际音频文件需要放置在 public/assets/sounds/ 目录中</li>
          </ul>
        }
        type="warning"
        showIcon
      />
    </div>
  )
}