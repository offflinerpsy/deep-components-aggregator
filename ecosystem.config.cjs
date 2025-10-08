module.exports = {
  apps: [{
    name: 'deep-agg',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    // env: delegated to dotenv (.env file) for secrets management
    env: {},
    out_file: './logs/out.log',
    error_file: './logs/err.log',
    merge_logs: true,
    time: true
  }]
};
