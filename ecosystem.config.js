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
      // standalone output requires node server.js, NOT next start.
      // pnpm monorepo emits server at .next/standalone/apps/web/server.js
      script: 'node',
      args: '.next/standalone/apps/web/server.js',
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
        PORT: 6001,
        FLOOD_RELIEF_URL: 'https://floodrelief.whtzup.city',
        MARKETPLACE_URL: 'https://app.whtzup.city',
      }
    },
    {
      name: 'saas-flood-relief-api',
      cwd: './apps/flood-relief-api',
      script: 'dist/server.js',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4002,
        // Own dedicated Postgres + JWT secret — see apps/flood-relief-api/.env.example.
        // Loaded from apps/flood-relief-api/.env by dotenv at startup (not from this file).
      }
    }
    // flood-relief-web has no PM2 entry — its production build (apps/flood-relief-web/dist)
    // is served directly by nginx as static files (see docker/nginx/default.conf).
  ]
};
