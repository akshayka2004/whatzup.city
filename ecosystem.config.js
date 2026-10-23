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
        // Served only over HTTPS (Cloudflare + HSTS), so auth cookies are Secure.
        COOKIE_SECURE: 'true',
        ENFORCE_EMAIL_VERIFICATION: 'false',
      },
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
        COOKIE_SECURE: 'true',
      },
    },
    {
      name: 'saas-web',
      cwd: './apps/web',
      // standalone output requires node server.js, NOT next start.
      // pnpm monorepo emits server at .next/standalone/apps/web/server.js
      script: '.next/standalone/apps/web/server.js',
      // Two stateless workers: `pm2 reload` swaps them one at a time (no downtime)
      // and one crash no longer takes the site down. The API stays a single fork
      // process: it holds Socket.IO connections and in-process timers.
      exec_mode: 'cluster',
      instances: 2,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Loopback only: nginx is the sole public entry point. Binding 0.0.0.0
        // let callers skip Cloudflare/nginx and spoof forwarding headers.
        HOSTNAME: '127.0.0.1',
        // Proxy target for /api/* rewrites — bare-metal API on port 4001
        API_URL: 'http://localhost:4001',
      },
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
        HOST: '127.0.0.1',
        FLOOD_RELIEF_URL: 'https://floodrelief.whtzup.city',
        MARKETPLACE_URL: 'https://platform.whtzup.city',
      },
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
      },
    },
    // flood-relief-web has no PM2 entry — its production build (apps/flood-relief-web/dist)
    // is served directly by nginx as static files (see docker/nginx/default.conf).
  ],
};
