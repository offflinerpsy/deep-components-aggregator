module.exports = {
  apps: [{
    name: 'deep-agg',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      PORT: process.env.PORT || 9201,
      NODE_ENV: process.env.NODE_ENV || 'production',
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      SESSION_SECRET: process.env.SESSION_SECRET || '4dbdbaf85ae03f6e9391d26ffac37083c246364a50753f1f4af2f8520e285957',
      HTTP_PROXY: process.env.HTTP_PROXY || 'http://127.0.0.1:18080',
      HTTPS_PROXY: process.env.HTTPS_PROXY || 'http://127.0.0.1:18080',
      NO_PROXY: process.env.NO_PROXY || 'localhost,127.0.0.1',
      MOUSER_API_KEY: process.env.MOUSER_API_KEY || '',
      FARNELL_API_KEY: process.env.FARNELL_API_KEY || '',
      FARNELL_REGION: process.env.FARNELL_REGION || 'uk.farnell.com',
      TME_TOKEN: process.env.TME_TOKEN || '',
      TME_SECRET: process.env.TME_SECRET || '',
      DIGIKEY_CLIENT_ID: process.env.DIGIKEY_CLIENT_ID || '',
      DIGIKEY_CLIENT_SECRET: process.env.DIGIKEY_CLIENT_SECRET || ''
    },
    out_file: './logs/out.log',
    error_file: './logs/err.log',
    merge_logs: true,
    time: true
  }]
};
