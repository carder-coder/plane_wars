import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: '0.0.0.0' // 允许外部访问
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // 生产环境不生成 sourcemap
    minify: 'terser', // 更好的压缩效果，但需要安装 terser
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd'],
          socket: ['socket.io-client']
        }
      }
    },
    // 资源文件大小警告阈值
    chunkSizeWarningLimit: 1000
  },
  // API 代理配置（开发环境）
  define: {
    __API_URL__: JSON.stringify(process.env.NODE_ENV === 'production' 
      ? '/api' 
      : 'http://120.26.106.214:3001/api'
    )
  }
})