import React, { useState } from 'react'
import { 
  Modal, 
  Form, 
  Input, 
  Radio, 
  Button, 
  Space, 
  Typography,
  message,
  Divider
} from 'antd'
import { 
  PlusOutlined,
  LockOutlined,
  UnlockOutlined,
  UserOutlined
} from '@ant-design/icons'
import { useNetworkStore } from '../../store/networkStore'
import { CreateRoomRequest } from '../../types/network'
import './CreateRoomModal.css'

const { Text } = Typography

interface CreateRoomModalProps {
  open: boolean
  onClose: () => void
}

/**
 * 创建房间弹窗组件
 */
export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  open,
  onClose
}) => {
  const { createRoom } = useNetworkStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [roomType, setRoomType] = useState<'public' | 'private'>('public')

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      
      const roomData: CreateRoomRequest = {
        roomName: values.roomName.trim(),
        roomType: values.roomType,
        password: values.roomType === 'private' ? values.password : undefined
      }

      const success = await createRoom(roomData)
      
      if (success) {
        message.success('房间创建成功！')
        form.resetFields()
        onClose()
      } else {
        message.error('房间创建失败，请重试')
      }
    } catch (error) {
      console.error('创建房间错误:', error)
      message.error('房间创建失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setRoomType('public')
    onClose()
  }

  const handleRoomTypeChange = (e: any) => {
    setRoomType(e.target.value)
    if (e.target.value === 'public') {
      form.setFieldsValue({ password: undefined })
    }
  }

  return (
    <Modal
      title={
        <div className="modal-title">
          <PlusOutlined />
          <span>创建房间</span>
        </div>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={480}
      centered
      className="create-room-modal"
      destroyOnClose
    >
      <div className="modal-content">
        <Text type="secondary" className="modal-description">
          创建一个新的游戏房间，与朋友一起开始飞机大战！
        </Text>
        
        <Divider />
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            roomType: 'public',
            roomName: ''
          }}
          className="create-room-form"
        >
          <Form.Item
            name="roomName"
            label="房间名称"
            rules={[
              { required: true, message: '请输入房间名称' },
              { min: 1, max: 30, message: '房间名称长度应在1-30字符之间' },
              { 
                pattern: /^[^\s].*[^\s]$|^[^\s]$/, 
                message: '房间名称不能以空格开头或结尾' 
              }
            ]}
          >
            <Input
              placeholder="输入房间名称（1-30字符）"
              maxLength={30}
              showCount
              size="large"
              prefix={<UserOutlined className="input-icon" />}
            />
          </Form.Item>

          <Form.Item
            name="roomType"
            label="房间类型"
            rules={[{ required: true, message: '请选择房间类型' }]}
          >
            <Radio.Group 
              onChange={handleRoomTypeChange}
              value={roomType}
              className="room-type-radio"
            >
              <Space direction="vertical" size="middle">
                <Radio value="public" className="radio-option">
                  <div className="radio-content">
                    <div className="radio-header">
                      <UnlockOutlined className="radio-icon public" />
                      <span className="radio-title">公开房间</span>
                    </div>
                    <Text type="secondary" className="radio-description">
                      任何人都可以查看和加入此房间
                    </Text>
                  </div>
                </Radio>
                
                <Radio value="private" className="radio-option">
                  <div className="radio-content">
                    <div className="radio-header">
                      <LockOutlined className="radio-icon private" />
                      <span className="radio-title">私密房间</span>
                    </div>
                    <Text type="secondary" className="radio-description">
                      需要密码才能加入此房间
                    </Text>
                  </div>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          {roomType === 'private' && (
            <Form.Item
              name="password"
              label="房间密码"
              rules={[
                { required: true, message: '私密房间需要设置密码' },
                { min: 4, max: 8, message: '密码长度应在4-8字符之间' },
                { 
                  pattern: /^[a-zA-Z0-9]+$/, 
                  message: '密码只能包含字母和数字' 
                }
              ]}
              className="password-field"
            >
              <Input.Password
                placeholder="输入房间密码（4-8位字母数字）"
                maxLength={8}
                showCount
                size="large"
                prefix={<LockOutlined className="input-icon" />}
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
                className="create-button"
                icon={<PlusOutlined />}
              >
                {loading ? '创建中...' : '创建房间'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  )
}