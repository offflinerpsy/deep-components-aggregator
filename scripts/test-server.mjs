// Тестовый сервер для проверки
import express from 'express';

const app = express();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint works!' });
});

const PORT = 9201;
app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/api/health`);
});
