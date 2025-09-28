import React, { useEffect, useState } from 'react';
import { soundManager } from '../utils/soundManager';
import { SoundId } from '../types/sound';

export const AudioDebugTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [audioStatus, setAudioStatus] = useState<any>({});

  const addLog = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const updateStatus = () => {
    const status = soundManager.getStatus();
    setAudioStatus(status);
    addLog(`系统状态更新: 初始化=${status.initialized}, 当前音乐=${status.currentMusic || '无'}`);
  };

  const testDirectAudioLoad = () => {
    addLog('开始直接音频测试...');
    
    // 测试直接加载 game_background.mp3
    const audio = new Audio();
    
    audio.addEventListener('loadstart', () => addLog('BGM: loadstart'));
    audio.addEventListener('canplay', () => addLog('BGM: canplay'));
    audio.addEventListener('canplaythrough', () => addLog('BGM: canplaythrough - 加载成功！'));
    audio.addEventListener('error', (e) => {
      addLog(`BGM: error - ${e.message || '加载失败'}`);
      console.error('BGM audio error:', e);
    });
    audio.addEventListener('abort', () => addLog('BGM: abort'));
    
    // 设置音频源并开始加载
    try {
      audio.src = '/assets/sounds/bgm/game_background.mp3';
      addLog(`BGM: 设置源 - ${audio.src}`);
      audio.load();
    } catch (error) {
      addLog(`BGM: 设置源时发生错误 - ${error}`);
    }
  };

  const testBGMController = async () => {
    addLog('测试 BGM 控制器...');
    
    try {
      // 检查初始化状态
      updateStatus();
      
      // 等待一下再执行
      setTimeout(() => {
        addLog('尝试播放背景音乐...');
        soundManager.playMusic(SoundId.GAME_BACKGROUND);
        
        // 检查播放结果
        setTimeout(() => {
          updateStatus();
        }, 1000);
      }, 500);
      
    } catch (error) {
      addLog(`BGM 控制器错误: ${error}`);
    }
  };

  const testSettings = () => {
    addLog('检查音效设置...');
    const settings = soundManager.getSettings();
    addLog(`音效开关: ${settings.soundEnabled}`);
    addLog(`音乐开关: ${settings.musicEnabled}`);
    addLog(`主音量: ${settings.masterVolume}`);
    addLog(`音乐音量: ${settings.musicVolume}`);
  };

  const testAudioFormats = () => {
    addLog('测试浏览器音频格式支持...');
    const audio = new Audio();
    
    const formats = {
      mp3: 'audio/mpeg',
      ogg: 'audio/ogg', 
      wav: 'audio/wav',
      m4a: 'audio/mp4'
    };
    
    Object.entries(formats).forEach(([format, mimeType]) => {
      const support = audio.canPlayType(mimeType);
      addLog(`${format}: ${support || '不支持'}`);
    });
  };

  useEffect(() => {
    testAudioFormats();
    testSettings();
    // 延迟执行音频测试，确保页面已完全加载
    setTimeout(() => {
      testDirectAudioLoad();
    }, 1000);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h3>背景音乐调试测试</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testBGMController}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          测试 BGM 控制器
        </button>
        
        <button 
          onClick={testDirectAudioLoad}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          重新测试音频加载
        </button>
        
        <button 
          onClick={updateStatus}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          更新状态
        </button>
        
        <button 
          onClick={() => setTestResults([])}
          style={{ padding: '8px 16px' }}
        >
          清空日志
        </button>
      </div>
      
      {audioStatus.initialized && (
        <div style={{ 
          background: '#f0f0f0', 
          padding: '10px', 
          marginBottom: '10px',
          border: '1px solid #ccc'
        }}>
          <h4>系统状态:</h4>
          <div>初始化: {audioStatus.initialized ? '✅ 已初始化' : '❌ 未初始化'}</div>
          <div>当前音乐: {audioStatus.currentMusic || '无'}</div>
          <div>播放中音效: {audioStatus.playingCount || 0}</div>
          <div>加载统计: 总计 {audioStatus.loadStats?.total || 0}, 已加载 {audioStatus.loadStats?.loaded || 0}</div>
        </div>
      )}
      
      <div style={{ 
        background: '#f5f5f5', 
        padding: '10px', 
        maxHeight: '400px', 
        overflowY: 'scroll',
        border: '1px solid #ccc'
      }}>
        {testResults.map((result, index) => (
          <div key={index} style={{ marginBottom: '4px' }}>
            {result}
          </div>
        ))}
      </div>
    </div>
  );
};