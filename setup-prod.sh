#!/bin/bash
# Скрипт для настройки конфигурации в проде

# 1) Создаем необходимые директории
mkdir -p /opt/deep-agg/var/db /opt/deep-agg/public

# 2) Копируем файлы конфигурации
cp nginx-deep-agg.conf /etc/nginx/conf.d/deep-agg.conf
cp deep-agg.service /etc/systemd/system/deep-agg.service
cp deep-agg.env /etc/deep-agg.env

# 3) NGINX проверка и перезапуск
nginx -t && systemctl reload nginx

# 4) Node сервис
systemctl daemon-reload
systemctl enable --now deep-agg
systemctl status deep-agg -l --no-pager | sed -n '1,80p'

# 5) Контрольные прогоны изнутри сервера
echo -e "\n=== API Health ===\n"
curl -sS http://127.0.0.1:9201/api/health
echo -e "\n\n=== Fresh Search ===\n"
curl -sS "http://127.0.0.1:9201/api/search?q=2N2222&fresh=1" | head -c 500
echo -e "\n\n=== Cached Search ===\n"
curl -sS "http://127.0.0.1:9201/api/search?q=2N2222" | head -c 500