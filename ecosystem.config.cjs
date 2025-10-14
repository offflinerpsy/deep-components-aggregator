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
      // Глобальная прокси-политика (WARP) для egress-трафика (унифицируем на 40000)
      HTTP_PROXY: 'http://127.0.0.1:40000',
      HTTPS_PROXY: 'http://127.0.0.1:40000',
      // Исключаем локальный трафик из прокси
      NO_PROXY: 'localhost,127.0.0.1,::1',
      // Session secret (explicit to avoid dotenv race)
      SESSION_SECRET: process.env.SESSION_SECRET || '967d72b5302fd7bc882bea5c53c315c64c621dfddda4d73ae739a03afb498560',
      // Provider keys fallback (dotenv preferred; fallback ensures availability)
      MOUSER_API_KEY: process.env.MOUSER_API_KEY || 'b1ade04e-2dd0-4bd9-b5b4-e51f252a0687',
      FARNELL_API_KEY: process.env.FARNELL_API_KEY || '9bbb8z5zuutmrscx72fukhvr',
      FARNELL_REGION: process.env.FARNELL_REGION || 'uk.farnell.com',
      TME_TOKEN: process.env.TME_TOKEN || '18745f2b94e785406561ef9bd83e9a0d0b941bb7a9f4b26327',
      TME_SECRET: process.env.TME_SECRET || 'd94ba92af87285b24da6',
      DIGIKEY_CLIENT_ID: process.env.DIGIKEY_CLIENT_ID || 'JaGDn87OXtjKuGJvIA6FOO75MYqj1z6UtAwLdlAeWc91m412',
      DIGIKEY_CLIENT_SECRET: process.env.DIGIKEY_CLIENT_SECRET || '5vlwGIui6h6HV4kkKptCqby2dLdbmUKX0jE2cWNaSmvN1C0QWyip5Ah5jhpbBBbe'
    },
    out_file: './logs/out.log',
    error_file: './logs/err.log',
    merge_logs: true,
    time: true
  }]
};
