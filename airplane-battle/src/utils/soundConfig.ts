import { AudioConfig, SoundId, SoundType, SoundQuality } from '../types/sound'

/**
 * 音频资源配置
 * 定义所有音频文件的配置信息
 */
export const AUDIO_CONFIGS: Record<SoundId, AudioConfig> = {
  // 背景音乐配置
  [SoundId.GAME_BACKGROUND]: {
    id: SoundId.GAME_BACKGROUND,
    name: '游戏背景音乐',
    url: '/assets/sounds/bgm/game_background.mp3',
    type: SoundType.BGM,
    preload: true,
    volume: 0.5,
    loop: true
  },
  
  [SoundId.VICTORY_MUSIC]: {
    id: SoundId.VICTORY_MUSIC,
    name: '胜利音乐',
    url: '/assets/sounds/bgm/victory.mp3',
    type: SoundType.BGM,
    preload: true,
    volume: 0.7,
    loop: false
  },
  
  [SoundId.DEFEAT_MUSIC]: {
    id: SoundId.DEFEAT_MUSIC,
    name: '失败音乐',
    url: '/assets/sounds/bgm/defeat.mp3',
    type: SoundType.BGM,
    preload: true,
    volume: 0.7,
    loop: false
  },
  
  // UI音效配置
  [SoundId.BUTTON_CLICK]: {
    id: SoundId.BUTTON_CLICK,
    name: '按钮点击音效',
    url: '/assets/sounds/sfx/ui/button_click.mp3',
    type: SoundType.SFX,
    preload: true,
    volume: 0.8,
    loop: false
  },
  
  // 游戏音效配置
  [SoundId.ATTACK_LAUNCH]: {
    id: SoundId.ATTACK_LAUNCH,
    name: '攻击发射音效',
    url: '/assets/sounds/sfx/gameplay/attack_launch.mp3',
    type: SoundType.SFX,
    preload: true,
    volume: 0.8,
    loop: false
  },
  
  [SoundId.HIT_BODY]: {
    id: SoundId.HIT_BODY,
    name: '击中机身音效',
    url: '/assets/sounds/sfx/gameplay/hit_body.mp3',
    type: SoundType.SFX,
    preload: true,
    volume: 0.9,
    loop: false
  },
  
  [SoundId.HIT_HEAD]: {
    id: SoundId.HIT_HEAD,
    name: '击中机头音效',
    url: '/assets/sounds/sfx/gameplay/hit_head.mp3',
    type: SoundType.SFX,
    preload: true,
    volume: 1.0,
    loop: false
  },
  
  [SoundId.ATTACK_MISS]: {
    id: SoundId.ATTACK_MISS,
    name: '攻击未中音效',
    url: '/assets/sounds/sfx/gameplay/attack_miss.mp3',
    type: SoundType.SFX,
    preload: true,
    volume: 0.6,
    loop: false
  },
  
  [SoundId.AIRPLANE_CONFIRM]: {
    id: SoundId.AIRPLANE_CONFIRM,
    name: '飞机放置确认音效',
    url: '/assets/sounds/sfx/gameplay/airplane_confirm.mp3',
    type: SoundType.SFX,
    preload: true,
    volume: 0.8,
    loop: false
  },
  
  // 事件音效配置
  [SoundId.GAME_START]: {
    id: SoundId.GAME_START,
    name: '游戏开始音效',
    url: '/assets/sounds/sfx/events/game_start.mp3',
    type: SoundType.SFX,
    preload: true,
    volume: 0.8,
    loop: false
  },
  
  [SoundId.GAME_VICTORY]: {
    id: SoundId.GAME_VICTORY,
    name: '游戏胜利音效',
    url: '/assets/sounds/sfx/events/game_victory.mp3',
    type: SoundType.SFX,
    preload: true,
    volume: 0.9,
    loop: false
  },
  
  [SoundId.GAME_DEFEAT]: {
    id: SoundId.GAME_DEFEAT,
    name: '游戏失败音效',
    url: '/assets/sounds/sfx/events/game_defeat.mp3',
    type: SoundType.SFX,
    preload: true,
    volume: 0.8,
    loop: false
  }
}

/**
 * 默认音效设置
 */
export const DEFAULT_SOUND_SETTINGS = {
  soundEnabled: true,
  musicEnabled: true,
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  soundQuality: SoundQuality.MEDIUM
}

/**
 * 音频文件格式支持检测
 */
export const SUPPORTED_AUDIO_FORMATS = {
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  m4a: 'audio/mp4'
}

/**
 * 检测浏览器音频格式支持
 */
export function detectAudioSupport(): Record<string, boolean> {
  const audio = new Audio()
  const support: Record<string, boolean> = {}
  
  Object.entries(SUPPORTED_AUDIO_FORMATS).forEach(([format, mimeType]) => {
    support[format] = audio.canPlayType(mimeType) !== ''
  })
  
  return support
}

/**
 * 获取适合的音频格式URL
 * 直接返回配置的URL，不再自动更改扩展名
 */
export function getOptimalAudioUrl(baseUrl: string): string {
  // 直接返回配置的URL，因为我们已经明确指定了正确的文件路径
  return baseUrl
}

/**
 * 音效触发事件映射
 * 定义游戏事件与音效的对应关系
 */
export const SOUND_EVENT_MAPPING = {
  // 游戏流程事件
  gameStart: [SoundId.GAME_START, SoundId.GAME_BACKGROUND],
  gameVictory: [SoundId.GAME_VICTORY, SoundId.VICTORY_MUSIC],
  gameDefeat: [SoundId.GAME_DEFEAT, SoundId.DEFEAT_MUSIC],
  
  // 用户交互事件
  buttonClick: [SoundId.BUTTON_CLICK],
  airplaneConfirm: [SoundId.AIRPLANE_CONFIRM],
  
  // 游戏动作事件
  attackLaunch: [SoundId.ATTACK_LAUNCH],
  hitBody: [SoundId.HIT_BODY],
  hitHead: [SoundId.HIT_HEAD],
  attackMiss: [SoundId.ATTACK_MISS]
} as const