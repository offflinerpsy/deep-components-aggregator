# 🎯 Быстрый старт — Координация проектов на сервере

**Сервер**: 5.129.228.88  
**Дата**: 2025-10-09  
**Статус**: ✅ Сконфигурировано

---

## 📊 Текущие проекты

| Проект | Порт | Директория | PM2 | URL |
|--------|------|------------|-----|-----|
| **Deep-Agg** | 9201 | `/opt/deep-agg` | deep-agg | http://5.129.228.88:9201 |
| **Investment** | 3000 | `/var/www/investment` | investment | http://5.129.228.88:3000 |

---

## ⚡ Быстрые команды

### Проверка здоровья всех проектов
```bash
/opt/deep-agg/scripts/check-server-health.sh
```

### Статус PM2
```bash
export PATH="/usr/local/bin:$PATH"
pm2 status
```

### Перезапуск конкретного проекта
```bash
pm2 restart deep-agg      # Только агрегатор
pm2 restart investment    # Только Investment
```

### Логи
```bash
pm2 logs deep-agg         # Агрегатор
pm2 logs investment       # Investment
pm2 logs                  # Все проекты
```

---

## 🚀 Деплой нового проекта

### 1. Проверь порт
```bash
/opt/deep-agg/scripts/pre-deploy-check.sh 3001
```

### 2. Обнови реестр
Отредактируй `/opt/deep-agg/SERVER-PROJECTS.md`

### 3. Задеплой
```bash
cd /path/to/project
pm2 start npm --name "my-project" -- start
pm2 save
```

### 4. Проверь
```bash
/opt/deep-agg/scripts/check-server-health.sh
```

---

## 📚 Документация

| Файл | Назначение |
|------|------------|
| `/opt/deep-agg/SERVER-PROJECTS.md` | 📋 Главный реестр проектов |
| `/var/www/investment/SERVER-INFO.md` | ℹ️ Инфо для Investment |
| `/opt/deep-agg/.env.example` | 🔧 Шаблон Deep-Agg |
| `/var/www/investment/.env.example` | 🔧 Шаблон Investment |
| `/opt/deep-agg/docs/_artifacts/2025-10-09/` | 📦 Артефакты |

---

## ⚠️ Важные правила

1. ✅ Всегда проверяй `/opt/deep-agg/SERVER-PROJECTS.md` перед деплоем
2. ✅ Используй уникальные порты из доступных диапазонов
3. ✅ Используй уникальные имена PM2 процессов
4. ✅ Храни проекты в отдельных директориях
5. ✅ Используй отдельные `.env` файлы
6. ❌ Никогда не шарь базы данных между проектами
7. ✅ Обновляй реестр при деплое/удалении проектов

---

## 🔌 Доступные порты

- **3001-3099**: Next.js приложения
- **9202-9299**: Express приложения
- **8000-8099**: Python/Django приложения

❌ **Занято**: 80, 443 (NGINX), 3000 (Investment), 9201 (Deep-Agg)

---

## 🆘 Проблемы?

### Конфликт портов
```bash
ss -tulpn | grep :<port>
```

### PM2 процесс не запускается
```bash
pm2 logs <name>
pm2 restart <name>
```

### Health check провален
```bash
curl http://localhost:<port>
pm2 status
```

---

## 📞 Помощь

- **Реестр проектов**: `/opt/deep-agg/SERVER-PROJECTS.md`
- **Анализ конфликтов**: `/opt/deep-agg/docs/_artifacts/2025-10-09/CONFLICT-ANALYSIS.md`
- **Координация**: `/opt/deep-agg/docs/_artifacts/2025-10-09/SERVER-COORDINATION.md`

---

**Последнее обновление**: 2025-10-09  
**Tech Lead Mode**: ✅ Полная координация настроена
