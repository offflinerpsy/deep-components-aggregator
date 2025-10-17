# Rewrites Proof (2025-10-16)

Source: `v0-components-aggregator-page/next.config.mjs`

```js
beforeFiles: [
  { source: '/api/:path*', destination: 'http://127.0.0.1:9201/api/:path*' },
  { source: '/auth/:path*', destination: 'http://127.0.0.1:9201/auth/:path*' },
  { source: '/api/auth/:path*', destination: 'http://127.0.0.1:9201/auth/:path*' }
]
```

- Все клиентские вызовы фронта идут через /api/*, CORS и секреты не утекают на клиент.
- Админ/аутентификация также проксируется через фронт.
