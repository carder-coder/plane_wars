/**
 * 前端日志工具
 */
interface Logger {
  info: (message: string, ...args: any[]) => void
  warn: (message: string, ...args: any[]) => void
  error: (message: string, ...args: any[]) => void
  debug: (message: string, ...args: any[]) => void
}

/**
 * 创建日志器实例
 */
const createLogger = (): Logger => {
  const isDevelopment = import.meta.env.DEV

  return {
    info: (message: string, ...args: any[]) => {
      if (isDevelopment) {
        console.log(`[INFO] ${message}`, ...args)
      }
    },
    
    warn: (message: string, ...args: any[]) => {
      if (isDevelopment) {
        console.warn(`[WARN] ${message}`, ...args)
      }
    },
    
    error: (message: string, ...args: any[]) => {
      console.error(`[ERROR] ${message}`, ...args)
    },
    
    debug: (message: string, ...args: any[]) => {
      if (isDevelopment) {
        console.debug(`[DEBUG] ${message}`, ...args)
      }
    }
  }
}

export const logger = createLogger()