import { 
  ISFXPlayer, 
  PlayOptions, 
  SoundId, 
  IAudioResourceManager,
  AudioInstance 
} from '../types/sound'

/**
 * 音效播放器
 * 负责短音效的播放和管理
 */
export class SFXPlayer implements ISFXPlayer {
  private sfxVolume: number = 0.8
  private isMuted: boolean = false
  private resourceManager: IAudioResourceManager
  private activeInstances: Map<string, HTMLAudioElement> = new Map()
  private playingCount: Map<SoundId, number> = new Map()
  private maxConcurrentSounds: number = 5 // 每种音效最大同时播放数

  constructor(resourceManager: IAudioResourceManager) {
    this.resourceManager = resourceManager
  }

  /**
   * 播放音效
   */
  play(soundId: SoundId, options: PlayOptions = {}): void {
    // 如果静音，直接返回
    if (this.isMuted) {
      return
    }
    
    try {
      // 检查并发播放限制
      const currentCount = this.playingCount.get(soundId) || 0
      if (currentCount >= this.maxConcurrentSounds) {
        console.warn(`Max concurrent sounds reached for: ${soundId}`)
        return
      }

      // 获取音频实例
      let audioInstance = this.resourceManager.getAudio(soundId)
      
      // 如果音频未加载，静默失败
      if (!audioInstance) {
        console.warn(`Sound effect not found: ${soundId}`)
        return
      }
      
      if (!audioInstance.isLoaded) {
        console.warn(`Sound effect not loaded: ${soundId}`)
        return
      }
      
      // 如果需要同时播放多个相同音效，尝试克隆音频
      if (currentCount > 0 && 'cloneAudio' in this.resourceManager) {
        const clonedInstance = (this.resourceManager as any).cloneAudio(soundId)
        if (clonedInstance) {
          audioInstance = clonedInstance
        }
      }

      // 再次检查音频实例
      if (!audioInstance) {
        console.warn(`Sound effect instance is null: ${soundId}`)
        return
      }

      const audio = audioInstance.audio
      
      // 设置播放选项
      audio.volume = this.calculateVolume(options.volume)
      
      if (options.loop !== undefined) {
        audio.loop = options.loop
      }

      // 重置播放位置
      audio.currentTime = 0

      // 生成唯一实例ID
      const instanceId = `${soundId}_${Date.now()}_${Math.random()}`
      
      // 设置事件监听器
      const onEnded = () => {
        this.cleanupInstance(instanceId, soundId, audio)
      }

      const onError = (error: Event) => {
        console.error(`Sound effect playback error: ${soundId}`, error)
        this.cleanupInstance(instanceId, soundId, audio)
      }

      audio.addEventListener('ended', onEnded, { once: true })
      audio.addEventListener('error', onError, { once: true })

      // 播放音效
      const playPromise = audio.play()
      
      if (playPromise) {
        playPromise
          .then(() => {
            // 记录活动实例
            this.activeInstances.set(instanceId, audio)
            this.playingCount.set(soundId, currentCount + 1)
            
            console.log(`Sound effect played: ${soundId}`)
          })
          .catch(error => {
            // 播放失败时不抛出错误，只记录日志
            console.warn(`Failed to play sound effect: ${soundId}`, error)
            this.cleanupInstance(instanceId, soundId, audio)
          })
      }

    } catch (error) {
      // 捕获所有错误，避免影响游戏正常运行
      console.warn(`Error playing sound effect: ${soundId}`, error)
    }
  }

  /**
   * 停止指定音效
   */
  stop(soundId: SoundId): void {
    // 停止所有该音效的播放实例
    const instancesToStop: string[] = []
    
    this.activeInstances.forEach((audio, instanceId) => {
      if (instanceId.startsWith(soundId)) {
        if (!audio.paused) {
          audio.pause()
          audio.currentTime = 0
        }
        instancesToStop.push(instanceId)
      }
    })

    // 清理停止的实例
    instancesToStop.forEach(instanceId => {
      this.activeInstances.delete(instanceId)
    })

    // 重置计数
    this.playingCount.set(soundId, 0)
    
    console.log(`Sound effect stopped: ${soundId}`)
  }

  /**
   * 停止所有音效
   */
  stopAll(): void {
    this.activeInstances.forEach((audio, instanceId) => {
      if (!audio.paused) {
        audio.pause()
        audio.currentTime = 0
      }
    })

    this.activeInstances.clear()
    this.playingCount.clear()
    
    console.log('All sound effects stopped')
  }

  /**
   * 设置音效音量
   */
  setVolume(volume: number): void {
    this.sfxVolume = Math.min(1, Math.max(0, volume))
    
    // 更新所有活动音效的音量
    this.activeInstances.forEach(audio => {
      if (!this.isMuted) {
        audio.volume = this.sfxVolume
      }
    })
  }

  /**
   * 静音控制
   */
  mute(muted: boolean): void {
    this.isMuted = muted
    
    this.activeInstances.forEach(audio => {
      audio.volume = muted ? 0 : this.sfxVolume
    })
  }

  /**
   * 获取当前音量
   */
  getVolume(): number {
    return this.sfxVolume
  }

  /**
   * 计算最终播放音量
   */
  private calculateVolume(optionVolume?: number): number {
    if (this.isMuted) return 0
    
    const baseVolume = optionVolume !== undefined ? optionVolume : 1
    return Math.min(1, Math.max(0, baseVolume * this.sfxVolume))
  }

  /**
   * 清理音效实例
   */
  private cleanupInstance(instanceId: string, soundId: SoundId, audio: HTMLAudioElement): void {
    // 移除事件监听器
    audio.removeEventListener('ended', () => this.cleanupInstance(instanceId, soundId, audio))
    audio.removeEventListener('error', () => this.cleanupInstance(instanceId, soundId, audio))
    
    // 从活动实例中移除
    this.activeInstances.delete(instanceId)
    
    // 更新计数
    const currentCount = this.playingCount.get(soundId) || 0
    this.playingCount.set(soundId, Math.max(0, currentCount - 1))
  }

  /**
   * 获取播放统计信息
   */
  getPlayStats(): {
    totalActive: number
    bySound: Record<string, number>
  } {
    const totalActive = this.activeInstances.size
    const bySound: Record<string, number> = {}
    
    this.playingCount.forEach((count, soundId) => {
      if (count > 0) {
        bySound[soundId] = count
      }
    })

    return { totalActive, bySound }
  }

  /**
   * 设置最大并发播放数
   */
  setMaxConcurrentSounds(max: number): void {
    this.maxConcurrentSounds = Math.max(1, max)
  }

  /**
   * 预热音效（预加载并进行无声播放测试）
   */
  async warmUp(soundId: SoundId): Promise<boolean> {
    try {
      const audioInstance = this.resourceManager.getAudio(soundId)
      if (!audioInstance || !audioInstance.isLoaded) {
        return false
      }

      const audio = audioInstance.audio
      
      // 无声播放测试
      const originalVolume = audio.volume
      audio.volume = 0
      
      const playPromise = audio.play()
      if (playPromise) {
        await playPromise
        audio.pause()
        audio.currentTime = 0
        audio.volume = originalVolume
      }
      
      return true
    } catch (error) {
      console.warn(`Failed to warm up sound: ${soundId}`, error)
      return false
    }
  }

  /**
   * 批量预热音效
   */
  async warmUpAll(): Promise<void> {
    const { AUDIO_CONFIGS } = await import('./soundConfig')
    const sfxIds = Object.keys(AUDIO_CONFIGS).filter(
      id => AUDIO_CONFIGS[id as SoundId].type === 'sfx'
    ) as SoundId[]

    const warmUpPromises = sfxIds.map(id => this.warmUp(id))
    await Promise.allSettled(warmUpPromises)
    
    console.log(`Warmed up ${sfxIds.length} sound effects`)
  }

  /**
   * 播放音效序列
   */
  playSequence(sounds: Array<{ id: SoundId; delay?: number; options?: PlayOptions }>): void {
    let totalDelay = 0
    
    sounds.forEach(({ id, delay = 0, options = {} }) => {
      totalDelay += delay
      
      setTimeout(() => {
        this.play(id, options)
      }, totalDelay)
    })
  }

  /**
   * 随机播放音效组合
   */
  playRandom(soundIds: SoundId[], options: PlayOptions = {}): void {
    if (soundIds.length === 0) return
    
    const randomIndex = Math.floor(Math.random() * soundIds.length)
    const selectedSound = soundIds[randomIndex]
    
    this.play(selectedSound, options)
  }

  /**
   * 销毁播放器
   */
  destroy(): void {
    this.stopAll()
    this.activeInstances.clear()
    this.playingCount.clear()
  }
}