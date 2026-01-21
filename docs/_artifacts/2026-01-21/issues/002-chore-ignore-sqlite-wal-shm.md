# [Task] Chore: ignore SQLite WAL/SHM in var/db

## PLAN
- Добавить `var/db/*.sqlite-wal` и `var/db/*.sqlite-shm` в `.gitignore`.
- Убрать из git-tracking уже попавшие WAL/SHM файлы (`git rm --cached`).

## CHANGES
modified:
- .gitignore
deleted (from tracking):
- var/db/deepagg.sqlite-wal
- var/db/deepagg.sqlite-shm

## RUN
```bash
cd /opt/deep-agg
git status --porcelain
```

## VERIFY
- После запуска сервера WAL/SHM не появляются в `git status`.

## ARTIFACTS
- (не требуется)

## GIT
Branch: chore/ignore-sqlite-wal-shm
Commit:
- chore(git): ignore sqlite wal/shm in var/db
PR: to main
