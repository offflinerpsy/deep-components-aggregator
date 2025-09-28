import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Путь к директории с данными о продуктах
 */
const PRODUCTS_DIR = 'data/db/products';

/**
 * Загружает все продукты из директории с данными
 * @returns {Array} Массив продуктов
 */
export function loadAllProducts() {
  // Проверяем существование директории
  if (!existsSync(PRODUCTS_DIR)) {
    console.warn(`Directory ${PRODUCTS_DIR} does not exist`);
    return [];
  }
  
  // Получаем список файлов JSON
  const files = readdirSync(PRODUCTS_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} product files`);
  
  // Загружаем данные из каждого файла
  const products = [];
  
  for (const file of files) {
    try {
      const filePath = path.join(PRODUCTS_DIR, file);
      const content = readFileSync(filePath, 'utf8');
      const product = JSON.parse(content);
      
      // Проверяем наличие обязательных полей
      if (product && product.mpn) {
        products.push(product);
      } else {
        console.warn(`Skipping invalid product in file ${file}`);
      }
    } catch (error) {
      console.error(`Error loading product from ${file}: ${error.message}`);
    }
  }
  
  console.log(`Loaded ${products.length} valid products`);
  return products;
}

/**
 * Загружает продукт по MPN
 * @param {string} mpn MPN продукта
 * @returns {object|null} Продукт или null, если не найден
 */
export function loadProduct(mpn) {
  if (!mpn) {
    return null;
  }
  
  // Нормализуем MPN для использования в имени файла
  const safeMpn = mpn.replace(/[\/\\?%*:|"<>]/g, '_');
  const filePath = path.join(PRODUCTS_DIR, `${safeMpn}.json`);
  
  // Проверяем существование файла
  if (!existsSync(filePath)) {
    return null;
  }
  
  try {
    // Загружаем данные из файла
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading product ${mpn}: ${error.message}`);
    return null;
  }
}