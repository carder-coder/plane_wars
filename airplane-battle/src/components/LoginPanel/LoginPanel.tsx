import React, { useState } from 'react'
import { Button, Form, Input, message, Card, Tabs } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNetworkStore } from '../../store/networkStore'

/**
 * 登录/注册组件
 */
export const LoginPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('login')
  const [loginForm] = Form.useForm()
  const [registerForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  
  const { login, register, isAuthenticated } = useNetworkStore()

  // 处理登录
  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const success = await login(values.username, values.password)
      if (success) {
        message.success('登录成功！')
      } else {
        message.error('登录失败，请检查用户名和密码')
      }
    } catch (error) {
      message.error('登录过程中发生错误')
    } finally {
      setLoading(false)
    }
  }

  // 处理注册
  const handleRegister = async (values: {
    username: string
    email: string
    password: string
    displayName?: string
  }) => {
    setLoading(true)
    try {
      const success = await register(values)
      if (success) {
        message.success('注册成功！请登录')
        setActiveTab('login')
        registerForm.resetFields()
      } else {
        message.error('注册失败，请检查输入信息')
      }
    } catch (error) {
      message.error('注册过程中发生错误')
    } finally {
      setLoading(false)
    }
  }

  // 如果已登录，不显示登录面板
  if (isAuthenticated) {
    return null
  }

  const loginTab = (
    <Form
      form={loginForm}
      name="login"
      onFinish={handleLogin}
      layout="vertical"
      size="large"
    >
      <Form.Item
        name="username"
        rules={[{ required: true, message: '请输入用户名' }]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="用户名"
          autoComplete="username"
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[{ required: true, message: '请输入密码' }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="密码"
          autoComplete="current-password"
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
        >
          登录
        </Button>
      </Form.Item>
    </Form>
  )

  const registerTab = (
    <Form
      form={registerForm}
      name="register"
      onFinish={handleRegister}
      layout="vertical"
      size="large"
    >
      <Form.Item
        name="username"
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 3, message: '用户名至少3个字符' },
          { max: 30, message: '用户名最多30个字符' },
          { pattern: /^[a-zA-Z0-9]+$/, message: '用户名只能包含字母和数字' }
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="用户名"
          autoComplete="username"
        />
      </Form.Item>

      <Form.Item
        name="email"
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' }
        ]}
      >
        <Input
          prefix={<MailOutlined />}
          placeholder="邮箱"
          autoComplete="email"
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[
          { required: true, message: '请输入密码' },
          { min: 6, message: '密码至少6个字符' },
          { 
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
            message: '密码必须包含大小写字母和数字' 
          }
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="密码"
          autoComplete="new-password"
        />
      </Form.Item>

      <Form.Item
        name="displayName"
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="显示名称（可选）"
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
        >
          注册
        </Button>
      </Form.Item>
    </Form>
  )

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card
        style={{
          width: 400,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}
        title={
          <div style={{ textAlign: 'center' }}>
            <h2>✈️ 飞机大战</h2>
            <p>多人在线对战游戏</p>
          </div>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            {
              key: 'login',
              label: '登录',
              children: loginTab
            },
            {
              key: 'register',
              label: '注册',
              children: registerTab
            }
          ]}
        />
      </Card>
    </div>
  )
}