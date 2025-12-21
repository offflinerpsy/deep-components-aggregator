# 🚀 ЛОКАЛЬНАЯ РАЗРАБОТКА: Клонирование и запуск проекта

**Дата**: 18 октября 2025  
**Ветка**: `feat/dynamic-specs-upload`  
**Коммит**: `f7fb58f` (включает план автодополнения)

---

## ✅ ГОТОВО В РЕПОЗИТОРИИ

- ✅ План автодополнения сохранён в `docs/_artifacts/2025-10-17-autocomplete/PLAN.md`
- ✅ Анализ решения в `docs/_artifacts/2025-10-17-autocomplete/ANALYSIS.md`
- ✅ Решение проблемы VS Code в `docs/_artifacts/2025-10-17-vscode-settings/SUCCESS.md`
- ✅ Всё закоммичено и запушено в GitHub

---

## 📥 КЛОНИРОВАНИЕ НА WINDOWS

### Шаг 1: Клонируй репозиторий

```bash
# PowerShell / Git Bash / Terminal
cd ~
git clone https://github.com/offflinerpsy/deep-components-aggregator.git deep-agg
cd deep-agg
```

### Шаг 2: Переключись на рабочую ветку

```bash
git checkout feat/dynamic-specs-upload
```

**Проверка**:
```bash
git branch
# Должно быть: * feat/dynamic-specs-upload

git log --oneline -1
# Должно показать: f7fb58f docs: add autocomplete implementation plan...
```

---

## 🛠️ УСТАНОВКА ЗАВИСИМОСТЕЙ

### Проверь Node.js

```bash
node -v   # Должно быть >= 18.0.0
npm -v
```

**Если нет Node.js** → скачай: https://nodejs.org/ (LTS версия)

### Установи зависимости

```bash
# Корневые (backend)
npm install

# Frontend (Next.js)
cd v0-components-aggregator-page
npm install
cd ..
```

---

## ⚙️ НАСТРОЙКА ОКРУЖЕНИЯ

### Создай [`.env`](.env ) файл

```bash
# В корне проекта
notepad .env
```

**Минимальная конфигурация**:
```env
# Backend port
PORT=9201

# База данных (создастся автоматически)
DB_PATH=./var/db/deepagg.sqlite

# Прокси (опционально, если нужен обход гео-блокировок)
# HTTP_PROXY=http://127.0.0.1:40000
# NO_PROXY=127.0.0.1,localhost

# API ключи (опционально, для live поиска)
# DIGIKEY_CLIENT_ID=your_id
# DIGIKEY_CLIENT_SECRET=your_secret
# MOUSER_API_KEY=your_key
```

**Примечание**: Для работы **автодополнения** API ключи **НЕ нужны** — используется локальный кэш SQLite.

---

## 🗄️ ИНИЦИАЛИЗАЦИЯ БД

```bash
# Создаст структуру SQLite (если нет)
node scripts/init-db.mjs
```

Или если уже есть БД с сервера — скопируй:
```bash
# Скачай с сервера (SCP/SFTP)
scp root@amsterdam-mailcow:/opt/deep-agg/var/db/deepagg.sqlite ./var/db/

# Или используй Git LFS (если настроен)
git lfs pull
```

---

## 🚀 ЗАПУСК ПРОЕКТА

### Вариант 1: Два терминала

**Терминал 1 — Backend (Express)**:
```bash
npm run dev
# Или: node server.js
```

Запустится на **http://localhost:9201**

**Терминал 2 — Frontend (Next.js)**:
```bash
cd v0-components-aggregator-page
npm run dev
```

Запустится на **http://localhost:3000**

---

### Вариант 2: VS Code встроенные терминалы

1. Открой проект в VS Code: `code .`
2. Открой терминал: `` Ctrl+` ``
3. Раздели на 2 панели: `Ctrl+Shift+5`
4. В первой: `npm run dev` (backend)
5. Во второй: `cd v0-components-aggregator-page && npm run dev` (frontend)

---

## ✅ ПРОВЕРКА

### Backend

```bash
# Health check
curl http://localhost:9201/api/health
# Ожидается: {"status":"ok","version":"3.2",...}

# Autocomplete (после реализации)
curl "http://localhost:9201/api/autocomplete?q=LM31"
```

### Frontend

Открой в браузере: **http://localhost:3000**

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

После запуска проекта локально можем приступить к реализации автодополнения:

1. Создать `/src/api/autocomplete.mjs` (backend endpoint)
2. Создать `/v0-components-aggregator-page/hooks/useDebounce.ts` (React hook)
3. Создать `/v0-components-aggregator-page/components/AutocompleteSearch.tsx` (UI компонент)
4. Интегрировать в `/v0-components-aggregator-page/app/page.tsx`
5. Написать тесты в `/tests/autocomplete.spec.mjs`

**Детальный план**: `docs/_artifacts/2025-10-17-autocomplete/PLAN.md`

---

## 🐛 TROUBLESHOOTING

### Ошибка "Cannot find module"
```bash
# Переустанови зависимости
rm -rf node_modules package-lock.json
npm install
```

### Порты заняты
```bash
# Измени порты в .env:
PORT=9202  # Backend
# И в next.config.mjs rewrites → destination: 'http://127.0.0.1:9202'

# Frontend запусти на другом порту:
npm run dev -- -p 3001
```

### БД не создаётся
```bash
# Создай структуру вручную
mkdir -p var/db
node scripts/init-db.mjs
```

### VS Code автоапрув не работает
**Решено!** Локально автоапрув работает без проблем (в отличие от Remote SSH).

---

## 📚 ПОЛЕЗНЫЕ КОМАНДЫ

```bash
# Обновить из remote
git pull origin feat/dynamic-specs-upload

# Посмотреть изменения
git status

# Создать новую ветку для автодополнения
git checkout -b feat/autocomplete-search

# Вернуться назад
git checkout feat/dynamic-specs-upload
```

---

## 🎉 ВСЁ ГОТОВО!

Теперь у тебя:
- ✅ Полная копия проекта локально
- ✅ Backend и Frontend запускаются
- ✅ План автодополнения сохранён
- ✅ VS Code автоапрув работает (локально)
- ✅ GitHub Copilot использует твою оплаченную подписку

**Готов начинать разработку!** 🚀

---

**Репозиторий**: https://github.com/offflinerpsy/deep-components-aggregator  
**Ветка**: `feat/dynamic-specs-upload`  
**Коммит**: `f7fb58f`
