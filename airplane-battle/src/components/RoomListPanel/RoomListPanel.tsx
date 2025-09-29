import React, { useEffect, useState } from 'react'
import { 
  Card, 
  Button, 
  Input, 
  Select, 
  Space, 
  List, 
  Tag, 
  Avatar, 
  Typography, 
  Empty, 
  Spin, 
  Row,
  Col,
  Tooltip
} from 'antd'
import { 
  ArrowLeftOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  UserOutlined,
  LockOutlined,
  UnlockOutlined,
  TeamOutlined,
  PlayCircleOutlined
} from '@ant-design/icons'
import { useNetworkStore } from '../../store/networkStore'
import { RoomListItem } from '../../types/network'
import { CreateRoomModal } from '../CreateRoomModal/CreateRoomModal'
import { JoinRoomModal } from '../JoinRoomModal/JoinRoomModal'
import './RoomListPanel.css'

const { Title, Text } = Typography
const { Search } = Input
const { Option } = Select

/**
 * 房间卡片组件
 */
interface RoomCardProps {
  room: RoomListItem
  onJoin: (roomId: string, needPassword: boolean) => void
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onJoin }) => {
  const getStatusColor = () => {
    switch (room.status) {
      case 'waiting': return 'green'
      case 'playing': return 'orange'
      case 'finished': return 'default'
      default: return 'default'
    }
  }

  const getStatusText = () => {
    switch (room.status) {
      case 'waiting': return '等待中'
      case 'playing': return '游戏中'
      case 'finished': return '已结束'
      default: return '未知'
    }
  }

  const canJoin = room.status === 'waiting' && room.currentPlayers < room.maxPlayers

  return (
    <Card 
      className={`room-card ${canJoin ? 'joinable' : 'not-joinable'}`}
      hoverable={canJoin}
      actions={canJoin ? [
        <Button 
          key="join"
          type="primary" 
          icon={<PlayCircleOutlined />}
          onClick={() => onJoin(room.roomId, room.needPassword)}
        >
          加入房间
        </Button>
      ] : undefined}
    >
      <div className="room-header">
        <div className="room-title">
          <Title level={5} className="room-name">
            {room.roomName}
          </Title>
          <Space>
            {room.roomType === 'private' ? (
              <Tooltip title="私密房间">
                <LockOutlined className="room-type-icon private" />
              </Tooltip>
            ) : (
              <Tooltip title="公开房间">
                <UnlockOutlined className="room-type-icon public" />
              </Tooltip>
            )}
            <Tag color={getStatusColor()}>{getStatusText()}</Tag>
          </Space>
        </div>
        
        <div className="room-info">
          <div className="room-players">
            <TeamOutlined />
            <Text>{room.currentPlayers}/{room.maxPlayers}</Text>
          </div>
          
          <div className="room-host">
            <Avatar size="small" icon={<UserOutlined />} />
            <Text type="secondary">{room.hostUsername}</Text>
          </div>
        </div>
      </div>
      
      <div className="room-meta">
        <Text type="secondary" className="room-created">
          创建于 {new Date(room.createdAt).toLocaleString()}
        </Text>
      </div>
    </Card>
  )
}

/**
 * 房间列表面板组件
 */
export const RoomListPanel: React.FC = () => {
  const { 
    roomList, 
    roomFilters,
    setCurrentView, 
    loadRoomList,
    updateRoomFilters,
    joinRoom
  } = useNetworkStore()

  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')

  useEffect(() => {
    handleRefresh()
  }, [])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await loadRoomList()
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = (roomId: string, needPassword: boolean) => {
    setSelectedRoomId(roomId)
    if (needPassword) {
      setShowJoinModal(true)
    } else {
      joinRoom(roomId)
    }
  }

  const handleSearch = (value: string) => {
    updateRoomFilters({ searchText: value })
  }

  const handleStatusFilter = (status: string) => {
    updateRoomFilters({ 
      status: status as 'waiting' | 'playing' | 'all' 
    })
  }

  const handleTypeFilter = (type: string) => {
    updateRoomFilters({ 
      type: type as 'public' | 'private' | 'all' 
    })
  }

  const handleSortChange = (sortBy: string) => {
    updateRoomFilters({ 
      sortBy: sortBy as 'createdAt' | 'playerCount' 
    })
  }

  return (
    <div className="room-list-panel">
      <div className="room-list-container">
        {/* 页面标题和返回按钮 */}
        <div className="panel-header">
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={() => setCurrentView('mainMenu')}
            className="back-button"
          >
            返回主菜单
          </Button>
          
          <Title level={2} className="panel-title">房间列表</Title>
          
          <Button 
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowCreateModal(true)}
            className="create-button"
          >
            创建房间
          </Button>
        </div>

        {/* 筛选和搜索栏 */}
        <Card className="filter-card">
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Search
                placeholder="搜索房间名称或房主..."
                value={roomFilters.searchText}
                onChange={(e) => handleSearch(e.target.value)}
                onSearch={handleSearch}
                enterButton={<SearchOutlined />}
                allowClear
              />
            </Col>
            
            <Col>
              <Select
                value={roomFilters.status}
                onChange={handleStatusFilter}
                style={{ width: 120 }}
              >
                <Option value="all">全部状态</Option>
                <Option value="waiting">等待中</Option>
                <Option value="playing">游戏中</Option>
              </Select>
            </Col>
            
            <Col>
              <Select
                value={roomFilters.type}
                onChange={handleTypeFilter}
                style={{ width: 120 }}
              >
                <Option value="all">全部类型</Option>
                <Option value="public">公开房间</Option>
                <Option value="private">私密房间</Option>
              </Select>
            </Col>
            
            <Col>
              <Select
                value={roomFilters.sortBy}
                onChange={handleSortChange}
                style={{ width: 120 }}
              >
                <Option value="createdAt">创建时间</Option>
                <Option value="playerCount">玩家数量</Option>
              </Select>
            </Col>
            
            <Col>
              <Button 
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              >
                刷新
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 房间列表 */}
        <Card className="room-list-card">
          {loading ? (
            <div className="loading-container">
              <Spin size="large" />
              <Text>加载房间列表中...</Text>
            </div>
          ) : roomList.length === 0 ? (
            <Empty
              description="暂无房间"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setShowCreateModal(true)}
              >
                创建第一个房间
              </Button>
            </Empty>
          ) : (
            <List
              grid={{ 
                gutter: 16, 
                xs: 1, 
                sm: 1, 
                md: 2, 
                lg: 2, 
                xl: 3,
                xxl: 4 
              }}
              dataSource={roomList}
              renderItem={(room: RoomListItem) => (
                <List.Item>
                  <RoomCard 
                    room={room} 
                    onJoin={handleJoinRoom}
                  />
                </List.Item>
              )}
            />
          )}
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
        roomId={selectedRoomId}
        onClose={() => {
          setShowJoinModal(false)
          setSelectedRoomId('')
        }}
      />
    </div>
  )
}