# Конфигурация
$SERVER = "89.104.69.77"
$USER = "root"
$PASSWORD = "DCIIcWfISxT3R4hT"
$REMOTE_DIR = "/opt/deep-agg"

Write-Host "Деплой на удаленный сервер для тестирования..."

# Проверяем наличие pscp и plink
if (-not (Get-Command "pscp" -ErrorAction SilentlyContinue) -or -not (Get-Command "plink" -ErrorAction SilentlyContinue)) {
    Write-Host "Ошибка: pscp и plink не найдены. Установите PuTTY."
    exit 1
}

# Создаем список файлов для копирования
$filesToCopy = @(
    "package.json",
    "package-lock.json",
    "server.js",
    "playwright.config.js",
    "nginx-deep-agg-live.conf",
    "README.md"
)

# Создаем список директорий для копирования
$dirsToSync = @(
    "src",
    "scripts",
    "public",
    "tests"
)

Write-Host "Копирование файлов на сервер..."

# Копируем основные файлы
foreach ($file in $filesToCopy) {
    Write-Host "Копирование $file..."
    & pscp -pw $PASSWORD $file "${USER}@${SERVER}:${REMOTE_DIR}/"
}

# Копируем директории
foreach ($dir in $dirsToSync) {
    Write-Host "Копирование директории $dir..."
    & pscp -pw $PASSWORD -r $dir "${USER}@${SERVER}:${REMOTE_DIR}/"
}

Write-Host "Настройка сервера..."

# Выполняем команды на сервере
$serverCommands = @"
cd $REMOTE_DIR
mkdir -p secrets/apis data/cache/html data/cache/meta data/db/products data/idx data/state logs/_diag loads/urls

# Устанавливаем зависимости
npm install

# Копируем конфигурацию Nginx
cp $REMOTE_DIR/nginx-deep-agg-live.conf /etc/nginx/conf.d/deep-agg-live.conf
systemctl reload nginx

# Останавливаем существующий процесс
pkill -f 'node server.js' || true

# Запускаем сервер в фоновом режиме
cd $REMOTE_DIR
nohup node server.js > logs/server.log 2>&1 &

# Проверяем, что сервер запустился
sleep 2
if curl -s http://localhost:9201/api/health > /dev/null; then
  echo 'Сервер успешно запущен!'
else
  echo 'Ошибка при запуске сервера!'
  tail -n 20 logs/server.log
  exit 1
fi

# Запускаем тесты
cd $REMOTE_DIR
node scripts/smoke.mjs
"@

& plink -batch -pw $PASSWORD $USER@$SERVER $serverCommands

Write-Host "Деплой завершен!"
Write-Host "Для проверки: http://$SERVER/"
Write-Host "API здоровья: http://$SERVER/api/health"
Write-Host "Поиск: http://$SERVER/ui/search.html?q=LM317"
