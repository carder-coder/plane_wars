// PM2 生态配置文件 (CommonJS 格式)
// 用于管理飞机大战游戏服务端的进程

module.exports = {
  apps: [{
    name: 'airplane-battle-server',
    script: 'dist/server.js',
    cwd: '/opt/airplane-battle',
    
    // 环境配置
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    
    // 进程配置
    instances: 1,
    exec_mode: 'cluster',
    
    // 日志配置
    log_file: '/var/log/airplane-battle/combined.log',
    out_file: '/var/log/airplane-battle/out.log',
    error_file: '/var/log/airplane-battle/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 自动重启配置
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // 自动化配置
    autorestart: true,
    kill_timeout: 5000,
    
    // 健康检查
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true
  }]
};