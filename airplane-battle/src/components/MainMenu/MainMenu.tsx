import React, { useState } from 'react'
import { Card, Button, Avatar, Space, Typography, Badge, Divider, Modal } from 'antd'
import { 
  UserOutlined, 
  PlusOutlined, 
  UnorderedListOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  LogoutOutlined,
  WifiOutlined,
  DisconnectOutlined
} from '@ant-design/icons'
import { useNetworkStore } from '../../store/networkStore'
import { CreateRoomModal } from '../CreateRoomModal/CreateRoomModal'
import { JoinRoomModal } from '../JoinRoomModal/JoinRoomModal'
import './MainMenu.css'

const { Title, Text } = Typography

/**
 * 主菜单组件
 */
export const MainMenu: React.FC = () => {
  const { 
    user, 
    isOnline, 
    setCurrentView,
    logout,
    loadRoomList
  } = useNetworkStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // 处理房间列表
  const handleViewRoomList = async () => {
    await loadRoomList()
    setCurrentView('roomList')
  }

  // 处理快速匹配
  const handleQuickMatch = async () => {
    await loadRoomList()
    setCurrentView('roomList')
  }

  // 处理登出
  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = async () => {
    await logout()
    setShowLogoutConfirm(false)
  }

  const getConnectionStatus = () => {
    if (isOnline) {
      return <Badge status="success" text="在线" />
    } else {
      return <Badge status="error" text="离线" />
    }
  }

  return (
    <div className="main-menu">
      <div className="main-menu-container">
        {/* 用户信息卡片 */}
        <Card className="user-info-card">
          <div className="user-header">
            <Avatar 
              size={64} 
              src={user?.avatarUrl} 
              icon={<UserOutlined />}
              className="user-avatar"
            />
            <div className="user-details">
              <Title level={4} className="username">
                {user?.displayName || user?.username}
              </Title>
              <Space direction="vertical" size="small">
                <Text type="secondary">等级 {user?.level || 1}</Text>
                <Text type="secondary">评分 {user?.rating || 1000}</Text>
                <div className="connection-status">
                  {isOnline ? <WifiOutlined /> : <DisconnectOutlined />}
                  {getConnectionStatus()}
                </div>
              </Space>
            </div>
          </div>
          
          <Divider />
          
          <div className="user-stats">
            <div className="stat-item">
              <Text strong>{user?.wins || 0}</Text>
              <Text type="secondary">胜利</Text>
            </div>
            <div className="stat-item">
              <Text strong>{user?.losses || 0}</Text>
              <Text type="secondary">失败</Text>
            </div>
            <div className="stat-item">
              <Text strong>{user?.experience || 0}</Text>
              <Text type="secondary">经验</Text>
            </div>
          </div>
        </Card>

        {/* 主要功能按钮 */}
        <Card className="menu-actions-card">
          <Title level={3} className="menu-title">游戏大厅</Title>
          
          <Space direction="vertical" size="large" className="menu-buttons">
            <Button 
              type="primary" 
              size="large" 
              icon={<UnorderedListOutlined />}
              onClick={handleViewRoomList}
              block
              className="menu-button primary-button"
            >
              房间列表
            </Button>
            
            <Button 
              size="large" 
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
              block
              className="menu-button"
            >
              创建房间
            </Button>
            
            <Button 
              size="large" 
              icon={<ThunderboltOutlined />}
              onClick={handleQuickMatch}
              block
              className="menu-button"
            >
              快速匹配
            </Button>
          </Space>
          
          <Divider />
          
          <Space direction="vertical" size="middle" className="secondary-buttons">
            <Button 
              icon={<SettingOutlined />}
              onClick={() => {/* TODO: 打开设置 */}}
              block
              ghost
            >
              设置
            </Button>
            
            <Button 
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              block
              danger
              ghost
            >
              退出登录
            </Button>
          </Space>
        </Card>
      </div>

      {/* 创建房间弹窗 */}
      <CreateRoomModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* 加入房间弹窗 */}
      <JoinRoomModal
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />

      {/* 登出确认弹窗 */}
      <Modal
        title="确认退出"
        open={showLogoutConfirm}
        onOk={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        okText="确认"
        cancelText="取消"
      >
        <p>确定要退出登录吗？</p>
      </Modal>
    </div>
  )
}