/**
 * 音乐库API客户端基类
 * 提供通用的API访问功能和错误处理
 */

import { 
  MusicProvider, 
  AudioResource, 
  SearchRequest, 
  SearchResult, 
  ApiError, 
  ApiErrorType,
  MusicProviderConfig,
  GameAudioCategory 
} from '../types/musicDownload'

/**
 * 抽象音乐库API客户端
 */
export abstract class BaseMusicApiClient {
  protected config: MusicProviderConfig
  protected rateLimitTracker: Map<string, number[]> = new Map()

  constructor(config: MusicProviderConfig) {
    this.config = config
  }

  /**
   * 搜索音频资源
   */
  abstract search(request: SearchRequest): Promise<SearchResult>

  /**
   * 获取下载URL
   */
  abstract getDownloadUrl(resourceId: string): Promise<string>

  /**
   * 获取预览URL
   */
  abstract getPreviewUrl(resourceId: string): Promise<string | null>

  /**
   * 验证API配置
   */
  abstract validateConfig(): Promise<boolean>

  /**
   * 检查速率限制
   */
  protected checkRateLimit(): boolean {
    const now = Date.now()
    const windowStart = now - (this.config.rateLimit.window * 1000)
    
    const key = this.config.provider
    if (!this.rateLimitTracker.has(key)) {
      this.rateLimitTracker.set(key, [])
    }
    
    const timestamps = this.rateLimitTracker.get(key)!
    
    // 清理过期的时间戳
    while (timestamps.length > 0 && timestamps[0] < windowStart) {
      timestamps.shift()
    }
    
    // 检查是否超过限制
    if (timestamps.length >= this.config.rateLimit.requests) {
      return false
    }
    
    // 记录当前请求
    timestamps.push(now)
    return true
  }

  /**
   * 发起HTTP请求
   */
  protected async makeRequest(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    // 检查速率限制
    if (!this.checkRateLimit()) {
      throw this.createApiError(
        ApiErrorType.RATE_LIMIT,
        'Rate limit exceeded',
        null,
        true,
        this.config.rateLimit.window
      )
    }

    const url = `${this.config.baseUrl}${endpoint}`
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...options.headers
        }
      })

      if (!response.ok) {
        throw await this.handleHttpError(response)
      }

      return response
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      throw this.createApiError(
        ApiErrorType.NETWORK_ERROR,
        `Network request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error,
        true
      )
    }
  }

  /**
   * 获取认证头
   */
  protected getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    
    if (this.config.authType === 'apikey' && this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }
    
    return headers
  }

  /**
   * 处理HTTP错误
   */
  protected async handleHttpError(response: Response): Promise<ApiError> {
    let errorData: any = null
    
    try {
      errorData = await response.json()
    } catch {
      // 忽略JSON解析错误
    }

    const errorMessage = errorData?.message || response.statusText
    
    switch (response.status) {
      case 401:
        return this.createApiError(
          ApiErrorType.AUTH_ERROR,
          'Authentication failed',
          errorData,
          false
        )
      case 404:
        return this.createApiError(
          ApiErrorType.NOT_FOUND,
          'Resource not found',
          errorData,
          false
        )
      case 429:
        const retryAfter = response.headers.get('Retry-After')
        return this.createApiError(
          ApiErrorType.RATE_LIMIT,
          'Rate limit exceeded',
          errorData,
          true,
          retryAfter ? parseInt(retryAfter) : 60
        )
      case 500:
      case 502:
      case 503:
        return this.createApiError(
          ApiErrorType.SERVER_ERROR,
          errorMessage,
          errorData,
          true
        )
      default:
        return this.createApiError(
          ApiErrorType.INVALID_REQUEST,
          errorMessage,
          errorData,
          false
        )
    }
  }

  /**
   * 创建API错误对象
   */
  protected createApiError(
    type: ApiErrorType,
    message: string,
    details?: any,
    retryable: boolean = false,
    retryAfter?: number
  ): ApiError {
    return {
      type,
      message: `[${this.config.provider}] ${message}`,
      details,
      retryable,
      retryAfter
    }
  }

  /**
   * 将平台特定数据转换为通用格式
   */
  protected abstract transformToAudioResource(data: any): AudioResource

  /**
   * 根据游戏需求映射音频分类
   */
  protected mapToGameCategory(tags: string[], duration: number): GameAudioCategory {
    const tagString = tags.join(' ').toLowerCase()
    
    // 检查是否为背景音乐
    if (
      duration > 30 || 
      tagString.includes('music') || 
      tagString.includes('background') ||
      tagString.includes('bgm') ||
      tagString.includes('loop')
    ) {
      return GameAudioCategory.BGM
    }
    
    // 检查是否为UI音效
    if (
      tagString.includes('click') ||
      tagString.includes('button') ||
      tagString.includes('ui') ||
      tagString.includes('interface') ||
      tagString.includes('menu')
    ) {
      return GameAudioCategory.UI
    }
    
    // 检查是否为事件音效
    if (
      tagString.includes('victory') ||
      tagString.includes('defeat') ||
      tagString.includes('win') ||
      tagString.includes('lose') ||
      tagString.includes('success') ||
      tagString.includes('fail')
    ) {
      return GameAudioCategory.EVENTS
    }
    
    // 默认为游戏音效
    return GameAudioCategory.GAMEPLAY
  }

  /**
   * 清理和验证文件大小
   */
  protected validateFileSize(size: number): number {
    // 限制文件大小不超过10MB
    const maxSize = 10 * 1024 * 1024
    return Math.min(size, maxSize)
  }

  /**
   * 清理和验证时长
   */
  protected validateDuration(duration: number): number {
    // 确保时长为正数且不超过10分钟
    return Math.max(0, Math.min(duration, 600))
  }

  /**
   * 清理标签数据
   */
  protected cleanTags(tags: string[]): string[] {
    return tags
      .filter(tag => tag && tag.trim().length > 0)
      .map(tag => tag.trim().toLowerCase())
      .slice(0, 20) // 最多保留20个标签
  }

  /**
   * 生成唯一ID
   */
  protected generateId(sourceId: string): string {
    return `${this.config.provider}_${sourceId}`
  }

  /**
   * 获取提供商信息
   */
  getProviderInfo(): {
    provider: MusicProvider
    name: string
    enabled: boolean
    hasAuth: boolean
  } {
    return {
      provider: this.config.provider,
      name: this.getProviderName(),
      enabled: this.config.enabled,
      hasAuth: !!this.config.apiKey
    }
  }

  /**
   * 获取提供商显示名称
   */
  protected getProviderName(): string {
    switch (this.config.provider) {
      case MusicProvider.FREESOUND:
        return 'Freesound'
      case MusicProvider.PIXABAY:
        return 'Pixabay Music'
      case MusicProvider.OPENGAMEART:
        return 'OpenGameArt'
      case MusicProvider.ZAPSPLAT:
        return 'Zapsplat'
      case MusicProvider.BBC_SOUND:
        return 'BBC Sound Effects'
      default:
        return 'Unknown Provider'
    }
  }
}