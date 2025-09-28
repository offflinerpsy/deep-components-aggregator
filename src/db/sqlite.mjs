// Заглушка для SQLite
// Используется для совместимости без native-модулей

export const insertProduct = (p) => {
  console.log(`[Mock SQLite] Insert product: ${p.mpn}`);
  return Math.floor(Math.random() * 1000000); // Случайный ID
};

export const upsertOffer = (product_id, o) => {
  console.log(`[Mock SQLite] Upsert offer for product ${product_id}: ${o.region}, ${o.price_min_rub} RUB`);
  return 1;
};

export const recordSearch = (id, q, kind, total_found) => {
  console.log(`[Mock SQLite] Record search: ${id}, query: ${q}, kind: ${kind}, found: ${total_found}`);
};

export const searchQuick = (q) => {
  console.log(`[Mock SQLite] Quick search for: ${q}`);
  return []; // Пустой результат, т.к. это заглушка
};

export default {
  prepare: () => ({
    get: () => null,
    all: () => [],
    run: () => ({ lastInsertRowid: Math.floor(Math.random() * 1000000) })
  }),
  exec: () => {},
  pragma: () => {}
};