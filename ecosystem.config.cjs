module.exports = {
  apps: [{
    name: 'deep-agg',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
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
