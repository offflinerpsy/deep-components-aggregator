module.exports = {
  apps: [{
    name: 'deep-agg',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: { MOUSER_API_KEY: process.env.MOUSER_API_KEY || '' },
    out_file: './logs/out.log',
    error_file: './logs/err.log',
    merge_logs: true,
    time: true
  }]
};