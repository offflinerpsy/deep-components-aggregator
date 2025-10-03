@echo off
echo === Check DB via Node ===
set SERVER=5.129.228.88

plink.exe -batch -ssh root@%SERVER% -pw "hKsxPKR+2ayZ^c" "cd /opt/deep-agg && node -e \"const db = require('better-sqlite3')('var/db/deepagg.sqlite'); console.log('Orders:', db.prepare('SELECT COUNT(*) as cnt FROM orders').get().cnt); console.log('Users:', db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt); console.log('Sessions:', db.prepare('SELECT COUNT(*) as cnt FROM sessions').get().cnt);\""

echo.
echo === DB Check Complete! ===
