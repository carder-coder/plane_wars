/**
 * 下载队列面板
 * 显示和管理音频下载队列
 */

import React, { useState } from 'react'
import { 
  Card, 
  Table, 
  Button, 
  Progress, 
  Tag, 
  Space, 
  Popconfirm, 
  Empty,
  message,
  Tooltip,
  Select
} from 'antd'
import { 
  PlayCircleOutlined,
  PauseCircleOutlined, 
  DeleteOutlined,
  RedoOutlined,
  ClearOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useMusicDownloadStore } from '../../store/musicDownloadStore'
import { DownloadTask, DownloadStatus } from '../../types/musicDownload'

const { Option } = Select

/**
 * 下载队列面板组件
 */
export const DownloadQueuePanel: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<DownloadStatus | 'all'>('all')
  
  const {
    downloadQueue,
    startDownload,
    pauseDownload,
    cancelDownload,
    retryDownload,
    clearCompleted,
    clearAll,
    getOverallProgress
  } = useMusicDownloadStore()

  // 过滤下载任务
  const filteredTasks = downloadQueue.filter(task => 
    statusFilter === 'all' || task.status === statusFilter
  )

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化下载速度
  const formatSpeed = (bytesPerSecond: number): string => {
    return formatFileSize(bytesPerSecond) + '/s'
  }

  // 格式化时间
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString()
  }

  // 获取状态标签
  const getStatusTag = (status: DownloadStatus) => {
    const statusConfig = {
      [DownloadStatus.PENDING]: { color: 'default', text: '等待中' },
      [DownloadStatus.DOWNLOADING]: { color: 'processing', text: '下载中' },
      [DownloadStatus.PROCESSING]: { color: 'processing', text: '处理中' },
      [DownloadStatus.COMPLETED]: { color: 'success', text: '已完成' },
      [DownloadStatus.FAILED]: { color: 'error', text: '失败' },
      [DownloadStatus.CANCELLED]: { color: 'default', text: '已取消' }
    }
    
    const config = statusConfig[status]
    return <Tag color={config.color}>{config.text}</Tag>
  }

  // 操作处理
  const handleStart = async (taskId: string) => {
    try {
      await startDownload(taskId)
      message.success('开始下载')
    } catch (error) {
      message.error('启动下载失败')
    }
  }

  const handlePause = (taskId: string) => {
    try {
      pauseDownload(taskId)
      message.success('已暂停下载')
    } catch (error) {
      message.error('暂停下载失败')
    }
  }

  const handleCancel = (taskId: string) => {
    try {
      cancelDownload(taskId)
      message.success('已取消下载')
    } catch (error) {
      message.error('取消下载失败')
    }
  }

  const handleRetry = async (taskId: string) => {
    try {
      await retryDownload(taskId)
      message.success('重新开始下载')
    } catch (error) {
      message.error('重试下载失败')
    }
  }

  const handleClearCompleted = () => {
    clearCompleted()
    message.success('已清理完成的任务')
  }

  const handleClearAll = () => {
    clearAll()
    message.success('已清空所有任务')
  }

  // 表格列定义
  const columns: ColumnsType<DownloadTask> = [
    {
      title: '音频名称',
      dataIndex: 'audioId',
      key: 'audioId',
      width: 200,
      ellipsis: true,
      render: (audioId: string) => {
        // 这里应该根据audioId获取音频名称，暂时显示ID
        return audioId.split('_').slice(-1)[0]
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: DownloadStatus) => getStatusTag(status)
    },
    {
      title: '进度',
      key: 'progress',
      width: 150,
      render: (_, record) => (
        <div>
          <Progress 
            percent={Math.round(record.progress)} 
            size=\"small\"
            status={record.status === DownloadStatus.FAILED ? 'exception' : 'active'}
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
            {formatFileSize(record.downloadedBytes)} / {formatFileSize(record.totalBytes)}
          </div>
        </div>
      )
    },
    {
      title: '速度',
      dataIndex: 'speed',
      key: 'speed',
      width: 100,
      render: (speed: number) => (
        <span style={{ fontSize: '12px' }}>
          {speed > 0 ? formatSpeed(speed) : '-'}
        </span>
      )
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 100,
      render: (time: Date) => (
        <span style={{ fontSize: '12px' }}>
          {formatTime(time)}
        </span>
      )
    },
    {
      title: '重试次数',
      dataIndex: 'retryCount',
      key: 'retryCount',
      width: 80,
      render: (count: number) => (
        <span style={{ fontSize: '12px' }}>
          {count}/3
        </span>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size=\"small\">
          {record.status === DownloadStatus.PENDING && (
            <Tooltip title=\"开始下载\">
              <Button
                type=\"text\"
                size=\"small\"
                icon={<PlayCircleOutlined />}
                onClick={() => handleStart(record.taskId)}
              />
            </Tooltip>
          )}
          
          {record.status === DownloadStatus.DOWNLOADING && (
            <Tooltip title=\"暂停下载\">
              <Button
                type=\"text\"
                size=\"small\"
                icon={<PauseCircleOutlined />}
                onClick={() => handlePause(record.taskId)}
              />
            </Tooltip>
          )}
          
          {record.status === DownloadStatus.FAILED && record.retryCount < 3 && (
            <Tooltip title=\"重试下载\">
              <Button
                type=\"text\"
                size=\"small\"
                icon={<RedoOutlined />}
                onClick={() => handleRetry(record.taskId)}
              />
            </Tooltip>
          )}
          
          {record.status !== DownloadStatus.COMPLETED && (
            <Tooltip title=\"取消下载\">
              <Popconfirm
                title=\"确定要取消这个下载任务吗？\"
                onConfirm={() => handleCancel(record.taskId)}
                okText=\"确定\"
                cancelText=\"取消\"
              >
                <Button
                  type=\"text\"
                  size=\"small\"
                  icon={<DeleteOutlined />}
                  danger
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      )
    }
  ]

  // 错误信息渲染
  const expandedRowRender = (record: DownloadTask) => {
    if (record.status === DownloadStatus.FAILED && record.error) {
      return (
        <div style={{ padding: '8px 0', color: '#ff4d4f' }}>
          <strong>错误信息：</strong> {record.error}
        </div>
      )
    }
    return null
  }

  const overallProgress = getOverallProgress()

  return (
    <div className=\"download-queue-panel\">
      {/* 统计信息 */}
      <Card size=\"small\" className=\"queue-stats-card\">
        <div className=\"queue-stats\">
          <div className=\"stat-item\">
            <span className=\"stat-label\">总任务：</span>
            <span className=\"stat-value\">{overallProgress.total}</span>
          </div>
          <div className=\"stat-item\">
            <span className=\"stat-label\">进行中：</span>
            <span className=\"stat-value processing\">{overallProgress.inProgress}</span>
          </div>
          <div className=\"stat-item\">
            <span className=\"stat-label\">已完成：</span>
            <span className=\"stat-value completed\">{overallProgress.completed}</span>
          </div>
          <div className=\"stat-item\">
            <span className=\"stat-label\">失败：</span>
            <span className=\"stat-value failed\">{overallProgress.failed}</span>
          </div>
        </div>
      </Card>

      {/* 操作栏 */}
      <Card size=\"small\" className=\"queue-actions-card\" style={{ marginTop: 16 }}>
        <div className=\"queue-actions\">
          <Space>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
              size=\"small\"
            >
              <Option value=\"all\">全部状态</Option>
              <Option value={DownloadStatus.PENDING}>等待中</Option>
              <Option value={DownloadStatus.DOWNLOADING}>下载中</Option>
              <Option value={DownloadStatus.COMPLETED}>已完成</Option>
              <Option value={DownloadStatus.FAILED}>失败</Option>
              <Option value={DownloadStatus.CANCELLED}>已取消</Option>
            </Select>
            
            <Button
              size=\"small\"
              icon={<ClearOutlined />}
              onClick={handleClearCompleted}
              disabled={overallProgress.completed === 0}
            >
              清理已完成
            </Button>
            
            <Popconfirm
              title=\"确定要清空所有下载任务吗？\"
              onConfirm={handleClearAll}
              okText=\"确定\"
              cancelText=\"取消\"
            >
              <Button
                size=\"small\"
                icon={<DeleteOutlined />}
                danger
                disabled={overallProgress.total === 0}
              >
                清空队列
              </Button>
            </Popconfirm>
          </Space>
        </div>
      </Card>

      {/* 下载队列表格 */}
      <Card size=\"small\" style={{ marginTop: 16 }}>
        {filteredTasks.length > 0 ? (
          <Table
            columns={columns}
            dataSource={filteredTasks}
            rowKey=\"taskId\"
            size=\"small\"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
            }}
            expandable={{
              expandedRowRender: expandedRowRender,
              rowExpandable: (record) => 
                record.status === DownloadStatus.FAILED && !!record.error
            }}
          />
        ) : (
          <Empty
            description={
              statusFilter === 'all' 
                ? '暂无下载任务' 
                : `暂无${statusFilter}状态的任务`
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>
    </div>
  )
}

export default DownloadQueuePanel