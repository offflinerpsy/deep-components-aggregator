module.exports = {
  apps: [{
    name: 'deep-aggregator',
    script: '/opt/deep-agg/server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 5000,
    max_memory_restart: '500M',
    kill_timeout: 5000,
    env: {
      PORT: '9201',
      NODE_ENV: 'production',
      HTTP_PROXY: process.env.HTTP_PROXY || '',
      HTTPS_PROXY: process.env.HTTPS_PROXY || ''
    },
    watch: false
  }]
};
