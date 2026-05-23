module.exports = {
  apps: [
    {
      name: 'saas-api',
      cwd: './apps/api',
      script: 'node',
      args: 'dist/main.js',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4001
      }
    },
    {
      name: 'saas-worker',
      cwd: './apps/worker',
      script: 'node',
      args: 'dist/main.js',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'saas-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3000',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
