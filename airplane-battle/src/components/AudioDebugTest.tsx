import React, { useEffect, useState } from 'react';

export const AudioDebugTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addLog = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDirectAudioLoad = () => {
    addLog('开始直接音频测试...');
    
    // 测试直接加载 victory.mp3
    const audio = new Audio();
    
    audio.addEventListener('loadstart', () => addLog('Victory: loadstart'));
    audio.addEventListener('canplay', () => addLog('Victory: canplay'));
    audio.addEventListener('canplaythrough', () => addLog('Victory: canplaythrough - 加载成功！'));
    audio.addEventListener('error', (e) => {
      addLog(`Victory: error - ${e.message || '加载失败'}`);
      console.error('Victory audio error:', e);
    });
    audio.addEventListener('abort', () => addLog('Victory: abort'));
    
    // 设置音频源并开始加载
    try {
      audio.src = '/assets/sounds/bgm/victory.mp3';
      addLog(`Victory: 设置源 - ${audio.src}`);
      audio.load();
    } catch (error) {
      addLog(`Victory: 设置源时发生错误 - ${error}`);
    }
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
    // 延迟执行音频测试，确保页面已完全加载
    setTimeout(() => {
      testDirectAudioLoad();
    }, 1000);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h3>音频调试测试</h3>
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
      
      <button 
        onClick={testDirectAudioLoad}
        style={{ marginTop: '10px', padding: '8px 16px' }}
      >
        重新测试音频加载
      </button>
      
      <button 
        onClick={() => setTestResults([])}
        style={{ marginTop: '10px', marginLeft: '10px', padding: '8px 16px' }}
      >
        清空日志
      </button>
    </div>
  );
};