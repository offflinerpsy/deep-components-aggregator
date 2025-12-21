# UI/UX R3 — Proof Notes (Part 1)

Это первая порция правок для R3 (без изменения сетки):

- Results (search-enhanced):
  - Ссылка на PDP ведёт на /ui/product-v2.html с передачей mpn.
  - Описание в таблице зажато в 2 строки (desc-clamp), без ломки лейаута.
  - Улучшена ленивная загрузка изображений (IntersectionObserver + data-src; селектор фиксирован на все узлы).
  - RU→EN бейдж отображается при hasCyrillic=true (span#ruen-badge в шапке результатов).
- PDP (product-v2):
  - Изображения проксируются через /api/image.
  - Datasheet ссылки уходят через /api/pdf?url=…&dl=1 (на бэке Content-Disposition=attachment при dl=1).

Проверка (ручная):
- Зайти на /ui/search-enhanced.html?q=LM317T → проверить бейдж RU→EN (для русских запросов), обрезку описания и клик на «Купить» → переход на product-v2.
- На product-v2 проверить загрузку картинок (через /api/image) и скачивание PDF (заголовок Content-Disposition=attachment при dl=1).

Следующие артефакты будут приложены после автосъёмки:
- screenshots (desktop/tablet/mobile) для search/results/pdp
- http-headers дамп для /api/pdf (inline vs attachment)

Дата: автоматически генерируется при сборе полного R3-пакета.
