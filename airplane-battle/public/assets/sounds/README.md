# 音频资源目录

本目录存放飞机大战游戏的所有音频文件。

## 目录结构

```
sounds/
├── bgm/                    # 背景音乐
│   ├── game_background.mp3 # 游戏主背景音乐
│   ├── victory.mp3         # 胜利音乐
│   └── defeat.mp3          # 失败音乐
├── sfx/                    # 音效
│   ├── ui/                 # UI音效
│   │   └── button_click.wav # 按钮点击音效
│   ├── gameplay/           # 游戏音效
│   │   ├── attack_launch.wav   # 攻击发射音效
│   │   ├── hit_body.wav        # 击中机身音效
│   │   ├── hit_head.wav        # 击中机头音效
│   │   ├── attack_miss.wav     # 攻击未中音效
│   │   └── airplane_confirm.wav # 飞机放置确认音效
│   └── events/             # 事件音效
│       ├── game_start.wav      # 游戏开始音效
│       ├── game_victory.wav    # 游戏胜利音效
│       └── game_defeat.wav     # 游戏失败音效
```

## 音频格式要求

- **背景音乐**: MP3格式，比特率128kbps-320kbps，时长2-3分钟
- **音效**: WAV格式，16位44.1kHz，时长0.1-3秒
- **音量**: 所有音频文件应进行音量标准化处理

## 获取音频文件

由于版权原因，此仓库不包含实际音频文件。您可以：

1. 使用免费音效网站下载：
   - [Freesound.org](https://freesound.org/)
   - [Zapsplat](https://www.zapsplat.com/)
   - [Adobe Audition](https://www.adobe.com/products/audition.html) 内置音效库

2. 自己录制音效

3. 使用AI生成音效工具

## 音效建议

- **按钮点击**: 短促清脆的"哔"声
- **攻击发射**: 炮弹发射声或"嗖"声
- **击中音效**: 爆炸声或撞击声
- **未命中**: 水花声或"扑通"声
- **背景音乐**: 紧张刺激的战斗音乐
- **胜利音乐**: 庆祝胜利的激昂音乐
- **失败音乐**: 略带遗憾的音乐

## 注意事项

- 确保所有音频文件格式与配置文件中定义的一致
- 音频文件名必须与 `soundConfig.ts` 中的URL路径完全匹配
- 建议对音频文件进行压缩以减少加载时间
- 测试时可以使用较短的音频片段替代