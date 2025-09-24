import express from 'express';
import dotenv from 'dotenv';

// Загружаем переменные окружения из .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Aggregator Server is running!');
});

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});