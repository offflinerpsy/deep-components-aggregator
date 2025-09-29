@echo off
echo Подготовка к деплою на удаленный сервер...

REM Проверка наличия необходимых инструментов
where plink >nul 2>&1
if %errorlevel% neq 0 (
    echo ОШИБКА: plink.exe не найден. Установите PuTTY и добавьте его в PATH.
    echo Скачать PuTTY можно с https://www.putty.org/
    exit /b 1
)

REM Настройки сервера
set SERVER=89.104.69.77
set USER=root
set PASSWORD=DCIIcWfISxT3R4hT
set REMOTE_DIR=/opt/deep-agg

echo Проверка соединения с сервером %SERVER%...
plink -batch -pw %PASSWORD% %USER%@%SERVER% "echo Соединение установлено"
if %errorlevel% neq 0 (
    echo ОШИБКА: Не удалось подключиться к серверу.
    exit /b 1
)

echo Создание структуры каталогов на сервере...
plink -batch -pw %PASSWORD% %USER%@%SERVER% "mkdir -p %REMOTE_DIR%/secrets/apis %REMOTE_DIR%/data/cache/html %REMOTE_DIR%/data/cache/meta %REMOTE_DIR%/data/db/products %REMOTE_DIR%/data/idx %REMOTE_DIR%/data/state %REMOTE_DIR%/data/_diag %REMOTE_DIR%/logs/_diag %REMOTE_DIR%/loads/urls"

echo Проверка версий ПО на сервере...
plink -batch -pw %PASSWORD% %USER%@%SERVER% "echo '=== Версии ПО на сервере ==='; node -v; npm -v; nginx -v 2>&1"

echo Создание файлов с API ключами...
echo a91efbc32580c3e8ab8b06ce9b6dc509 > scraperapi.txt
echo ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ > scrapingbee.txt
echo 1KYSOE...e4346 >> scrapingbee.txt
echo YObdDv4IEG9tXWW5Fd614JLNZ > scrapingbot.txt

echo Копирование API ключей на сервер...
pscp -batch -pw %PASSWORD% scraperapi.txt %USER%@%SERVER%:%REMOTE_DIR%/secrets/apis/
pscp -batch -pw %PASSWORD% scrapingbee.txt %USER%@%SERVER%:%REMOTE_DIR%/secrets/apis/
pscp -batch -pw %PASSWORD% scrapingbot.txt %USER%@%SERVER%:%REMOTE_DIR%/secrets/apis/

echo Удаление временных файлов...
del scraperapi.txt scrapingbee.txt scrapingbot.txt

echo Деплой базовой структуры завершен!
echo.
echo Для полного деплоя выполните:
echo git push origin main
echo plink -batch -pw %PASSWORD% %USER%@%SERVER% "cd %REMOTE_DIR% && git pull"
