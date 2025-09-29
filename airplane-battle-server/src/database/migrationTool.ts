#!/usr/bin/env node

import { Command } from 'commander'
import { DataValidator } from './dataValidator.js'
import { mongoDatabase, dropAllCollections, getDatabaseStats, initializeIndexes } from '../models/index.js'
import { logger } from '../utils/logger.js'

const program = new Command()

program
  .name('migration-tool')
  .description('MongoDB迁移和验证工具')
  .version('1.0.0')

// 执行完整迁移
program
  .command('migrate')
  .description('初始化MongoDB数据库')
  .option('--force', '强制初始化，即使目标数据库不为空')
  .action(async (options) => {
    try {
      if (!options.force) {
        // 检查目标数据库是否为空
        await mongoDatabase.connect()
        const stats = await getDatabaseStats()
        const totalRecords = Object.values(stats).reduce((sum: number, count) => {
          return typeof count === 'number' ? sum + count : sum
        }, 0) as number

        if (totalRecords > 0) {
          logger.warn('目标数据库不为空，使用 --force 参数强制初始化')
          process.exit(1)
        }
        await mongoDatabase.disconnect()
      }

      // 初始化MongoDB索引
      await mongoDatabase.connect()
      await initializeIndexes()
      await mongoDatabase.disconnect()
      
      logger.info('MongoDB初始化完成！')
    } catch (error) {
      logger.error('MongoDB初始化失败:', error)
      process.exit(1)
    }
  })

// 验证数据
program
  .command('validate')
  .description('验证迁移后的数据完整性')
  .option('--detailed', '显示详细验证结果')
  .action(async (_options) => {
    try {
      const validator = new DataValidator()
      const success = await validator.runFullValidation()
      
      if (success) {
        logger.info('数据验证通过！')
        process.exit(0)
      } else {
        logger.error('数据验证失败！')
        process.exit(1)
      }
    } catch (error) {
      logger.error('验证过程出错:', error)
      process.exit(1)
    }
  })

// 清空MongoDB数据
program
  .command('reset')
  .description('清空MongoDB所有数据')
  .option('--confirm', '确认清空操作')
  .action(async (options) => {
    try {
      if (!options.confirm) {
        logger.warn('此操作将清空所有MongoDB数据，请使用 --confirm 参数确认')
        process.exit(1)
      }

      await mongoDatabase.connect()
      await dropAllCollections()
      await mongoDatabase.disconnect()
      
      logger.info('MongoDB数据清空完成')
    } catch (error) {
      logger.error('清空数据失败:', error)
      process.exit(1)
    }
  })

// 初始化索引
program
  .command('init-indexes')
  .description('创建MongoDB索引')
  .action(async () => {
    try {
      await mongoDatabase.connect()
      await initializeIndexes()
      await mongoDatabase.disconnect()
      
      logger.info('索引创建完成')
    } catch (error) {
      logger.error('创建索引失败:', error)
      process.exit(1)
    }
  })

// 获取数据库统计
program
  .command('stats')
  .description('显示数据库统计信息')
  .option('--format <type>', '输出格式 (json|table)', 'table')
  .action(async (options) => {
    try {
      await mongoDatabase.connect()
      const stats = await getDatabaseStats()
      await mongoDatabase.disconnect()

      if (options.format === 'json') {
        console.log(JSON.stringify(stats, null, 2))
      } else {
        console.log('\n========== 数据库统计 ==========')
        console.log(`用户数量: ${stats.users}`)
        console.log(`房间数量: ${stats.rooms}`)
        console.log(`游戏数量: ${stats.games}`)
        console.log(`会话数量: ${stats.sessions}`)
        console.log(`统计时间: ${stats.timestamp}`)
        console.log('===============================\n')
      }
    } catch (error) {
      logger.error('获取统计信息失败:', error)
      process.exit(1)
    }
  })

// 测试连接
program
  .command('test-connection')
  .description('测试数据库连接')
  .action(async () => {
    try {
      logger.info('测试MongoDB连接...')
      const success = await mongoDatabase.testConnection()
      
      if (success) {
        logger.info('MongoDB连接测试成功')
        process.exit(0)
      } else {
        logger.error('MongoDB连接测试失败')
        process.exit(1)
      }
    } catch (error) {
      logger.error('连接测试出错:', error)
      process.exit(1)
    }
  })

// 数据备份
program
  .command('backup')
  .description('备份MongoDB数据')
  .option('--output <path>', '备份文件输出路径', './backup')
  .option('--compress', '压缩备份文件')
  .action(async (options) => {
    try {
      logger.info('开始备份数据...')
      
      // 这里可以实现MongoDB数据备份逻辑
      // 使用mongodump或者程序化方式导出数据
      
      logger.info(`数据备份功能暂未实现，选项: ${JSON.stringify(options)}`)
    } catch (error) {
      logger.error('备份失败:', error)
      process.exit(1)
    }
  })

// 数据恢复
program
  .command('restore')
  .description('从备份恢复MongoDB数据')
  .option('--input <path>', '备份文件路径')
  .option('--force', '强制恢复，覆盖现有数据')
  .action(async (options) => {
    try {
      if (!options.input) {
        logger.error('请指定备份文件路径')
        process.exit(1)
      }

      logger.info('开始恢复数据...')
      
      // 这里可以实现MongoDB数据恢复逻辑
      // 使用mongorestore或者程序化方式导入数据
      
      logger.info('数据恢复功能暂未实现')
    } catch (error) {
      logger.error('恢复失败:', error)
      process.exit(1)
    }
  })

// MongoDB初始化和验证组合命令
program
  .command('full-init')
  .description('执行MongoDB初始化并验证')
  .option('--force', '强制初始化')
  .action(async (options) => {
    try {
      logger.info('开始执行MongoDB初始化流程...')

      // 1. 初始化MongoDB
      await mongoDatabase.connect()
      if (options.force) {
        logger.info('强制模式：将覆盖现有数据')
        await dropAllCollections()
      }
      await initializeIndexes()
      await mongoDatabase.disconnect()

      // 2. 验证数据
      const validator = new DataValidator()
      const success = await validator.runFullValidation()

      if (success) {
        logger.info('MongoDB初始化流程成功完成！')
        process.exit(0)
      } else {
        logger.error('初始化完成但验证失败！')
        process.exit(1)
      }
    } catch (error) {
      logger.error('MongoDB初始化流程失败:', error)
      process.exit(1)
    }
  })

// 性能测试
program
  .command('performance-test')
  .description('执行数据库性能测试')
  .option('--iterations <count>', '测试迭代次数', '100')
  .option('--concurrency <count>', '并发数量', '10')
  .action(async (options) => {
    try {
      logger.info('开始性能测试...')
      
      const iterations = parseInt(options.iterations)
      const concurrency = parseInt(options.concurrency)
      
      await mongoDatabase.connect()
      
      // 这里可以实现性能测试逻辑
      logger.info(`执行 ${iterations} 次迭代，并发数 ${concurrency}`)
      
      await mongoDatabase.disconnect()
      
      logger.info('性能测试功能暂未实现')
    } catch (error) {
      logger.error('性能测试失败:', error)
      process.exit(1)
    }
  })

// 错误处理
program.on('command:*', () => {
  logger.error('未知命令: %s', program.args.join(' '))
  logger.info('使用 --help 查看可用命令')
  process.exit(1)
})

// 解析命令行参数
program.parse()