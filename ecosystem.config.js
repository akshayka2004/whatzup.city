module.exports = {
  apps: [
    {
      name: 'saas-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
        // HTTP bare-metal deployment — cookies must NOT require HTTPS
        COOKIE_SECURE: 'false',
        ENFORCE_EMAIL_VERIFICATION: 'false',
      }
    },
    {
      name: 'saas-worker',
      cwd: './apps/worker',
      script: 'dist/main.js',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        COOKIE_SECURE: 'false',
      }
    },
    {
      name: 'saas-web',
      cwd: './apps/web',
      script: 'node',
      args: '.next/standalone/server.js',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        // Proxy target for /api/* rewrites — bare-metal API on port 4001
        API_URL: 'http://localhost:4001',
      }
    },
    {
      name: 'saas-launch-page',
      cwd: './apps/launch-page',
      script: 'dist/server.js',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 6001
      }
    }
  ]
};
