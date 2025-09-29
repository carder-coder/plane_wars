import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Button, 
  Avatar, 
  List, 
  Typography, 
  Space, 
  Badge,
  Modal,
  Input,
  message,
  Row,
  Col,
  Tag,
  Tooltip
} from 'antd'
import { 
  ArrowLeftOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  MessageOutlined,
  SendOutlined,
  CrownOutlined,
  TeamOutlined
} from '@ant-design/icons'
import { useNetworkStore } from '../../store/networkStore'
import { PlayerInfo, ChatMessage } from '../../types/network'
import './GameLobby.css'

const { Title, Text } = Typography
const { TextArea } = Input

/**
 * 玩家卡片组件
 */
interface PlayerCardProps {
  player: PlayerInfo
  isCurrentUser: boolean
  isHost: boolean
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, isCurrentUser, isHost }) => {
  return (
    <Card className={`player-card ${isCurrentUser ? 'current-user' : ''}`} size="small">
      <div className="player-info">
        <Avatar 
          size={48} 
          src={player.avatarUrl} 
          icon={<UserOutlined />}
          className="player-avatar"
        />
        
        <div className="player-details">
          <div className="player-name">
            <Text strong>{player.displayName || player.username}</Text>
            {isHost && (
              <Tooltip title="房主">
                <CrownOutlined className="host-icon" />
              </Tooltip>
            )}
            {isCurrentUser && (
              <Tag color="blue">你</Tag>
            )}
          </div>
          
          <div className="player-stats">
            {player.level && (
              <Text type="secondary" className="player-level">
                等级 {player.level}
              </Text>
            )}
            {player.rating && (
              <Text type="secondary" className="player-rating">
                评分 {player.rating}
              </Text>
            )}
          </div>
        </div>
        
        <div className="player-status">
          <div className="connection-status">
            <Badge 
              status={player.isConnected ? "success" : "error"} 
              text={player.isConnected ? "在线" : "离线"}
            />
          </div>
          
          <div className="ready-status">
            {player.isReady ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                已准备
              </Tag>
            ) : (
              <Tag color="default" icon={<CloseCircleOutlined />}>
                未准备
              </Tag>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * 游戏大厅组件
 */
export const GameLobby: React.FC = () => {
  const { 
    currentRoom, 
    lobbyPlayers, 
    user,
    setCurrentView,
    leaveRoom,
    togglePlayerReady,
    sendChatMessage
  } = useNetworkStore()

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory] = useState<ChatMessage[]>([])

  // 检查当前用户是否是房主
  const isHost = currentRoom?.hostUserId === user?.userId
  
  // 检查当前用户的准备状态
  const currentPlayer = lobbyPlayers.find(p => p.userId === user?.userId)
  const isCurrentUserReady = currentPlayer?.isReady || false
  
  // 检查是否所有玩家都已准备
  const allPlayersReady = lobbyPlayers.length >= 2 && 
    lobbyPlayers.every(p => p.isReady) &&
    currentRoom?.status === 'waiting'

  useEffect(() => {
    if (!currentRoom) {
      setCurrentView('mainMenu')
    }
  }, [currentRoom, setCurrentView])

  const handleLeaveRoom = () => {
    setShowLeaveConfirm(true)
  }

  const confirmLeaveRoom = async () => {
    await leaveRoom()
    setShowLeaveConfirm(false)
  }

  const handleToggleReady = () => {
    togglePlayerReady()
  }

  const handleStartGame = () => {
    if (isHost && allPlayersReady) {
      // 发送开始游戏请求
      message.success('游戏即将开始...')
      // TODO: 实现开始游戏逻辑
    }
  }

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      sendChatMessage(chatMessage.trim())
      setChatMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!currentRoom) {
    return null
  }

  return (
    <div className="game-lobby">
      <div className="lobby-container">
        {/* 页面标题 */}
        <div className="lobby-header">
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={handleLeaveRoom}
            className="leave-button"
          >
            离开房间
          </Button>
          
          <div className="room-info">
            <Title level={3} className="room-name">
              {currentRoom.roomName}
            </Title>
            <Space>
              <Tag color="blue">
                <TeamOutlined /> {currentRoom.currentPlayers}/{currentRoom.maxPlayers}
              </Tag>
              <Tag color={currentRoom.status === 'waiting' ? 'green' : 'orange'}>
                {currentRoom.status === 'waiting' ? '等待中' : '游戏中'}
              </Tag>
            </Space>
          </div>
        </div>

        <Row gutter={24} className="lobby-content">
          {/* 左侧 - 玩家列表和控制面板 */}
          <Col xs={24} md={16} className="left-panel">
            {/* 玩家列表 */}
            <Card title="玩家列表" className="players-card">
              <List
                dataSource={lobbyPlayers}
                renderItem={(player: PlayerInfo) => (
                  <List.Item key={player.userId}>
                    <PlayerCard
                      player={player}
                      isCurrentUser={player.userId === user?.userId}
                      isHost={player.userId === currentRoom.hostUserId}
                    />
                  </List.Item>
                )}
                locale={{ emptyText: '暂无玩家' }}
              />
              
              {/* 空位提示 */}
              {Array.from({ length: currentRoom.maxPlayers - lobbyPlayers.length }).map((_, index) => (
                <Card key={`empty-${index}`} className="empty-slot" size="small">
                  <div className="empty-slot-content">
                    <Avatar size={48} icon={<UserOutlined />} className="empty-avatar" />
                    <Text type="secondary">等待玩家加入...</Text>
                  </div>
                </Card>
              ))}
            </Card>

            {/* 控制面板 */}
            <Card className="control-panel">
              <Space size="large" className="control-buttons">
                <Button
                  type={isCurrentUserReady ? "default" : "primary"}
                  size="large"
                  icon={isCurrentUserReady ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
                  onClick={handleToggleReady}
                  className={`ready-button ${isCurrentUserReady ? 'ready' : 'not-ready'}`}
                >
                  {isCurrentUserReady ? '取消准备' : '准备'}
                </Button>

                {isHost && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlayCircleOutlined />}
                    onClick={handleStartGame}
                    disabled={!allPlayersReady}
                    className="start-button"
                  >
                    开始游戏
                  </Button>
                )}
              </Space>

              {isHost && !allPlayersReady && (
                <div className="start-hint">
                  <Text type="secondary">
                    需要所有玩家都准备后才能开始游戏
                  </Text>
                </div>
              )}
            </Card>
          </Col>

          {/* 右侧 - 聊天区域 */}
          <Col xs={24} md={8} className="right-panel">
            <Card 
              title={
                <Space>
                  <MessageOutlined />
                  <span>房间聊天</span>
                </Space>
              }
              className="chat-card"
            >
              <div className="chat-messages">
                {chatHistory.length === 0 ? (
                  <div className="no-messages">
                    <Text type="secondary">暂无聊天记录</Text>
                  </div>
                ) : (
                  <List
                    size="small"
                    dataSource={chatHistory}
                    renderItem={(msg: ChatMessage) => (
                      <List.Item key={msg.messageId} className="chat-message">
                        <div className="message-content">
                          <Text strong className="message-user">
                            {msg.username}:
                          </Text>
                          <Text className="message-text">{msg.message}</Text>
                          <Text type="secondary" className="message-time">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </Text>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </div>

              <div className="chat-input">
                <Input.Group compact>
                  <TextArea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入聊天消息..."
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    maxLength={200}
                    showCount
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim()}
                    className="send-button"
                  >
                    发送
                  </Button>
                </Input.Group>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* 离开房间确认弹窗 */}
      <Modal
        title="确认离开"
        open={showLeaveConfirm}
        onOk={confirmLeaveRoom}
        onCancel={() => setShowLeaveConfirm(false)}
        okText="确认离开"
        cancelText="取消"
      >
        <p>确定要离开这个房间吗？</p>
      </Modal>
    </div>
  )
}