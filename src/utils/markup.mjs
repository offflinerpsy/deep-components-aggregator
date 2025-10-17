/**
 * Markup Management Utilities
 * Управление наценкой на товары
 */

import { openDb } from '../db/sql.mjs';

/**
 * Получить текущую наценку в процентах
 * @returns {number} Наценка в процентах (например, 20 для 20%)
 */
export function getMarkupPercentage() {
  const db = openDb();
  
  try {
    const row = db.prepare(`
      SELECT value FROM settings 
      WHERE key = 'markup_percentage'
    `).get();
    
    if (!row) {
      return 0; // По умолчанию без наценки
    }
    
    const markup = parseFloat(row.value);
    return isNaN(markup) ? 0 : markup;
  } catch (error) {
    console.error('Error getting markup percentage:', error);
    return 0;
  }
}

/**
 * Применить наценку к цене
 * @param {number} originalPrice Оригинальная цена
 * @param {string} currency Валюта
 * @returns {number} Цена с наценкой
 */
export function applyMarkup(originalPrice, currency = 'RUB') {
  if (!originalPrice || originalPrice <= 0) {
    return originalPrice;
  }
  
  const markupPercent = getMarkupPercentage();
  if (markupPercent <= 0) {
    return originalPrice;
  }
  
  const markupMultiplier = 1 + (markupPercent / 100);
  return Math.round(originalPrice * markupMultiplier * 100) / 100; // Округляем до копеек
}

/**
 * Применить наценку к массиву товаров
 * @param {Array} products Массив товаров
 * @returns {Array} Товары с примененной наценкой
 */
export function applyMarkupToProducts(products) {
  if (!Array.isArray(products)) {
    return products;
  }
  
  const markupPercent = getMarkupPercentage();
  if (markupPercent <= 0) {
    return products;
  }
  
  return products.map(product => {
    const updatedProduct = { ...product };
    
    // Применяем наценку к основной цене
    if (product.min_price && product.min_price > 0) {
      updatedProduct.min_price = applyMarkup(product.min_price, product.min_currency);
    }
    
    if (product.min_price_rub && product.min_price_rub > 0) {
      updatedProduct.min_price_rub = applyMarkup(product.min_price_rub, 'RUB');
    }
    
    // Применяем наценку к ценовым уровням
    if (product.pricing && Array.isArray(product.pricing)) {
      updatedProduct.pricing = product.pricing.map(tier => ({
        ...tier,
        price: applyMarkup(tier.price, tier.currency),
        price_rub: tier.price_rub ? applyMarkup(tier.price_rub, 'RUB') : tier.price_rub
      }));
    }
    
    return updatedProduct;
  });
}

/**
 * Обновить наценку в настройках
 * @param {number} percentage Новый процент наценки
 * @returns {boolean} Успешность операции
 */
export function updateMarkupPercentage(percentage) {
  const db = openDb();
  
  try {
    const normalizedPercentage = Math.max(0, Math.min(1000, percentage)); // Ограничиваем от 0 до 1000%
    const now = Date.now();
    
    const update = db.prepare(`
      UPDATE settings 
      SET value = ?, updated_at = ?
      WHERE key = 'markup_percentage'
    `);
    
    const insert = db.prepare(`
      INSERT INTO settings (key, value, updated_at, category, type, description, is_public)
      VALUES ('markup_percentage', ?, ?, 'pricing', 'number', 'Глобальная наценка в процентах на все товары', 0)
    `);
    
    const tx = db.transaction(() => {
      const info = update.run(normalizedPercentage.toString(), now);
      if (info.changes === 0) {
        insert.run(normalizedPercentage.toString(), now);
      }
    });
    
    tx();
    return true;
  } catch (error) {
    console.error('Error updating markup percentage:', error);
    return false;
  }
}
