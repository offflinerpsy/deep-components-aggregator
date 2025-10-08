#!/usr/bin/env node
/**
 * HTTP-to-SOCKS5 proxy bridge for WARP
 * Converts HTTP proxy requests to SOCKS5 (WARP on port 25345)
 * Listens on http://127.0.0.1:40000
 */

import httpProxy from 'http-proxy-to-socks';

const HTTP_PORT = 40000;
const SOCKS_HOST = '127.0.0.1';
const SOCKS_PORT = 25345;

const server = httpProxy.createServer({
  proxyHost: SOCKS_HOST,
  proxyPort: SOCKS_PORT,
  localPort: HTTP_PORT,
  localHost: '127.0.0.1'
});

server.on('listening', () => {
  console.log(`[HTTP→SOCKS Proxy] Listening on http://127.0.0.1:${HTTP_PORT}`);
  console.log(`[HTTP→SOCKS Proxy] Forwarding to socks5://${SOCKS_HOST}:${SOCKS_PORT}`);
});

server.on('error', (err) => {
  console.error('[HTTP→SOCKS Proxy] Error:', err);
  process.exit(1);
});

server.listen(HTTP_PORT, '127.0.0.1');
