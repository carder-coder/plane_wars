/**
 * Freesound API客户端实现
 * 集成Freesound.org免费音效库
 */

import { BaseMusicApiClient } from './BaseMusicApiClient'
import { 
  AudioResource, 
  SearchRequest, 
  SearchResult,
  MusicProvider,
  GameAudioCategory,
  AudioQuality
} from '../../types/musicDownload'

/**
 * Freesound API响应数据结构
 */
interface FreesoundSearchResponse {
  count: number
  next: string | null
  previous: string | null
  results: FreesoundSound[]
}

interface FreesoundSound {
  id: number
  name: string
  description: string
  created: string
  license: string
  url: string
  tags: string[]
  username: string
  duration: number
  filesize: number
  type: string
  channels: number
  bitrate: number
  bitdepth: number
  samplerate: number
  download: string
  previews: {
    'preview-hq-mp3': string
    'preview-hq-ogg': string
    'preview-lq-mp3': string
    'preview-lq-ogg': string
  }
  images: {
    spectral_m: string
    spectral_l: string
    waveform_m: string
    waveform_l: string
  }
}

/**
 * Freesound API客户端
 */
export class FreesoundApiClient extends BaseMusicApiClient {
  
  /**
   * 搜索音频资源
   */
  async search(request: SearchRequest): Promise<SearchResult> {
    const { query, filters = {}, page = 1, pageSize = 20, sort } = request
    
    // 构建搜索参数
    const params = new URLSearchParams({
      query: this.buildSearchQuery(query, filters),
      page: page.toString(),
      page_size: Math.min(pageSize, 150).toString(), // Freesound限制
      fields: 'id,name,description,created,license,url,tags,username,duration,filesize,type,channels,bitrate,bitdepth,samplerate,download,previews,images'
    })
    
    // 添加排序参数
    if (sort) {
      params.append('sort', this.mapSortField(sort.field, sort.order))
    }
    
    // 添加过滤器
    if (filters.duration) {
      if (filters.duration.min !== undefined) {
        params.append('filter', `duration:[${filters.duration.min} TO *]`)
      }
      if (filters.duration.max !== undefined) {
        params.append('filter', `duration:[* TO ${filters.duration.max}]`)
      }
    }
    
    if (filters.fileSize) {
      if (filters.fileSize.min !== undefined) {
        params.append('filter', `filesize:[${filters.fileSize.min} TO *]`)
      }
      if (filters.fileSize.max !== undefined) {
        params.append('filter', `filesize:[* TO ${filters.fileSize.max}]`)
      }
    }
    
    try {
      const response = await this.makeRequest(`/search/text/?${params}`)
      const data: FreesoundSearchResponse = await response.json()
      
      return {
        results: data.results.map(sound => this.transformToAudioResource(sound)),
        total: data.count,
        page,
        pageSize,
        hasMore: !!data.next
      }
    } catch (error) {
      console.error('Freesound search failed:', error)
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
          searchTerms.push('music OR background OR bgm OR loop')
          break
        case GameAudioCategory.UI:
          searchTerms.push('click OR button OR ui OR interface OR menu')
          break
        case GameAudioCategory.GAMEPLAY:
          searchTerms.push('game OR action OR weapon OR explosion')
          break
        case GameAudioCategory.EVENTS:
          searchTerms.push('victory OR defeat OR success OR fail')
          break
      }
    }
    
    // 添加标签过滤
    if (filters.tags && filters.tags.length > 0) {
      searchTerms.push(...filters.tags)
    }
    
    return searchTerms.join(' ')
  }

  /**
   * 映射排序字段
   */
  private mapSortField(field: string, order: string): string {
    const orderPrefix = order === 'desc' ? '-' : ''
    
    switch (field) {
      case 'relevance':
        return 'score' // Freesound使用score表示相关性
      case 'duration':
        return `${orderPrefix}duration`
      case 'created':
        return `${orderPrefix}created`
      case 'downloads':
        return `${orderPrefix}num_downloads`
      case 'rating':
        return `${orderPrefix}avg_rating`
      case 'fileSize':
        return `${orderPrefix}filesize`
      default:
        return 'score'
    }
  }

  /**
   * 获取下载URL
   */
  async getDownloadUrl(resourceId: string): Promise<string> {
    const soundId = resourceId.replace(`${MusicProvider.FREESOUND}_`, '')
    
    try {
      const response = await this.makeRequest(`/sounds/${soundId}/download/`)
      const data = await response.json()
      return data.download_url || data.url
    } catch (error) {
      console.error('Failed to get Freesound download URL:', error)
      throw error
    }
  }

  /**
   * 获取预览URL
   */
  async getPreviewUrl(resourceId: string): Promise<string | null> {
    const soundId = resourceId.replace(`${MusicProvider.FREESOUND}_`, '')
    
    try {
      const response = await this.makeRequest(`/sounds/${soundId}/`)
      const data: FreesoundSound = await response.json()
      return data.previews['preview-hq-mp3'] || data.previews['preview-lq-mp3'] || null
    } catch (error) {
      console.error('Failed to get Freesound preview URL:', error)
      return null
    }
  }

  /**
   * 验证API配置
   */
  async validateConfig(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/me/')
      return response.ok
    } catch (error) {
      console.error('Freesound API validation failed:', error)
      return false
    }
  }

  /**
   * 转换为通用音频资源格式
   */
  protected transformToAudioResource(sound: FreesoundSound): AudioResource {
    const now = new Date()
    
    return {
      id: this.generateId(sound.id.toString()),
      source: MusicProvider.FREESOUND,
      sourceId: sound.id.toString(),
      name: sound.name || 'Unnamed Sound',
      description: sound.description || '',
      url: sound.url,
      downloadUrl: sound.download,
      previewUrl: sound.previews['preview-hq-mp3'] || sound.previews['preview-lq-mp3'],
      duration: this.validateDuration(sound.duration),
      fileSize: this.validateFileSize(sound.filesize),
      format: this.extractFormat(sound.type),
      sampleRate: sound.samplerate || 44100,
      bitRate: sound.bitrate,
      channels: sound.channels || 1,
      license: this.mapLicense(sound.license),
      licenseUrl: this.getLicenseUrl(sound.license),
      author: sound.username,
      tags: this.cleanTags(sound.tags || []),
      gameCategory: this.mapToGameCategory(sound.tags || [], sound.duration),
      preview: !!sound.previews['preview-hq-mp3'],
      downloaded: false,
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * 提取文件格式
   */
  private extractFormat(type: string): string {
    if (type) {
      return type.toLowerCase()
    }
    return 'unknown'
  }

  /**
   * 映射许可证信息
   */
  private mapLicense(license: string): string {
    const licenseMap: Record<string, string> = {
      'Creative Commons 0': 'CC0',
      'Attribution': 'CC BY',
      'Attribution Noncommercial': 'CC BY-NC',
      'Attribution Share Alike': 'CC BY-SA',
      'Attribution Noncommercial Share Alike': 'CC BY-NC-SA'
    }
    
    return licenseMap[license] || license || 'Unknown'
  }

  /**
   * 获取许可证URL
   */
  private getLicenseUrl(license: string): string {
    const licenseUrls: Record<string, string> = {
      'Creative Commons 0': 'https://creativecommons.org/publicdomain/zero/1.0/',
      'Attribution': 'https://creativecommons.org/licenses/by/4.0/',
      'Attribution Noncommercial': 'https://creativecommons.org/licenses/by-nc/4.0/',
      'Attribution Share Alike': 'https://creativecommons.org/licenses/by-sa/4.0/',
      'Attribution Noncommercial Share Alike': 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
    }
    
    return licenseUrls[license] || 'https://freesound.org/help/faq/#licenses'
  }

  /**
   * 获取认证头（重写以支持Freesound特定格式）
   */
  protected getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Token ${this.config.apiKey}`
    }
    
    return headers
  }
}