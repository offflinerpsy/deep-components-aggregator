# Workspace Instructions — No-Nonsense Engineering

## 🎯 РЕЖИМ РАБОТЫ: Tech Lead Mode (ПОСТОЯННО)

**Все задачи выполняются в Tech Lead режиме**:
1. **PLAN** → точные шаги (без догадок)
2. **CHANGES** → список файлов (created/modified/deleted)
3. **RUN** → команды для выполнения
4. **VERIFY** → критерии проверки + артефакты
5. **ARTIFACTS** → сохранение доказательств в `docs/_artifacts/<date>/`
6. **GIT** → conventional commit + PR описание

**Запрещено**: переизобретения, placeholder-данные, try/catch в новом коде, работа без артефактов.

---

## Источники истины

1. **Текущий репозиторий и ветка**  
   Запрещено ссылаться на несуществующие файлы/пути. Перед использованием — проверить существование через `read_file`, `list_dir` или `file_search`.

2. **Официальные стандарты и документация**  
   Любая догадка помечается как `ASSUMPTION:` с немедленной проверкой в коде/репозитории.

---

## Запреты

### ❌ Обработка ошибок
- **Запрещено** использовать `try/except` (Python) или `try/catch` (JavaScript) в новом коде
- **Запрещены** «пустые» catch-блоки и «молчаливые» fallback
- **Используем**: явные guard-clauses, валидацию на входе, чистые возвраты (Result/Either паттерны)

### ❌ Псевдоданные и догадки
- **Запрещено** генерировать примерные пути к файлам
- **Запрещено** использовать placeholder-данные без явного комментария
- Если файла нет — создать явно и зафиксировать в git

---

## Обязательные паттерны и стандарты

### 📝 Коммиты и версионирование
- **Conventional Commits**: `type(scope): description`
  - Типы: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
  - Примеры: `feat(search): add Russian normalization`, `fix(api): validate product MPN`
- **SemVer 2.0.0**: `MAJOR.MINOR.PATCH`
  - MAJOR: breaking changes
  - MINOR: новый функционал (обратно совместимый)
  - PATCH: багфиксы

### 🏗️ Архитектура (12-Factor)
- **Конфигурация**: только через переменные окружения (`.env`, не в коде)
- **Процессы**: stateless, без сессий на диске
- **Зависимости**: явно объявлены (package.json, requirements.txt)
- **Dev ≈ Prod**: одинаковые зависимости и поведение

### 📚 Документация
- **API**: OpenAPI Specification (OAS 3.x) для всех HTTP endpoints
- **Архитектурные решения**: Architecture Decision Records (ADR) в `docs/adr/`
- **Формат ADR**: `NNNN-title.md` (0001-template.md как шаблон)

### 🧪 Тестирование (Test Pyramid)
- **Unit тесты**: много, быстрые, изолированные (70-80%)
- **Integration тесты**: умеренно, проверяют связки (15-20%)
- **E2E/UI тесты**: мало, точечно, критичные потоки (5-10%)
- **После каждого изменения**: артефакт в `docs/_artifacts/<date>/` (JSON, скриншот, лог)

### 🔒 Безопасность
- **Baseline**: OWASP ASVS 5.0 (Application Security Verification Standard)
- **Чек-лист**: OWASP Top-10 при code review
- **Секреты**: только через env-переменные или секрет-хранилища
- **Минимальная верификация** для новых endpoints:
  - Аутентификация и идентификация
  - Авторизация (RBAC/ABAC)
  - Защита от инъекций (SQL, XSS, command injection)
  - Логирование действий и ошибок

### 🎨 Форматирование
- **EditorConfig**: `.editorconfig` для всех редакторов
- **VS Code**: `.vscode/settings.json` с автоформатированием
- **Окончания строк**: LF (`\n`), не CRLF
- **Отступы**: 2 пробела (общий стандарт для JS/TS/JSON/YAML)
- **Format on save**: обязательно включено

---

## Формат ответа агента на любую задачу

Каждая задача должна следовать структуре:

### 1. **PLAN** (точные шаги)
```
- Шаг 1: Создать файл X по пути Y
- Шаг 2: Обновить конфигурацию Z
- Шаг 3: Запустить тесты
```

### 2. **CHANGES** (список файлов)
```
created:   src/features/search/normalize.mjs
modified:  src/api/search.mjs
modified:  package.json
```

### 3. **RUN** (команды для выполнения)
```bash
npm test
node scripts/verify-search.mjs
```

### 4. **VERIFY** (что и как проверить)
```
- Запустить: node scripts/audit-search.mjs
- Ожидаемый результат: 5/5 русских запросов возвращают результаты
- Артефакт: docs/_artifacts/2025-10-05/search-verification.json
```

### 5. **ARTIFACTS** (куда положены результаты)
```
docs/_artifacts/2025-10-05/
├── search-verification.json
├── test-results.txt
└── screenshot-desktop.png
```

### 6. **GIT** (ветка и PR)
```
Branch: feature/russian-search-normalization
Commits: 
  - feat(search): add Russian-to-English translation layer
  - test(search): verify 5 Russian queries work
PR: #15 to main
```

---

## Примеры использования

### ✅ Правильно:
```javascript
// Guard clause вместо try/catch
function parseProduct(data) {
  if (!data || typeof data !== 'object') {
    return { error: 'Invalid data format', data: null };
  }
  if (!data.mpn) {
    return { error: 'Missing MPN', data: null };
  }
  
  return { 
    error: null, 
    data: { mpn: data.mpn, title: data.title || 'N/A' } 
  };
}
```

### ❌ Неправильно:
```javascript
// try/catch запрещён!
function parseProduct(data) {
  try {
    return { mpn: data.mpn, title: data.title };
  } catch (e) {
    return null; // Молчаливый fallback
  }
}
```

---

## Ссылки на стандарты

- **Conventional Commits**: https://www.conventionalcommits.org/
- **Semantic Versioning**: https://semver.org/
- **12-Factor App**: https://12factor.net/
- **OpenAPI Specification**: https://spec.openapis.org/oas/latest.html
- **Test Pyramid**: https://martinfowler.com/articles/practical-test-pyramid.html
- **OWASP ASVS**: https://github.com/OWASP/ASVS
- **OWASP Top-10**: https://owasp.org/www-project-top-ten/
- **EditorConfig**: https://editorconfig.org/

---

## Проверка соответствия

Перед коммитом проверь:
- [ ] Все файлы существуют (не ASSUMPTION)
- [ ] Нет try/catch в новом коде
- [ ] Коммит следует Conventional Commits
- [ ] Конфигурация вынесена в env
- [ ] Тесты написаны и прошли
- [ ] Артефакты сохранены в docs/_artifacts/
- [ ] Секреты не захардкожены
- [ ] EditorConfig соблюдён (LF, 2 spaces)

---

## Режим работы агента

**Tech Lead Mode — ПОСТОЯННО АКТИВЕН**:
- Каждая задача документируется по структуре: PLAN → CHANGES → RUN → VERIFY → ARTIFACTS → GIT
- Никаких догадок — только проверенные факты из репозитория
- Артефакты (JSON/logs/screenshots) сохраняются в `docs/_artifacts/<date>/` **ВСЕГДА**
- Conventional Commits обязательны для всех коммитов
- PR описание генерируется по шаблону `.github/PULL_REQUEST_TEMPLATE.md`

**Ссылка на полный workflow**: `.github/prompts/techlead.prompt.md`

---

**Последнее обновление**: 8 октября 2025  
**Версия**: 1.1.0 (добавлен Tech Lead mode как постоянный стандарт)
