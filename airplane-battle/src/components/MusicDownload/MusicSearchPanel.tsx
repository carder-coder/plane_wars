/**
 * 音乐搜索面板
 * 提供音乐搜索和浏览功能
 */

import React, { useState, useEffect } from 'react'
import { 
  Input, 
  Select, 
  Button, 
  Card, 
  List, 
  Pagination, 
  Spin, 
  Empty, 
  message,
  Row,
  Col,
  Tag,
  Slider,
  Space
} from 'antd'
import { 
  SearchOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined,
  DownloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { AudioResourceCard } from './AudioResourceCard'
import { useMusicDownloadStore } from '../../store/musicDownloadStore'
import { useAudioPreview } from '../../hooks/useAudioPreview'
import { 
  SearchRequest, 
  GameAudioCategory, 
  SortField, 
  SortOrder,
  AudioResource 
} from '../../types/musicDownload'

const { Search } = Input
const { Option } = Select

/**
 * 音乐搜索面板组件
 */
export const MusicSearchPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<GameAudioCategory | undefined>()
  const [durationRange, setDurationRange] = useState<[number, number]>([0, 300])
  const [sortField, setSortField] = useState<SortField>(SortField.RELEVANCE)
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const {
    searchResults,
    isSearching,
    search,
    clearSearch,
    addToDownloadQueue
  } = useMusicDownloadStore()

  const {
    currentAudio,
    isPlaying,
    isLoading: isPreviewLoading,
    play,
    pause,
    stop
  } = useAudioPreview()

  // 搜索音乐
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      message.warning('请输入搜索关键词')
      return
    }

    const searchRequest: SearchRequest = {
      query: searchQuery.trim(),
      filters: {
        category: selectedCategory,
        duration: {
          min: durationRange[0],
          max: durationRange[1]
        }
      },
      page: currentPage,
      pageSize,
      sort: {
        field: sortField,
        order: sortOrder
      }
    }

    try {
      await search(searchRequest)
    } catch (error) {
      message.error('搜索失败，请稍后重试')
    }
  }

  // 清空搜索
  const handleClearSearch = () => {
    setSearchQuery('')
    setSelectedCategory(undefined)
    setDurationRange([0, 300])
    setCurrentPage(1)
    clearSearch()
    stop()
  }

  // 播放/暂停预览
  const handlePreviewToggle = async (audioResource: AudioResource) => {
    try {
      if (currentAudio?.id === audioResource.id) {
        if (isPlaying) {
          pause()
        } else {
          await play(audioResource)
        }
      } else {
        await play(audioResource)
      }
    } catch (error) {
      message.error('音频预览失败')
    }
  }

  // 添加到下载队列
  const handleDownload = (audioResource: AudioResource) => {
    try {
      const taskId = addToDownloadQueue(audioResource)
      message.success(`已添加到下载队列：${audioResource.name}`)
    } catch (error) {
      message.error('添加到下载队列失败')
    }
  }

  // 分页变化
  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page)
    if (size) {
      setPageSize(size)
    }
    
    // 重新搜索
    if (searchQuery.trim()) {
      handleSearch()
    }
  }

  // 分类选项
  const categoryOptions = [
    { value: GameAudioCategory.BGM, label: '背景音乐' },
    { value: GameAudioCategory.UI, label: 'UI音效' },
    { value: GameAudioCategory.GAMEPLAY, label: '游戏音效' },
    { value: GameAudioCategory.EVENTS, label: '事件音效' }
  ]

  // 排序选项
  const sortOptions = [
    { value: SortField.RELEVANCE, label: '相关性' },
    { value: SortField.DURATION, label: '时长' },
    { value: SortField.CREATED, label: '创建时间' },
    { value: SortField.DOWNLOADS, label: '下载量' },
    { value: SortField.FILE_SIZE, label: '文件大小' }
  ]

  return (
    <div className=\"music-search-panel\">
      {/* 搜索区域 */}
      <Card className=\"search-filters-card\" size=\"small\">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Search
              placeholder=\"搜索音乐、音效...\"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
              size=\"large\"
              loading={isSearching}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              placeholder=\"音频分类\"
              value={selectedCategory}
              onChange={setSelectedCategory}
              allowClear
              size=\"large\"
              style={{ width: '100%' }}
            >
              {categoryOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} md={6}>
            <Space>
              <Select
                value={sortField}
                onChange={setSortField}
                size=\"large\"
                style={{ width: 120 }}
              >
                {sortOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
              <Select
                value={sortOrder}
                onChange={setSortOrder}
                size=\"large\"
                style={{ width: 80 }}
              >
                <Option value={SortOrder.DESC}>降序</Option>
                <Option value={SortOrder.ASC}>升序</Option>
              </Select>
            </Space>
          </Col>
        </Row>
        
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <div className=\"duration-filter\">
              <label>时长范围 (秒): {durationRange[0]} - {durationRange[1]}</label>
              <Slider
                range
                min={0}
                max={600}
                step={5}
                value={durationRange}
                onChange={setDurationRange}
                style={{ marginTop: 8 }}
              />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <Space>
              <Button onClick={handleSearch} type=\"primary\" loading={isSearching}>
                搜索
              </Button>
              <Button onClick={handleClearSearch}>
                清空
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 搜索结果区域 */}
      <Card className=\"search-results-card\" style={{ marginTop: 16 }}>
        {isSearching ? (
          <div className=\"loading-container\">
            <Spin size=\"large\" />
            <p style={{ marginTop: 16 }}>正在搜索音乐资源...</p>
          </div>
        ) : searchResults ? (
          <>
            <div className=\"results-header\">
              <h3>
                搜索结果 ({searchResults.total} 个)
                {searchQuery && <Tag color=\"blue\">关键词: {searchQuery}</Tag>}
                {selectedCategory && <Tag color=\"green\">分类: {categoryOptions.find(c => c.value === selectedCategory)?.label}</Tag>}
              </h3>
            </div>
            
            {searchResults.results.length > 0 ? (
              <>
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
                  dataSource={searchResults.results}
                  renderItem={(item) => (
                    <List.Item>
                      <AudioResourceCard
                        audioResource={item}
                        isPlaying={currentAudio?.id === item.id && isPlaying}
                        isPreviewLoading={currentAudio?.id === item.id && isPreviewLoading}
                        onPreviewToggle={() => handlePreviewToggle(item)}
                        onDownload={() => handleDownload(item)}
                      />
                    </List.Item>
                  )}
                />
                
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={searchResults.total}
                  showSizeChanger
                  showQuickJumper
                  showTotal={(total, range) => 
                    `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
                  }
                  onChange={handlePageChange}
                  style={{ marginTop: 24, textAlign: 'center' }}
                />
              </>
            ) : (
              <Empty
                description=\"没有找到相关音乐资源\"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </>
        ) : (
          <Empty
            description=\"输入关键词开始搜索音乐\"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>
    </div>
  )
}

export default MusicSearchPanel