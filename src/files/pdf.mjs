import fs from 'node:fs';
import path from 'node:path';
import { fetch } from 'undici';
import crypto from 'node:crypto';

// Скачивает PDF файл и сохраняет его локально
export const downloadPdf = async (url) => {
  // Создаем хеш URL для имени файла
  const hash = crypto.createHash('sha1').update(url).digest('hex');
  const dirPath = path.resolve('data/files/pdf');
  const filePath = path.join(dirPath, `${hash}.pdf`);
  
  // Если файл уже существует, возвращаем его локальный путь
  if (fs.existsSync(filePath)) {
    return `/files/pdf/${hash}.pdf`;
  }
  
  // Создаем директорию, если она не существует
  fs.mkdirSync(dirPath, { recursive: true });
  
  // Скачиваем файл
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));
    
    return `/files/pdf/${hash}.pdf`;
  } catch (error) {
    console.error(`Error downloading PDF from ${url}:`, error);
    return null;
  }
};
