import { 
  ISoundManager, 
  SoundSettings, 
  SoundId, 
  PlayOptions,
  SoundEventListener,
  SoundEvent,
  SoundQuality
} from '../types/sound'
import { AudioResourceManager } from './audioResourceManager'
import { BGMController } from './bgmController'
import { SFXPlayer } from './sfxPlayer'
import { AUDIO_CONFIGS, DEFAULT_SOUND_SETTINGS } from './soundConfig'

/**
 * 音效管理器
 * 音效系统的主控制器，统一管理所有音效相关功能
 */
export class SoundManager implements ISoundManager {
  private resourceManager: AudioResourceManager
  private bgmController: BGMController
  private sfxPlayer: SFXPlayer
  private settings: SoundSettings
  private eventListeners: Map<SoundEvent, Set<SoundEventListener>> = new Map()
  private isInitialized: boolean = false
  private storageKey = 'airplane_battle_sound_settings'

  constructor() {
    this.resourceManager = new AudioResourceManager()
    this.bgmController = new BGMController(this.resourceManager)
    this.sfxPlayer = new SFXPlayer(this.resourceManager)
    this.settings = this.loadSettings()
  }

  /**
   * 初始化音效系统
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      console.log('Initializing sound system...')
      
      // 检查浏览器音频支持
      const audioSupport = this.resourceManager.checkAudioSupport()
      console.log('Audio support:', audioSupport)

      if (!audioSupport.htmlAudio) {
        console.warn('HTML Audio not supported, sound system disabled')
        this.settings.soundEnabled = false
        return
      }

      // 预加载音频资源
      await this.preloadAssets()
      
      // 预热音效
      await this.sfxPlayer.warmUpAll()
      
      // 应用设置
      this.applySettings()
      
      this.isInitialized = true
      this.emitEvent('sound_loaded', { initialized: true })
      
      console.log('Sound system initialized successfully')
      
    } catch (error) {
      console.error('Failed to initialize sound system:', error)
      this.settings.soundEnabled = false
      throw error
    }
  }

  /**
   * 播放音效
   */
  playSound(soundId: SoundId, options: PlayOptions = {}): void {
    if (!this.settings.soundEnabled || !this.isInitialized) {
      return
    }

    try {
      const config = AUDIO_CONFIGS[soundId]
      if (!config) {
        console.warn(`Unknown sound ID: ${soundId}`)
        return
      }

      if (config.type === 'bgm') {
        this.playMusic(soundId, options)
      } else {
        this.sfxPlayer.play(soundId, options)
        this.emitEvent('sound_play_start', { soundId, options })
      }
      
    } catch (error) {
      console.error(`Error playing sound: ${soundId}`, error)
      this.emitEvent('sound_error', { soundId, error })
    }
  }

  /**
   * 停止音效
   */
  stopSound(soundId: SoundId): void {
    try {
      const config = AUDIO_CONFIGS[soundId]
      if (!config) {
        return
      }

      if (config.type === 'bgm') {
        this.stopMusic()
      } else {
        this.sfxPlayer.stop(soundId)
      }
      
    } catch (error) {
      console.error(`Error stopping sound: ${soundId}`, error)
    }
  }

  /**
   * 播放背景音乐
   */
  playMusic(musicId: SoundId, options: PlayOptions = {}): void {
    console.log(`请求播放背景音乐: ${musicId}`);
    console.log(`音乐开关: ${this.settings.musicEnabled}, 初始化状态: ${this.isInitialized}`);
    
    if (!this.settings.musicEnabled) {
      console.warn('背景音乐已被禁用');
      return
    }
    
    if (!this.isInitialized) {
      console.warn('音效系统尚未初始化');
      return
    }

    try {
      this.bgmController.play(musicId, options)
      this.emitEvent('music_change', { musicId, options })
    } catch (error) {
      console.error(`Error playing music: ${musicId}`, error)
      this.emitEvent('sound_error', { musicId, error })
    }
  }

  /**
   * 暂停背景音乐
   */
  pauseMusic(): void {
    this.bgmController.pause()
  }

  /**
   * 恢复背景音乐
   */
  resumeMusic(): void {
    if (this.settings.musicEnabled) {
      this.bgmController.resume()
    }
  }

  /**
   * 停止背景音乐
   */
  stopMusic(): void {
    this.bgmController.stop()
  }

  /**
   * 设置主音量
   */
  setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.min(1, Math.max(0, volume))
    this.applyVolumeSettings()
    this.saveSettings()
    this.emitEvent('volume_change', { type: 'master', volume })
  }

  /**
   * 设置背景音乐音量
   */
  setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.min(1, Math.max(0, volume))
    this.bgmController.setVolume(this.settings.musicVolume * this.settings.masterVolume)
    this.saveSettings()
    this.emitEvent('volume_change', { type: 'music', volume })
  }

  /**
   * 设置音效音量
   */
  setSfxVolume(volume: number): void {
    this.settings.sfxVolume = Math.min(1, Math.max(0, volume))
    this.sfxPlayer.setVolume(this.settings.sfxVolume * this.settings.masterVolume)
    this.saveSettings()
    this.emitEvent('volume_change', { type: 'sfx', volume })
  }

  /**
   * 启用/禁用音效
   */
  enableSound(enabled: boolean): void {
    this.settings.soundEnabled = enabled
    
    if (!enabled) {
      this.sfxPlayer.stopAll()
    }
    
    this.saveSettings()
    this.emitEvent('settings_change', { soundEnabled: enabled })
  }

  /**
   * 启用/禁用背景音乐
   */
  enableMusic(enabled: boolean): void {
    this.settings.musicEnabled = enabled
    
    if (!enabled) {
      this.stopMusic()
    } else if (this.isInitialized) {
      // 可以在这里添加自动恢复背景音乐的逻辑
    }
    
    this.saveSettings()
    this.emitEvent('settings_change', { musicEnabled: enabled })
  }

  /**
   * 预加载音频资源
   */
  async preloadAssets(): Promise<void> {
    await this.resourceManager.preloadAll()
  }

  /**
   * 释放资源
   */
  releaseResources(): void {
    this.sfxPlayer.destroy()
    this.bgmController.destroy()
    this.resourceManager.releaseResources()
    this.isInitialized = false
  }

  /**
   * 获取设置
   */
  getSettings(): SoundSettings {
    return { ...this.settings }
  }

  /**
   * 更新设置
   */
  updateSettings(newSettings: Partial<SoundSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
    this.applySettings()
    this.saveSettings()
    this.emitEvent('settings_change', newSettings)
  }

  /**
   * 应用设置
   */
  private applySettings(): void {
    this.applyVolumeSettings()
    
    // 应用音质设置
    if (this.settings.soundQuality !== SoundQuality.HIGH) {
      // 可以在这里添加音质调整逻辑
    }
  }

  /**
   * 应用音量设置
   */
  private applyVolumeSettings(): void {
    this.bgmController.setVolume(this.settings.musicVolume * this.settings.masterVolume)
    this.sfxPlayer.setVolume(this.settings.sfxVolume * this.settings.masterVolume)
  }

  /**
   * 加载设置
   */
  private loadSettings(): SoundSettings {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const parsedSettings = JSON.parse(stored)
        return { ...DEFAULT_SOUND_SETTINGS, ...parsedSettings }
      }
    } catch (error) {
      console.warn('Failed to load sound settings:', error)
    }
    
    return { ...DEFAULT_SOUND_SETTINGS }
  }

  /**
   * 保存设置
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings))
    } catch (error) {
      console.warn('Failed to save sound settings:', error)
    }
  }

  /**
   * 添加事件监听器
   */
  addEventListener(event: SoundEvent, listener: SoundEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(event: SoundEvent, listener: SoundEventListener): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  /**
   * 触发事件
   */
  private emitEvent(event: SoundEvent, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event, data)
        } catch (error) {
          console.error(`Error in sound event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * 获取系统状态
   */
  getStatus(): {
    initialized: boolean
    settings: SoundSettings
    currentMusic: SoundId | null
    playingCount: number
    loadStats: any
  } {
    return {
      initialized: this.isInitialized,
      settings: this.getSettings(),
      currentMusic: this.bgmController.getCurrentMusic(),
      playingCount: this.sfxPlayer.getPlayStats().totalActive,
      loadStats: this.resourceManager.getLoadStats()
    }
  }

  /**
   * 测试音效播放
   */
  testSound(soundId: SoundId): void {
    console.log(`Testing sound: ${soundId}`)
    this.playSound(soundId, { volume: 0.5 })
  }

  /**
   * 批量播放音效
   */
  playSounds(soundIds: SoundId[], delay: number = 100): void {
    soundIds.forEach((soundId, index) => {
      setTimeout(() => {
        this.playSound(soundId)
      }, index * delay)
    })
  }

  /**
   * 销毁音效管理器
   */
  destroy(): void {
    this.releaseResources()
    this.eventListeners.clear()
  }
}

// 创建全局音效管理器实例
export const soundManager = new SoundManager()