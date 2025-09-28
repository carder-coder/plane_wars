/**
 * 音乐下载状态管理
 * 使用 Zustand 管理音乐下载系统的状态
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { 
  MusicProvider,
  AudioQuality,
  DownloadStatus,
  GameAudioCategory
} from '../types/musicDownload'
import type { 
  MusicDownloadState, 
  MusicDownloadActions,
  AudioResource,
  DownloadTask,
  DownloadedResource,
  SearchRequest,
  SearchResult,
  MusicDownloadSettings,
  ApiError,
  AudioProcessingOptions
} from '../types/musicDownload'

/**
 * 默认设置
 */
const defaultSettings: MusicDownloadSettings = {
  autoDownload: false,
  defaultQuality: AudioQuality.HIGH,
  downloadPath: './public/assets/sounds',
  maxConcurrent: 3,
  enableProcessing: true,
  autoIntegration: false,
  licenseCheck: true,
  providers: [MusicProvider.FREESOUND, MusicProvider.PIXABAY]
}

/**
 * 音乐下载状态接口
 */
interface MusicDownloadStore extends MusicDownloadState, MusicDownloadActions {}

/**
 * 音乐下载存储
 */
export const useMusicDownloadStore = create<MusicDownloadStore>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    isInitialized: false,
    searchResults: null,
    currentSearch: null,
    downloadQueue: [],
    downloadedResources: [],
    settings: defaultSettings,
    apiStatus: {
      [MusicProvider.FREESOUND]: false,
      [MusicProvider.PIXABAY]: false,
      [MusicProvider.OPENGAMEART]: false,
      [MusicProvider.ZAPSPLAT]: false,
      [MusicProvider.BBC_SOUND]: false
    },
    isSearching: false,
    error: null,

    // 初始化
    initialize: async () => {
      try {
        console.log('[MusicDownloadStore] 初始化音乐下载系统...')
        
        // 模拟初始化过程
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 加载已下载的资源
        const savedResources = localStorage.getItem('downloadedResources')
        const downloadedResources = savedResources ? JSON.parse(savedResources) : []
        
        // 加载设置
        const savedSettings = localStorage.getItem('musicDownloadSettings')
        const settings = savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings
        
        set({
          isInitialized: true,
          downloadedResources,
          settings,
          apiStatus: {
            [MusicProvider.FREESOUND]: true,
            [MusicProvider.PIXABAY]: true,
            [MusicProvider.OPENGAMEART]: false,
            [MusicProvider.ZAPSPLAT]: false,
            [MusicProvider.BBC_SOUND]: false
          }
        })
        
        console.log('[MusicDownloadStore] 音乐下载系统初始化完成')
      } catch (error) {
        console.error('[MusicDownloadStore] 初始化失败:', error)
        set({ 
          error: {
            type: 'server_error' as any,
            message: '系统初始化失败',
            retryable: true
          }
        })
        throw error
      }
    },

    // 搜索相关
    search: async (request: SearchRequest) => {
      set({ isSearching: true, error: null })
      
      try {
        console.log('[MusicDownloadStore] 开始搜索:', request)
        
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // 模拟搜索结果
        const mockResults: AudioResource[] = [
          {
            id: 'audio_001',
            source: MusicProvider.FREESOUND,
            sourceId: 'fs_001',
            name: '激烈战斗音效',
            description: '高质量的战斗背景音乐',
            url: 'https://freesound.org/audio001',
            downloadUrl: 'https://freesound.org/download/audio001.mp3',
            previewUrl: 'https://freesound.org/preview/audio001.mp3',
            duration: 120,
            fileSize: 2048000,
            format: 'mp3',
            sampleRate: 44100,
            channels: 2,
            license: 'CC0',
            author: 'GameSoundMaster',
            tags: ['battle', 'epic', 'orchestral'],
            gameCategory: GameAudioCategory.BGM,
            preview: true,
            downloaded: false,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'audio_002',
            source: MusicProvider.PIXABAY,
            sourceId: 'px_002',
            name: '按钮点击音效',
            description: '清脆的UI按钮点击声音',
            url: 'https://pixabay.com/audio002',
            downloadUrl: 'https://pixabay.com/download/audio002.wav',
            duration: 1,
            fileSize: 48000,
            format: 'wav',
            sampleRate: 44100,
            channels: 1,
            license: 'Pixabay License',
            author: 'UIDesigner',
            tags: ['click', 'button', 'ui'],
            gameCategory: GameAudioCategory.UI,
            preview: true,
            downloaded: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
        
        const searchResult: SearchResult = {
          results: mockResults,
          total: mockResults.length,
          page: request.page || 1,
          pageSize: request.pageSize || 20,
          hasMore: false
        }
        
        set({
          searchResults: searchResult,
          currentSearch: request,
          isSearching: false
        })
        
        console.log('[MusicDownloadStore] 搜索完成，找到', mockResults.length, '个结果')
      } catch (error) {
        console.error('[MusicDownloadStore] 搜索失败:', error)
        set({
          isSearching: false,
          error: {
            type: 'network_error' as any,
            message: '搜索失败，请重试',
            retryable: true
          }
        })
      }
    },

    clearSearch: () => {
      set({
        searchResults: null,
        currentSearch: null,
        error: null
      })
    },

    // 下载相关
    addToDownloadQueue: (resource: AudioResource, options?: AudioProcessingOptions) => {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const newTask: DownloadTask = {
        taskId,
        audioId: resource.id,
        status: DownloadStatus.PENDING,
        progress: 0,
        downloadedBytes: 0,
        totalBytes: resource.fileSize,
        speed: 0,
        retryCount: 0,
        startTime: new Date(),
        processingOptions: options
      }
      
      set(state => ({
        downloadQueue: [...state.downloadQueue, newTask]
      }))
      
      console.log('[MusicDownloadStore] 添加到下载队列:', resource.name)
    },

    removeFromQueue: (taskId: string) => {
      set(state => ({
        downloadQueue: state.downloadQueue.filter(task => task.taskId !== taskId)
      }))
    },

    startDownload: async (taskId: string) => {
      const { downloadQueue } = get()
      const task = downloadQueue.find(t => t.taskId === taskId)
      
      if (!task) return
      
      // 更新任务状态为下载中
      set(state => ({
        downloadQueue: state.downloadQueue.map(t =>
          t.taskId === taskId
            ? { ...t, status: DownloadStatus.DOWNLOADING, startTime: new Date() }
            : t
        )
      }))
      
      try {
        console.log('[MusicDownloadStore] 开始下载任务:', taskId)
        
        // 模拟下载进度
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 200))
          
          set(state => ({
            downloadQueue: state.downloadQueue.map(t =>
              t.taskId === taskId
                ? {
                    ...t,
                    progress,
                    downloadedBytes: Math.floor((progress / 100) * t.totalBytes),
                    speed: 1024 * 50 // 50KB/s
                  }
                : t
            )
          }))
        }
        
        // 完成下载
        const completedTask = get().downloadQueue.find(t => t.taskId === taskId)
        if (completedTask) {
          // 创建已下载资源记录
          const downloadedResource: DownloadedResource = {
            id: completedTask.audioId,
            name: `音频资源_${completedTask.audioId}`,
            category: GameAudioCategory.BGM,
            fileSize: completedTask.totalBytes,
            duration: 120,
            filePath: `./public/assets/sounds/${completedTask.audioId}.mp3`,
            downloadedAt: new Date(),
            format: 'mp3'
          }
          
          set(state => {
            const newDownloadedResources = [...state.downloadedResources, downloadedResource]
            
            // 保存到本地存储
            localStorage.setItem('downloadedResources', JSON.stringify(newDownloadedResources))
            
            return {
              downloadQueue: state.downloadQueue.map(t =>
                t.taskId === taskId
                  ? { ...t, status: DownloadStatus.COMPLETED, completeTime: new Date() }
                  : t
              ),
              downloadedResources: newDownloadedResources
            }
          })
          
          console.log('[MusicDownloadStore] 下载完成:', taskId)
        }
      } catch (error) {
        console.error('[MusicDownloadStore] 下载失败:', error)
        set(state => ({
          downloadQueue: state.downloadQueue.map(t =>
            t.taskId === taskId
              ? { ...t, status: DownloadStatus.FAILED, error: '下载失败' }
              : t
          )
        }))
      }
    },

    pauseDownload: (taskId: string) => {
      // 暂停功能的实现
      console.log('[MusicDownloadStore] 暂停下载:', taskId)
    },

    cancelDownload: (taskId: string) => {
      set(state => ({
        downloadQueue: state.downloadQueue.map(t =>
          t.taskId === taskId
            ? { ...t, status: DownloadStatus.CANCELLED }
            : t
        )
      }))
      console.log('[MusicDownloadStore] 取消下载:', taskId)
    },

    retryDownload: async (taskId: string) => {
      set(state => ({
        downloadQueue: state.downloadQueue.map(t =>
          t.taskId === taskId
            ? { ...t, status: DownloadStatus.PENDING, retryCount: t.retryCount + 1, error: undefined }
            : t
        )
      }))
      
      // 重新开始下载
      await get().startDownload(taskId)
    },

    // 资源管理
    deleteDownloadedResource: async (audioId: string) => {
      set(state => {
        const newDownloadedResources = state.downloadedResources.filter(r => r.id !== audioId)
        
        // 更新本地存储
        localStorage.setItem('downloadedResources', JSON.stringify(newDownloadedResources))
        
        return {
          downloadedResources: newDownloadedResources
        }
      })
      
      console.log('[MusicDownloadStore] 删除资源:', audioId)
    },

    integrateToGame: async (audioId: string, gameCategory: GameAudioCategory) => {
      // 集成到游戏的实现
      console.log('[MusicDownloadStore] 集成到游戏:', audioId, gameCategory)
    },

    // 设置管理
    updateSettings: (newSettings: Partial<MusicDownloadSettings>) => {
      set(state => {
        const updatedSettings = { ...state.settings, ...newSettings }
        
        // 保存到本地存储
        localStorage.setItem('musicDownloadSettings', JSON.stringify(updatedSettings))
        
        return {
          settings: updatedSettings
        }
      })
    },

    // 状态更新
    updateTaskProgress: (taskId: string, progress: number) => {
      set(state => ({
        downloadQueue: state.downloadQueue.map(t =>
          t.taskId === taskId ? { ...t, progress } : t
        )
      }))
    },

    updateTaskStatus: (taskId: string, status: DownloadStatus) => {
      set(state => ({
        downloadQueue: state.downloadQueue.map(t =>
          t.taskId === taskId ? { ...t, status } : t
        )
      }))
    },

    setError: (error: ApiError | null) => {
      set({ error })
    },

    // 辅助方法
    getOverallProgress: () => {
      const { downloadQueue } = get()
      const total = downloadQueue.length
      const completed = downloadQueue.filter(t => t.status === DownloadStatus.COMPLETED).length
      const failed = downloadQueue.filter(t => t.status === DownloadStatus.FAILED).length
      const inProgress = downloadQueue.filter(t => 
        t.status === DownloadStatus.DOWNLOADING || t.status === DownloadStatus.PENDING
      ).length
      
      return { total, completed, failed, inProgress }
    },

    getResourcePath: (resource: DownloadedResource) => {
      return resource.filePath
    },

    removeDownloadedResource: async (resourceId: string) => {
      await get().deleteDownloadedResource(resourceId)
    },

    clearCompleted: () => {
      set(state => ({
        downloadQueue: state.downloadQueue.filter(task => task.status !== DownloadStatus.COMPLETED)
      }))
    },

    clearAll: () => {
      set({ downloadQueue: [] })
    }
  }))
)

// 默认导出
export default useMusicDownloadStore