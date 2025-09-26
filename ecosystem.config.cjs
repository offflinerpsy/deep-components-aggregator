module.exports = {
  apps: [{
    name: 'deep-aggregator',
    script: '/root/aggregator-v2/server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_restarts: 10,
    max_memory_restart: '600M',
    env: {
      PORT: '9201',
      NODE_ENV: 'production',
      HTTP_PROXY: process.env.HTTP_PROXY || '',
      HTTPS_PROXY: process.env.HTTPS_PROXY || ''
    },
    watch: false
  }]
};
