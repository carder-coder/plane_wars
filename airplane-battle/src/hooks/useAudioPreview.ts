/**
 * 音频预览Hook
 * 提供音频预览播放功能
 */

import { useState, useRef, useCallback } from 'react'
import { AudioResource } from '../types/musicDownload'

interface UseAudioPreviewReturn {
  currentAudio: AudioResource | null
  isPlaying: boolean
  isLoading: boolean
  play: (audioResource: AudioResource) => Promise<void>
  pause: () => void
  stop: () => void
}

export const useAudioPreview = (): UseAudioPreviewReturn => {
  const [currentAudio, setCurrentAudio] = useState<AudioResource | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const play = useCallback(async (audioResource: AudioResource) => {
    try {
      setIsLoading(true)
      
      // 如果有正在播放的音频，先停止
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      // 创建新的音频元素
      const audio = new Audio(audioResource.previewUrl || audioResource.downloadUrl)
      audioRef.current = audio

      // 设置事件监听器
      audio.addEventListener('canplay', () => {
        setIsLoading(false)
        setIsPlaying(true)
      })

      audio.addEventListener('ended', () => {
        setIsPlaying(false)
        setCurrentAudio(null)
      })

      audio.addEventListener('error', () => {
        setIsLoading(false)
        setIsPlaying(false)
        console.error('音频加载失败')
      })

      setCurrentAudio(audioResource)
      await audio.play()
    } catch (error) {
      setIsLoading(false)
      setIsPlaying(false)
      console.error('音频播放失败:', error)
      throw error
    }
  }, [])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlaying(false)
    setCurrentAudio(null)
    setIsLoading(false)
  }, [])

  return {
    currentAudio,
    isPlaying,
    isLoading,
    play,
    pause,
    stop
  }
}