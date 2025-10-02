// Минимальный тест сервера
import express from 'express';

console.log('Starting minimal server...');

const app = express();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

const PORT = 9201;

try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server listening on http://localhost:${PORT}`);
    console.log(`Server object:`, !!server);
    console.log(`Server listening:`, server.listening);
    console.log(`Address:`, server.address());
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
  });

  server.on('close', () => {
    console.log('⚠️  Server closed');
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  process.on('beforeExit', (code) => {
    console.log('⚠️  Process beforeExit event with code:', code);
  });

  process.on('exit', (code) => {
    console.log('⚠️  Process exiting with code:', code);
  });

  // Keep process alive
  setInterval(() => {
    console.log('❤️  Heartbeat -', new Date().toISOString());
  }, 10000);

} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

console.log('Script reached end - entering event loop');
