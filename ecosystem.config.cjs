module.exports = {
  apps: [
    {
      name: 'soha-backend',
      script: 'server/server.js',
      cwd: '/opt/soha',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/opt/soha/logs/backend-error.log',
      out_file: '/opt/soha/logs/backend-out.log',
    },
    {
      name: 'soha-frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/opt/soha',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '800M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/opt/soha/logs/frontend-error.log',
      out_file: '/opt/soha/logs/frontend-out.log',
    },
  ],
};
