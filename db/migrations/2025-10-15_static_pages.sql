-- Static pages CMS for О нас, Доставка, Контакты
CREATE TABLE IF NOT EXISTS static_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meta_description TEXT,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Default pages
INSERT OR IGNORE INTO static_pages (slug, title, content, meta_description) VALUES
('about', 'О нас', '<h1>О нас</h1><p>Deep Components Aggregator — агрегатор электронных компонентов с живым поиском и кэш-слоем.</p><p>Мы объединяем данные от ведущих дистрибьюторов (DigiKey, Mouser, Farnell, TME) и предоставляем актуальные цены через OEMstrade.</p>', 'Deep Components Aggregator - агрегатор электронных компонентов'),
('delivery', 'Доставка', '<h1>Доставка</h1><p>Мы работаем с надежными партнерами для обеспечения быстрой доставки электронных компонентов.</p><p>Сроки доставки зависят от наличия товара на складе и региона доставки.</p>', 'Условия и сроки доставки электронных компонентов'),
('contacts', 'Контакты', '<h1>Контакты</h1><p>Email: zapros@prosnab.tech</p><p>Телефон: +7 (495) 123-45-67</p><p>Адрес: Россия, Москва</p>', 'Контактная информация Deep Components Aggregator');
