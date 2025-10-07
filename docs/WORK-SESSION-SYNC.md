# Work Session Sync — Cross-Device Context

**Последнее обновление:** October 7, 2025  
**Активные устройства:** MacBook, Amsterdam VPS

---

## 📍 Current Focus

**Проект:** Deep Components Aggregator  
**Задача:** SRX-02 Production Fixes (8 tasks)  
**Статус:** 6/8 complete ✅

---

## 🖥️ MacBook Session

### Дата/Время: [укажи когда начал]

**Что делал:**
- [Опиши что сделал на MacBook]
- [Какие файлы менял]
- [Какие проблемы нашёл]

**Изменённые файлы:**
- `путь/к/файлу.js` - [что поменял]

**Проблемы:**
- [Опиши проблему 1]
- [Опиши проблему 2]

**Next steps:**
- [ ] [Что нужно сделать дальше]

**Команды для воспроизведения:**
```bash
# Команды которые запускал
```

---

## 🌍 Amsterdam VPS Session

### Дата/Время: October 6, 2025 → October 7, 2025

**Что сделано:**
- ✅ SystemD auto-restart
- ✅ DigiKey pricing normalization FIX
- ✅ CBR RF currency integration
- ✅ Prometheus /metrics endpoint
- ✅ Enhanced /health endpoint
- ✅ UI source badges (DK/MO/TME/FN)
- ✅ WARP proxy setup
- ✅ MacBook SSH setup scripts

**Изменённые файлы:**
- `adapters/digikey.js` - ProductVariations[0].StandardPricing fix
- `lib/currency.js` - CBR RF integration
- `server.js` - /metrics, /health endpoints
- `public/js/results.js` - source badges
- `scripts/setup-macbook.sh` - one-command setup
- `scripts/add-amsterdam-to-vscode.sh` - SSH config helper

**Текущее состояние:**
- Сервер работает на http://5.129.228.88:9201
- SystemD: deep-agg.service enabled
- Git: main branch, все коммиты запушены

**Pending tasks:**
- [ ] /health - provider checks (тест-запросы к каждому API)
- [ ] UI - заменить '...' на '—'

---

## 🔄 Sync Instructions

### Перед началом работы (на любом устройстве):

```bash
cd ~/Projects/deep-agg  # MacBook
# или
cd /opt/deep-agg        # Amsterdam

git pull
cat docs/WORK-SESSION-SYNC.md
# Прочитай последние обновления
```

### После работы (обновить контекст):

```bash
# 1. Отредактируй этот файл (добавь что сделал)
nano docs/WORK-SESSION-SYNC.md

# 2. Закоммить
git add docs/WORK-SESSION-SYNC.md
git commit -m "docs: update work session - [краткое описание]"

# 3. Запушить
git push
```

### При переключении устройств:

```bash
# На новом устройстве
git pull
cat docs/WORK-SESSION-SYNC.md
# Продолжи работу с контекстом
```

---

## 📋 Quick Reference

### Активные порты:
- **9201** - Deep Aggregator API
- **25345** - WARP proxy (socks5)

### Важные пути:
- **Amsterdam VPS:** `/opt/deep-agg`
- **MacBook:** `~/Projects/deep-agg` (или где клонировал)

### SSH подключение:
```bash
ssh amsterdam
# или
code --remote ssh-remote+amsterdam /opt/deep-agg
```

### Проверка сервиса:
```bash
systemctl status deep-agg
journalctl -u deep-agg -n 50
curl http://localhost:9201/health
```

---

## 🐛 Known Issues

### Issue 1: [Название проблемы]
**Описание:** [что не так]  
**Воспроизведение:** [как повторить]  
**Статус:** [open/fixed]  
**Устройство:** [MacBook/Server]

---

## 💡 Notes & Decisions

### October 7, 2025
- Решение: [важное архитектурное решение]
- Причина: [почему так сделали]

### October 6, 2025
- DigiKey API v4 pricing fix - использовать ProductVariations[0].StandardPricing
- CBR RF cache TTL = 12 часов
- Prometheus metrics: search_latency_seconds (histogram, 8 buckets)

---

## 🔗 Links

- **GitHub:** https://github.com/offflinerpsy/deep-components-aggregator
- **Production:** http://5.129.228.88:9201
- **Docs:** `/opt/deep-agg/docs/`
- **Artifacts:** `/opt/deep-agg/docs/_artifacts/`

---

**Инструкция по использованию:**
1. Перед работой: `git pull && cat docs/WORK-SESSION-SYNC.md`
2. После работы: обновить файл, закоммитить, запушить
3. На другом устройстве: `git pull` и читать обновления
