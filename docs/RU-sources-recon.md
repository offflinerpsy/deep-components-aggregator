# RU Sources Reconnaissance

Документация по интеграции российских источников контента для DEEP Components Aggregator.

## Архитектура RU-оркестратора

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Request   │ -> │   Orchestrator   │ -> │  Response JSON  │
│ /api/product    │    │                  │    │   (RU-canon)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              v
                    ┌─────────────────────┐
                    │ Parallel Execution  │
                    └─────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          v                   v                   v
    ┌──────────┐      ┌──────────────┐     ┌─────────────┐
    │ RU Content│      │  Commerce    │     │ Currency    │
    │ (5 sources)│      │ (OEMsTrade)  │     │ (ЦБ РФ)     │
    └──────────┘      └──────────────┘     └─────────────┘
          │
    ┌─────┼─────┐
    v     v     v
ChipDip Promelec Compel
Platan Electronshik
```

## Источники RU-контента

### 1. ChipDip (Приоритет 1)

**URL**: https://www.chipdip.ru  
**Статус**: ✅ Интегрирован  
**Специализация**: Электронные компоненты, модули, инструменты

**Селекторы**:
- Заголовок: `h1[itemprop="name"], h1.product-name`
- Описание: `div[itemprop="description"], .product-description`
- Техпараметры: `[itemprop="specification"], .specifications table`
- Датащиты: `a[href*="pdf"], a[href*="datasheet"]`
- Изображения: `img[itemprop="image"], .product-image img`

**Особенности**:
- Микроразметка Schema.org
- Качественные изображения продуктов
- PDF документация
- Детальные технические параметры

### 2. Promelec (Приоритет 2)

**URL**: https://www.promelec.ru  
**Статус**: ✅ Интегрирован  
**Специализация**: Промышленная электроника, автоматизация

**Селекторы**:
- Заголовок: `h1, .product-name`
- Описание: `#desc, .product-description`
- Техпараметры: `section:contains("Технические параметры") table`
- Датащиты: `a[href*=".pdf"], section:contains("Документация") a`

**Особенности**:
- Промышленные компоненты
- Техническая документация на русском языке
- Подробные спецификации

### 3. Compel (Приоритет 3)

**URL**: https://www.compel.ru  
**Статус**: ✅ Интегрирован  
**Специализация**: Компьютерная техника, электроника

**Селекторы**:
- Заголовок: `h1, .product-name`
- Описание: `.product-description, .description`
- Техпараметры: `.product-specs table, .characteristics table`
- Датащиты: `a[href*="item-pdf"], a[href*="pdf"]`

### 4. Platan (Приоритет 4)

**URL**: https://www.platan.ru  
**Статус**: ✅ Интегрирован  
**Специализация**: Электронные компоненты, радиодетали

**Селекторы**:
- Заголовок: `h1, .goods_name, #name`
- Описание: `.description, .goods_description`
- Техпараметры: `table:has(th), .tech table`
- Изображения: `.goods_image img, .product-image img`

**Особенности**:
- Старый дизайн сайта
- CGI-скрипты для поиска
- Базовая информация о компонентах

### 5. Electronshik (Приоритет 5)

**URL**: https://www.electronshik.ru  
**Статус**: ✅ Интегрирован  
**Специализация**: Радиоэлектронные компоненты

**Селекторы**:
- Заголовок: `h1, .product-name`
- Описание: `.product-description, .description`
- Техпараметры: `h2:contains("Технические параметры") + *`
- Датащиты: `a[href*=".pdf"], .docs a`

## Алгоритм мержа данных

Данные объединяются по приоритету источников:

1. **ChipDip** (наивысший приоритет) - основной источник изображений и описаний
2. **Promelec** - промышленные спецификации и документация  
3. **Compel** - дополнительные технические параметры
4. **Platan** - базовая информация о корпусах и упаковке
5. **Electronshik** - резервный источник

### Правила мержа:

- **Текстовые поля**: берется первое непустое значение по приоритету
- **Изображения**: объединяются уникальные URL из всех источников
- **Датащиты**: объединяются все PDF ссылки
- **Техпараметры**: мерж с приоритетом (не перезаписываем существующие)

## Производительность

### Параллельное выполнение

Все 5 источников запрашиваются параллельно:
```javascript
const promises = RU_ADAPTERS.map(adapter => adapter.parser(mpn));
const results = await Promise.all(promises);
```

### Типичное время ответа:
- **ChipDip**: 800-1500мс
- **Promelec**: 600-1200мс  
- **Compel**: 700-1400мс
- **Platan**: 1000-2000мс (медленный)
- **Electronshik**: 900-1600мс

**Общее время оркестрации**: 1.5-3 секунды (лимит самого медленного)

### Троттлинг

- Минимальная задержка между запросами: 600мс
- Случайный джиттер: 600-1200мс
- Уважение к robots.txt (планируется)

## Отладка и мониторинг

### HTML Sources

Все исходные HTML сохраняются в `reports/sources/`:
```
reports/sources/
├── chipdip/
│   ├── LM317T.html
│   └── 1N4148W-TP.html
├── promelec/
├── compel/
├── platan/
└── electronshik/
```

### Структурированные логи

```json
{
  "ts": "2025-09-25T14:30:00.000Z",
  "level": "info",
  "msg": "RU content orchestration completed",
  "mpn": "LM317T",
  "duration": 1847,
  "sources_found": 3,
  "has_images": true,
  "has_datasheets": true,
  "has_specs": true
}
```

### Метрики оркестрации

В ответе API содержится секция `orchestration`:
```json
{
  "orchestration": {
    "duration": 1847,
    "ru_content": {
      "ok": true,
      "duration": 1245,
      "sources_count": 3
    },
    "commerce": {
      "ok": true,
      "duration": 892
    },
    "pricing": {
      "conversion_ok": true,
      "rates_cached": true
    }
  }
}
```

## Fallback стратегия

1. **Нет RU-контента**: Используется только коммерческая информация из OEMsTrade
2. **Нет коммерции**: Используется только RU-контент без цен
3. **Полный фейл**: Возвращается 404 с детальной информацией об ошибках

## Расширение источников

Для добавления нового источника:

1. Создать адаптер в `src/adapters/ru/newsource.js`
2. Добавить конфиг в `src/config/parsers.config.js`
3. Зарегистрировать в `src/services/orchestrator.js`
4. Добавить E2E тесты

### Шаблон адаптера:

```javascript
export const parseNewSource = async (mpn) => {
  const searchResult = await searchProduct(mpn);
  if (!searchResult.ok) return searchResult;
  
  const extractResult = await extractProductData(searchResult.productUrl, mpn);
  if (!extractResult.ok) return extractResult;
  
  return {
    ok: true,
    source: 'newsource',
    priority: 6, // Новый приоритет
    data: extractResult.data
  };
};
```

---

*Последнее обновление: 25 сентября 2025*  
*Версия оркестратора: 0.1.0*
