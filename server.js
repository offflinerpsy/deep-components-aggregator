import express from 'express';
import apiRouter from './src/api/http.mjs';
import fs from 'node:fs';
import path from 'node:path';

const app = express();

// Создаем директории для файлов, если они не существуют
const filesDir = path.resolve('data/files/pdf');
fs.mkdirSync(filesDir, { recursive: true });

// Статические файлы
app.use('/files', express.static('data/files'));
app.use(express.static('public'));

// API маршруты
app.use('/api', apiRouter);

// Запуск сервера
app.listen(9201, () => console.log('HTTP 9201'));