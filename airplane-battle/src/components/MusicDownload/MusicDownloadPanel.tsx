/**
 * 音乐下载管理面板
 * 音乐下载系统的主界面组件
 */

import React, { useState, useEffect } from 'react'
import { Card, Tabs, message } from 'antd'
import { DownloadOutlined, SearchOutlined, SettingOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { MusicSearchPanel } from './MusicSearchPanel'
import { DownloadQueuePanel } from './DownloadQueuePanel'
import { DownloadedResourcesPanel } from './DownloadedResourcesPanel'
import { MusicDownloadSettings } from './MusicDownloadSettings'
import { useMusicDownloadStore } from '../../store/musicDownloadStore'
import './MusicDownloadPanel.css'

/**
 * 音乐下载管理面板组件
 */
export const MusicDownloadPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('search')
  const [isInitialized, setIsInitialized] = useState(false)
  
  const {
    isInitialized: storeInitialized,
    initialize,
    downloadQueue,
    downloadedResources,
    getOverallProgress
  } = useMusicDownloadStore()

  // 初始化音乐下载系统
  useEffect(() => {
    const initializeSystem = async () => {
      if (!storeInitialized) {
        try {
          await initialize()
          setIsInitialized(true)
          message.success('音乐下载系统初始化成功')
        } catch (error) {
          console.error('Failed to initialize music download system:', error)
          message.error('音乐下载系统初始化失败')
        }
      } else {
        setIsInitialized(true)
      }
    }

    initializeSystem()
  }, [storeInitialized, initialize])

  // 获取整体进度信息
  const overallProgress = getOverallProgress()
  const hasActiveDownloads = downloadQueue.some((task: any) => 
    task.status === 'downloading' || task.status === 'pending'
  )

  // 标签页配置
  const tabItems = [
    {
      key: 'search',
      label: (
        <span>
          <SearchOutlined />
          搜索音乐
        </span>
      ),
      children: <MusicSearchPanel />
    },
    {
      key: 'queue',
      label: (
        <span>
          <DownloadOutlined />
          下载队列
          {hasActiveDownloads && (
            <span className="download-badge">
              {overallProgress.inProgress}
            </span>
          )}
        </span>
      ),
      children: <DownloadQueuePanel />
    },
    {
      key: 'downloaded',
      label: (
        <span>
          <PlayCircleOutlined />
          已下载资源
          {downloadedResources.length > 0 && (
            <span className="resource-badge">
              {downloadedResources.length}
            </span>
          )}
        </span>
      ),
      children: <DownloadedResourcesPanel />
    },
    {
      key: 'settings',
      label: (
        <span>
          <SettingOutlined />
          设置
        </span>
      ),
      children: <MusicDownloadSettings />
    }
  ]

  if (!isInitialized) {
    return (
      <Card className="music-download-panel loading-panel">
        <div className="loading-content">
          <div className="loading-spinner" />
          <p>正在初始化音乐下载系统...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="music-download-panel">
      <Card 
        title="音乐下载管理" 
        className="music-download-card"
        extra={
          <div className="panel-header-extra">
            {hasActiveDownloads && (
              <div className="progress-indicator">
                正在下载: {overallProgress.inProgress} / {overallProgress.total}
              </div>
            )}
          </div>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="music-download-tabs"
          items={tabItems}
        />
      </Card>
    </div>
  )
}

export default MusicDownloadPanel