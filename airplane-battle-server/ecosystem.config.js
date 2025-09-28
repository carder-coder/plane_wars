# PM2 生态配置文件
# 用于管理飞机大战游戏服务端的进程

module.exports = {
  apps: [
    {
      name: 'airplane-battle-api',
      script: './dist/server.js',
      
      // 集群模式配置
      instances: 2, // 运行2个实例
      exec_mode: 'cluster',
      
      // 环境配置
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        DATABASE_TYPE: 'mongodb'
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_TYPE: 'mongodb'
      },
      
      // 日志配置
      log_file: '/var/log/airplane-battle/combined.log',
      out_file: '/var/log/airplane-battle/out.log',
      error_file: '/var/log/airplane-battle/error.log',
      merge_logs: true,
      time: true,
      
      // 进程管理
      watch: false, // 生产环境不启用文件监听
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git'
      ],
      
      // 重启策略
      max_restarts: 10,
      min_uptime: 10000, // 10秒
      restart_delay: 4000, // 4秒
      
      // 内存限制
      max_memory_restart: '500M',
      
      // 进程配置
      node_args: '--max-old-space-size=512',
      
      // 健康检查
      health_check_http: {
        path: '/health',
        port: 3001,
        timeout: 5000,
        interval: 30000,
        retries: 3
      },
      
      // 自动重启条件
      autorestart: true,
      
      // 启动延迟
      wait_ready: true,
      listen_timeout: 10000,
      
      // 优雅关闭
      kill_timeout: 5000,
      
      // 进程标识
      pid_file: './.pm2/airplane-battle-api.pid',
      
      // 环境变量文件
      env_file: './.env',
      
      // 监控配置
      pmx: true,
      
      // 源映射支持
      source_map_support: true,
      
      // 实例配置
      increment_var: 'PORT',
      
      // 错误处理
      error_file: '/var/log/airplane-battle/error.log',
      
      // 自定义启动脚本
      post_update: ['npm install', 'npm run build'],
      
      // 进程监控
      monitoring: false, // 可以启用keymetrics监控
      
      // 集群配置
      instance_var: 'INSTANCE_ID',
      
      // 日志轮转配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 自定义环境变量
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        DATABASE_TYPE: 'mongodb',
        LOG_LEVEL: 'debug'
      },
      
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
        DATABASE_TYPE: 'mongodb',
        LOG_LEVEL: 'info'
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_TYPE: 'mongodb',
        LOG_LEVEL: 'warn'
      }
    }
  ],
  
  // 部署配置
  deploy: {
    production: {
      user: 'airplane',
      host: ['production-server-1', 'production-server-2'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/airplane-battle-server.git',
      path: '/opt/airplane-battle',
      
      // 部署钩子
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      
      // SSH配置
      ssh_options: 'StrictHostKeyChecking=no',
      
      // 环境变量
      env: {
        NODE_ENV: 'production'
      }
    },
    
    staging: {
      user: 'airplane',
      host: 'staging-server',
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/airplane-battle-server.git',
      path: '/opt/airplane-battle-staging',
      
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
}