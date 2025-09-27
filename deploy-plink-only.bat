@echo off
echo 🚀 Деплой через plink (только plink, без scp)

echo 📦 Загружаем архив на сервер через plink...
plink -ssh -pw OPYgPpOEqUSQmUqI root@89.104.69.77 "cat > /root/deploy.tar.gz" < deploy.tar.gz

echo 📁 Распаковываем и настраиваем на сервере...
plink -ssh -pw OPYgPpOEqUSQmUqI root@89.104.69.77 "cd /root && rm -rf aggregator-v2 && tar -xzf deploy.tar.gz && cd aggregator-v2 && npm install && npm run build:corpus && npm run build:index && npm run serve &"

echo ✅ Деплой завершен!
echo 🌐 Сервер: http://89.104.69.77:9201
pause


