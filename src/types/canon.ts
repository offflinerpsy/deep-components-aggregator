// canon.ts - типы канонов для выдачи и карточки товара
export type Region = 'RU' | 'EU' | 'US' | 'ASIA' | 'GLOBAL';
export type Currency = 'RUB' | 'USD' | 'EUR' | 'GBP' | 'PLN';
export type Source =
  | 'chipdip'
  | 'promelec'
  | 'compel'
  | 'electronshik'
  | 'elitan'
  | 'oemstrade'
  | 'mouser'
  | 'digikey'
  | 'tme'
  | 'farnell';

export interface PriceBreak {
  qty: number;
  price: number;
  currency: Currency;
  price_rub: number | null;
}

// Канон строки выдачи
export interface SearchRow {
  mpn: string;                          // нормализованный MPN
  title: string;                        // краткий заголовок (RU приоритет)
  manufacturer: string;                 // производитель
  description_short: string;            // 0..200 символов
  package: string;                      // корпус (TO-220, SOD-123…)
  packaging: string;                    // Tube/Reel/Tape/Cut/Tray/—
  regions: Region[];                    // из источника
  stock: number | null;                 // ≥0 или null (не знаем)
  min_price: number | null;             // исходная цена в валюте источника
  min_price_rub: number | null;         // сконвертированная ₽
  min_currency: Currency | null;        // валюта источника
  image_url: string | null;             // абсолютная
  product_url: string;                  // ссылка на карточку источника
  source: Source;                       // источник данных
  price_breaks?: PriceBreak[];          // список прайс-брейков
}

// Типы для карточки
export interface DocLink {
  label: string;
  url: string;
}

export interface SpecKV {
  name: string;
  value: string;
}

// Канон карточки товара
export interface ProductCanon {
  mpn: string;
  title: string;
  manufacturer: string;
  gallery: { image_url: string }[];      // ≥1, абсолютные URL
  meta: {
    package: string;
    packaging: string;
  };
  order: {
    regions: Region[];
    stock: number | null;
    min_price_rub: number | null;
    min_currency: Currency | null;
  };
  description_html: string;              // очищенный безопасный HTML
  docs: DocLink[];                       // PDF/датышиты
  specs: SpecKV[];                       // таблица ТТХ
  sources: Array<{
    source: Source;
    product_url: string;
  }>;
}

// Статусы для частичных данных
export type ParseStatus = 'OK' | 'PARTIAL' | 'EMPTY' | 'ERROR';

export interface ParseResult<T> {
  status: ParseStatus;
  data?: T;
  error?: string;
}
