/**
 * Скрипт для загрузки файла с URL ChipDip на сервер
 *
 * Использование:
 * node scripts/upload-chipdip-urls.mjs <local-file-path>
 *
 * Пример:
 * node scripts/upload-chipdip-urls.mjs C:/Users/Makkaroshka/Documents/GitHub/components-aggregator/loads/url/chipdip-urls.txt
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Получаем аргументы командной строки
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Использование: node upload-chipdip-urls.mjs <local-file-path>');
  process.exit(1);
}

const localFilePath = args[0];

// Проверяем существование локального файла
if (!fs.existsSync(localFilePath)) {
  console.error(`Ошибка: файл ${localFilePath} не существует`);
  process.exit(1);
}

// Конфигурация сервера
const SERVER = '89.104.69.77';
const USER = 'root';
const PASSWORD = 'DCIIcWfISxT3R4hT';
const REMOTE_DIR = '/opt/deep-agg/loads/urls-db';
const REMOTE_FILE = `${REMOTE_DIR}/chipdip-urls.txt`;

// Функция для выполнения команды с выводом результата
function executeCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, options);

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(data.toString());
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(data.toString());
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Команда завершилась с кодом ${code}: ${stderr}`));
      }
    });
  });
}

// Основная функция для загрузки файла
async function uploadFile() {
  try {
    console.log(`Загрузка файла ${localFilePath} на сервер ${SERVER}...`);

    // Получаем размер файла
    const stats = fs.statSync(localFilePath);
    const fileSizeMB = stats.size / (1024 * 1024);

    console.log(`Размер файла: ${fileSizeMB.toFixed(2)} MB`);

    // Создаем директорию на сервере, если она не существует
    await executeCommand('plink', [
      '-batch',
      '-pw', PASSWORD,
      `${USER}@${SERVER}`,
      `mkdir -p ${REMOTE_DIR}`
    ]);

    // Загружаем файл на сервер
    console.log(`Копирование файла на сервер...`);

    await executeCommand('pscp', [
      '-batch',
      '-pw', PASSWORD,
      localFilePath,
      `${USER}@${SERVER}:${REMOTE_FILE}`
    ]);

    console.log(`Файл успешно загружен на сервер: ${REMOTE_FILE}`);

    // Проверяем размер загруженного файла
    const { stdout } = await executeCommand('plink', [
      '-batch',
      '-pw', PASSWORD,
      `${USER}@${SERVER}`,
      `ls -lh ${REMOTE_FILE}`
    ]);

    console.log(`Информация о загруженном файле:\n${stdout}`);

    console.log('Загрузка завершена успешно!');
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error.message);
    process.exit(1);
  }
}

// Запускаем загрузку
uploadFile();
