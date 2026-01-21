# [Task] GitHub Issues automation (setup)

Сейчас автоматическое создание issue через GH CLI не работает, пока не обновить авторизацию.

## PLAN
- Перелогиниться в `gh` (интерактивно, без вставки токенов в команды/файлы).
- Запустить скрипт, который создаст issues из файлов в `docs/_artifacts/2026-01-21/issues/*`.

## RUN
```bash
gh auth login -h github.com

./scripts/gh-create-issues.sh
```

## VERIFY
- Issues появились в репозитории `offflinerpsy/deep-components-aggregator` и содержат PLAN/VERIFY.

## GIT
- Не требуется.
