import { 
  IBGMController, 
  PlayOptions, 
  SoundId, 
  IAudioResourceManager 
} from '../types/sound'

/**
 * 背景音乐控制器
 * 负责背景音乐的播放、暂停、切换和音量控制
 */
export class BGMController implements IBGMController {
  private currentMusic: SoundId | null = null
  private currentAudio: HTMLAudioElement | null = null
  private musicVolume: number = 0.5
  private isMuted: boolean = false
  private fadeInterval: number | null = null
  private resourceManager: IAudioResourceManager

  constructor(resourceManager: IAudioResourceManager) {
    this.resourceManager = resourceManager
  }

  /**
   * 播放背景音乐
   */
  play(musicId: SoundId, options: PlayOptions = {}): void {
    try {
      // 如果正在播放相同音乐，不需要重新播放
      if (this.currentMusic === musicId && this.isPlaying()) {
        return
      }

      // 停止当前播放的音乐
      if (this.currentAudio && !this.currentAudio.paused) {
        this.stop()
      }

      // 获取音频实例
      const audioInstance = this.resourceManager.getAudio(musicId)
      if (!audioInstance) {
        console.warn(`Background music not found: ${musicId}`)
        return
      }
      
      if (!audioInstance.isLoaded) {
        console.warn(`Background music not loaded: ${musicId}`)
        return
      }

      const audio = audioInstance.audio
      
      // 设置播放选项
      audio.volume = options.volume !== undefined 
        ? Math.min(1, Math.max(0, options.volume * this.musicVolume))
        : this.musicVolume
      
      if (options.loop !== undefined) {
        audio.loop = options.loop
      }

      // 重置播放位置
      audio.currentTime = 0

      // 播放音乐
      const playPromise = audio.play()
      
      if (playPromise) {
        playPromise
          .then(() => {
            this.currentMusic = musicId
            this.currentAudio = audio
            
            // 应用淡入效果
            if (options.fadeIn && options.fadeIn > 0) {
              this.fadeIn(options.fadeIn)
            }
            
            console.log(`Background music started: ${musicId}`)
          })
          .catch(error => {
            console.warn(`Failed to play background music: ${musicId}`, error)
            this.handlePlaybackError(error)
          })
      }

    } catch (error) {
      console.warn(`Error playing background music: ${musicId}`, error)
    }
  }

  /**
   * 暂停背景音乐
   */
  pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause()
      console.log(`Background music paused: ${this.currentMusic}`)
    }
  }

  /**
   * 恢复背景音乐
   */
  resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      const playPromise = this.currentAudio.play()
      
      if (playPromise) {
        playPromise
          .then(() => {
            console.log(`Background music resumed: ${this.currentMusic}`)
          })
          .catch(error => {
            console.error(`Failed to resume background music`, error)
            this.handlePlaybackError(error)
          })
      }
    }
  }

  /**
   * 停止背景音乐
   */
  stop(): void {
    if (this.currentAudio) {
      // 清除淡入淡出效果
      this.clearFade()
      
      // 停止播放
      if (!this.currentAudio.paused) {
        this.currentAudio.pause()
      }
      
      // 重置播放位置
      this.currentAudio.currentTime = 0
      
      console.log(`Background music stopped: ${this.currentMusic}`)
      
      this.currentMusic = null
      this.currentAudio = null
    }
  }

  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    this.musicVolume = Math.min(1, Math.max(0, volume))
    
    if (this.currentAudio && !this.isMuted) {
      this.currentAudio.volume = this.musicVolume
    }
  }

  /**
   * 淡入效果
   */
  fadeIn(duration: number): void {
    if (!this.currentAudio) return

    this.clearFade()
    
    const audio = this.currentAudio
    const targetVolume = this.musicVolume
    const steps = 20
    const stepDuration = duration / steps
    const volumeStep = targetVolume / steps

    audio.volume = 0
    let currentStep = 0

    this.fadeInterval = window.setInterval(() => {
      currentStep++
      audio.volume = Math.min(volumeStep * currentStep, targetVolume)

      if (currentStep >= steps) {
        this.clearFade()
      }
    }, stepDuration)
  }

  /**
   * 淡出效果
   */
  fadeOut(duration: number): void {
    if (!this.currentAudio) return

    this.clearFade()
    
    const audio = this.currentAudio
    const initialVolume = audio.volume
    const steps = 20
    const stepDuration = duration / steps
    const volumeStep = initialVolume / steps

    let currentStep = 0

    this.fadeInterval = window.setInterval(() => {
      currentStep++
      audio.volume = Math.max(initialVolume - (volumeStep * currentStep), 0)

      if (currentStep >= steps) {
        this.clearFade()
        this.stop()
      }
    }, stepDuration)
  }

  /**
   * 清除淡入淡出效果
   */
  private clearFade(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval)
      this.fadeInterval = null
    }
  }

  /**
   * 获取当前播放的音乐
   */
  getCurrentMusic(): SoundId | null {
    return this.currentMusic
  }

  /**
   * 检查是否正在播放
   */
  isPlaying(): boolean {
    return this.currentAudio ? !this.currentAudio.paused : false
  }

  /**
   * 静音控制
   */
  mute(muted: boolean): void {
    this.isMuted = muted
    
    if (this.currentAudio) {
      this.currentAudio.volume = muted ? 0 : this.musicVolume
    }
  }

  /**
   * 获取当前音量
   */
  getVolume(): number {
    return this.musicVolume
  }

  /**
   * 获取播放进度
   */
  getProgress(): { current: number; duration: number; percentage: number } {
    if (!this.currentAudio) {
      return { current: 0, duration: 0, percentage: 0 }
    }

    const current = this.currentAudio.currentTime
    const duration = this.currentAudio.duration || 0
    const percentage = duration > 0 ? (current / duration) * 100 : 0

    return { current, duration, percentage }
  }

  /**
   * 设置播放进度
   */
  setProgress(percentage: number): void {
    if (!this.currentAudio) return

    const duration = this.currentAudio.duration
    if (duration && isFinite(duration)) {
      const targetTime = (percentage / 100) * duration
      this.currentAudio.currentTime = Math.min(Math.max(0, targetTime), duration)
    }
  }

  /**
   * 处理播放错误
   */
  private handlePlaybackError(error: any): void {
    console.error('Background music playback error:', error)
    
    // 重置状态
    this.currentMusic = null
    this.currentAudio = null
    this.clearFade()
    
    // 可以在这里触发错误事件或重试逻辑
  }

  /**
   * 平滑切换到新音乐
   */
  crossFade(newMusicId: SoundId, fadeTime: number = 1000, options: PlayOptions = {}): void {
    if (this.currentMusic === newMusicId && this.isPlaying()) {
      return
    }

    // 如果当前有音乐在播放，先淡出
    if (this.currentAudio && this.isPlaying()) {
      // 保存当前音频引用，以便在淡出完成后停止
      const oldAudio = this.currentAudio
      
      // 开始新音乐的播放
      setTimeout(() => {
        this.play(newMusicId, { ...options, fadeIn: fadeTime })
      }, fadeTime / 2)
      
      // 淡出当前音乐
      this.fadeOut(fadeTime)
    } else {
      // 直接播放新音乐
      this.play(newMusicId, { ...options, fadeIn: fadeTime })
    }
  }

  /**
   * 销毁控制器
   */
  destroy(): void {
    this.stop()
    this.clearFade()
    this.currentMusic = null
    this.currentAudio = null
  }
}