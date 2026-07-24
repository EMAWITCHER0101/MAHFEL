const path = require('path');

const logDir = path.resolve(__dirname, 'logs');

module.exports = {
  apps: [
    {
      name: 'soha-backend',
      script: path.resolve(__dirname, 'server/server.js'),
      cwd: __dirname,
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: path.join(logDir, 'backend-error.log'),
      out_file: path.join(logDir, 'backend-out.log'),
    },
    {
      name: 'soha-frontend',
      script: path.resolve(__dirname, 'node_modules/next/dist/bin/next'),
      args: 'start -p 3000',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: path.join(logDir, 'frontend-error.log'),
      out_file: path.join(logDir, 'frontend-out.log'),
    },
  ],
};
