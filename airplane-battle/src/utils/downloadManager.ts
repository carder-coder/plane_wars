/**
 * 下载管理器
 * 管理音频文件的下载队列、进度跟踪和文件管理
 */

import { 
  DownloadTask, 
  DownloadStatus, 
  AudioResource, 
  AudioProcessingOptions,
  ApiError,
  ApiErrorType,
  IMusicDownloadManager,
  SearchRequest,
  SearchResult,
  DownloadQueueConfig
} from '../types/musicDownload'

import { musicApiManager } from './musicApi'

/**
 * 下载事件类型
 */
type DownloadEventType = 'progress' | 'complete' | 'error' | 'start' | 'cancel'

/**
 * 下载事件监听器
 */
type DownloadEventListener = (taskId: string, data?: any) => void

/**
 * 默认下载配置
 */
const DEFAULT_DOWNLOAD_CONFIG: DownloadQueueConfig = {
  maxConcurrent: 3,
  maxRetries: 3,
  retryDelay: 2000,
  timeout: 30000,
  resumeSupport: true
}

/**
 * 下载管理器实现
 */
export class DownloadManager implements IMusicDownloadManager {
  private downloadQueue: Map<string, DownloadTask> = new Map()
  private activeDownloads: Map<string, AbortController> = new Map()
  private downloadedResources: Map<string, AudioResource> = new Map()
  private eventListeners: Map<DownloadEventType, Set<DownloadEventListener>> = new Map()
  private config: DownloadQueueConfig
  private storageKey = 'airplane_battle_downloaded_resources'

  constructor(config: Partial<DownloadQueueConfig> = {}) {
    this.config = { ...DEFAULT_DOWNLOAD_CONFIG, ...config }
    this.loadDownloadedResources()
  }

  /**
   * 搜索音频资源（委托给API管理器）
   */
  async searchAudio(request: SearchRequest): Promise<SearchResult> {
    return await musicApiManager.search(request)
  }

  /**
   * 添加到下载队列
   */
  addToQueue(audioResource: AudioResource, options?: AudioProcessingOptions): string {
    const taskId = this.generateTaskId()
    
    const task: DownloadTask = {
      taskId,
      audioId: audioResource.id,
      status: DownloadStatus.PENDING,
      progress: 0,
      downloadedBytes: 0,
      totalBytes: audioResource.fileSize || 0,
      speed: 0,
      retryCount: 0,
      startTime: new Date(),
      processingOptions: options
    }

    this.downloadQueue.set(taskId, task)
    
    // 自动开始下载（如果有空闲槽位）
    this.processQueue()
    
    return taskId
  }

  /**
   * 开始下载
   */
  async startDownload(taskId: string): Promise<void> {
    const task = this.downloadQueue.get(taskId)
    if (!task) {
      throw new Error(`Download task not found: ${taskId}`)
    }

    if (task.status !== DownloadStatus.PENDING) {
      throw new Error(`Cannot start download in status: ${task.status}`)
    }

    await this.executeDownload(task)
  }

  /**
   * 暂停下载
   */
  pauseDownload(taskId: string): void {
    const controller = this.activeDownloads.get(taskId)
    if (controller) {
      controller.abort()
      this.activeDownloads.delete(taskId)
      
      const task = this.downloadQueue.get(taskId)
      if (task) {
        task.status = DownloadStatus.PENDING
        this.downloadQueue.set(taskId, task)
      }
    }
  }

  /**
   * 取消下载
   */
  cancelDownload(taskId: string): void {
    const controller = this.activeDownloads.get(taskId)
    if (controller) {
      controller.abort()
      this.activeDownloads.delete(taskId)
    }

    const task = this.downloadQueue.get(taskId)
    if (task) {
      task.status = DownloadStatus.CANCELLED
      this.downloadQueue.set(taskId, task)
      this.emitEvent('cancel', taskId)
    }
  }

  /**
   * 重试下载
   */
  async retryDownload(taskId: string): Promise<void> {
    const task = this.downloadQueue.get(taskId)
    if (!task) {
      throw new Error(`Download task not found: ${taskId}`)
    }

    if (task.retryCount >= this.config.maxRetries) {
      throw new Error('Maximum retry attempts exceeded')
    }

    task.status = DownloadStatus.PENDING
    task.retryCount++
    task.error = undefined
    this.downloadQueue.set(taskId, task)

    // 延迟重试
    setTimeout(() => {
      this.processQueue()
    }, this.config.retryDelay)
  }

  /**
   * 执行下载
   */
  private async executeDownload(task: DownloadTask): Promise<void> {
    try {
      task.status = DownloadStatus.DOWNLOADING
      task.startTime = new Date()
      this.downloadQueue.set(task.taskId, task)
      this.emitEvent('start', task.taskId)

      // 获取音频资源信息
      const audioResource = await this.getAudioResourceById(task.audioId)
      if (!audioResource) {
        throw new Error('Audio resource not found')
      }

      // 获取下载URL
      const downloadUrl = await musicApiManager.getDownloadUrl(audioResource)
      
      // 创建下载控制器
      const controller = new AbortController()
      this.activeDownloads.set(task.taskId, controller)

      // 执行下载
      const response = await fetch(downloadUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AirplaneBattle/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`)
      }

      const totalBytes = parseInt(response.headers.get('content-length') || '0')
      task.totalBytes = totalBytes
      
      // 读取响应流
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Failed to get response reader')
      }

      const chunks: Uint8Array[] = []
      let downloadedBytes = 0
      const startTime = Date.now()

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        chunks.push(value)
        downloadedBytes += value.length
        
        // 更新进度
        const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0
        const elapsed = Date.now() - startTime
        const speed = elapsed > 0 ? (downloadedBytes / elapsed) * 1000 : 0

        task.progress = Math.min(progress, 100)
        task.downloadedBytes = downloadedBytes
        task.speed = speed
        this.downloadQueue.set(task.taskId, task)
        
        this.emitEvent('progress', task.taskId, { progress, downloadedBytes, speed })
      }

      // 合并数据块
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const fileData = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        fileData.set(chunk, offset)
        offset += chunk.length
      }

      // 保存文件
      const outputPath = await this.saveFile(audioResource, fileData)
      
      // 更新资源信息
      audioResource.downloaded = true
      audioResource.localPath = outputPath
      audioResource.updatedAt = new Date()
      
      // 处理完成
      task.status = DownloadStatus.COMPLETED
      task.progress = 100
      task.completeTime = new Date()
      task.outputPath = outputPath
      this.downloadQueue.set(task.taskId, task)
      
      // 保存到已下载资源
      this.downloadedResources.set(audioResource.id, audioResource)
      this.saveDownloadedResources()
      
      this.activeDownloads.delete(task.taskId)
      this.emitEvent('complete', task.taskId, audioResource)
      
      // 处理队列中的下一个任务
      this.processQueue()

    } catch (error) {
      this.handleDownloadError(task, error as Error)
    }
  }

  /**
   * 保存文件到本地
   */
  private async saveFile(audioResource: AudioResource, data: Uint8Array): Promise<string> {
    try {
      // 生成文件名和路径
      const fileName = this.generateFileName(audioResource)
      const categoryPath = this.getCategoryPath(audioResource.gameCategory)
      const fullPath = `${categoryPath}/${fileName}`
      
      // 在实际应用中，这里应该调用文件系统API
      // 这里模拟文件保存过程
      const blob = new Blob([data], { type: this.getContentType(audioResource.format) })
      
      // 创建临时URL（用于预览）
      const tempUrl = URL.createObjectURL(blob)
      
      // 在实际环境中，应该使用File System Access API或其他方式保存文件
      // 这里返回临时路径
      return fullPath
      
    } catch (error) {
      throw new Error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 生成文件名
   */
  private generateFileName(audioResource: AudioResource): string {
    const safeName = audioResource.name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)
    
    const timestamp = Date.now()
    const extension = this.getFileExtension(audioResource.format)
    
    return `${safeName}_${timestamp}.${extension}`
  }

  /**
   * 获取分类路径
   */
  private getCategoryPath(category: string): string {
    switch (category) {
      case 'bgm':
        return 'public/assets/sounds/bgm'
      case 'ui':
        return 'public/assets/sounds/sfx/ui'
      case 'gameplay':
        return 'public/assets/sounds/sfx/gameplay'
      case 'events':
        return 'public/assets/sounds/sfx/events'
      default:
        return 'public/assets/sounds/sfx'
    }
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(format: string): string {
    switch (format.toLowerCase()) {
      case 'mpeg':
      case 'mp3':
        return 'mp3'
      case 'wav':
      case 'wave':
        return 'wav'
      case 'ogg':
        return 'ogg'
      case 'mp4':
      case 'm4a':
        return 'm4a'
      default:
        return 'mp3'
    }
  }

  /**
   * 获取内容类型
   */
  private getContentType(format: string): string {
    switch (format.toLowerCase()) {
      case 'mp3':
      case 'mpeg':
        return 'audio/mpeg'
      case 'wav':
      case 'wave':
        return 'audio/wav'
      case 'ogg':
        return 'audio/ogg'
      case 'mp4':
      case 'm4a':
        return 'audio/mp4'
      default:
        return 'audio/mpeg'
    }
  }

  /**
   * 处理下载错误
   */
  private handleDownloadError(task: DownloadTask, error: Error): void {
    task.status = DownloadStatus.FAILED
    task.error = error.message
    this.downloadQueue.set(task.taskId, task)
    
    this.activeDownloads.delete(task.taskId)
    this.emitEvent('error', task.taskId, error)
    
    // 如果可以重试，添加到重试队列
    if (task.retryCount < this.config.maxRetries) {
      setTimeout(() => {
        this.retryDownload(task.taskId).catch(console.error)
      }, this.config.retryDelay)
    } else {
      console.error(`Download failed permanently: ${task.taskId}`, error)
    }
    
    // 处理队列中的下一个任务
    this.processQueue()
  }

  /**
   * 处理下载队列
   */
  private processQueue(): void {
    const pendingTasks = Array.from(this.downloadQueue.values())
      .filter(task => task.status === DownloadStatus.PENDING)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    
    const activeCount = this.activeDownloads.size
    const availableSlots = this.config.maxConcurrent - activeCount
    
    if (availableSlots > 0 && pendingTasks.length > 0) {
      const tasksToStart = pendingTasks.slice(0, availableSlots)
      tasksToStart.forEach(task => {
        this.executeDownload(task).catch(console.error)
      })
    }
  }

  /**
   * 获取下载队列
   */
  getDownloadQueue(): DownloadTask[] {
    return Array.from(this.downloadQueue.values())
  }

  /**
   * 清理已完成的任务
   */
  clearCompleted(): void {
    Array.from(this.downloadQueue.entries()).forEach(([taskId, task]) => {
      if (task.status === DownloadStatus.COMPLETED || task.status === DownloadStatus.CANCELLED) {
        this.downloadQueue.delete(taskId)
      }
    })
  }

  /**
   * 清理所有任务
   */
  clearAll(): void {
    // 取消所有活动下载
    this.activeDownloads.forEach((controller, taskId) => {
      controller.abort()
      this.cancelDownload(taskId)
    })
    
    this.downloadQueue.clear()
    this.activeDownloads.clear()
  }

  /**
   * 获取已下载的资源
   */
  getDownloadedResources(): AudioResource[] {
    return Array.from(this.downloadedResources.values())
  }

  /**
   * 删除资源
   */
  async deleteResource(audioId: string): Promise<void> {
    const resource = this.downloadedResources.get(audioId)
    if (resource) {
      // 在实际应用中，这里应该删除本地文件
      
      this.downloadedResources.delete(audioId)
      this.saveDownloadedResources()
    }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): DownloadTask | null {
    return this.downloadQueue.get(taskId) || null
  }

  /**
   * 获取整体进度
   */
  getOverallProgress(): {
    total: number
    completed: number
    failed: number
    inProgress: number
  } {
    const tasks = Array.from(this.downloadQueue.values())
    
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === DownloadStatus.COMPLETED).length,
      failed: tasks.filter(t => t.status === DownloadStatus.FAILED).length,
      inProgress: tasks.filter(t => t.status === DownloadStatus.DOWNLOADING).length
    }
  }

  /**
   * 添加事件监听器
   */
  onProgress(callback: (taskId: string, progress: number) => void): void {
    this.addEventListener('progress', callback)
  }

  onComplete(callback: (taskId: string, result: AudioResource) => void): void {
    this.addEventListener('complete', callback)
  }

  onError(callback: (taskId: string, error: ApiError) => void): void {
    this.addEventListener('error', callback)
  }

  /**
   * 添加事件监听器
   */
  private addEventListener(event: DownloadEventType, listener: DownloadEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)
  }

  /**
   * 触发事件
   */
  private emitEvent(event: DownloadEventType, taskId: string, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(taskId, data)
        } catch (error) {
          console.error(`Error in download event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 根据ID获取音频资源
   */
  private async getAudioResourceById(audioId: string): Promise<AudioResource | null> {
    // 这里应该实现从搜索结果或缓存中获取音频资源的逻辑
    // 暂时返回null，需要在集成时完善
    return null
  }

  /**
   * 加载已下载的资源
   */
  private loadDownloadedResources(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const resources: AudioResource[] = JSON.parse(stored)
        resources.forEach(resource => {
          this.downloadedResources.set(resource.id, resource)
        })
      }
    } catch (error) {
      console.warn('Failed to load downloaded resources:', error)
    }
  }

  /**
   * 保存已下载的资源
   */
  private saveDownloadedResources(): void {
    try {
      const resources = Array.from(this.downloadedResources.values())
      localStorage.setItem(this.storageKey, JSON.stringify(resources))
    } catch (error) {
      console.warn('Failed to save downloaded resources:', error)
    }
  }

  /**
   * 销毁下载管理器
   */
  destroy(): void {
    this.clearAll()
    this.eventListeners.clear()
  }
}

// 创建全局下载管理器实例
export const downloadManager = new DownloadManager()