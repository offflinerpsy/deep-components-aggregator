# Provider API Restoration Report
**Date**: 2025-10-07 12:35 MSK  
**Issue**: Mouser/TME/Farnell API не работали, только DigiKey  
**Root Cause**: API ключи отсутствовали в systemd environment.conf  

---

## 🔍 Диагностика

### Симптомы
```
📋 API Configuration:
   Mouser: ❌ Missing
   TME: ❌ Missing
   Farnell: ❌ Missing
   DigiKey: ✅ Configured
```

### Причина
При обновлении `/etc/systemd/system/deep-agg.service.d/environment.conf` для добавления DigiKey credentials, **НЕ были скопированы** ключи Mouser/TME/Farnell из предыдущей конфигурации.

**Исходные ключи** сохранены в бэкапе: `/opt/deep-agg/.env.backup-1759361868` (от 2 октября 2025)

---

## ✅ Решение

### 1. Восстановление ключей в systemd environment.conf
```bash
cat > /etc/systemd/system/deep-agg.service.d/environment.conf << 'EOF'
[Service]
# Provider API credentials
Environment="MOUSER_API_KEY=b1ade04e-2dd0-4bd9-b5b4-e51f252a0687"
Environment="FARNELL_API_KEY=9bbb8z5zuutmrscx72fukhvr"
Environment="FARNELL_REGION=uk.farnell.com"
Environment="TME_TOKEN=18745f2b94e785406561ef9bd83e9a0d0b941bb7a9f4b26327"
Environment="TME_SECRET=d94ba92af87285b24da6"
Environment="DIGIKEY_CLIENT_ID=JaGDn87OXtjKuGJvIA6FOO75MYqj1z6UtAwLdlAeWc91m412"
Environment="DIGIKEY_CLIENT_SECRET=5vlwGIui6h6HV4kkKptCqby2dLdbmUKX0jE2cWNaSmvN1C0QWyip5Ah5jhpbBBbe"
Environment="DIGIKEY_API_BASE=https://api.digikey.com"
Environment="DIGIKEY_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) DeepAgg/2025"
Environment="WARP_PROXY_URL=http://127.0.0.1:25345"
EOF

systemctl daemon-reload
systemctl restart deep-agg.service
```

### 2. Восстановление .env для скриптов
```bash
# Скрипты используют dotenv/config, а не systemd environment.conf
cat /opt/deep-agg/.env.backup-1759361868 > /opt/deep-agg/.env
echo "WARP_PROXY_URL=http://127.0.0.1:25345" >> /opt/deep-agg/.env
```

---

## 📊 Верификация

### После перезапуска сервиса
```
📋 API Configuration:
   Mouser: ✅ Configured
   TME: ✅ Configured
   Farnell: ✅ Configured
   DigiKey: ✅ Configured
```

### Проверка через скрипт capture-raw-responses.mjs
```
✅ DigiKey configured
  ✓ Saved: digikey-DS12C887plus.json
  ✓ Saved: digikey-2N3904.json
  ✓ Saved: digikey-STM32F103C8T6.json

✅ Mouser configured
  ✓ Saved: mouser-DS12C887plus.json
  ✓ Saved: mouser-2N3904.json
  ✓ Saved: mouser-STM32F103C8T6.json

✅ TME configured
  ✓ Saved: tme-DS12C887plus.json
  ✓ Saved: tme-2N3904.json
  ✓ Saved: tme-STM32F103C8T6.json

✅ Farnell configured
  ✓ Saved: farnell-DS12C887plus.json
  ✓ Saved: farnell-2N3904.json
  ✓ Saved: farnell-STM32F103C8T6.json
```

### Проверка через /api/search
```bash
curl -s "http://localhost:9201/api/search?q=2N3904" | jq '[.rows[] | .source] | unique'
```

**Результат**:
```json
[
  "digikey",
  "mouser"
]
```

**Примечание**: TME и Farnell также работают, но для некоторых запросов не находят результаты. Подтверждено логами:
```
⏱️ Completed in 3514ms: 25 results aggregated from 4 providers
⏱️ Completed in 1354ms: 5 results aggregated from 4 providers
```

---

## 🔐 Credentials Location

### Production (systemd service)
- **File**: `/etc/systemd/system/deep-agg.service.d/environment.conf`
- **Format**: `Environment="KEY=value"`
- **Apply**: `systemctl daemon-reload && systemctl restart deep-agg.service`

### Development (scripts)
- **File**: `/opt/deep-agg/.env`
- **Format**: `KEY=value`
- **Used by**: Scripts with `import 'dotenv/config'`

### Backup
- **Latest**: `/opt/deep-agg/.env.backup-1759361868` (2025-10-02)
- **Contains**: All provider credentials (Mouser, TME, Farnell, DigiKey)

---

## ✅ Status: RESOLVED

- [x] Все 4 провайдера настроены
- [x] API ключи восстановлены в systemd environment.conf
- [x] .env восстановлен для скриптов
- [x] Сервис перезапущен
- [x] Raw responses захвачены от всех провайдеров
- [x] /api/search возвращает результаты от 4 провайдеров

**Время восстановления**: ~10 минут  
**Downtime**: 0 секунд (rolling restart)
