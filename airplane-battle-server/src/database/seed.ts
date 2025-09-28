import { UserService } from '../services/userService.js'
import { logger } from '../utils/logger.js'

/**
 * 数据库种子数据脚本
 */
export class SeedData {
  /**
   * 创建测试用户
   */
  public static async createTestUsers(): Promise<void> {
    try {
      logger.info('开始创建测试用户...')

      const testUsers = [
        {
          username: 'testuser1',
          email: 'test1@example.com',
          password: 'TestPass123',
          displayName: '测试用户1'
        },
        {
          username: 'testuser2',
          email: 'test2@example.com',
          password: 'TestPass123',
          displayName: '测试用户2'
        },
        {
          username: 'admin',
          email: 'admin@example.com',
          password: 'AdminPass123',
          displayName: '管理员'
        }
      ]

      for (const userData of testUsers) {
        const result = await UserService.register(userData)
        if (result.success) {
          logger.info(`测试用户创建成功: ${userData.username}`)
        } else {
          logger.warn(`测试用户创建失败: ${userData.username} - ${result.message}`)
        }
      }

      logger.info('测试用户创建完成')
    } catch (error) {
      logger.error('创建测试用户失败:', error)
      throw error
    }
  }

  /**
   * 运行所有种子数据
   */
  public static async runSeeding(): Promise<void> {
    try {
      logger.info('开始执行数据库种子数据...')
      
      await this.createTestUsers()
      
      logger.info('数据库种子数据执行完成！')
    } catch (error) {
      logger.error('数据库种子数据执行失败:', error)
      throw error
    }
  }
}

// 如果直接运行此文件，执行种子数据
if (import.meta.url === `file://${process.argv[1]}`) {
  SeedData.runSeeding()
    .then(() => {
      logger.info('种子数据完成，正在退出...')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('种子数据失败:', error)
      process.exit(1)
    })
}