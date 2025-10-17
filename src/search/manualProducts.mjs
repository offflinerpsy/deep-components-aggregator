/**
 * Manual Products Integration
 * Добавляет ручные товары в результаты поиска
 */

import { openDb } from '../db/sql.mjs';

/**
 * Получить произвольные поля товара
 * @param {number} productId ID товара
 * @returns {Object} Объект с произвольными полями
 */
function getCustomFields(productId) {
  const db = openDb();
  
  try {
    const rows = db.prepare(`
      SELECT field_name, field_value, field_type 
      FROM manual_product_fields 
      WHERE product_id = ?
    `).all(productId);
    
    const customFields = {};
    rows.forEach(row => {
      let value = row.field_value;
      
      // Преобразуем значение в зависимости от типа
      switch (row.field_type) {
        case 'number':
          value = Number(value) || 0;
          break;
        case 'boolean':
          value = value === 'true' || value === '1' || value === 'yes';
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = value;
          }
          break;
        default:
          value = String(value || '');
      }
      
      customFields[row.field_name] = value;
    });
    
    return customFields;
  } catch (error) {
    console.error('Error getting custom fields:', error);
    return {};
  }
}

/**
 * Поиск ручных товаров по запросу
 * @param {string} query Поисковый запрос
 * @returns {Array} Массив найденных товаров в формате поиска
 */
export function searchManualProducts(query) {
  const db = openDb();
  
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = `%${query.toLowerCase()}%`;
  
  try {
    const rows = db.prepare(`
      SELECT 
        mpn,
        manufacturer,
        description as title,
        price,
        currency,
        region,
        stock,
        image_url,
        datasheet_url,
        technical_specs,
        images,
        datasheets,
        pricing,
        availability,
        regions,
        package,
        packaging,
        vendor_url,
        source,
        category,
        'manual' as source,
        created_at,
        updated_at
      FROM manual_products 
      WHERE is_active = 1 
        AND (
          LOWER(mpn) LIKE ? OR 
          LOWER(manufacturer) LIKE ? OR 
          LOWER(description) LIKE ? OR
          LOWER(category) LIKE ?
        )
      ORDER BY 
        CASE 
          WHEN LOWER(mpn) = LOWER(?) THEN 1
          WHEN LOWER(mpn) LIKE ? THEN 2
          WHEN LOWER(manufacturer) LIKE ? THEN 3
          ELSE 4
        END,
        stock DESC,
        price ASC
      LIMIT 20
    `).all(
      searchTerm, searchTerm, searchTerm, searchTerm,
      query.toLowerCase(), // exact MPN match
      `${query.toLowerCase()}%`, // MPN starts with
      searchTerm // manufacturer match
    );

    return rows.map(row => {
      // Получаем произвольные поля
      const customFields = getCustomFields(row.id);
      
      // Объединяем технические характеристики с произвольными полями
      const technicalSpecs = row.technical_specs ? JSON.parse(row.technical_specs) : {};
      const mergedSpecs = { ...technicalSpecs, ...customFields };
      
      return {
        mpn: row.mpn,
        manufacturer: row.manufacturer,
        title: row.title || `${row.manufacturer} ${row.mpn}`,
        description_short: row.title,
        source: 'manual',
        region: row.region || 'GLOBAL',
        stock: row.stock || 0,
        min_price: row.price || 0,
        min_price_rub: row.price || 0, // Assuming RUB for manual products
        image_url: row.image_url,
        datasheet_url: row.datasheet_url,
        technical_specs: mergedSpecs,
        images: row.images ? JSON.parse(row.images) : [],
        datasheets: row.datasheets ? JSON.parse(row.datasheets) : [],
        pricing: row.pricing ? JSON.parse(row.pricing) : [],
        availability: row.availability ? JSON.parse(row.availability) : {},
        regions: row.regions ? JSON.parse(row.regions) : [],
        package: row.package,
        packaging: row.packaging,
        vendorUrl: row.vendor_url,
        category: row.category,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });
  } catch (error) {
    console.error('Error searching manual products:', error);
    return [];
  }
}

/**
 * Получить ручной товар по MPN
 * @param {string} mpn MPN товара
 * @returns {Object|null} Товар или null
 */
export function getManualProduct(mpn) {
  const db = openDb();
  
  if (!mpn || mpn.trim().length === 0) {
    return null;
  }

  try {
    const row = db.prepare(`
      SELECT * FROM manual_products 
      WHERE is_active = 1 AND LOWER(mpn) = LOWER(?)
      LIMIT 1
    `).get(mpn);

    if (!row) {
      return null;
    }

    // Получаем произвольные поля
    const customFields = getCustomFields(row.id);
    
    // Объединяем технические характеристики с произвольными полями
    const technicalSpecs = row.technical_specs ? JSON.parse(row.technical_specs) : {};
    const mergedSpecs = { ...technicalSpecs, ...customFields };

    return {
      mpn: row.mpn,
      manufacturer: row.manufacturer,
      title: row.description || `${row.manufacturer} ${row.mpn}`,
      description: row.description,
      source: 'manual',
      region: row.region || 'GLOBAL',
      stock: row.stock || 0,
      min_price: row.price || 0,
      min_price_rub: row.price || 0,
      image_url: row.image_url,
      datasheet_url: row.datasheet_url,
      technical_specs: mergedSpecs,
      images: row.images ? JSON.parse(row.images) : [],
      datasheets: row.datasheets ? JSON.parse(row.datasheets) : [],
      pricing: row.pricing ? JSON.parse(row.pricing) : [],
      availability: row.availability ? JSON.parse(row.availability) : {},
      regions: row.regions ? JSON.parse(row.regions) : [],
      package: row.package,
      packaging: row.packaging,
      vendorUrl: row.vendor_url,
      category: row.category,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  } catch (error) {
    console.error('Error getting manual product:', error);
    return null;
  }
}
