import express from 'express';

// Перехватываем process.exit()
const originalExit = process.exit;
process.exit = function(code) {
  console.error('\n🚨 PROCESS.EXIT CALLED! Code:', code);
  console.error('Stack trace:');
  console.trace();
  originalExit.call(process, code);
};

const app = express();

app.get('/test', (req, res) => {
  console.log('[TEST] Handler called');
  res.json({ status: 'ok', message: 'Minimal server works!' });
});

const PORT = 9201;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Minimal server started on :${PORT}`);
  console.log(`Test: http://localhost:${PORT}/test`);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ UNCAUGHT EXCEPTION');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n❌ UNHANDLED REJECTION');
  console.error(reason);
  process.exit(1);
});
