/**
 * 音效系统类型定义
 * 定义音效管理所需的所有类型和接口
 */

/**
 * 音频类型枚举
 */
export enum SoundType {
  BGM = 'bgm',           // 背景音乐
  SFX = 'sfx'            // 音效
}

/**
 * 音效标识符枚举
 */
export enum SoundId {
  // 背景音乐
  GAME_BACKGROUND = 'game_background',
  VICTORY_MUSIC = 'victory_music',
  DEFEAT_MUSIC = 'defeat_music',
  
  // UI音效
  BUTTON_CLICK = 'button_click',
  
  // 游戏音效
  ATTACK_LAUNCH = 'attack_launch',
  HIT_BODY = 'hit_body',
  HIT_HEAD = 'hit_head',
  ATTACK_MISS = 'attack_miss',
  AIRPLANE_CONFIRM = 'airplane_confirm',
  
  // 事件音效
  GAME_START = 'game_start',
  GAME_VICTORY = 'game_victory',
  GAME_DEFEAT = 'game_defeat'
}

/**
 * 音质设置枚举
 */
export enum SoundQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

/**
 * 音效设置接口
 */
export interface SoundSettings {
  soundEnabled: boolean           // 音效总开关
  musicEnabled: boolean           // 背景音乐开关
  masterVolume: number           // 主音量 (0-1)
  musicVolume: number            // 背景音乐音量 (0-1)
  sfxVolume: number              // 音效音量 (0-1)
  soundQuality: SoundQuality     // 音质设置
}

/**
 * 音频配置接口
 */
export interface AudioConfig {
  id: SoundId                    // 音频唯一标识
  name: string                   // 音频显示名称
  url: string                    // 音频文件路径
  type: SoundType                // 音频类型
  preload: boolean               // 是否预加载
  volume: number                 // 默认音量 (0-1)
  loop: boolean                  // 是否循环播放
}

/**
 * 音频播放选项接口
 */
export interface PlayOptions {
  volume?: number                // 播放音量 (0-1)
  loop?: boolean                 // 是否循环
  fadeIn?: number                // 淡入时间 (毫秒)
  fadeOut?: number               // 淡出时间 (毫秒)
}

/**
 * 音频实例接口
 */
export interface AudioInstance {
  id: SoundId                    // 音频标识
  audio: HTMLAudioElement        // 音频元素
  config: AudioConfig            // 音频配置
  isLoaded: boolean              // 是否已加载
  isPlaying: boolean             // 是否正在播放
}

/**
 * 音效管理器接口
 */
export interface ISoundManager {
  // 初始化
  initialize(): Promise<void>
  
  // 音效播放控制
  playSound(soundId: SoundId, options?: PlayOptions): void
  stopSound(soundId: SoundId): void
  
  // 背景音乐控制
  playMusic(musicId: SoundId, options?: PlayOptions): void
  pauseMusic(): void
  resumeMusic(): void
  stopMusic(): void
  
  // 音量控制
  setMasterVolume(volume: number): void
  setMusicVolume(volume: number): void
  setSfxVolume(volume: number): void
  
  // 开关控制
  enableSound(enabled: boolean): void
  enableMusic(enabled: boolean): void
  
  // 资源管理
  preloadAssets(): Promise<void>
  releaseResources(): void
  
  // 设置管理
  getSettings(): SoundSettings
  updateSettings(settings: Partial<SoundSettings>): void
}

/**
 * 音频资源管理器接口
 */
export interface IAudioResourceManager {
  loadAudio(config: AudioConfig): Promise<AudioInstance>
  getAudio(id: SoundId): AudioInstance | null
  preloadAll(): Promise<void>
  releaseResources(): void
  isLoaded(id: SoundId): boolean
}

/**
 * 背景音乐控制器接口
 */
export interface IBGMController {
  play(musicId: SoundId, options?: PlayOptions): void
  pause(): void
  resume(): void
  stop(): void
  setVolume(volume: number): void
  fadeIn(duration: number): void
  fadeOut(duration: number): void
  getCurrentMusic(): SoundId | null
  isPlaying(): boolean
}

/**
 * 音效播放器接口
 */
export interface ISFXPlayer {
  play(soundId: SoundId, options?: PlayOptions): void
  stop(soundId: SoundId): void
  setVolume(volume: number): void
  stopAll(): void
}

/**
 * 音效事件类型
 */
export type SoundEvent = 
  | 'sound_loaded'
  | 'sound_play_start'
  | 'sound_play_end'
  | 'sound_error'
  | 'music_change'
  | 'volume_change'
  | 'settings_change'

/**
 * 音效事件监听器类型
 */
export type SoundEventListener = (event: SoundEvent, data?: any) => void