/**
 * 音频处理器
 * 提供音频格式转换、音量标准化、压缩等功能
 */

import { AudioProcessingOptions, AudioQuality, IAudioProcessor } from '../types/musicDownload'

/**
 * 音频分析结果接口
 */
interface AudioAnalysis {
  format: string
  sampleRate: number
  bitRate: number
  channels: number
  duration: number
  fileSize: number
  quality: AudioQuality
  peakAmplitude: number
  averageAmplitude: number
}

/**
 * 音频处理器实现
 */
export class AudioProcessor implements IAudioProcessor {
  private audioContext: AudioContext | null = null
  private supportedFormats = ['mp3', 'wav', 'ogg', 'm4a']

  constructor() {
    this.initializeAudioContext()
  }

  /**
   * 初始化音频上下文
   */
  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.warn('AudioContext not supported:', error)
    }
  }

  /**
   * 格式转换
   */
  async convertFormat(inputFile: File, targetFormat: string): Promise<Blob> {
    if (!this.supportedFormats.includes(targetFormat.toLowerCase())) {
      throw new Error(`Unsupported target format: ${targetFormat}`)
    }

    try {
      // 解码音频文件
      const audioBuffer = await this.decodeAudioFile(inputFile)
      
      // 转换为目标格式
      return await this.encodeAudioBuffer(audioBuffer, targetFormat)
    } catch (error) {
      throw new Error(`Format conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 音量标准化
   */
  async normalizeVolume(inputFile: File): Promise<Blob> {
    try {
      const audioBuffer = await this.decodeAudioFile(inputFile)
      const normalizedBuffer = this.normalizeAudioBuffer(audioBuffer)
      
      // 保持原格式
      const originalFormat = this.getFileFormat(inputFile)
      return await this.encodeAudioBuffer(normalizedBuffer, originalFormat)
    } catch (error) {
      throw new Error(`Volume normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 压缩处理
   */
  async compress(inputFile: File, quality: number): Promise<Blob> {
    const clampedQuality = Math.max(0.1, Math.min(1.0, quality))
    
    try {
      const audioBuffer = await this.decodeAudioFile(inputFile)
      const format = this.getFileFormat(inputFile)
      
      // 根据质量调整比特率
      const bitRate = this.calculateBitRate(format, clampedQuality)
      
      return await this.encodeAudioBuffer(audioBuffer, format, { bitRate })
    } catch (error) {
      throw new Error(`Audio compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 裁剪处理
   */
  async trim(inputFile: File, startTime: number, endTime: number): Promise<Blob> {
    try {
      const audioBuffer = await this.decodeAudioFile(inputFile)
      const trimmedBuffer = this.trimAudioBuffer(audioBuffer, startTime, endTime)
      
      const originalFormat = this.getFileFormat(inputFile)
      return await this.encodeAudioBuffer(trimmedBuffer, originalFormat)
    } catch (error) {
      throw new Error(`Audio trimming failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 渐变处理
   */
  async addFade(inputFile: File, fadeIn: number, fadeOut: number): Promise<Blob> {
    try {
      const audioBuffer = await this.decodeAudioFile(inputFile)
      const fadeBuffer = this.addFadeToBuffer(audioBuffer, fadeIn, fadeOut)
      
      const originalFormat = this.getFileFormat(inputFile)
      return await this.encodeAudioBuffer(fadeBuffer, originalFormat)
    } catch (error) {
      throw new Error(`Fade processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 批量处理
   */
  async batchProcess(files: File[], options: AudioProcessingOptions): Promise<Blob[]> {
    const results: Blob[] = []
    
    for (const file of files) {
      try {
        const processedBlob = await this.processAudio(file, options)
        results.push(processedBlob)
      } catch (error) {
        console.error(`Failed to process file ${file.name}:`, error)
        // 跳过失败的文件，继续处理其他文件
        results.push(file) // 返回原文件作为fallback
      }
    }
    
    return results
  }

  /**
   * 质量检测
   */
  async analyzeQuality(file: File): Promise<AudioAnalysis> {
    try {
      const audioBuffer = await this.decodeAudioFile(file)
      const analysis = this.analyzeAudioBuffer(audioBuffer, file)
      
      return analysis
    } catch (error) {
      throw new Error(`Audio analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 处理音频文件
   */
  private async processAudio(file: File, options: AudioProcessingOptions): Promise<Blob> {
    let audioBuffer = await this.decodeAudioFile(file)
    let targetFormat = options.targetFormat || this.getFileFormat(file)

    // 裁剪
    if (options.trimStart !== undefined || options.trimEnd !== undefined) {
      const startTime = options.trimStart || 0
      const endTime = options.trimEnd || audioBuffer.duration
      audioBuffer = this.trimAudioBuffer(audioBuffer, startTime, endTime)
    }

    // 音量标准化
    if (options.normalize) {
      audioBuffer = this.normalizeAudioBuffer(audioBuffer)
    }

    // 渐变
    if (options.fadeIn || options.fadeOut) {
      audioBuffer = this.addFadeToBuffer(audioBuffer, options.fadeIn || 0, options.fadeOut || 0)
    }

    // 编码选项
    const encodeOptions: any = {}
    if (options.targetBitRate) {
      encodeOptions.bitRate = options.targetBitRate
    }
    if (options.targetSampleRate) {
      // 重采样逻辑（简化版）
      if (options.targetSampleRate !== audioBuffer.sampleRate) {
        audioBuffer = await this.resampleAudioBuffer(audioBuffer, options.targetSampleRate)
      }
    }

    return await this.encodeAudioBuffer(audioBuffer, targetFormat, encodeOptions)
  }

  /**
   * 解码音频文件
   */
  private async decodeAudioFile(file: File): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available')
    }

    const arrayBuffer = await file.arrayBuffer()
    
    try {
      return await this.audioContext.decodeAudioData(arrayBuffer)
    } catch (error) {
      throw new Error(`Failed to decode audio file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 编码音频缓冲区
   */
  private async encodeAudioBuffer(
    audioBuffer: AudioBuffer, 
    format: string, 
    options: { bitRate?: number } = {}
  ): Promise<Blob> {
    // 这里是一个简化的实现，实际应用中需要使用Web Audio API的音频编码器
    // 或者服务器端处理
    
    switch (format.toLowerCase()) {
      case 'wav':
        return this.encodeToWav(audioBuffer)
      case 'mp3':
        // MP3编码需要专门的库，这里返回WAV作为fallback
        console.warn('MP3 encoding not implemented, using WAV instead')
        return this.encodeToWav(audioBuffer)
      default:
        return this.encodeToWav(audioBuffer)
    }
  }

  /**
   * 编码为WAV格式
   */
  private encodeToWav(audioBuffer: AudioBuffer): Blob {
    const length = audioBuffer.length
    const channels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const bitDepth = 16
    
    const arrayBuffer = new ArrayBuffer(44 + length * channels * 2)
    const view = new DataView(arrayBuffer)
    
    // WAV文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * channels * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, channels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * channels * 2, true)
    view.setUint16(32, channels * 2, true)
    view.setUint16(34, bitDepth, true)
    writeString(36, 'data')
    view.setUint32(40, length * channels * 2, true)
    
    // 音频数据
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < channels; ch++) {
        const sample = audioBuffer.getChannelData(ch)[i]
        const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF
        view.setInt16(offset, intSample, true)
        offset += 2
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }

  /**
   * 音量标准化处理
   */
  private normalizeAudioBuffer(audioBuffer: AudioBuffer): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('AudioContext not available')
    }

    const newBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )

    // 找到最大幅度
    let maxAmplitude = 0
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch)
      for (let i = 0; i < channelData.length; i++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[i]))
      }
    }

    // 计算标准化因子
    const normalizationFactor = maxAmplitude > 0 ? 0.95 / maxAmplitude : 1

    // 应用标准化
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const inputData = audioBuffer.getChannelData(ch)
      const outputData = newBuffer.getChannelData(ch)
      
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i] * normalizationFactor
      }
    }

    return newBuffer
  }

  /**
   * 裁剪音频缓冲区
   */
  private trimAudioBuffer(audioBuffer: AudioBuffer, startTime: number, endTime: number): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('AudioContext not available')
    }

    const sampleRate = audioBuffer.sampleRate
    const startSample = Math.floor(startTime * sampleRate)
    const endSample = Math.floor(endTime * sampleRate)
    const newLength = endSample - startSample

    if (newLength <= 0) {
      throw new Error('Invalid trim range')
    }

    const newBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      newLength,
      audioBuffer.sampleRate
    )

    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const inputData = audioBuffer.getChannelData(ch)
      const outputData = newBuffer.getChannelData(ch)
      
      for (let i = 0; i < newLength; i++) {
        outputData[i] = inputData[startSample + i] || 0
      }
    }

    return newBuffer
  }

  /**
   * 添加渐变效果
   */
  private addFadeToBuffer(audioBuffer: AudioBuffer, fadeInMs: number, fadeOutMs: number): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('AudioContext not available')
    }

    const newBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )

    const sampleRate = audioBuffer.sampleRate
    const fadeInSamples = Math.floor(fadeInMs / 1000 * sampleRate)
    const fadeOutSamples = Math.floor(fadeOutMs / 1000 * sampleRate)
    const totalSamples = audioBuffer.length

    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const inputData = audioBuffer.getChannelData(ch)
      const outputData = newBuffer.getChannelData(ch)
      
      for (let i = 0; i < totalSamples; i++) {
        let gain = 1

        // 淡入
        if (i < fadeInSamples) {
          gain = i / fadeInSamples
        }
        
        // 淡出
        if (i > totalSamples - fadeOutSamples) {
          const fadeOutProgress = (totalSamples - i) / fadeOutSamples
          gain = Math.min(gain, fadeOutProgress)
        }

        outputData[i] = inputData[i] * gain
      }
    }

    return newBuffer
  }

  /**
   * 重采样音频缓冲区
   */
  private async resampleAudioBuffer(audioBuffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available')
    }

    // 简化的重采样实现
    const ratio = targetSampleRate / audioBuffer.sampleRate
    const newLength = Math.floor(audioBuffer.length * ratio)

    const newBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      newLength,
      targetSampleRate
    )

    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const inputData = audioBuffer.getChannelData(ch)
      const outputData = newBuffer.getChannelData(ch)
      
      for (let i = 0; i < newLength; i++) {
        const sourceIndex = i / ratio
        const index = Math.floor(sourceIndex)
        const fraction = sourceIndex - index
        
        const sample1 = inputData[index] || 0
        const sample2 = inputData[index + 1] || 0
        
        // 线性插值
        outputData[i] = sample1 + (sample2 - sample1) * fraction
      }
    }

    return newBuffer
  }

  /**
   * 分析音频缓冲区
   */
  private analyzeAudioBuffer(audioBuffer: AudioBuffer, file: File): AudioAnalysis {
    let peakAmplitude = 0
    let totalAmplitude = 0
    let sampleCount = 0

    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch)
      for (let i = 0; i < channelData.length; i++) {
        const sample = Math.abs(channelData[i])
        peakAmplitude = Math.max(peakAmplitude, sample)
        totalAmplitude += sample
        sampleCount++
      }
    }

    const averageAmplitude = totalAmplitude / sampleCount
    const quality = this.determineQuality(audioBuffer, file)

    return {
      format: this.getFileFormat(file),
      sampleRate: audioBuffer.sampleRate,
      bitRate: this.estimateBitRate(file, audioBuffer.duration),
      channels: audioBuffer.numberOfChannels,
      duration: audioBuffer.duration,
      fileSize: file.size,
      quality,
      peakAmplitude,
      averageAmplitude
    }
  }

  /**
   * 获取文件格式
   */
  private getFileFormat(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase()
    return extension || 'unknown'
  }

  /**
   * 估算比特率
   */
  private estimateBitRate(file: File, duration: number): number {
    if (duration <= 0) return 0
    return Math.floor((file.size * 8) / duration / 1000) // kbps
  }

  /**
   * 确定音频质量
   */
  private determineQuality(audioBuffer: AudioBuffer, file: File): AudioQuality {
    const bitRate = this.estimateBitRate(file, audioBuffer.duration)
    const sampleRate = audioBuffer.sampleRate

    if (sampleRate >= 48000 && bitRate >= 320) {
      return AudioQuality.LOSSLESS
    } else if (sampleRate >= 44100 && bitRate >= 192) {
      return AudioQuality.HIGH
    } else if (bitRate >= 128) {
      return AudioQuality.MEDIUM
    } else {
      return AudioQuality.LOW
    }
  }

  /**
   * 计算比特率
   */
  private calculateBitRate(format: string, quality: number): number {
    const baseBitRates: Record<string, number> = {
      mp3: 320,
      wav: 1411, // 44.1kHz 16-bit stereo
      ogg: 256,
      m4a: 256
    }

    const baseBitRate = baseBitRates[format.toLowerCase()] || 192
    return Math.floor(baseBitRate * quality)
  }

  /**
   * 销毁处理器
   */
  destroy(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
    }
    this.audioContext = null
  }
}

// 创建全局音频处理器实例
export const audioProcessor = new AudioProcessor()