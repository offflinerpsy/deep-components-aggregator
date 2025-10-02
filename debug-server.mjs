// Минимальный сервер с пошаговой проверкой импортов
console.log('1. Starting server...');

import 'dotenv/config';
console.log('2. dotenv loaded');

import express from 'express';
console.log('3. express loaded');

console.log('4. ENV vars:', {
  mouser: process.env.MOUSER_API_KEY ? 'SET' : 'NOT SET',
  farnell: process.env.FARNELL_API_KEY ? 'SET' : 'NOT SET'
});

import { openDb } from './src/db/sql.mjs';
console.log('5. openDb imported');

const app = express();
console.log('6. express app created');

app.use(express.static('public', { extensions:['html'] }));
console.log('7. static middleware added');

app.get('/api/health', (req, res) => {
  res.json({status:'ok',ts:Date.now()});
});
console.log('8. health endpoint added');

try {
  const db = openDb();
  console.log('9. database opened');
} catch (e) {
  console.error('ERROR opening database:', e.message);
}

const PORT = Number(process.env.PORT||9201);
app.listen(PORT, () => {
  console.log(`✅ SERVER RUNNING on http://localhost:${PORT}`);
});
