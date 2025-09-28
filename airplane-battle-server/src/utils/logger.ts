import { config } from '../config/index.js'

/**
 * 日志级别枚举
 */
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

/**
 * 日志颜色配置
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

/**
 * 简单的日志记录器
 */
class Logger {
  private level: LogLevel

  constructor() {
    this.level = this.getLevelFromString(config.logLevel)
  }

  /**
   * 从字符串获取日志级别
   */
  private getLevelFromString(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR
      case 'warn': return LogLevel.WARN
      case 'info': return LogLevel.INFO
      case 'debug': return LogLevel.DEBUG
      default: return LogLevel.INFO
    }
  }

  /**
   * 格式化时间戳
   */
  private getTimestamp(): string {
    return new Date().toISOString()
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = this.getTimestamp()
    const logData = data ? ` ${JSON.stringify(data)}` : ''
    return `[${timestamp}] ${level}: ${message}${logData}`
  }

  /**
   * 错误日志
   */
  public error(message: string, data?: any): void {
    if (this.level >= LogLevel.ERROR) {
      const formattedMessage = this.formatMessage('ERROR', message, data)
      console.error(`${colors.red}${formattedMessage}${colors.reset}`)
    }
  }

  /**
   * 警告日志
   */
  public warn(message: string, data?: any): void {
    if (this.level >= LogLevel.WARN) {
      const formattedMessage = this.formatMessage('WARN', message, data)
      console.warn(`${colors.yellow}${formattedMessage}${colors.reset}`)
    }
  }

  /**
   * 信息日志
   */
  public info(message: string, data?: any): void {
    if (this.level >= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('INFO', message, data)
      console.log(`${colors.green}${formattedMessage}${colors.reset}`)
    }
  }

  /**
   * 调试日志
   */
  public debug(message: string, data?: any): void {
    if (this.level >= LogLevel.DEBUG) {
      const formattedMessage = this.formatMessage('DEBUG', message, data)
      console.log(`${colors.blue}${formattedMessage}${colors.reset}`)
    }
  }

  /**
   * HTTP请求日志
   */
  public http(method: string, url: string, status: number, duration: number): void {
    const color = status >= 400 ? colors.red : status >= 300 ? colors.yellow : colors.green
    const message = `${method} ${url} ${status} - ${duration}ms`
    console.log(`${color}${this.formatMessage('HTTP', message)}${colors.reset}`)
  }
}

// 导出日志实例
export const logger = new Logger()