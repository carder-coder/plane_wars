/**
 * 音乐下载系统类型定义
 * 扩展现有音效系统，添加音乐下载相关类型
 */

/**
 * 音乐库平台枚举
 */
export enum MusicProvider {
  FREESOUND = 'freesound',
  PIXABAY = 'pixabay',
  OPENGAMEART = 'opengameart',
  ZAPSPLAT = 'zapsplat',
  BBC_SOUND = 'bbc_sound'
}

/**
 * 音频资源数据模型
 */
export interface AudioResource {
  id: string                        // 唯一标识符
  source: MusicProvider             // 来源平台
  sourceId: string                  // 原平台ID
  name: string                      // 音频名称
  description: string               // 音频描述
  url: string                       // 原始URL
  downloadUrl: string               // 下载链接
  previewUrl?: string               // 预览链接
  duration: number                  // 时长(秒)
  fileSize: number                  // 文件大小(字节)
  format: string                    // 文件格式
  sampleRate: number                // 采样率
  bitRate?: number                  // 比特率
  channels: number                  // 声道数
  license: string                   // 授权信息
  licenseUrl?: string               // 授权链接
  author?: string                   // 作者
  tags: string[]                    // 标签列表
  gameCategory: GameAudioCategory   // 游戏分类
  preview: boolean                  // 是否可预览
  downloaded: boolean               // 是否已下载
  localPath?: string                // 本地文件路径
  createdAt: Date                   // 创建时间
  updatedAt: Date                   // 更新时间
}

/**
 * 游戏音频分类
 */
export enum GameAudioCategory {
  BGM = 'bgm',                      // 背景音乐
  UI = 'ui',                        // UI音效
  GAMEPLAY = 'gameplay',            // 游戏音效
  EVENTS = 'events'                 // 事件音效
}

/**
 * 下载任务状态
 */
export enum DownloadStatus {
  PENDING = 'pending',              // 待下载
  DOWNLOADING = 'downloading',      // 下载中
  PROCESSING = 'processing',        // 处理中
  COMPLETED = 'completed',          // 已完成
  FAILED = 'failed',               // 下载失败
  CANCELLED = 'cancelled'           // 已取消
}

/**
 * 下载任务数据模型
 */
export interface DownloadTask {
  taskId: string                    // 任务唯一ID
  audioId: string                   // 音频资源ID
  status: DownloadStatus            // 下载状态
  progress: number                  // 下载进度 (0-100)
  downloadedBytes: number           // 已下载字节数
  totalBytes: number                // 总字节数
  speed: number                     // 下载速度 (字节/秒)
  error?: string                    // 错误信息
  retryCount: number                // 重试次数
  startTime: Date                   // 开始时间
  completeTime?: Date               // 完成时间
  outputPath?: string               // 输出路径
  processingOptions?: AudioProcessingOptions  // 处理选项
}

/**
 * 音频处理选项
 */
export interface AudioProcessingOptions {
  targetFormat?: string             // 目标格式
  targetBitRate?: number           // 目标比特率
  targetSampleRate?: number        // 目标采样率
  normalize?: boolean              // 是否音量标准化
  compress?: boolean               // 是否压缩
  fadeIn?: number                  // 淡入时间(毫秒)
  fadeOut?: number                 // 淡出时间(毫秒)
  trimStart?: number               // 裁剪开始时间(秒)
  trimEnd?: number                 // 裁剪结束时间(秒)
}

/**
 * 搜索过滤器
 */
export interface SearchFilters {
  category?: GameAudioCategory      // 音频分类
  duration?: {                     // 时长范围
    min?: number
    max?: number
  }
  fileSize?: {                     // 文件大小范围
    min?: number
    max?: number
  }
  format?: string[]                // 文件格式
  license?: string[]               // 授权类型
  quality?: AudioQuality           // 音频质量
  provider?: MusicProvider[]       // 音乐库平台
  tags?: string[]                  // 标签过滤
}

/**
 * 音频质量枚举
 */
export enum AudioQuality {
  LOW = 'low',                     // 低质量
  MEDIUM = 'medium',               // 中等质量
  HIGH = 'high',                   // 高质量
  LOSSLESS = 'lossless'            // 无损质量
}

/**
 * 搜索请求参数
 */
export interface SearchRequest {
  query: string                    // 搜索关键词
  filters?: SearchFilters          // 过滤条件
  page?: number                    // 页码
  pageSize?: number                // 每页数量
  sort?: SortOption               // 排序选项
}

/**
 * 排序选项
 */
export interface SortOption {
  field: SortField                 // 排序字段
  order: SortOrder                 // 排序顺序
}

/**
 * 排序字段
 */
export enum SortField {
  RELEVANCE = 'relevance',         // 相关性
  DURATION = 'duration',           // 时长
  CREATED = 'created',             // 创建时间
  DOWNLOADS = 'downloads',         // 下载次数
  RATING = 'rating',               // 评分
  FILE_SIZE = 'fileSize'           // 文件大小
}

/**
 * 排序顺序
 */
export enum SortOrder {
  ASC = 'asc',                     // 升序
  DESC = 'desc'                    // 降序
}

/**
 * 搜索结果
 */
export interface SearchResult {
  results: AudioResource[]         // 搜索结果
  total: number                    // 总数量
  page: number                     // 当前页码
  pageSize: number                 // 每页数量
  hasMore: boolean                 // 是否有更多
}

/**
 * API错误类型
 */
export enum ApiErrorType {
  NETWORK_ERROR = 'network_error',
  AUTH_ERROR = 'auth_error',
  RATE_LIMIT = 'rate_limit',
  NOT_FOUND = 'not_found',
  SERVER_ERROR = 'server_error',
  INVALID_REQUEST = 'invalid_request'
}

/**
 * API错误信息
 */
export interface ApiError {
  type: ApiErrorType
  message: string
  details?: any
  retryable: boolean
  retryAfter?: number              // 重试等待时间(秒)
}

/**
 * 音乐库API配置
 */
export interface MusicProviderConfig {
  provider: MusicProvider
  apiKey?: string
  apiSecret?: string
  baseUrl: string
  rateLimit: {
    requests: number               // 请求数量
    window: number                 // 时间窗口(秒)
  }
  endpoints: {
    search: string
    download: string
    preview?: string
  }
  authType?: 'apikey' | 'oauth' | 'none'
  enabled: boolean
}

/**
 * 下载队列配置
 */
export interface DownloadQueueConfig {
  maxConcurrent: number            // 最大并发下载数
  maxRetries: number               // 最大重试次数
  retryDelay: number               // 重试延迟(毫秒)
  timeout: number                  // 下载超时(毫秒)
  resumeSupport: boolean           // 是否支持断点续传
}

/**
 * 音乐下载管理器接口
 */
export interface IMusicDownloadManager {
  // 搜索功能
  searchAudio(request: SearchRequest): Promise<SearchResult>
  
  // 下载管理
  addToQueue(audioResource: AudioResource, options?: AudioProcessingOptions): string
  startDownload(taskId: string): Promise<void>
  pauseDownload(taskId: string): void
  cancelDownload(taskId: string): void
  retryDownload(taskId: string): Promise<void>
  
  // 队列管理
  getDownloadQueue(): DownloadTask[]
  clearCompleted(): void
  clearAll(): void
  
  // 资源管理
  getDownloadedResources(): AudioResource[]
  deleteResource(audioId: string): Promise<void>
  
  // 状态查询
  getTaskStatus(taskId: string): DownloadTask | null
  getOverallProgress(): {
    total: number
    completed: number
    failed: number
    inProgress: number
  }
  
  // 事件监听
  onProgress(callback: (taskId: string, progress: number) => void): void
  onComplete(callback: (taskId: string, result: AudioResource) => void): void
  onError(callback: (taskId: string, error: ApiError) => void): void
}

/**
 * 音频预览器接口
 */
export interface IAudioPreviewer {
  // 预览控制
  play(audioResource: AudioResource): Promise<void>
  pause(): void
  stop(): void
  seek(time: number): void
  
  // 状态查询
  isPlaying(): boolean
  getCurrentTime(): number
  getDuration(): number
  
  // 音量控制
  setVolume(volume: number): void
  getVolume(): number
  
  // 事件监听
  onLoadStart(callback: () => void): void
  onLoadEnd(callback: () => void): void
  onPlay(callback: () => void): void
  onPause(callback: () => void): void
  onEnd(callback: () => void): void
  onError(callback: (error: Error) => void): void
}

/**
 * 音频处理器接口
 */
export interface IAudioProcessor {
  // 格式转换
  convertFormat(inputFile: File, targetFormat: string): Promise<Blob>
  
  // 音量处理
  normalizeVolume(inputFile: File): Promise<Blob>
  
  // 压缩处理
  compress(inputFile: File, quality: number): Promise<Blob>
  
  // 裁剪处理
  trim(inputFile: File, startTime: number, endTime: number): Promise<Blob>
  
  // 渐变处理
  addFade(inputFile: File, fadeIn: number, fadeOut: number): Promise<Blob>
  
  // 批量处理
  batchProcess(files: File[], options: AudioProcessingOptions): Promise<Blob[]>
  
  // 质量检测
  analyzeQuality(file: File): Promise<{
    format: string
    sampleRate: number
    bitRate: number
    channels: number
    duration: number
    fileSize: number
    quality: AudioQuality
  }>
}

/**
 * 音乐下载设置
 */
export interface MusicDownloadSettings {
  autoDownload: boolean            // 自动开始下载
  defaultQuality: AudioQuality     // 默认音质
  downloadPath: string             // 下载目录
  maxConcurrent: number            // 最大并发数
  enableProcessing: boolean        // 启用音频处理
  autoIntegration: boolean         // 自动集成到游戏
  licenseCheck: boolean            // 授权检查
  providers: MusicProvider[]       // 启用的音乐库
}

/**
 * 音乐下载状态
 */
export interface MusicDownloadState {
  isInitialized: boolean
  searchResults: SearchResult | null
  currentSearch: SearchRequest | null
  downloadQueue: DownloadTask[]
  downloadedResources: DownloadedResource[]  // 修改为 DownloadedResource[]
  settings: MusicDownloadSettings
  apiStatus: Record<MusicProvider, boolean>
  isSearching: boolean
  error: ApiError | null
}

/**
 * 音乐下载操作
 */
export interface MusicDownloadActions {
  // 初始化
  initialize(): Promise<void>
  
  // 搜索相关
  search(request: SearchRequest): Promise<void>
  clearSearch(): void
  
  // 下载相关
  addToDownloadQueue(resource: AudioResource, options?: AudioProcessingOptions): void
  removeFromQueue(taskId: string): void
  startDownload(taskId: string): Promise<void>
  pauseDownload(taskId: string): void
  cancelDownload(taskId: string): void
  retryDownload(taskId: string): Promise<void>
  
  // 队列管理
  clearCompleted(): void
  clearAll(): void
  getOverallProgress(): {
    total: number
    completed: number
    failed: number
    inProgress: number
  }
  
  // 资源管理
  deleteDownloadedResource(audioId: string): Promise<void>
  integrateToGame(audioId: string, gameCategory: GameAudioCategory): Promise<void>
  
  // 设置管理
  updateSettings(settings: Partial<MusicDownloadSettings>): void
  
  // 状态更新
  updateTaskProgress(taskId: string, progress: number): void
  updateTaskStatus(taskId: string, status: DownloadStatus): void
  setError(error: ApiError | null): void
}

/**
 * 事件类型
 */
export type MusicDownloadEvent = 
  | 'search_start'
  | 'search_complete'
  | 'search_error'
  | 'download_start'
  | 'download_progress'
  | 'download_complete'
  | 'download_error'
  | 'queue_update'
  | 'settings_change'

/**
 * 已下载资源类型 (简化版AudioResource)
 */
export interface DownloadedResource {
  id: string
  name: string
  category: GameAudioCategory
  fileSize: number
  duration?: number
  filePath: string
  downloadedAt: Date
  format: string
}

/**
 * 事件监听器类型
 */
export type MusicDownloadEventListener = (event: MusicDownloadEvent, data?: any) => void