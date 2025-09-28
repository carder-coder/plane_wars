/**
 * 已下载资源面板
 * 显示和管理已下载的音频资源
 */

import React, { useState } from 'react'
import { List, Card, Button, Space, Tag, Tooltip, Modal, message } from 'antd'
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  DeleteOutlined, 
  FolderOpenOutlined,
  SoundOutlined,
  ClockCircleOutlined 
} from '@ant-design/icons'
import { useMusicDownloadStore } from '../../store/musicDownloadStore.ts'
import type { DownloadedResource } from '../../types/musicDownload'

export const DownloadedResourcesPanel: React.FC = () => {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null)
  
  const { 
    downloadedResources, 
    deleteDownloadedResource
  } = useMusicDownloadStore()

  // 获取资源路径的辅助函数
  const getResourcePath = (resource: DownloadedResource): string => {
    return resource.filePath
  }

  // 播放预览
  const handlePlay = async (resource: DownloadedResource) => {
    try {
      // 停止当前播放
      if (previewAudio) {
        previewAudio.pause()
        previewAudio.currentTime = 0
      }

      if (playingId === resource.id) {
        setPlayingId(null)
        setPreviewAudio(null)
        return
      }

      const filePath = getResourcePath(resource)
      const audio = new Audio(filePath)
      
      audio.onended = () => {
        setPlayingId(null)
        setPreviewAudio(null)
      }
      
      audio.onerror = () => {
        message.error('音频播放失败')
        setPlayingId(null)
        setPreviewAudio(null)
      }

      await audio.play()
      setPlayingId(resource.id)
      setPreviewAudio(audio)
      
    } catch (error) {
      console.error('播放音频失败:', error)
      message.error('音频播放失败')
    }
  }

  // 停止播放
  const handleStop = () => {
    if (previewAudio) {
      previewAudio.pause()
      previewAudio.currentTime = 0
    }
    setPlayingId(null)
    setPreviewAudio(null)
  }

  // 删除资源
  const handleDelete = (resource: DownloadedResource) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除音频资源 "${resource.name}" 吗？`,
      onOk: async () => {
        try {
          await deleteDownloadedResource(resource.id)
          message.success('资源删除成功')
          
          // 如果正在播放被删除的资源，停止播放
          if (playingId === resource.id) {
            handleStop()
          }
        } catch (error) {
          console.error('删除资源失败:', error)
          message.error('删除资源失败')
        }
      }
    })
  }

  // 打开文件位置
  const handleOpenFolder = (resource: DownloadedResource) => {
    const filePath = getResourcePath(resource)
    // 在实际应用中，这里可以调用 Electron API 打开文件夹
    message.info(`文件位置: ${filePath}`)
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化时长
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (downloadedResources.length === 0) {
    return (
      <div className="empty-state">
        <SoundOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
        <p style={{ marginTop: 16, color: '#999' }}>
          还没有下载任何音频资源
        </p>
      </div>
    )
  }

  return (
    <div className="downloaded-resources-panel">
      <div className="panel-header">
        <h3>已下载资源 ({downloadedResources.length})</h3>
      </div>
      
      <List<DownloadedResource>
        className="resources-list"
        dataSource={downloadedResources}
        renderItem={(resource: DownloadedResource) => (
          <List.Item
            key={resource.id}
            className="resource-item"
          >
            <Card 
              size="small" 
              className={`resource-card ${playingId === resource.id ? 'playing' : ''}`}
            >
              <div className="resource-info">
                <div className="resource-header">
                  <h4 className="resource-title" title={resource.name}>
                    {resource.name}
                  </h4>
                  <div className="resource-meta">
                    <Tag color="blue">{resource.category}</Tag>
                    {resource.duration && (
                      <Tag icon={<ClockCircleOutlined />}>
                        {formatDuration(resource.duration)}
                      </Tag>
                    )}
                  </div>
                </div>
                
                <div className="resource-details">
                  <span className="file-size">{formatFileSize(resource.fileSize)}</span>
                  <span className="download-date">
                    下载于 {new Date(resource.downloadedAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="resource-actions">
                  <Space>
                    <Button
                      type="text"
                      icon={playingId === resource.id ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                      onClick={() => handlePlay(resource)}
                    >
                      {playingId === resource.id ? '停止' : '播放'}
                    </Button>
                    
                    <Tooltip title="打开文件位置">
                      <Button
                        type="text"
                        icon={<FolderOpenOutlined />}
                        onClick={() => handleOpenFolder(resource)}
                      />
                    </Tooltip>
                    
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(resource)}
                    >
                      删除
                    </Button>
                  </Space>
                </div>
              </div>
            </Card>
          </List.Item>
        )}
      />
    </div>
  )
}

export default DownloadedResourcesPanel