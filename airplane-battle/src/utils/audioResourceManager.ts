import { 
  AudioConfig, 
  AudioInstance, 
  IAudioResourceManager, 
  SoundId 
} from '../types/sound'
import { getOptimalAudioUrl } from './soundConfig'

/**
 * 音频资源管理器
 * 负责音频文件的加载、缓存和管理
 */
export class AudioResourceManager implements IAudioResourceManager {
  private audioInstances: Map<SoundId, AudioInstance> = new Map()
  private loadingPromises: Map<SoundId, Promise<AudioInstance>> = new Map()
  private errorCount: Map<SoundId, number> = new Map()
  private readonly maxRetries = 3

  /**
   * 加载音频文件
   */
  async loadAudio(config: AudioConfig): Promise<AudioInstance> {
    // 检查是否已在加载中
    const existingPromise = this.loadingPromises.get(config.id)
    if (existingPromise) {
      return existingPromise
    }

    // 检查是否已加载
    const existingInstance = this.audioInstances.get(config.id)
    if (existingInstance && existingInstance.isLoaded) {
      return existingInstance
    }

    // 创建加载Promise
    const loadPromise = this.createAudioInstance(config)
    this.loadingPromises.set(config.id, loadPromise)

    try {
      const instance = await loadPromise
      this.audioInstances.set(config.id, instance)
      return instance
    } catch (error) {
      console.error(`Failed to load audio: ${config.id}`, error)
      
      // 对于加载失败的音频，创建一个默认实例避免后续错误
      const fallbackInstance: AudioInstance = {
        id: config.id,
        audio: new Audio(),
        config,
        isLoaded: false,
        isPlaying: false
      }
      this.audioInstances.set(config.id, fallbackInstance)
      
      // 不再抛出错误，而是返回默认实例
      console.warn(`Audio loading failed for ${config.id}, using fallback instance`)
      return fallbackInstance
    } finally {
      this.loadingPromises.delete(config.id)
    }
  }

  /**
   * 创建音频实例
   */
  private async createAudioInstance(config: AudioConfig): Promise<AudioInstance> {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      const instance: AudioInstance = {
        id: config.id,
        audio,
        config,
        isLoaded: false,
        isPlaying: false
      }

      // 设置音频属性
      audio.preload = config.preload ? 'auto' : 'none'
      audio.loop = config.loop
      audio.volume = config.volume

      // 监听加载事件
      const onLoad = () => {
        instance.isLoaded = true
        this.errorCount.delete(config.id)
        cleanup()
        resolve(instance)
      }

      const onError = (_error: Event) => {
        const retryCount = this.errorCount.get(config.id) || 0
        
        if (retryCount < this.maxRetries) {
          this.errorCount.set(config.id, retryCount + 1)
          console.warn(`Audio load retry ${retryCount + 1}/${this.maxRetries}: ${config.id}`)
          
          // 重试加载
          setTimeout(() => {
            const newSrc = getOptimalAudioUrl(config.url)
            audio.src = newSrc
            audio.load()
          }, 1000 * (retryCount + 1))
          
          return
        }

        cleanup()
        const errorMsg = `Failed to load audio after ${this.maxRetries} retries: ${config.id}`
        reject(new Error(errorMsg))
      }

      const cleanup = () => {
        audio.removeEventListener('canplaythrough', onLoad)
        audio.removeEventListener('error', onError)
        audio.removeEventListener('abort', onError)
      }

      // 监听播放状态变化
      audio.addEventListener('play', () => {
        instance.isPlaying = true
      })

      audio.addEventListener('pause', () => {
        instance.isPlaying = false
      })

      audio.addEventListener('ended', () => {
        instance.isPlaying = false
      })

      // 设置事件监听器
      audio.addEventListener('canplaythrough', onLoad)
      audio.addEventListener('error', onError)
      audio.addEventListener('abort', onError)

      // 开始加载
      try {
        audio.src = getOptimalAudioUrl(config.url)
        if (config.preload) {
          audio.load()
        } else {
          // 对于非预加载音频，直接标记为已加载
          setTimeout(onLoad, 0)
        }
      } catch (error) {
        console.error(`Error setting audio src for ${config.id}:`, error)
        setTimeout(() => onError(error as Event), 0)
      }
    })
  }

  /**
   * 获取音频实例
   */
  getAudio(id: SoundId): AudioInstance | null {
    const instance = this.audioInstances.get(id)
    return instance || null
  }

  /**
   * 检查音频是否已加载
   */
  isLoaded(id: SoundId): boolean {
    const instance = this.audioInstances.get(id)
    return instance ? instance.isLoaded : false
  }

  /**
   * 预加载所有音频
   */
  async preloadAll(): Promise<void> {
    const { AUDIO_CONFIGS } = await import('./soundConfig')
    
    const preloadConfigs = Object.values(AUDIO_CONFIGS).filter(config => config.preload)
    
    console.log(`Starting to preload ${preloadConfigs.length} audio files...`)
    
    // 并行加载所有预加载音频
    const loadPromises = preloadConfigs.map(async (config) => {
      try {
        const instance = await this.loadAudio(config)
        console.log(`Successfully preloaded: ${config.id}`)
        return instance
      } catch (error) {
        console.warn(`Failed to preload audio: ${config.id}`, error)
        // 返回 null 而不是抛出错误
        return null
      }
    })

    const results = await Promise.allSettled(loadPromises)
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null).length
    const failed = results.length - successful
    
    console.log(`Preload completed: ${successful} successful, ${failed} failed`)
  }

  /**
   * 释放资源
   */
  releaseResources(): void {
    this.audioInstances.forEach(instance => {
      try {
        const audio = instance.audio
        
        // 停止播放
        if (!audio.paused) {
          audio.pause()
        }
        
        // 重置音频
        audio.currentTime = 0
        audio.removeAttribute('src')
        audio.load()
        
      } catch (error) {
        console.warn(`Error releasing audio resource: ${instance.id}`, error)
      }
    })

    // 清空缓存
    this.audioInstances.clear()
    this.loadingPromises.clear()
    this.errorCount.clear()
    
    console.log('Audio resources released')
  }

  /**
   * 获取加载统计信息
   */
  getLoadStats(): {
    total: number
    loaded: number
    loading: number
    errors: number
  } {
    const total = this.audioInstances.size
    const loaded = Array.from(this.audioInstances.values()).filter(i => i.isLoaded).length
    const loading = this.loadingPromises.size
    const errors = this.errorCount.size

    return { total, loaded, loading, errors }
  }

  /**
   * 检查浏览器音频支持
   */
  checkAudioSupport(): {
    webAudio: boolean
    htmlAudio: boolean
    autoplay: boolean
  } {
    const webAudio = 'AudioContext' in window || 'webkitAudioContext' in window
    const htmlAudio = 'Audio' in window
    
    // 检测自动播放支持（简化版）
    let autoplay = false
    try {
      const audio = new Audio()
      autoplay = typeof audio.play === 'function'
    } catch {
      autoplay = false
    }

    return { webAudio, htmlAudio, autoplay }
  }

  /**
   * 克隆音频实例（用于同时播放多个相同音效）
   */
  cloneAudio(id: SoundId): AudioInstance | null {
    const original = this.getAudio(id)
    if (!original || !original.isLoaded) {
      return null
    }

    try {
      const clonedAudio = original.audio.cloneNode() as HTMLAudioElement
      const clonedInstance: AudioInstance = {
        id: original.id,
        audio: clonedAudio,
        config: original.config,
        isLoaded: true,
        isPlaying: false
      }

      // 复制音频设置
      clonedAudio.volume = original.audio.volume
      clonedAudio.loop = original.audio.loop

      // 监听播放状态
      clonedAudio.addEventListener('play', () => {
        clonedInstance.isPlaying = true
      })

      clonedAudio.addEventListener('pause', () => {
        clonedInstance.isPlaying = false
      })

      clonedAudio.addEventListener('ended', () => {
        clonedInstance.isPlaying = false
      })

      return clonedInstance
    } catch (error) {
      console.warn(`Failed to clone audio: ${id}`, error)
      return null
    }
  }
}