#!/bin/bash

# Проверяем статус WARP
check_warp() {
    if ! warp-cli --accept-tos status | grep -q "Connected"; then
        echo "WARP не подключен. Перезапускаю..."
        systemctl restart warp-tunnel
        sleep 5
    fi
}

# Проверяем прокси
check_proxy() {
    if ! curl -s -x http://127.0.0.1:40000 https://cloudflare.com/cdn-cgi/trace | grep -q "warp=on"; then
        echo "Прокси не работает. Перезапускаю WARP..."
        systemctl restart warp-tunnel
        sleep 5
    fi
}

# Основной цикл мониторинга
while true; do
    check_warp
    check_proxy
    sleep 30
done