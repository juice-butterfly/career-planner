// 职引 · pm2 进程守护配置
// 用法：在 backend 目录内： pm2 start ecosystem.config.cjs --env production
// 说明：node:sqlite / MySQL 都是单进程同步写入，单实例即可；靠 pm2 崩重启 + 开机自启。
module.exports = {
  apps: [
    {
      name: 'career-planner',
      script: 'src/server.js',
      cwd: '/var/www/career-planner/backend',
      instances: 1,
      exec_mode: 'fork', // 不要 cluster 多实例：SQLite/单库写入与内存验证码均要求单进程
      autorestart: true,
      max_memory_restart: '512M',
      time: true, // 日志带时间
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};