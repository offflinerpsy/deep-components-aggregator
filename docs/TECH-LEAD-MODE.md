# Tech Lead Mode — Постоянный стандарт для проекта

**Статус**: 🟢 **ПОСТОЯННО АКТИВЕН**  
**Версия**: 1.1.0  
**Дата активации**: 8 октября 2025

---

## 🎯 Что такое Tech Lead Mode

**Tech Lead Mode** — это строгая методология работы над задачами, которая обеспечивает:
1. **Полную прослеживаемость** всех изменений
2. **Доказательную базу** для каждого решения (артефакты)
3. **Минимальные изменения** без переизобретений
4. **Качество кода** через guard clauses вместо try/catch
5. **Чистый git history** через Conventional Commits

---

## 📋 Структура выполнения любой задачи

### 1. **PLAN** (точный план шагов)
```markdown
- Шаг 1: Проверить существование файла X
- Шаг 2: Создать модуль Y с функцией Z
- Шаг 3: Добавить тесты для функции Z
- Шаг 4: Запустить npm test
- Шаг 5: Сохранить артефакты в docs/_artifacts/
```

**Требования**:
- Никаких догадок — только проверенные факты
- Пометка `ASSUMPTION:` если что-то неясно (с немедленной проверкой)
- Перед использованием файла — проверить через `read_file`/`list_dir`

---

### 2. **CHANGES** (список файлов)
```
created:   src/features/search/normalize.mjs
modified:  src/api/search.mjs
modified:  package.json
deleted:   src/legacy/old-search.js
```

**Требования**:
- Указывать тип изменения: `created`, `modified`, `deleted`
- Полные пути от корня репозитория
- Группировать по типу (сначала created, потом modified, потом deleted)

---

### 3. **RUN** (команды для выполнения)
```bash
npm test
node scripts/verify-search.mjs
curl http://localhost:9201/api/search?q=resistor
```

**Требования**:
- Команды должны быть копируемыми (ready-to-run)
- Указывать ожидаемый результат для проверки
- Использовать `--no-pager` для git/journalctl

---

### 4. **VERIFY** (критерии проверки)
```markdown
- Запустить: node scripts/audit-search.mjs
- Ожидаемый результат: 5/5 русских запросов возвращают результаты
- Артефакт: docs/_artifacts/2025-10-08/search-verification.json
- Критерий успеха: все тесты зелёные, артефакт сохранён
```

**Требования**:
- Конкретные критерии успеха (не "должно работать", а "5/5 запросов вернули > 0 результатов")
- Указывать путь к артефакту
- Включать команды для повторной проверки

---

### 5. **ARTIFACTS** (куда положены результаты)
```
docs/_artifacts/2025-10-08/
├── search-verification.json   (API response с 5 запросами)
├── test-results.txt           (npm test вывод)
└── screenshot-desktop.png     (UI проверка)
```

**Требования**:
- **ВСЕГДА** сохранять артефакты в `docs/_artifacts/<YYYY-MM-DD>/`
- JSON для API ответов
- .txt для логов/stdout
- .md для отчётов
- Группировать по дате и типу задачи (e2e, audit, fix)

---

### 6. **GIT** (ветка и коммиты)
```
Branch: feature/russian-search-normalization
Commits: 
  - feat(search): add Russian-to-English translation layer
  - test(search): verify 5 Russian queries work
  - docs(search): update API docs with normalization behavior
PR: #15 to main
```

**Требования**:
- **Conventional Commits** обязательно: `type(scope): description`
- Типы: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Одна задача = одна ветка
- Коммиты атомарны (можно cherry-pick)
- PR описание по шаблону `.github/PULL_REQUEST_TEMPLATE.md`

---

## 🚫 Запреты

### ❌ Обработка ошибок
```javascript
// ЗАПРЕЩЕНО: try/catch в новом коде
function parseData(input) {
  try {
    return JSON.parse(input);
  } catch (e) {
    return null; // Молчаливый fallback
  }
}

// ✅ ПРАВИЛЬНО: guard clause + явная обработка
function parseData(input) {
  if (!input || typeof input !== 'string') {
    return { error: 'invalid_input', data: null };
  }
  
  // JSON.parse может бросить исключение — обрабатываем явно
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch (err) {
    return { error: 'json_parse_failed', message: err.message, data: null };
  }
  
  return { error: null, data: parsed };
}
```

### ❌ Псевдоданные и догадки
```javascript
// ЗАПРЕЩЕНО: placeholder без проверки
const configPath = './config/app.json'; // А если файла нет?
const config = require(configPath);

// ✅ ПРАВИЛЬНО: проверка + fallback
import fs from 'node:fs';

const configPath = './config/app.json';
if (!fs.existsSync(configPath)) {
  console.error(`Config not found: ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
```

### ❌ Переизобретения
```javascript
// ЗАПРЕЩЕНО: создание нового endpoint если уже есть
app.get('/api/health-check', ...); // Уже есть /api/health!

// ✅ ПРАВИЛЬНО: проверить существование, использовать или расширить
// grep_search → найден /api/health → использовать его
```

---

## ✅ Обязательные паттерны

### 📝 Conventional Commits
```bash
# Feature
feat(search): add fuzzy matching for product names

# Bugfix
fix(api): validate MPN before database query

# Documentation
docs(e2e): add Mission Pack R1 smoke test report

# Tests
test(auth): verify OAuth callback with mock tokens

# Chores
chore(deps): update undici to 7.2.0
```

### 🏗️ Архитектура (12-Factor)
- **Config**: только через `.env` (не хардкодить)
- **Зависимости**: явно в `package.json` (не глобальные npm install)
- **Процессы**: stateless (не хранить сессии на диске)
- **Dev ≈ Prod**: одинаковые зависимости и поведение

### 🧪 Тестирование (Test Pyramid)
- **70-80% Unit**: `tests/unit/` (быстрые, изолированные)
- **15-20% Integration**: `tests/api/` (проверяют связки)
- **5-10% E2E**: `e2e/` (критичные потоки, Playwright)
- **После каждого теста**: артефакт в `docs/_artifacts/`

### 🔒 Безопасность (OWASP ASVS)
- **Auth check** в начале каждого protected endpoint (guard clause)
- **Валидация входа** через zod/AJV (не trust user input)
- **SQL prepared statements** (не конкатенация строк)
- **Логирование** всех auth failures и errors

---

## 🔄 Workflow пример (полный цикл)

### Задача: "Добавить русский поиск с нормализацией"

#### 1. PLAN
```
- Шаг 1: Проверить src/api/search.mjs (существует?)
- Шаг 2: Создать src/features/search/normalize.mjs (ru → en перевод)
- Шаг 3: Интегрировать в search.mjs (guard clause если query пустой)
- Шаг 4: Добавить тест tests/api/search.test.js (5 русских запросов)
- Шаг 5: Запустить npm test
- Шаг 6: Curl 5 русских запросов → сохранить в docs/_artifacts/
- Шаг 7: Коммит + push + PR
```

#### 2. CHANGES
```
created:   src/features/search/normalize.mjs
modified:  src/api/search.mjs
modified:  tests/api/search.test.js
modified:  docs/API.md
```

#### 3. RUN
```bash
npm test -- tests/api/search.test.js
node -e "import('./src/features/search/normalize.mjs').then(m => console.log(m.normalize('резистор')))"
curl 'http://localhost:9201/api/search?q=%D1%80%D0%B5%D0%B7%D0%B8%D1%81%D1%82%D0%BE%D1%80'
```

#### 4. VERIFY
```
- npm test: 12/12 тестов прошли (включая 5 русских)
- curl резистор → {"results": [...], "count": 47}
- Артефакт: docs/_artifacts/2025-10-08/search-ru-verification.json (5 запросов)
```

#### 5. ARTIFACTS
```
docs/_artifacts/2025-10-08/
├── search-ru-verification.json  (5 curl ответов)
├── npm-test-output.txt          (12/12 passed)
└── search-normalization-plan.md (этот документ)
```

#### 6. GIT
```bash
git checkout -b feature/russian-search-normalization
git add src/ tests/ docs/
git commit -m "feat(search): add Russian-to-English normalization

- Created normalize.mjs with translation map (резистор → resistor)
- Integrated into search.mjs with guard clause
- Added 5 Russian query tests (all passed)
- Saved verification artifacts

Refs: #42 (request for Russian search support)"

git push origin feature/russian-search-normalization
# → Create PR with .github/PULL_REQUEST_TEMPLATE.md
```

---

## 📚 Ссылки на стандарты

- **Conventional Commits**: https://www.conventionalcommits.org/
- **12-Factor App**: https://12factor.net/
- **Test Pyramid**: https://martinfowler.com/articles/practical-test-pyramid.html
- **OWASP ASVS**: https://github.com/OWASP/ASVS
- **SemVer**: https://semver.org/

---

## ✅ Чеклист соответствия Tech Lead Mode

Перед каждым коммитом:

- [ ] PLAN написан (конкретные шаги, без догадок)
- [ ] CHANGES задокументированы (created/modified/deleted)
- [ ] RUN команды выполнены (результаты проверены)
- [ ] VERIFY критерии выполнены (артефакты сохранены)
- [ ] ARTIFACTS в `docs/_artifacts/<date>/` (JSON/txt/md)
- [ ] GIT: Conventional Commit формат
- [ ] GIT: ветка с понятным именем (feat/*, fix/*, docs/*)
- [ ] Нет try/catch в новом коде (только guard clauses)
- [ ] Нет ASSUMPTION без проверки
- [ ] Секреты в .env (не в коде)
- [ ] EditorConfig соблюдён (LF, 2 spaces)

---

**Режим активирован**: 8 октября 2025  
**Применяется ко всем задачам проекта deep-agg**  
**Обновления**: `.github/copilot-instructions.md`, `docs/COPILOT_MEMORY.md`
