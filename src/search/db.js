import { create, insertMultiple } from '@orama/orama';

// Создаем пустую базу данных Orama
export const db = await create({
  schema: {
    title: 'string',
    mpn: 'string',
    manufacturer: 'string',
    description: 'string',
    specs_flat: 'string',
    url: 'string',
    source: 'string'
  }
});

// Функция для добавления продуктов в индекс
export async function addProducts(products) {
  if (!products || products.length === 0) return;

  const docs = products.map(p => ({
    title: p.title || '',
    mpn: p.mpn || '',
    manufacturer: p.manufacturer || '',
    description: p.description || '',
    specs_flat: JSON.stringify(p.specs || {}),
    url: p.url || '',
    source: p.source || 'unknown'
  }));

  await insertMultiple(db, docs);
}
