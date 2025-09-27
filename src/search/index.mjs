import fs from 'node:fs';
import { create, insertMultiple, search, save, load } from '@orama/orama';
import snowballFactory from 'snowball-stemmers';
import path from 'node:path';

const DB_PATH = path.resolve('data/orama.db');
const CORPUS_PATH = path.resolve('data/corpus.json');

const ru = snowballFactory.newStemmer('russian');
const en = snowballFactory.newStemmer('english');

function stem(token) {
  const isCyrillic = /[\u0400-\u04FF]/.test(token);
  return isCyrillic ? ru.stem(token) : en.stem(token);
}

const dbSchema = {
  id: 'string',
  title: 'string',
  mpn: 'string',
  manufacturer: 'string',
  description: 'string',
  specs_flat: 'string',
  url: 'string',
  image: 'string',
  price: 'string'
};

// Функция, которую мы будем запускать отдельно для создания индекса
export async function buildAndSaveIndex() {
  if (!fs.existsSync(CORPUS_PATH)) {
    console.error('❌ corpus.json не найден! Запустите npm run build:corpus');
    return;
  }

  console.log('🔍 Загрузка корпуса данных...');
  const docs = JSON.parse(fs.readFileSync(CORPUS_PATH, 'utf8'));
  console.log(`📊 Загружено ${docs.length} документов`);

  console.log('🏗️ Создание индекса Orama...');
  const db = await create({
    schema: dbSchema,
    language: 'english' // Orama v2 использует language вместо components
  });

  console.log('📝 Вставка документов в индекс...');
  await insertMultiple(db, docs);

  console.log('💾 Сохранение индекса...');
  await save(db, DB_PATH);
  console.log(`✅ Индекс Orama сохранен в ${DB_PATH}`);
}

// Функция, которую будет использовать сервер для быстрой загрузки
export async function loadIndex() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ База данных Orama не найдена! Запустите npm run build:index');
    return null;
  }

  console.log('📂 Загрузка индекса Orama...');
  const db = await load(DB_PATH);
  console.log('✅ Индекс Orama загружен');
  return db;
}

export async function query(db, q) {
  if (!db) return { count: 0, hits: [] };

  console.log(`🔍 Поиск: "${q}"`);
  const result = await search(db, {
    term: q,
    properties: ['title', 'mpn', 'manufacturer', 'description', 'specs_flat'],
    boost: { mpn: 3, title: 2, manufacturer: 1.5 },
    limit: 50,
    tolerance: 1,
    threshold: 0
  });

  console.log(`📊 Найдено результатов: ${result.hits.length}`);
  return result;
}

// Если файл запускается напрямую, создаем индекс
if (import.meta.url === `file://${process.argv[1]}`) {
  buildAndSaveIndex().catch(console.error);
}
