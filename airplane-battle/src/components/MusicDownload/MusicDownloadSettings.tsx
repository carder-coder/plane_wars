/**
 * 音乐下载设置组件
 * 管理音乐下载系统的配置选项
 */

import React from 'react'
import { 
  Form, 
  Card, 
  Switch, 
  Select, 
  InputNumber, 
  Button, 
  Space, 
  Divider,
  message,
  Tooltip
} from 'antd'
import { 
  SettingOutlined, 
  FolderOpenOutlined, 
  ReloadOutlined,
  QuestionCircleOutlined 
} from '@ant-design/icons'
import { useMusicDownloadStore } from '../../store/musicDownloadStore'
import { MusicProvider, AudioQuality } from '../../types/musicDownload'

const { Option } = Select

export const MusicDownloadSettings: React.FC = () => {
  const [form] = Form.useForm()
  const { settings, updateSettings, apiStatus } = useMusicDownloadStore()

  // 保存设置
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      updateSettings(values)
      message.success('设置保存成功')
    } catch (error) {
      console.error('保存设置失败:', error)
      message.error('设置保存失败')
    }
  }

  // 重置设置
  const handleReset = () => {
    form.resetFields()
    message.info('设置已重置')
  }

  // 选择下载目录
  const handleSelectDownloadPath = () => {
    // 在实际应用中，这里可以调用 Electron API 打开目录选择对话框
    message.info('请手动输入下载目录路径')
  }

  // 测试API连接
  const handleTestApi = (provider: MusicProvider) => {
    message.loading(`正在测试 ${provider} API 连接...`, 2)
    // 这里可以实现实际的API测试逻辑
    setTimeout(() => {
      message.success(`${provider} API 连接正常`)
    }, 2000)
  }

  return (
    <div className="music-download-settings">
      <Card 
        title={
          <span>
            <SettingOutlined style={{ marginRight: 8 }} />
            下载设置
          </span>
        }
        className="settings-card"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={settings}
          onFinish={handleSave}
        >
          {/* 基本设置 */}
          <div className="settings-section">
            <h3>基本设置</h3>
            
            <Form.Item
              name="autoDownload"
              label={
                <span>
                  自动下载
                  <Tooltip title="添加到队列后自动开始下载">
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </span>
              }
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="defaultQuality"
              label="默认音质"
              tooltip="新添加的下载任务将使用此音质设置"
            >
              <Select>
                <Option value={AudioQuality.LOW}>低质量 (小文件)</Option>
                <Option value={AudioQuality.MEDIUM}>中等质量 (平衡)</Option>
                <Option value={AudioQuality.HIGH}>高质量 (推荐)</Option>
                <Option value={AudioQuality.LOSSLESS}>无损质量 (大文件)</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="downloadPath"
              label="下载目录"
              tooltip="音频文件的保存位置"
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <Form.Item name="downloadPath" noStyle>
                  <Select 
                    style={{ flex: 1 }}
                    placeholder="选择或输入下载目录"
                    mode="tags"
                    maxTagCount={1}
                  >
                    <Option value="./public/assets/sounds">./public/assets/sounds</Option>
                    <Option value="./assets/audio">./assets/audio</Option>
                    <Option value="./downloads">./downloads</Option>
                  </Select>
                </Form.Item>
                <Tooltip title="浏览目录">
                  <Button 
                    icon={<FolderOpenOutlined />} 
                    onClick={handleSelectDownloadPath}
                  />
                </Tooltip>
              </div>
            </Form.Item>

            <Form.Item
              name="maxConcurrent"
              label="最大并发下载数"
              tooltip="同时进行的下载任务数量"
            >
              <InputNumber min={1} max={10} />
            </Form.Item>
          </div>

          <Divider />

          {/* 音频处理设置 */}
          <div className="settings-section">
            <h3>音频处理</h3>
            
            <Form.Item
              name="enableProcessing"
              label={
                <span>
                  启用音频处理
                  <Tooltip title="下载后自动进行格式转换、音量标准化等处理">
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </span>
              }
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="autoIntegration"
              label={
                <span>
                  自动集成到游戏
                  <Tooltip title="下载完成后自动将音频文件添加到游戏音效系统">
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </span>
              }
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="licenseCheck"
              label={
                <span>
                  授权检查
                  <Tooltip title="下载前检查音频文件的使用授权">
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </span>
              }
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>

          <Divider />

          {/* API提供商设置 */}
          <div className="settings-section">
            <h3>音乐库设置</h3>
            
            <Form.Item
              name="providers"
              label="启用的音乐库"
              tooltip="选择要使用的音频资源提供商"
            >
              <Select mode="multiple" placeholder="选择音乐库">
                <Option value={MusicProvider.FREESOUND}>
                  Freesound {apiStatus[MusicProvider.FREESOUND] ? '✅' : '❌'}
                </Option>
                <Option value={MusicProvider.PIXABAY}>
                  Pixabay {apiStatus[MusicProvider.PIXABAY] ? '✅' : '❌'}
                </Option>
                <Option value={MusicProvider.OPENGAMEART}>
                  OpenGameArt {apiStatus[MusicProvider.OPENGAMEART] ? '✅' : '❌'}
                </Option>
                <Option value={MusicProvider.ZAPSPLAT}>
                  Zapsplat {apiStatus[MusicProvider.ZAPSPLAT] ? '✅' : '❌'}
                </Option>
                <Option value={MusicProvider.BBC_SOUND}>
                  BBC Sound {apiStatus[MusicProvider.BBC_SOUND] ? '✅' : '❌'}
                </Option>
              </Select>
            </Form.Item>

            <div className="api-test-section">
              <h4>API 连接测试</h4>
              <Space wrap>
                {Object.values(MusicProvider).map(provider => (
                  <Button
                    key={provider}
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => handleTestApi(provider)}
                    type={apiStatus[provider] ? "default" : "dashed"}
                  >
                    测试 {provider}
                  </Button>
                ))}
              </Space>
            </div>
          </div>

          <Divider />

          {/* 操作按钮 */}
          <div className="settings-actions">
            <Space>
              <Button type="primary" htmlType="submit">
                保存设置
              </Button>
              <Button onClick={handleReset}>
                重置
              </Button>
              <Button 
                onClick={() => {
                  // 导出设置
                  const settingsData = JSON.stringify(settings, null, 2)
                  const blob = new Blob([settingsData], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'music-download-settings.json'
                  a.click()
                  URL.revokeObjectURL(url)
                  message.success('设置已导出')
                }}
              >
                导出设置
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default MusicDownloadSettings