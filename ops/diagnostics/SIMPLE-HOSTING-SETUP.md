# 🔥 ПРОСТАЯ НАСТРОЙКА ХОСТИНГА

## ВАРИАНТ 1: Попробуем текущую Ubuntu (5 минут)

### Открой консоль хостинга и вставь ЭТУ ОДНУ КОМАНДУ:

```bash
cd /tmp && wget https://github.com/offflinerpsy/deep-components-aggregator/archive/refs/heads/main.zip -O project.zip && unzip -o project.zip && pkill -f node || true && rm -rf /opt/deep-agg/* && mkdir -p /opt/deep-agg && cp -r deep-components-aggregator-main/* /opt/deep-agg/ && cd /opt/deep-agg && npm install --production && nohup node server.js > server.log 2>&1 & && sleep 5 && curl http://127.0.0.1:9201/api/search?q=LM317
```

**Если увидишь JSON с данными LM317 - ГОТОВО!**

---

## ВАРИАНТ 2: Переустановка системы

### Рекомендуемые ОС (по надежности):

1. **CentOS 7/8** - очень стабильная, простая
2. **Debian 11** - надежная, без капризов
3. **Ubuntu 20.04 LTS** - если хочешь Ubuntu
4. **Rocky Linux** - замена CentOS, современная

### После переустановки системы:

```bash
# Для CentOS/Rocky Linux:
yum update -y && yum install -y curl wget unzip && curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - && yum install -y nodejs

# Для Debian:
apt update && apt install -y curl wget unzip && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs

# Затем деплой проекта:
cd /tmp && wget https://github.com/offflinerpsy/deep-components-aggregator/archive/refs/heads/main.zip -O project.zip && unzip -o project.zip && mkdir -p /opt/deep-agg && cp -r deep-components-aggregator-main/* /opt/deep-agg/ && cd /opt/deep-agg && npm install --production && nohup node server.js > server.log 2>&1 & && sleep 5 && curl http://127.0.0.1:9201/api/search?q=LM317
```

---

## ВАРИАНТ 3: Альтернативные хостинги

Если текущий хостинг капризный, можно быстро перенести на:

- **DigitalOcean** - $5/месяц, очень стабильно
- **Vultr** - $2.50/месяц, простая настройка
- **Linode** - надежно, хорошая поддержка
- **Hetzner** - дешево, европейские серверы

---

## 🎯 ЦЕЛЬ: Получить рабочий API

**Успех = когда команда `curl http://127.0.0.1:9201/api/search?q=LM317` возвращает JSON с результатами**

После этого настроим nginx и все будет работать на внешнем IP.

**Сколько времени потратим:**
- Вариант 1: 5 минут
- Вариант 2: 15 минут
- Вариант 3: 30 минут

**Твой выбор?**
