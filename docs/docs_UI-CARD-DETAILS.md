
# Карточка товара 2.0 — ТЗ для исполнителя (не менять стиль, только компоновку)

Это задание выполняется **без замены визуального стиля**: цвета, радиусы, тени, размерность шрифтов и общая эстетика остаются прежними. Меняем **только** компоновку, правила верстки и микроповедение. Все классы и переменные ниже — добавочные; существующие стили не трогаем, кроме явных правок в этом документе.

---

## 0. Ссылки на нормы (читать, если сомневаешься)
- CSS Grid: MDN «CSS grid layout» — https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout
- `position: sticky` и ограничения (не должен быть внутри контейнера с overflow): MDN «position» — https://developer.mozilla.org/en-US/docs/Web/CSS/position ; заметка по багам sticky в overflow: https://stackoverflow.com/questions/45530235/the-property-position-sticky-is-not-working/63780286
- Семантика `<dl>/<dt>/<dd>` для пар «ключ–значение»: MDN — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dl и https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dt
- Разрывы длинных слов/MPN: MDN `overflow-wrap` — https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-wrap и `hyphens` — https://developer.mozilla.org/en-US/docs/Web/CSS/hyphens
- UX: заголовки, sticky‑элементы и карточки товара: NN/g — https://www.nngroup.com/articles/ecommerce-product-pages/ и «Sticky headers» — https://www.nngroup.com/articles/sticky-headers/
- Галерея: достаточный зум/качество изображений (Baymard) — https://baymard.com/blog/ensure-sufficient-image-resolution-and-zoom

---

## 1. Новая сетка страницы (desktop ≥1280px)
Переводим корневой контейнер карточки в **трёхколоночный Grid**.

### 1.1. Семантические блоки (обёртки)
Добавь/убедиcь, что есть следующие обёртки:
```html
<div class="product-card">
  <aside class="product-gallery">…</aside>
  <main class="product-main">…</main>
  <aside class="product-aside">…</aside>
</div>
```
- `.product-gallery` — галерея изображений (левая колонка).
- `.product-main` — название и технические характеристики (центр).
- `.product-aside` — цена/наличие/производитель/документация/CTA (правая колонка, sticky).

### 1.2. Правила Grid (подключи styles/card-detail.css)
- Desktop: колонки ≈ `2fr 6fr 4fr` (см. CSS).
- Tablet 1024–1279px: две колонки (галерея слева, aside справа; характеристики под галереей).
- Mobile ≤768px: одна колонка; снизу «плавающая» панель с ценой и CTA.

### 1.3. Sticky
- `.product-aside { position: sticky; top: var(--sticky-top); }`
- **Важно:** ни один предок sticky‑блока **не** должен иметь `overflow: hidden|auto|scroll` (иначе липкость сломается). См. MDN и разбор: ссылки выше.

---

## 2. Галерея (компактная + zoom в оверлее)
- Основной кадр ограничить ~360–420px шириной, соотношение 1:1 по умолчанию.
- Лента превью — 48–64px.
- Клик по основному кадру — полноэкранный overlay с zoom/pan (без изменения лэйаута).
- Если одно фото — показываем заглушку фиксированной высоты (чтобы не прыгал CLS).

---

## 3. Правый сайдбар (sticky): цена/наличие/CTA/документация
- Порядок блоков:
  1) Цена и наличие (кратко) + кнопка «Заказать».
  2) Краткие прайс‑брейки (до 5 строк) + «Моё количество» (см. п.4).
  3) Производитель (бренд, артикул производителя).
  4) Документация — список ссылок с иконкой.
- Mobile: вместо sticky — узкая нижняя панель с ценой/CTA.

---

## 4. Прайс‑брейки — компакт + фильтр
- В сайдбаре показываем **до 5 строк**.
- Добавляем поле «Ваше количество» + быстрые чипы `1 / 10 / 100 / 1k / 10k`.
- По вводу подсвечиваем соответствующий брейк и показываем «цена за ед.».
- «Показать все цены» открывает модал с **Grid‑таблицей** (sticky‑заголовок).

---

## 5. Характеристики — DL + Grid
- Заменяем текущую таблицу на семантический список:
```html
<section class="specs">
  <h2>Технические характеристики</h2>
  <dl class="specs-dl">
    <dt>Package / Case</dt><dd>0603 (1608 Metric)</dd>
    <dt>Tolerance</dt><dd>±1%</dd>
    …
  </dl>
</section>
```
- Сетка: `grid-template-columns: 220px 1fr; row-gap: 8px;`
- Для длинных значений включить переносы: `overflow-wrap: anywhere; hyphens: auto;`
- Группировка: «Основные» (6–8 строк сверху), «Электрические», «Корпус/пакет», «Другое».
- Кнопка «Показать ещё» разворачивает скрытую часть.

---

## 6. Типографика и переносы
- Для H1/MPN: `overflow-wrap: anywhere; word-break: break-word;`
- Межстрочный 1.4–1.5; вертикальные отступы между строками характеристик — 8px.
- Проверить хлебные крошки: sticky‑отступ `top` учитывает высоту хедера.

---

## 7. Унификация без фреймворка: токены и небольшие утилиты
- Подключить `styles/tokens.css` (CSS custom properties — цвета/радиусы/тени/отступы/шрифты).
- Создать пару малых утилит в `styles/card-detail.css` (типа `.text-muted`, `.shadow-soft`, `.gap-8`, и т.п.) — **только те, что реально используем здесь**.
- Сделать страницу `/ui-kit` (локальная), чтобы визуально проверить токены/компоненты.

---

## 8. Шрифты
- Использовать один набор гарнитуры и веса (например, 400/600).
- В `@font-face` включить `font-display: swap` (см. web.dev и MDN):
  - web.dev «Best practices for fonts» — https://web.dev/articles/font-best-practices
  - MDN `font-display` — https://developer.mozilla.org/en-US/docs/Web/CSS/%40font-face/font-display
- Форматы: WOFF2, при необходимости сабсет кириллицы.

---

## 9. Acceptance Criteria (проверяем руками)
1) Сайдбар «липкий», не ломается из‑за `overflow` у предков; правильно учитывает высоту хедера (MDN про sticky).  
2) Галерея компактна; overlay‑zoom работает; CLS ≤ 0.02.  
3) Характеристики в DL‑Grid: при 5 и при 25 строках читаемо; длинные значения не ломают сетку (см. MDN overflow‑wrap/hyphens).  
4) Прайс‑брейки: в сайдбаре до 5 строк, подсветка по полю «Ваше количество»; модал «Все цены» с Grid‑таблицей и sticky‑заголовком.  
5) Документация находится в сайдбаре; ссылки кликабельны.  
6) Типографика едина, шрифты загружаются с `font-display: swap`; нет «рваных» переносов.  
7) Mobile: одна колонка; снизу узкая панель цены/CTA; всё кликабельно, не перекрывает контент.  
8) Никаких изменений брендинга/цветов/теней/радиусов: визуальный стиль сохранён.

---

## 10. Что положить в PR
- `styles/tokens.css` и `styles/card-detail.css` (строки и комментарии из шаблона не удалять).  
- HTML‑обёртки/классы (`product-card`, `product-gallery`, `product-main`, `product-aside`, `specs-dl`).  
- Скриншоты **до/после** (desktop/tablet/mobile).  
- Короткое видео прокрутки со sticky‑сайдбаром и модалом «Все цены».  
- Ссылка на этот документ в описании PR.

