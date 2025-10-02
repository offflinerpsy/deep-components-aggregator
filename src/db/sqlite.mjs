/**
 * Модуль для работы с SQLite базой данных
 * @module src/db/sqlite
 */

import fs from 'node:fs';
import path from 'node:path';

// Заглушка для SQLite в Windows
// В реальной среде используется better-sqlite3

/**
 * Вставить продукт в базу данных
 * @param {Object} p - Продукт для вставки
 * @returns {number} ID вставленного продукта
 */
export const insertProduct = (p) => {
  if (!p.mpn && !p.title) return 0;

  try {
    // Логируем действие
    console.log(`[Mock SQLite] Insert product: ${p.mpn || p.title}`);

    // Возвращаем случайный ID
    return Math.floor(Math.random() * 1000000);
  } catch (error) {
    console.error('Ошибка при вставке продукта:', error.message);
    return 0;
  }
};

/**
 * Обновить или вставить предложение
 * @param {number} product_id - ID продукта
 * @param {Object} o - Предложение
 * @returns {number} Количество затронутых строк
 */
export const upsertOffer = (product_id, o) => {
  if (!product_id) return 0;

  try {
    // Логируем действие
    console.log(`[Mock SQLite] Upsert offer for product ${product_id}: ${o.region}, ${o.price_min_rub} RUB`);

    return 1;
  } catch (error) {
    console.error('Ошибка при обновлении предложения:', error.message);
    return 0;
  }
};

/**
 * Записать информацию о поиске
 * @param {string} id - ID поиска
 * @param {string} q - Поисковый запрос
 * @param {string} kind - Тип запроса
 * @param {number} total_found - Количество найденных результатов
 * @returns {number} Количество затронутых строк
 */
export const recordSearch = (id, q, kind, total_found) => {
  try {
    // Логируем действие
    console.log(`[Mock SQLite] Record search: ${id}, query: ${q}, kind: ${kind}, found: ${total_found}`);

    return 1;
  } catch (error) {
    console.error('Ошибка при записи информации о поиске:', error.message);
    return 0;
  }
};

/**
 * Быстрый поиск по базе данных
 * @param {string} q - Поисковый запрос
 * @returns {Object[]} Результаты поиска
 */
export const searchQuick = (q) => {
  try {
    // Логируем действие
    console.log(`[Mock SQLite] Quick search for: ${q}`);

    // Возвращаем пустой результат
    return [];
  } catch (error) {
    console.error('Ошибка при быстром поиске:', error.message);
    return [];
  }
};

// Заглушка для объекта базы данных
export default {
  prepare: () => ({
    get: () => null,
    all: () => [],
    run: () => ({ lastInsertRowid: Math.floor(Math.random() * 1000000) })
  }),
  exec: () => {},
  pragma: () => {}
};
