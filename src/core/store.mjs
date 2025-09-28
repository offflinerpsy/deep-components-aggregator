import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Получаем путь к директории модуля
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

// Путь к директории с продуктами
const PRODUCTS_DIR = path.join(rootDir, 'data/db/products');

/**
 * Загружает все продукты из директории
 * @returns {Array} Массив продуктов
 */
export function loadAllProducts() {
  // Проверяем существование директории
  if (!fs.existsSync(PRODUCTS_DIR)) {
    console.warn(`Директория ${PRODUCTS_DIR} не существует`);
    return [];
  }

  try {
    // Получаем список файлов JSON
    const files = fs.readdirSync(PRODUCTS_DIR).filter(f => f.endsWith('.json'));
    console.log(`Найдено ${files.length} файлов продуктов`);

    // Загружаем данные из каждого файла
    const products = [];

    for (const file of files) {
      try {
        const filePath = path.join(PRODUCTS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const product = JSON.parse(content);

        // Проверяем наличие обязательных полей
        if (product && (product.mpn || product.id)) {
          products.push(product);
        } else {
          console.warn(`Пропускаем некорректный продукт в файле ${file}`);
        }
      } catch (error) {
        console.error(`Ошибка загрузки продукта из ${file}: ${error.message}`);
      }
    }

    console.log(`Загружено ${products.length} валидных продуктов`);
    return products;
  } catch (error) {
    console.error(`Ошибка при загрузке продуктов: ${error.message}`);
    return [];
  }
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

  try {
    // Нормализуем MPN для использования в имени файла
    const safeMpn = mpn.replace(/[\/\\?%*:|"<>]/g, '_');
    const filePath = path.join(PRODUCTS_DIR, `${safeMpn}.json`);

    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      return null;
    }

    // Загружаем данные из файла
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Ошибка загрузки продукта ${mpn}: ${error.message}`);
    return null;
  }
}

/**
 * Сохраняет продукт в файл
 * @param {object} product Продукт
 * @returns {string|null} Путь к файлу или null в случае ошибки
 */
export function saveProduct(product) {
  if (!product || (!product.mpn && !product.id)) {
    console.error('Невозможно сохранить продукт без MPN или ID');
    return null;
  }

  try {
    // Создаем директорию, если она не существует
    if (!fs.existsSync(PRODUCTS_DIR)) {
      fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
    }

    // Используем MPN или ID для имени файла
    const key = product.mpn || product.id;
    const safeName = key.replace(/[\/\\?%*:|"<>]/g, '_');
    const filePath = path.join(PRODUCTS_DIR, `${safeName}.json`);

    // Сохраняем продукт в файл
    fs.writeFileSync(filePath, JSON.stringify(product, null, 2));

    return filePath;
  } catch (error) {
    console.error(`Ошибка сохранения продукта: ${error.message}`);
    return null;
  }
}
