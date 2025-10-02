#!/bin/bash
cat > /opt/deep-agg/src/core/search.mjs << 'EOL'
/**
 * Модуль для работы с индексом Orama для быстрого поиска
 * @module src/core/search
 */

import fs from 'node:fs';
import path from 'node:path';
import { create, insert, search } from '@orama/orama';
import { toIndexable } from './canon.mjs';

// Путь к файлу индекса
const INDEX_FILE_PATH = path.resolve('data/idx/search-index.json');

// Время создания индекса
let indexBuildTime = null;

// Схема индекса
const schema = {
  id: 'string',
  mpn: 'string',
  brand: 'string',
  title: 'string',
  description: 'string',
  package: 'string',
  packaging: 'string',
  image_url: 'string',
  datasheet_urls: 'string[]',
  text: 'string',
  regions: 'string[]',
  min_price_rub: 'number',
  total_stock: 'number'
};

// Индекс Orama
let db = null;

/**
 * Инициализировать индекс
 * @returns {Promise<Object>} Индекс Orama
 */
const initIndex = async () => {
  if (db) return db;
  
  try {
    // Создаем новый индекс
    db = await create({
      schema,
      components: {
        tokenizer: {
          stemming: true,
          normalization: {
            lowercase: true,
            normalizeWhitespace: true,
            trim: true
          }
        }
      }
    });
    
    // Пытаемся загрузить индекс из файла
    await loadIndex();
    
    return db;
  } catch (error) {
    console.error('Ошибка при инициализации индекса:', error.message);
    
    // Создаем пустой индекс в случае ошибки
    db = await create({
      schema,
      components: {
        tokenizer: {
          stemming: true,
          normalization: {
            lowercase: true,
            normalizeWhitespace: true,
            trim: true
          }
        }
      }
    });
    
    return db;
  }
};

/**
 * Загрузить индекс из файла
 * @returns {Promise<boolean>} Результат загрузки
 */
const loadIndex = async () => {
  try {
    if (!fs.existsSync(INDEX_FILE_PATH)) {
      return false;
    }
    
    const stats = fs.statSync(INDEX_FILE_PATH);
    indexBuildTime = stats.mtime.getTime();
    
    const data = JSON.parse(fs.readFileSync(INDEX_FILE_PATH, 'utf8'));
    
    if (!data || !data.index) {
      return false;
    }
    
    // Загружаем индекс
    db = await create({
      schema,
      components: {
        tokenizer: {
          stemming: true,
          normalization: {
            lowercase: true,
            normalizeWhitespace: true,
            trim: true
          }
        }
      },
      data: data.index
    });
    
    return true;
  } catch (error) {
    console.error('Ошибка при загрузке индекса:', error.message);
    return false;
  }
};

/**
 * Сохранить индекс в файл
 * @returns {Promise<boolean>} Результат сохранения
 */
const saveIndex = async () => {
  try {
    const dir = path.dirname(INDEX_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Сериализуем индекс
    const serialized = {
      index: db,
      timestamp: Date.now()
    };
    
    fs.writeFileSync(INDEX_FILE_PATH, JSON.stringify(serialized, null, 2), 'utf8');
    indexBuildTime = Date.now();
    
    return true;
  } catch (error) {
    console.error('Ошибка при сохранении индекса:', error.message);
    return false;
  }
};

/**
 * Построить индекс из массива продуктов
 * @param {Object[]} products - Массив продуктов
 * @returns {Promise<boolean>} Результат построения
 */
export const buildIndex = async (products) => {
  if (!Array.isArray(products) || products.length === 0) {
    console.warn('Пустой массив продуктов для индексации');
    return false;
  }
  
  try {
    // Инициализируем индекс
    db = await create({
      schema,
      components: {
        tokenizer: {
          stemming: true,
          normalization: {
            lowercase: true,
            normalizeWhitespace: true,
            trim: true
          }
        }
      }
    });
    
    // Индексируем продукты
    for (const product of products) {
      const indexable = toIndexable(product);
      
      if (indexable && indexable.id) {
        await insert(db, indexable);
      }
    }
    
    // Сохраняем индекс
    await saveIndex();
    
    return true;
  } catch (error) {
    console.error('Ошибка при построении индекса:', error.message);
    return false;
  }
};

/**
 * Добавить продукт в индекс
 * @param {Object} product - Продукт для добавления
 * @returns {Promise<boolean>} Результат добавления
 */
export const addToIndex = async (product) => {
  if (!product) return false;
  
  try {
    // Инициализируем индекс, если он еще не создан
    if (!db) {
      await initIndex();
    }
    
    const indexable = toIndexable(product);
    
    if (indexable && indexable.id) {
      await insert(db, indexable);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Ошибка при добавлении продукта ${product.mpn} в индекс:`, error.message);
    return false;
  }
};

/**
 * Выполнить поиск по индексу
 * @param {string} query - Поисковый запрос
 * @param {Object} [options] - Опции поиска
 * @param {number} [options.limit=50] - Максимальное количество результатов
 * @returns {Promise<Object>} Результаты поиска
 */
export const searchIndex = async (query, { limit = 50 } = {}) => {
  if (!query) {
    return { hits: [], count: 0 };
  }
  
  try {
    // Инициализируем индекс, если он еще не создан
    if (!db) {
      await initIndex();
    }
    
    // Выполняем поиск
    const results = await search(db, {
      term: query,
      properties: ['mpn', 'brand', 'title', 'text'],
      limit,
      boost: (doc) => {
        // Повышаем релевантность документов с ценой и наличием
        let score = 1;
        
        if (doc.min_price_rub > 0) {
          score += 0.5;
        }
        
        if (doc.total_stock > 0) {
          score += 0.5;
        }
        
        return score;
      }
    });
    
    // Преобразуем результаты
    const hits = results.hits.map(hit => ({
      ...hit.document,
      score: hit.score
    }));
    
    return {
      hits,
      count: results.count
    };
  } catch (error) {
    console.error(`Ошибка при поиске "${query}":`, error.message);
    return { hits: [], count: 0 };
  }
};

/**
 * Получить возраст индекса
 * @returns {number|null} Возраст индекса в миллисекундах или null, если индекс не создан
 */
export const getIndexAge = () => {
  if (!indexBuildTime) {
    try {
      if (fs.existsSync(INDEX_FILE_PATH)) {
        const stats = fs.statSync(INDEX_FILE_PATH);
        indexBuildTime = stats.mtime.getTime();
      }
    } catch (error) {
      return null;
    }
  }
  
  return indexBuildTime ? Date.now() - indexBuildTime : null;
};

export default { buildIndex, addToIndex, searchIndex, getIndexAge };
EOL
