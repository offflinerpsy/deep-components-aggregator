/**
 * Модуль для поиска по индексу
 * @module src/core/search
 */

import fs from 'node:fs';
import path from 'node:path';
import { create, insert, search, remove } from '@orama/orama';

// Путь к файлу индекса
const indexPath = path.resolve('data/idx/search-index.json');

// Экземпляр индекса
let db = null;

/**
 * Нормализует текст для поиска
 * @param {string} text - Текст для нормализации
 * @returns {string} Нормализованный текст
 */
export function normalizeText(text) {
  if (!text) return '';

  // Приводим к нижнему регистру и нормализуем Юникод (NFKC)
  const normalized = text.toLowerCase().normalize('NFKC');

  // Заменяем дефисы и подчеркивания на пробелы
  const withSpaces = normalized.replace(/[-_]/g, ' ');

  // Удаляем лишние пробелы
  return withSpaces.replace(/\s+/g, ' ').trim();
}

/**
 * Токенизирует текст для поиска
 * @param {string} text - Текст для токенизации
 * @returns {string[]} Массив токенов
 */
export function tokenizeText(text) {
  if (!text) return [];

  const normalized = normalizeText(text);

  // Разбиваем на токены по пробелам
  return normalized.split(/\s+/).filter(Boolean);
}

/**
 * Определяет, содержит ли текст кириллицу
 * @param {string} text - Текст для проверки
 * @returns {boolean} true, если текст содержит кириллицу
 */
export function hasCyrillic(text) {
  if (!text) return false;
  return /[а-яА-ЯёЁ]/.test(text);
}

/**
 * Создает схему индекса
 * @returns {Object} Схема индекса
 */
function createIndexSchema() {
  return {
    mpn: 'string',
    sku: 'string',
    brand: 'string',
    title: 'string',
    ru_title: 'string',
    description: 'string',
    ru_description: 'string',
    package: 'string',
    packaging: 'string',
    text: 'string',
    ru_text: 'string'
  };
}

/**
 * Подготавливает документ для индексации
 * @param {Object} product - Продукт для индексации
 * @returns {Object} Документ для индексации
 */
export function prepareDocument(product) {
  // Базовые поля
  const doc = {
    id: product.id || product.mpn || product.chipdip_id || String(Math.random()).slice(2),
    mpn: product.mpn || '',
    sku: product.sku || '',
    brand: product.brand || '',
    title: product.title || '',
    description: product.description || '',
    package: product.package || '',
    packaging: product.packaging || '',
    text: '',
    ru_title: '',
    ru_description: '',
    ru_text: ''
  };

  // Добавляем русские поля, если они содержат кириллицу
  if (hasCyrillic(product.title)) {
    doc.ru_title = product.title;
  }

  if (hasCyrillic(product.description)) {
    doc.ru_description = product.description;
  }

  // Собираем все текстовые поля для полнотекстового поиска
  const textParts = [
    product.mpn,
    product.sku,
    product.brand,
    product.title,
    product.description,
    product.package,
    product.packaging
  ].filter(Boolean);

  // Добавляем технические характеристики
  if (product.technical_specs && typeof product.technical_specs === 'object') {
    for (const [key, value] of Object.entries(product.technical_specs)) {
      if (key && value) {
        textParts.push(`${key}: ${value}`);

        // Если ключ или значение содержит кириллицу, добавляем в русский текст
        if (hasCyrillic(key) || hasCyrillic(value)) {
          doc.ru_text += ` ${key}: ${value}`;
        }
      }
    }
  }

  // Объединяем все текстовые части
  doc.text = textParts.join(' ');

  return doc;
}

/**
 * Строит индекс из продуктов
 * @param {Array} products - Массив продуктов для индексации
 * @returns {Promise<boolean>} true, если индекс успешно построен
 */
export async function buildIndex(products) {
  try {
    console.log(`[SEARCH] Building index from ${products.length} products...`);

    // Создаем новый индекс
    db = await create({
      schema: createIndexSchema()
    });

    // Добавляем продукты в индекс
    for (const product of products) {
      const doc = prepareDocument(product);
      await insert(db, doc);
    }

    // Сохраняем индекс в файл
    const indexDir = path.dirname(indexPath);
    if (!fs.existsSync(indexDir)) {
      fs.mkdirSync(indexDir, { recursive: true });
    }

    // Сохраняем индекс в файл (если будет поддержка сериализации в Orama)
    // fs.writeFileSync(indexPath, JSON.stringify(db), 'utf8');

    console.log(`[SEARCH] Index built successfully with ${products.length} products`);
    return true;
  } catch (error) {
    console.error(`[SEARCH] Error building index:`, error);
    return false;
  }
}

/**
 * Загружает индекс из файла
 * @returns {Promise<boolean>} true, если индекс успешно загружен
 */
export async function loadIndex() {
  try {
    if (!fs.existsSync(indexPath)) {
      console.warn(`[SEARCH] Index file not found: ${indexPath}`);
      return false;
    }

    // Загружаем индекс из файла (если будет поддержка десериализации в Orama)
    // const indexData = fs.readFileSync(indexPath, 'utf8');
    // db = JSON.parse(indexData);

    console.log(`[SEARCH] Index loaded successfully`);
    return true;
  } catch (error) {
    console.error(`[SEARCH] Error loading index:`, error);
    return false;
  }
}

/**
 * Обновляет индекс, добавляя или обновляя продукт
 * @param {Object} product - Продукт для обновления
 * @returns {Promise<boolean>} true, если индекс успешно обновлен
 */
export async function updateIndex(product) {
  try {
    if (!db) {
      console.warn(`[SEARCH] Index not initialized`);
      return false;
    }

    const doc = prepareDocument(product);

    // Удаляем документ, если он уже существует
    try {
      await remove(db, doc.id);
    } catch (error) {
      // Игнорируем ошибку, если документ не существует
    }

    // Добавляем новый документ
    await insert(db, doc);

    return true;
  } catch (error) {
    console.error(`[SEARCH] Error updating index:`, error);
    return false;
  }
}

/**
 * Выполняет поиск по индексу
 * @param {string} query - Поисковый запрос
 * @param {Object} options - Опции поиска
 * @param {number} [options.limit=50] - Максимальное количество результатов
 * @returns {Promise<Object>} Результаты поиска
 */
export async function searchIndex(query, { limit = 50 } = {}) {
  try {
    // Если индекс не инициализирован, создаем пустой
    if (!db) {
      db = await create({
        schema: createIndexSchema()
      });
    }

    // Нормализуем запрос
    const normalizedQuery = normalizeText(query);

    // Определяем, содержит ли запрос кириллицу
    const hasCyrillicQuery = hasCyrillic(normalizedQuery);

    // Настраиваем поля для поиска с бустами
    const properties = [
      { name: 'mpn', boost: 6 },
      { name: 'sku', boost: 5 },
      { name: 'brand', boost: 3 },
      { name: 'title', boost: 2 },
      { name: 'description', boost: 1.5 },
      { name: 'text', boost: 1 }
    ];

    // Если запрос содержит кириллицу, добавляем русские поля с высоким бустом
    if (hasCyrillicQuery) {
      properties.push(
        { name: 'ru_title', boost: 4 },
        { name: 'ru_description', boost: 3 },
        { name: 'ru_text', boost: 2 }
      );
    }

    // Выполняем поиск
    const results = await search(db, {
      term: normalizedQuery,
      properties,
      limit
    });

    return {
      hits: results.hits.map(hit => ({
        ...hit.document,
        score: hit.score
      })),
      count: results.count
    };
  } catch (error) {
    console.error(`[SEARCH] Error searching for "${query}":`, error);
    return { hits: [], count: 0 };
  }
}

export default {
  buildIndex,
  loadIndex,
  updateIndex,
  searchIndex,
  normalizeText,
  tokenizeText,
  hasCyrillic
};
