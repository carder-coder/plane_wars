/**
 * 音乐API管理器
 * 统一管理所有音乐库API客户端
 */

import { 
  MusicProvider, 
  AudioResource, 
  SearchRequest, 
  SearchResult,
  ApiError,
  ApiErrorType,
  MusicProviderConfig
} from '../../types/musicDownload'

import { BaseMusicApiClient } from './BaseMusicApiClient'
import { FreesoundApiClient } from './FreesoundApiClient'
import { PixabayMusicApiClient } from './PixabayMusicApiClient'

/**
 * 默认API配置
 */
const DEFAULT_PROVIDER_CONFIGS: Record<MusicProvider, MusicProviderConfig> = {
  [MusicProvider.FREESOUND]: {
    provider: MusicProvider.FREESOUND,
    baseUrl: 'https://freesound.org/apiv2',
    rateLimit: { requests: 60, window: 60 },
    endpoints: {
      search: '/search/text/',
      download: '/sounds/{id}/download/',
      preview: '/sounds/{id}/'
    },
    authType: 'apikey',
    enabled: true
  },
  [MusicProvider.PIXABAY]: {
    provider: MusicProvider.PIXABAY,
    baseUrl: 'https://pixabay.com/api/music',
    rateLimit: { requests: 100, window: 60 },
    endpoints: {
      search: '/',
      download: '/',
      preview: '/'
    },
    authType: 'apikey',
    enabled: true
  },
  [MusicProvider.OPENGAMEART]: {
    provider: MusicProvider.OPENGAMEART,
    baseUrl: 'https://opengameart.org/api',
    rateLimit: { requests: 30, window: 60 },
    endpoints: {
      search: '/search',
      download: '/download',
      preview: '/preview'
    },
    authType: 'none',
    enabled: false // 需要实现具体客户端
  },
  [MusicProvider.ZAPSPLAT]: {
    provider: MusicProvider.ZAPSPLAT,
    baseUrl: 'https://api.zapsplat.com',
    rateLimit: { requests: 50, window: 60 },
    endpoints: {
      search: '/sounds/search',
      download: '/sounds/download',
      preview: '/sounds/preview'
    },
    authType: 'oauth',
    enabled: false // 需要实现具体客户端
  },
  [MusicProvider.BBC_SOUND]: {
    provider: MusicProvider.BBC_SOUND,
    baseUrl: 'https://sound-effects.bbcrewind.co.uk/api',
    rateLimit: { requests: 20, window: 60 },
    endpoints: {
      search: '/search',
      download: '/download',
      preview: '/preview'
    },
    authType: 'none',
    enabled: false // 需要实现具体客户端
  }
}

/**
 * 音乐API管理器
 */
export class MusicApiManager {
  private clients: Map<MusicProvider, BaseMusicApiClient> = new Map()
  private configs: Map<MusicProvider, MusicProviderConfig> = new Map()
  private initialized: boolean = false

  constructor() {
    this.initializeConfigs()
  }

  /**
   * 初始化配置
   */
  private initializeConfigs(): void {
    Object.values(DEFAULT_PROVIDER_CONFIGS).forEach(config => {
      this.configs.set(config.provider, { ...config })
    })
  }

  /**
   * 初始化API管理器
   */
  async initialize(apiKeys?: Partial<Record<MusicProvider, string>>): Promise<void> {
    if (this.initialized) {
      return
    }

    // 设置API密钥
    if (apiKeys) {
      Object.entries(apiKeys).forEach(([provider, apiKey]) => {
        const config = this.configs.get(provider as MusicProvider)
        if (config && apiKey) {
          config.apiKey = apiKey
        }
      })
    }

    // 初始化客户端
    await this.initializeClients()
    
    this.initialized = true
  }

  /**
   * 初始化客户端
   */
  private async initializeClients(): Promise<void> {
    const initPromises: Promise<void>[] = []

    // 初始化Freesound客户端
    const freesoundConfig = this.configs.get(MusicProvider.FREESOUND)!
    if (freesoundConfig.enabled) {
      const client = new FreesoundApiClient(freesoundConfig)
      this.clients.set(MusicProvider.FREESOUND, client)
      
      // 验证API配置
      initPromises.push(
        this.validateAndSetupClient(MusicProvider.FREESOUND, client)
      )
    }

    // 初始化Pixabay客户端
    const pixabayConfig = this.configs.get(MusicProvider.PIXABAY)!
    if (pixabayConfig.enabled) {
      const client = new PixabayMusicApiClient(pixabayConfig)
      this.clients.set(MusicProvider.PIXABAY, client)
      
      initPromises.push(
        this.validateAndSetupClient(MusicProvider.PIXABAY, client)
      )
    }

    // 等待所有客户端初始化完成
    await Promise.allSettled(initPromises)
  }

  /**
   * 验证并设置客户端
   */
  private async validateAndSetupClient(
    provider: MusicProvider, 
    client: BaseMusicApiClient
  ): Promise<void> {
    try {
      const isValid = await client.validateConfig()
      if (!isValid) {
        console.warn(`${provider} API validation failed, disabling client`)
        this.disableProvider(provider)
      }
    } catch (error) {
      console.error(`Failed to validate ${provider} API:`, error)
      this.disableProvider(provider)
    }
  }

  /**
   * 禁用提供商
   */
  private disableProvider(provider: MusicProvider): void {
    const config = this.configs.get(provider)
    if (config) {
      config.enabled = false
    }
    this.clients.delete(provider)
  }

  /**
   * 搜索音频资源
   */
  async search(request: SearchRequest): Promise<SearchResult> {
    this.ensureInitialized()

    const enabledClients = Array.from(this.clients.entries())
      .filter(([provider]) => this.isProviderEnabled(provider))

    if (enabledClients.length === 0) {
      throw this.createError(
        ApiErrorType.SERVER_ERROR,
        'No enabled music providers available'
      )
    }

    // 并行搜索所有启用的提供商
    const searchPromises = enabledClients.map(async ([provider, client]) => {
      try {
        const result = await client.search(request)
        return { provider, result, error: null }
      } catch (error) {
        console.error(`Search failed for ${provider}:`, error)
        return { provider, result: null, error: error as ApiError }
      }
    })

    const searchResults = await Promise.allSettled(searchPromises)
    
    // 合并成功的搜索结果
    const combinedResults: AudioResource[] = []
    let totalCount = 0
    let hasErrors = false

    searchResults.forEach((promiseResult) => {
      if (promiseResult.status === 'fulfilled') {
        const { result, error } = promiseResult.value
        if (result && !error) {
          combinedResults.push(...result.results)
          totalCount += result.total
        } else {
          hasErrors = true
        }
      } else {
        hasErrors = true
      }
    })

    // 如果所有提供商都失败了
    if (combinedResults.length === 0 && hasErrors) {
      throw this.createError(
        ApiErrorType.SERVER_ERROR,
        'All music providers failed to respond'
      )
    }

    // 按相关性排序结果
    const sortedResults = this.sortResults(combinedResults, request)
    
    // 分页处理
    const { page = 1, pageSize = 20 } = request
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedResults = sortedResults.slice(startIndex, endIndex)

    return {
      results: paginatedResults,
      total: sortedResults.length,
      page,
      pageSize,
      hasMore: endIndex < sortedResults.length
    }
  }

  /**
   * 排序搜索结果
   */
  private sortResults(results: AudioResource[], request: SearchRequest): AudioResource[] {
    const { sort } = request
    
    if (!sort) {
      return results // 保持原有顺序
    }

    return results.sort((a, b) => {
      let comparison = 0
      
      switch (sort.field) {
        case 'duration':
          comparison = a.duration - b.duration
          break
        case 'created':
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
        case 'fileSize':
          comparison = a.fileSize - b.fileSize
          break
        default:
          return 0
      }
      
      return sort.order === 'desc' ? -comparison : comparison
    })
  }

  /**
   * 获取下载URL
   */
  async getDownloadUrl(audioResource: AudioResource): Promise<string> {
    this.ensureInitialized()

    const client = this.clients.get(audioResource.source)
    if (!client) {
      throw this.createError(
        ApiErrorType.NOT_FOUND,
        `No client available for provider: ${audioResource.source}`
      )
    }

    return await client.getDownloadUrl(audioResource.id)
  }

  /**
   * 获取预览URL
   */
  async getPreviewUrl(audioResource: AudioResource): Promise<string | null> {
    this.ensureInitialized()

    const client = this.clients.get(audioResource.source)
    if (!client) {
      return null
    }

    try {
      return await client.getPreviewUrl(audioResource.id)
    } catch (error) {
      console.error('Failed to get preview URL:', error)
      return null
    }
  }

  /**
   * 更新API密钥
   */
  updateApiKey(provider: MusicProvider, apiKey: string): void {
    const config = this.configs.get(provider)
    if (config) {
      config.apiKey = apiKey
      
      // 重新初始化客户端
      if (this.initialized) {
        this.reinitializeClient(provider)
      }
    }
  }

  /**
   * 重新初始化特定客户端
   */
  private async reinitializeClient(provider: MusicProvider): Promise<void> {
    const config = this.configs.get(provider)
    if (!config || !config.enabled) {
      return
    }

    let client: BaseMusicApiClient | null = null

    switch (provider) {
      case MusicProvider.FREESOUND:
        client = new FreesoundApiClient(config)
        break
      case MusicProvider.PIXABAY:
        client = new PixabayMusicApiClient(config)
        break
      // 其他提供商的客户端初始化
    }

    if (client) {
      this.clients.set(provider, client)
      await this.validateAndSetupClient(provider, client)
    }
  }

  /**
   * 启用/禁用提供商
   */
  setProviderEnabled(provider: MusicProvider, enabled: boolean): void {
    const config = this.configs.get(provider)
    if (config) {
      config.enabled = enabled
      
      if (!enabled) {
        this.clients.delete(provider)
      } else if (this.initialized) {
        this.reinitializeClient(provider)
      }
    }
  }

  /**
   * 检查提供商是否启用
   */
  isProviderEnabled(provider: MusicProvider): boolean {
    const config = this.configs.get(provider)
    return config ? config.enabled : false
  }

  /**
   * 获取提供商状态
   */
  getProviderStatus(): Array<{
    provider: MusicProvider
    name: string
    enabled: boolean
    hasAuth: boolean
    isConnected: boolean
  }> {
    return Array.from(this.configs.values()).map(config => {
      const client = this.clients.get(config.provider)
      return {
        provider: config.provider,
        name: this.getProviderName(config.provider),
        enabled: config.enabled,
        hasAuth: !!config.apiKey,
        isConnected: !!client
      }
    })
  }

  /**
   * 获取提供商显示名称
   */
  private getProviderName(provider: MusicProvider): string {
    switch (provider) {
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

  /**
   * 确保管理器已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw this.createError(
        ApiErrorType.SERVER_ERROR,
        'Music API manager not initialized'
      )
    }
  }

  /**
   * 创建错误对象
   */
  private createError(type: ApiErrorType, message: string): ApiError {
    return {
      type,
      message,
      retryable: type === ApiErrorType.NETWORK_ERROR || type === ApiErrorType.SERVER_ERROR
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.clients.clear()
    this.configs.clear()
    this.initialized = false
  }
}

// 创建全局音乐API管理器实例
export const musicApiManager = new MusicApiManager()