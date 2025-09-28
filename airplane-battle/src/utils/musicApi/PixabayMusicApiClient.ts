/**
 * Pixabay Music API客户端实现
 * 集成Pixabay免费音乐库
 */

import { BaseMusicApiClient } from './BaseMusicApiClient'
import { 
  AudioResource, 
  SearchRequest, 
  SearchResult,
  MusicProvider,
  GameAudioCategory
} from '../../types/musicDownload'

/**
 * Pixabay Music API响应数据结构
 */
interface PixabayMusicResponse {
  total: number
  totalHits: number
  hits: PixabayMusicItem[]
}

interface PixabayMusicItem {
  id: number
  pageURL: string
  type: string
  tags: string
  duration: number
  size: number
  bitrate: number
  samplerate: number
  download_url: string
  preview_url: string
  user_id: number
  user: string
}

/**
 * Pixabay Music API客户端
 */
export class PixabayMusicApiClient extends BaseMusicApiClient {
  
  /**
   * 搜索音频资源
   */
  async search(request: SearchRequest): Promise<SearchResult> {
    const { query, filters = {}, page = 1, pageSize = 20, sort } = request
    
    // 构建搜索参数
    const params = new URLSearchParams({
      key: this.config.apiKey || '',
      q: this.buildSearchQuery(query, filters),
      audio_type: 'music',
      page: page.toString(),
      per_page: Math.min(pageSize, 200).toString(), // Pixabay限制
      safesearch: 'true'
    })
    
    // 添加分类过滤
    if (filters.category) {
      params.append('category', this.mapCategoryFilter(filters.category))
    }
    
    // 添加排序参数
    if (sort) {
      params.append('order', this.mapSortField(sort.field, sort.order))
    }
    
    // 添加时长过滤
    if (filters.duration) {
      if (filters.duration.min !== undefined) {
        params.append('min_duration', Math.floor(filters.duration.min).toString())
      }
      if (filters.duration.max !== undefined) {
        params.append('max_duration', Math.floor(filters.duration.max).toString())
      }
    }
    
    try {
      const response = await this.makeRequest(`/?${params}`)
      const data: PixabayMusicResponse = await response.json()
      
      return {
        results: data.hits.map(item => this.transformToAudioResource(item)),
        total: data.totalHits,
        page,
        pageSize,
        hasMore: (page * pageSize) < data.totalHits
      }
    } catch (error) {
      console.error('Pixabay Music search failed:', error)
      throw error
    }
  }

  /**
   * 构建搜索查询字符串
   */
  private buildSearchQuery(query: string, filters: any): string {
    let searchTerms = [query]
    
    // 添加分类相关的搜索词
    if (filters.category) {
      switch (filters.category) {
        case GameAudioCategory.BGM:
          searchTerms.push('background music game soundtrack')
          break
        case GameAudioCategory.UI:
          searchTerms.push('interface sound effect button')
          break
        case GameAudioCategory.GAMEPLAY:
          searchTerms.push('action game sound effect')
          break
        case GameAudioCategory.EVENTS:
          searchTerms.push('victory success achievement')
          break
      }
    }
    
    // 清理并组合搜索词
    return searchTerms
      .join(' ')
      .replace(/[^\w\s]/g, '') // 移除特殊字符
      .trim()
  }

  /**
   * 映射分类过滤器
   */
  private mapCategoryFilter(category: GameAudioCategory): string {
    switch (category) {
      case GameAudioCategory.BGM:
        return 'background'
      case GameAudioCategory.UI:
        return 'sound_effects'
      case GameAudioCategory.GAMEPLAY:
        return 'computer_games'
      case GameAudioCategory.EVENTS:
        return 'sound_effects'
      default:
        return 'all'
    }
  }

  /**
   * 映射排序字段
   */
  private mapSortField(field: string, order: string): string {
    switch (field) {
      case 'relevance':
        return 'popular' // Pixabay的相关性排序
      case 'created':
        return 'latest'
      case 'downloads':
        return 'popular'
      default:
        return 'popular'
    }
  }

  /**
   * 获取下载URL
   */
  async getDownloadUrl(resourceId: string): Promise<string> {
    const musicId = resourceId.replace(`${MusicProvider.PIXABAY}_`, '')
    
    try {
      // Pixabay的下载URL通常直接在搜索结果中提供
      // 这里可以根据需要实现额外的验证逻辑
      const params = new URLSearchParams({
        key: this.config.apiKey || '',
        id: musicId
      })
      
      const response = await this.makeRequest(`/?${params}`)
      const data: PixabayMusicResponse = await response.json()
      
      if (data.hits.length > 0) {
        return data.hits[0].download_url
      }
      
      throw new Error('Music not found')
    } catch (error) {
      console.error('Failed to get Pixabay download URL:', error)
      throw error
    }
  }

  /**
   * 获取预览URL
   */
  async getPreviewUrl(resourceId: string): Promise<string | null> {
    const musicId = resourceId.replace(`${MusicProvider.PIXABAY}_`, '')
    
    try {
      const params = new URLSearchParams({
        key: this.config.apiKey || '',
        id: musicId
      })
      
      const response = await this.makeRequest(`/?${params}`)
      const data: PixabayMusicResponse = await response.json()
      
      if (data.hits.length > 0) {
        return data.hits[0].preview_url || null
      }
      
      return null
    } catch (error) {
      console.error('Failed to get Pixabay preview URL:', error)
      return null
    }
  }

  /**
   * 验证API配置
   */
  async validateConfig(): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        key: this.config.apiKey || '',
        q: 'test',
        per_page: '3'
      })
      
      const response = await this.makeRequest(`/?${params}`)
      return response.ok
    } catch (error) {
      console.error('Pixabay Music API validation failed:', error)
      return false
    }
  }

  /**
   * 转换为通用音频资源格式
   */
  protected transformToAudioResource(item: PixabayMusicItem): AudioResource {
    const now = new Date()
    const tags = item.tags ? item.tags.split(',').map(tag => tag.trim()) : []
    
    return {
      id: this.generateId(item.id.toString()),
      source: MusicProvider.PIXABAY,
      sourceId: item.id.toString(),
      name: this.generateName(tags),
      description: `Free music from Pixabay - ${tags.slice(0, 3).join(', ')}`,
      url: item.pageURL,
      downloadUrl: item.download_url,
      previewUrl: item.preview_url,
      duration: this.validateDuration(item.duration),
      fileSize: this.validateFileSize(item.size || 0),
      format: 'mp3', // Pixabay主要提供MP3格式
      sampleRate: item.samplerate || 44100,
      bitRate: item.bitrate || 128,
      channels: 2, // Pixabay音乐通常是立体声
      license: 'Pixabay License',
      licenseUrl: 'https://pixabay.com/service/license/',
      author: item.user || 'Unknown',
      tags: this.cleanTags(tags),
      gameCategory: this.mapToGameCategory(tags, item.duration),
      preview: !!item.preview_url,
      downloaded: false,
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * 根据标签生成音频名称
   */
  private generateName(tags: string[]): string {
    if (tags.length === 0) {
      return 'Untitled Music'
    }
    
    // 选择最相关的标签作为名称
    const relevantTags = tags.filter(tag => 
      !['music', 'audio', 'sound'].includes(tag.toLowerCase())
    ).slice(0, 3)
    
    if (relevantTags.length > 0) {
      return relevantTags
        .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1))
        .join(' ') + ' Music'
    }
    
    return tags[0].charAt(0).toUpperCase() + tags[0].slice(1) + ' Music'
  }

  /**
   * 获取认证头（重写以支持Pixabay API Key格式）
   */
  protected getAuthHeaders(): Record<string, string> {
    // Pixabay使用URL参数而不是头部认证
    return {}
  }
}