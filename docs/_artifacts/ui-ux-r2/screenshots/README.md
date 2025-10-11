# UI/UX R2 — Screenshots

Скриншоты генерируются скриптом `v0-components-aggregator-page/scripts/snapshots.mjs` в эту папку.

- Источник: фронтенд на адресу `FRONT_BASE` (по умолчанию http://127.0.0.1:3000)
- Роуты: `/`, `/results?q=LM317T`, `/product/LM317T`
- Брейкпоинты: desktop, tablet, mobile
- Формат: `${route}-${breakpoint}.png`

Команды для запуска (пример):

```bash
node v0-components-aggregator-page/scripts/snapshots.mjs
```
