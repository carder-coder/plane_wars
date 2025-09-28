/**
 * 音频资源卡片组件
 * 展示单个音频资源的信息和操作
 */

import React from 'react'
import { Card, Button, Tag, Tooltip, Space, Typography } from 'antd'
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined,
  DownloadOutlined,
  ClockCircleOutlined,
  FileOutlined,
  UserOutlined,
  InfoCircleOutlined,
  LinkOutlined
} from '@ant-design/icons'
import { AudioResource } from '../../types/musicDownload'

const { Text, Paragraph } = Typography

interface AudioResourceCardProps {
  audioResource: AudioResource
  isPlaying?: boolean
  isPreviewLoading?: boolean
  onPreviewToggle: () => void
  onDownload: () => void
  showDownloadButton?: boolean
}

/**
 * 音频资源卡片组件
 */
export const AudioResourceCard: React.FC<AudioResourceCardProps> = ({
  audioResource,
  isPlaying = false,
  isPreviewLoading = false,
  onPreviewToggle,
  onDownload,
  showDownloadButton = true
}) => {
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
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // 获取分类颜色
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'bgm':
        return 'blue'
      case 'ui':
        return 'green'
      case 'gameplay':
        return 'orange'
      case 'events':
        return 'purple'
      default:
        return 'default'
    }
  }

  // 获取分类标签
  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'bgm':
        return '背景音乐'
      case 'ui':
        return 'UI音效'
      case 'gameplay':
        return '游戏音效'
      case 'events':
        return '事件音效'
      default:
        return '其他'
    }
  }

  // 获取音质标签颜色
  const getQualityColor = (bitRate?: number): string => {
    if (!bitRate) return 'default'
    if (bitRate >= 320) return 'red'
    if (bitRate >= 192) return 'orange'
    if (bitRate >= 128) return 'green'
    return 'default'
  }

  return (
    <Card
      className=\"audio-resource-card\"
      size=\"small\"
      hoverable
      actions={[
        <Tooltip title={isPlaying ? '暂停预览' : '播放预览'}>
          <Button
            type=\"text\"
            icon={
              isPreviewLoading ? (
                <div className=\"loading-spinner-small\" />
              ) : isPlaying ? (
                <PauseCircleOutlined />
              ) : (
                <PlayCircleOutlined />
              )
            }
            onClick={onPreviewToggle}
            disabled={isPreviewLoading || !audioResource.preview}
          />
        </Tooltip>,
        showDownloadButton && (
          <Tooltip title=\"下载音频\">
            <Button
              type=\"text\"
              icon={<DownloadOutlined />}
              onClick={onDownload}
              disabled={audioResource.downloaded}
            />
          </Tooltip>
        ),
        <Tooltip title=\"查看详情\">
          <Button
            type=\"text\"
            icon={<InfoCircleOutlined />}
            onClick={() => window.open(audioResource.url, '_blank')}
          />
        </Tooltip>
      ]}
    >
      <div className=\"audio-card-content\">
        {/* 标题和标签 */}
        <div className=\"audio-header\">
          <Typography.Title level={5} className=\"audio-title\">
            {audioResource.name}
          </Typography.Title>
          <div className=\"audio-tags\">
            <Tag color={getCategoryColor(audioResource.gameCategory)}>
              {getCategoryLabel(audioResource.gameCategory)}
            </Tag>
            {audioResource.bitRate && (
              <Tag color={getQualityColor(audioResource.bitRate)}>
                {audioResource.bitRate}kbps
              </Tag>
            )}
            <Tag color=\"blue\">{audioResource.format.toUpperCase()}</Tag>
          </div>
        </div>

        {/* 描述 */}
        {audioResource.description && (
          <Paragraph 
            className=\"audio-description\"
            ellipsis={{ rows: 2, expandable: false }}
          >
            {audioResource.description}
          </Paragraph>
        )}

        {/* 基本信息 */}
        <div className=\"audio-info\">
          <Space wrap size=\"small\">
            <Text type=\"secondary\">
              <ClockCircleOutlined /> {formatDuration(audioResource.duration)}
            </Text>
            <Text type=\"secondary\">
              <FileOutlined /> {formatFileSize(audioResource.fileSize)}
            </Text>
            {audioResource.author && (
              <Text type=\"secondary\">
                <UserOutlined /> {audioResource.author}
              </Text>
            )}
          </Space>
        </div>

        {/* 音频参数 */}
        <div className=\"audio-params\">
          <Space wrap size=\"small\">
            <Text type=\"secondary\" className=\"param-item\">
              {audioResource.sampleRate / 1000}kHz
            </Text>
            <Text type=\"secondary\" className=\"param-item\">
              {audioResource.channels === 1 ? '单声道' : '立体声'}
            </Text>
            {audioResource.license && (
              <Tooltip title={audioResource.licenseUrl}>
                <Text type=\"secondary\" className=\"license-item\">
                  <LinkOutlined /> {audioResource.license}
                </Text>
              </Tooltip>
            )}
          </Space>
        </div>

        {/* 标签云 */}
        {audioResource.tags && audioResource.tags.length > 0 && (
          <div className=\"audio-tags-cloud\">
            {audioResource.tags.slice(0, 5).map((tag, index) => (
              <Tag key={index} size=\"small\">
                {tag}
              </Tag>
            ))}
            {audioResource.tags.length > 5 && (
              <Text type=\"secondary\" className=\"more-tags\">
                +{audioResource.tags.length - 5} 更多
              </Text>
            )}
          </div>
        )}

        {/* 来源信息 */}
        <div className=\"audio-source\">
          <Text type=\"secondary\" className=\"source-info\">
            来源: {audioResource.source}
            {audioResource.downloaded && (
              <Tag color=\"success\" size=\"small\" style={{ marginLeft: 8 }}>
                已下载
              </Tag>
            )}
          </Text>
        </div>
      </div>
    </Card>
  )
}

export default AudioResourceCard