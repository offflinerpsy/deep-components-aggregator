# PowerShell скрипт для проверки доступности сервера
$server = "89.104.69.77"
$user = "root"
$password = "DCIIcWfISxT3R4hT"

Write-Host "Проверка доступности сервера $server..."

try {
    # Проверка доступности сервера по SSH
    $result = Test-NetConnection -ComputerName $server -Port 22 -InformationLevel Quiet
    if ($result) {
        Write-Host "Сервер доступен по SSH."

        # Проверка наличия plink.exe для SSH подключения из Windows
        $plinkPath = "plink.exe"
        if (Get-Command $plinkPath -ErrorAction SilentlyContinue) {
            Write-Host "plink.exe найден, можно использовать для SSH подключения."
        } else {
            Write-Host "ВНИМАНИЕ: plink.exe не найден. Необходимо установить PuTTY для SSH подключения из Windows."
            Write-Host "Скачайте PuTTY с https://www.putty.org/ и добавьте в PATH."
        }

        # Проверка наличия sshpass для скрипта bash
        Write-Host "Для выполнения скрипта deploy-to-server.sh в Linux/WSL необходим sshpass."
        Write-Host "В Ubuntu/Debian установите его командой: sudo apt-get install sshpass"
    } else {
        Write-Host "ОШИБКА: Сервер недоступен по SSH."
    }
} catch {
    Write-Host "ОШИБКА при проверке сервера: $_"
}

# Проверка версий ПО локально
Write-Host "`n=== Локальные версии ПО ==="
try {
    $nodeVersion = node -v
    Write-Host "Node.js: $nodeVersion"
} catch {
    Write-Host "Node.js не установлен"
}

try {
    $npmVersion = npm -v
    Write-Host "npm: $npmVersion"
} catch {
    Write-Host "npm не установлен"
}

# Проверка наличия WSL для запуска bash скриптов
$wslEnabled = $false
try {
    $wslCheck = wsl --list
    $wslEnabled = $true
    Write-Host "`nWSL доступен. Можно использовать для выполнения bash скриптов."
} catch {
    Write-Host "`nWSL не установлен. Для запуска bash скриптов установите WSL или используйте Git Bash."
}

Write-Host "`nРекомендации:"
Write-Host "1. Для работы с удаленным сервером используйте WSL или Git Bash"
Write-Host "2. Убедитесь, что все необходимые зависимости установлены на сервере"
Write-Host '3. Для деплоя используйте команду: ./deploy-to-server.sh (в WSL или Git Bash)'
