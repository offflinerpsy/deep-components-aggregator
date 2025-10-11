module.exports = {
  apps: [{
    name: 'deep-agg',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    // env: delegated to dotenv (.env file) for secrets management
    // WARP Proxy configuration (WarpProxy mode, port 18080)
    // Safe for SSH - does not affect system routing
    env: {
      // Порт бэкенда — единый источник правды
      PORT: '9201',
      // Глобальная прокси-политика (WARP) для egress-трафика
      HTTP_PROXY: 'http://127.0.0.1:18080',
      HTTPS_PROXY: 'http://127.0.0.1:18080',
      // Исключаем локальный трафик из прокси
      NO_PROXY: 'localhost,127.0.0.1,::1'
    },
    out_file: './logs/out.log',
    error_file: './logs/err.log',
    merge_logs: true,
    time: true
  }]
};
