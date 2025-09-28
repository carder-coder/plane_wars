/**
 * 音频预览器
 * 提供音频预览播放功能
 */

import { AudioResource, IAudioPreviewer } from '../types/musicDownload'

/**
 * 预览器事件类型
 */
type PreviewEventType = 'loadstart' | 'loadend' | 'play' | 'pause' | 'end' | 'error' | 'timeupdate'

/**
 * 预览器事件监听器
 */
type PreviewEventListener = (data?: any) => void

/**
 * 音频预览器实现
 */
export class AudioPreviewer implements IAudioPreviewer {
  private audio: HTMLAudioElement | null = null
  private currentResource: AudioResource | null = null
  private eventListeners: Map<PreviewEventType, Set<PreviewEventListener>> = new Map()
  private isLoading: boolean = false

  /**
   * 播放音频预览
   */
  async play(audioResource: AudioResource): Promise<void> {
    try {
      // 如果正在播放其他音频，先停止
      if (this.audio && !this.audio.paused) {
        this.stop()
      }

      // 如果是同一个资源且已加载，直接播放
      if (this.currentResource?.id === audioResource.id && this.audio) {
        await this.audio.play()
        this.emitEvent('play')
        return
      }

      // 加载新的音频资源
      await this.loadAudio(audioResource)
      
      if (this.audio) {
        await this.audio.play()
        this.emitEvent('play')
      }
    } catch (error) {
      console.error('Failed to play audio preview:', error)
      this.emitEvent('error', error)
      throw error
    }
  }

  /**
   * 暂停播放
   */
  pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause()
      this.emitEvent('pause')
    }
  }

  /**
   * 停止播放
   */
  stop(): void {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
      this.emitEvent('pause')
    }
  }

  /**
   * 跳转到指定时间
   */
  seek(time: number): void {
    if (this.audio) {
      this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration || 0))
    }
  }

  /**
   * 检查是否正在播放
   */
  isPlaying(): boolean {
    return this.audio ? !this.audio.paused : false
  }

  /**
   * 获取当前播放时间
   */
  getCurrentTime(): number {
    return this.audio?.currentTime || 0
  }

  /**
   * 获取音频总时长
   */
  getDuration(): number {
    return this.audio?.duration || 0
  }

  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    if (this.audio) {
      this.audio.volume = clampedVolume
    }
  }

  /**
   * 获取音量
   */
  getVolume(): number {
    return this.audio?.volume || 0.5
  }

  /**
   * 加载音频资源
   */
  private async loadAudio(audioResource: AudioResource): Promise<void> {
    if (this.isLoading) {
      return
    }

    this.isLoading = true
    this.emitEvent('loadstart')

    try {
      // 销毁之前的音频元素
      this.destroyAudio()

      // 创建新的音频元素
      this.audio = new Audio()
      this.currentResource = audioResource
      
      // 设置音频属性
      this.audio.preload = 'metadata'
      this.audio.volume = 0.5
      this.audio.crossOrigin = 'anonymous'

      // 绑定事件监听器
      this.setupAudioEventListeners()

      // 获取预览URL
      const previewUrl = await this.getPreviewUrl(audioResource)
      if (!previewUrl) {
        throw new Error('No preview URL available')
      }

      // 加载音频
      this.audio.src = previewUrl
      
      // 等待加载完成
      await new Promise<void>((resolve, reject) => {
        if (!this.audio) {
          reject(new Error('Audio element destroyed during loading'))
          return
        }

        const onLoad = () => {
          cleanup()
          resolve()
        }

        const onError = (error: Event) => {
          cleanup()
          reject(new Error(`Failed to load audio: ${error.type}`))
        }

        const cleanup = () => {
          if (this.audio) {
            this.audio.removeEventListener('loadeddata', onLoad)
            this.audio.removeEventListener('error', onError)
          }
        }

        this.audio.addEventListener('loadeddata', onLoad, { once: true })
        this.audio.addEventListener('error', onError, { once: true })

        // 设置超时
        setTimeout(() => {
          cleanup()
          reject(new Error('Audio loading timeout'))
        }, 10000)
      })

      this.emitEvent('loadend')
    } catch (error) {
      this.emitEvent('error', error)
      throw error
    } finally {
      this.isLoading = false
    }
  }

  /**
   * 获取预览URL
   */
  private async getPreviewUrl(audioResource: AudioResource): Promise<string | null> {
    // 优先使用预设的预览URL
    if (audioResource.previewUrl) {
      return audioResource.previewUrl
    }

    // 尝试从API获取预览URL
    try {
      const { musicApiManager } = await import('./musicApi')
      return await musicApiManager.getPreviewUrl(audioResource)
    } catch (error) {
      console.warn('Failed to get preview URL from API:', error)
      
      // 回退到使用下载URL（如果可用）
      return audioResource.downloadUrl || null
    }
  }

  /**
   * 设置音频事件监听器
   */
  private setupAudioEventListeners(): void {
    if (!this.audio) return

    // 时间更新事件
    this.audio.addEventListener('timeupdate', () => {
      this.emitEvent('timeupdate', {
        currentTime: this.getCurrentTime(),
        duration: this.getDuration()
      })
    })

    // 播放结束事件
    this.audio.addEventListener('ended', () => {
      this.emitEvent('end')
    })

    // 错误事件
    this.audio.addEventListener('error', (event) => {
      const error = new Error(`Audio playback error: ${event.type}`)
      this.emitEvent('error', error)
    })

    // 暂停事件
    this.audio.addEventListener('pause', () => {
      this.emitEvent('pause')
    })

    // 播放事件
    this.audio.addEventListener('play', () => {
      this.emitEvent('play')
    })
  }

  /**
   * 销毁音频元素
   */
  private destroyAudio(): void {
    if (this.audio) {
      this.audio.pause()
      this.audio.src = ''
      this.audio.load() // 强制释放资源
      this.audio = null
    }
    this.currentResource = null
  }

  /**
   * 事件监听器注册方法
   */
  onLoadStart(callback: () => void): void {
    this.addEventListener('loadstart', callback)
  }

  onLoadEnd(callback: () => void): void {
    this.addEventListener('loadend', callback)
  }

  onPlay(callback: () => void): void {
    this.addEventListener('play', callback)
  }

  onPause(callback: () => void): void {
    this.addEventListener('pause', callback)
  }

  onEnd(callback: () => void): void {
    this.addEventListener('end', callback)
  }

  onError(callback: (error: Error) => void): void {
    this.addEventListener('error', callback)
  }

  onTimeUpdate(callback: (data: { currentTime: number, duration: number }) => void): void {
    this.addEventListener('timeupdate', callback)
  }

  /**
   * 添加事件监听器
   */
  private addEventListener(event: PreviewEventType, listener: PreviewEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(event: PreviewEventType, listener: PreviewEventListener): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  /**
   * 触发事件
   */
  private emitEvent(event: PreviewEventType, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error(`Error in audio preview event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * 获取当前播放的资源
   */
  getCurrentResource(): AudioResource | null {
    return this.currentResource
  }

  /**
   * 检查是否正在加载
   */
  isLoadingAudio(): boolean {
    return this.isLoading
  }

  /**
   * 销毁预览器
   */
  destroy(): void {
    this.destroyAudio()
    this.eventListeners.clear()
    this.isLoading = false
  }
}

// 创建全局音频预览器实例
export const audioPreviewer = new AudioPreviewer()