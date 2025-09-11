module.exports = {
  apps: [{
    name: 'retailverse-backend',
    script: 'server.js',
    cwd: '/home/retailverse/apps/retailverse',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 1200
    },
    env_file: '.env.production',
    log_file: '/home/retailverse/logs/retailverse/backend.log',
    out_file: '/home/retailverse/logs/retailverse/backend-out.log',
    error_file: '/home/retailverse/logs/retailverse/backend-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      'uploads',
      'frontend/dist'
    ],
    // Advanced PM2 features
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true,
    // Health monitoring
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true
  }]
};
