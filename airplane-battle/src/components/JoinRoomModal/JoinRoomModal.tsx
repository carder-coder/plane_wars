import React, { useState, useEffect } from 'react'
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  Space, 
  Typography,
  message,
  Divider
} from 'antd'
import { 
  LoginOutlined,
  LockOutlined
} from '@ant-design/icons'
import { useNetworkStore } from '../../store/networkStore'
import './JoinRoomModal.css'

const { Title, Text } = Typography

interface JoinRoomModalProps {
  open: boolean
  roomId?: string
  onClose: () => void
}

/**
 * 加入房间弹窗组件
 */
export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  open,
  roomId,
  onClose
}) => {
  const { joinRoom, roomList } = useNetworkStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  // 获取房间信息
  const roomInfo = roomList.find(room => room.roomId === roomId)

  useEffect(() => {
    if (open && roomId) {
      form.setFieldsValue({ roomId })
    }
  }, [open, roomId, form])

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      
      const success = await joinRoom(values.roomId, values.password)
      
      if (success) {
        message.success('正在加入房间...')
        form.resetFields()
        onClose()
      } else {
        message.error('加入房间失败，请检查房间ID和密码')
      }
    } catch (error) {
      console.error('加入房间错误:', error)
      message.error('加入房间失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title={
        <div className="modal-title">
          <LoginOutlined />
          <span>加入房间</span>
        </div>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={480}
      centered
      className="join-room-modal"
      destroyOnClose
    >
      <div className="modal-content">
        {roomInfo ? (
          <div className="room-info-section">
            <Text type="secondary" className="modal-description">
              您正在加入房间：<Text strong>{roomInfo.roomName}</Text>
            </Text>
            {roomInfo.needPassword && (
              <Text type="warning" className="password-hint">
                此房间需要密码才能加入
              </Text>
            )}
          </div>
        ) : (
          <Text type="secondary" className="modal-description">
            输入房间ID和密码（如果需要）来加入游戏
          </Text>
        )}
        
        <Divider />
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            roomId: roomId || '',
            password: ''
          }}
          className="join-room-form"
        >
          <Form.Item
            name="roomId"
            label="房间ID"
            rules={[
              { required: true, message: '请输入房间ID' },
              { 
                pattern: /^[a-zA-Z0-9-_]+$/, 
                message: '房间ID格式不正确' 
              }
            ]}
          >
            <Input
              placeholder="输入要加入的房间ID"
              size="large"
              disabled={!!roomId} // 如果通过房间列表进入，禁用编辑
              className={roomId ? 'disabled-input' : ''}
            />
          </Form.Item>

          {(roomInfo?.needPassword || !roomInfo) && (
            <Form.Item
              name="password"
              label="房间密码"
              rules={
                roomInfo?.needPassword 
                  ? [{ required: true, message: '此房间需要密码' }]
                  : []
              }
            >
              <Input.Password
                placeholder={roomInfo?.needPassword ? "输入房间密码" : "如果房间有密码请输入"}
                size="large"
                prefix={<LockOutlined className="input-icon" />}
                maxLength={20}
              />
            </Form.Item>
          )}

          <Form.Item className="form-actions">
            <Space className="action-buttons">
              <Button 
                onClick={handleCancel}
                size="large"
                className="cancel-button"
              >
                取消
              </Button>
              
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                size="large"
                className="join-button"
                icon={<LoginOutlined />}
              >
                {loading ? '加入中...' : '加入房间'}
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {roomInfo && (
          <>
            <Divider />
            <div className="room-details">
              <Title level={5}>房间详情</Title>
              <div className="detail-item">
                <Text type="secondary">房间名称：</Text>
                <Text>{roomInfo.roomName}</Text>
              </div>
              <div className="detail-item">
                <Text type="secondary">房主：</Text>
                <Text>{roomInfo.hostUsername}</Text>
              </div>
              <div className="detail-item">
                <Text type="secondary">玩家数量：</Text>
                <Text>{roomInfo.currentPlayers}/{roomInfo.maxPlayers}</Text>
              </div>
              <div className="detail-item">
                <Text type="secondary">房间类型：</Text>
                <Text>{roomInfo.roomType === 'public' ? '公开房间' : '私密房间'}</Text>
              </div>
              <div className="detail-item">
                <Text type="secondary">状态：</Text>
                <Text className={`status-${roomInfo.status}`}>
                  {roomInfo.status === 'waiting' ? '等待中' : 
                   roomInfo.status === 'playing' ? '游戏中' : '已结束'}
                </Text>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}