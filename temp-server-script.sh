set -Eeuo pipefail

log(){ echo -e ">>> $1"; }

log "Создаю каталоги…"
mkdir -p /opt/deep-agg/public /opt/deep-agg/var/db

log "Сношу мусорный results.html (если где-то лежит)…"
rm -f /opt/deep-agg/public/results.html /usr/share/nginx/html/results.html /var/www/html/results.html || true

log "Ставлю каноничный NGINX-конфиг…"
/bin/cat > /etc/nginx/conf.d/deep-agg.conf <<'NGINX'
server {
  listen 80 default_server;
  server_name _;

  access_log /var/log/nginx/deep-agg.access.log;
  error_log  /var/log/nginx/deep-agg.error.log warn;

  root  /opt/deep-agg/public;
  index index.html;

  # SPA: любые пути → index.html, без переписывательных петель
  location / { try_files $uri $uri/ /index.html; }

  # API => Node на localhost:9201
  location /api/ {
    proxy_pass         http://127.0.0.1:9201;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   Connection "";
    proxy_read_timeout 120s;
  }
}
NGINX

log "Service для Node (systemd)…"
/bin/cat > /etc/systemd/system/deep-agg.service <<'UNIT'
[Unit]
Description=DeepAgg API
After=network.target

[Service]
WorkingDirectory=/opt/deep-agg
EnvironmentFile=/etc/deep-agg.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
UNIT

log "ENV (оставляю существующий, создаю дефолт, если нет)…"
test -f /etc/deep-agg.env || /bin/cat > /etc/deep-agg.env <<'ENV'
PORT=9201
DATA_DIR=/opt/deep-agg/var
# Подставьте свои ключи (держим как есть, если файл уже существовал)
MOUSER_API_KEY=
FARNELL_API_KEY=
FARNELL_REGION=uk.farnell.com
ENV

log "Проверяю и перегружаю NGINX…"
nginx -t
systemctl reload nginx

log "Включаю и перезапускаю сервис…"
systemctl daemon-reload
systemctl enable --now deep-agg
sleep 2
systemctl status deep-agg -l --no-pager | sed -n '1,60p' || true

log "Проверки API/SPA…"
echo -e "\nHEALTH:" && curl -fsS http://127.0.0.1:9201/api/health || true
echo -e "\nSEARCH (2N2222, fresh=1):" && curl -fsS "http://127.0.0.1:9201/api/search?q=2N2222&fresh=1" | head -c 800 || true
echo -e "\nSEARCH (кириллица «транзистор»):" && curl -fsS "http://127.0.0.1:9201/api/search?q=%D1%82%D1%80%D0%B0%D0%BD%D0%B7%D0%B8%D1%81%D1%82%D0%BE%D1%80" | head -c 800 || true
echo -e "\nSPA / (ожидаю 200 OK):" && curl -fsSI http://127.0.0.1/ | head -n1 || true

log "ГОТОВО."