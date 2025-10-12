# Repository Inventory — October 12, 2025

## Найдено репозиториев на сервере

### 1. `/opt/deep-agg/` ✅ АКТИВНЫЙ (Production)
- **Статус**: PRIMARY REPOSITORY
- **Описание**: Основной рабочий репозиторий проекта
- **Сервисы**: PM2 (deep-agg, deep-v0)
- **Действие**: ОСТАВИТЬ

### 2. `/opt/deep-agg/v0-components-aggregator-page/` ✅ АКТИВНЫЙ (Production)
- **Статус**: FRONTEND SUBPROJECT
- **Описание**: Next.js фронтенд (работает на :3000)
- **Последний коммит**: 32007bf (2025-10-12) "feat(ui): visual refactor"
- **Действие**: ОСТАВИТЬ

### 3. `/opt/deep-agg/v0-components-aggregator-page/v0-fresh-clone/` ⚠️ CLONE
- **Статус**: BACKUP CLONE
- **Описание**: Полный клон фронтенда (дубликат)
- **Размер**: ~200 MB с node_modules
- **Действие**: УДАЛИТЬ (после бекапа)

### 4. `/opt/deep-agg/temp/v0-components-aggregator-page/` ⚠️ TEMP
- **Статус**: TEMPORARY DIRECTORY
- **Описание**: Временная копия фронтенда
- **Действие**: УДАЛИТЬ (после бекапа)

### 5. `/opt/deep-agg/v0-analysis-artifacts/` ⚠️ SUBMODULE
- **Статус**: SUBMODULE (возможно устаревший)
- **Описание**: Артефакты анализа v0
- **Действие**: ПРОВЕРИТЬ содержимое, затем удалить или интегрировать в docs/

### 6. `/opt/deep-agg-next/` ❌ OBSOLETE
- **Статус**: OLD VERSION
- **Описание**: Старая версия проекта
- **Действие**: УДАЛИТЬ (после бекапа)

### 7. `/opt/deep-agg--new/` ❌ OBSOLETE
- **Статус**: EXPERIMENTAL VERSION
- **Описание**: Экспериментальная версия
- **Действие**: УДАЛИТЬ (после бекапа)

### 8. `/opt/deep-agg-main/` ❌ OBSOLETE
- **Статус**: OLD MAIN BRANCH
- **Описание**: Старая основная ветка
- **Действие**: УДАЛИТЬ (после бекапа)

## Plan

### Оставить (Active):
1. `/opt/deep-agg/` (main repo)
2. `/opt/deep-agg/v0-components-aggregator-page/` (frontend)

### Удалить (после backup):
1. `/opt/deep-agg/v0-components-aggregator-page/v0-fresh-clone/`
2. `/opt/deep-agg/temp/v0-components-aggregator-page/`
3. `/opt/deep-agg/v0-analysis-artifacts/` (если не нужен)
4. `/opt/deep-agg-next/`
5. `/opt/deep-agg--new/`
6. `/opt/deep-agg-main/`

### Backup location:
`/opt/deep-agg/backups/2025-10-12-cleanup/`

## Next Steps
1. Создать backups всех obsolete репозиториев
2. Верифицировать архивы (tar.gz)
3. Удалить obsolete директории
4. Обновить PM2 конфиги (если нужно)
5. Финальный отчет
