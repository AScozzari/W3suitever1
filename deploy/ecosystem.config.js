module.exports = {
  apps: [
    {
      name: 'w3-api',
      script: '/var/www/w3suite/current/server.cjs',
      cwd: '/var/www/w3suite',
      node_args: '--max-old-space-size=1024',
      instances: 1,
      exec_mode: 'fork',
      env_file: '/var/www/w3suite/.env.production',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      error_file: '/var/log/pm2/w3-api-error.log',
      out_file: '/var/log/pm2/w3-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_restarts: 10,
      restart_delay: 5000,
      watch: false
    }
  ]
};
