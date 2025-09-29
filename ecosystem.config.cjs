module.exports = {
  apps: [{
    name: 'deep-agg',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      MOUSER_API_KEY: process.env.MOUSER_API_KEY || '',
      FARNELL_API_KEY: process.env.FARNELL_API_KEY || '',
      FARNELL_REGION: process.env.FARNELL_REGION || 'uk.farnell.com'
    },
    out_file: './logs/out.log',
    error_file: './logs/err.log',
    merge_logs: true,
    time: true
  }]
};