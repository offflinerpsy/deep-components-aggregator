// ULTRA SIMPLE TEST
import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
});

server.listen(9201, '0.0.0.0', () => {
  console.log('Server running on port 9201');
});

console.log('Script loaded');
