module.exports = {
  apps: [
    { name:'proxy-rotator-api', script:'proxy-rotator/server.mjs', exec_mode:'fork', instances:1, env:{ NODE_ENV:'production', PROXY_API_PORT:'9125' } },
    { name:'proxy-rotator-local', script:'proxy-rotator/rotator.mjs', exec_mode:'fork', instances:1, env:{ NODE_ENV:'production', LOCAL_PROXY_PORT:'18080' } }
  ]
};


