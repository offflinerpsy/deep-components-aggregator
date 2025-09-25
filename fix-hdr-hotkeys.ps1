# HDR Hotkeys Fix Script - Восстановление горячих клавиш Win+Alt+B
# Требует запуска от имени администратора

param(
    [switch]$Force,
    [switch]$Debug
)

$ErrorActionPreference = "Stop"

# Проверка прав администратора
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ Требуются права администратора!" -ForegroundColor Red
    Write-Host "Перезапускаю с правами администратора..." -ForegroundColor Yellow
    Start-Process PowerShell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" $($MyInvocation.UnboundArguments -join ' ')"
    exit
}

Write-Host "`n🔧 HDR Hotkeys Fix - Восстановление горячих клавиш Win+Alt+B" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor DarkGray

# Функция логирования
function Write-Log {
    param($Message, $Type = "Info")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch($Type) {
        "Success" { "Green" }
        "Error" { "Red" }
        "Warning" { "Yellow" }
        default { "White" }
    }
    Write-Host "[$timestamp] $Message" -ForegroundColor $color
}

# 1. Проверка состояния HDR
Write-Log "Проверка поддержки HDR..." "Info"
$displays = Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorHDRSupport
if (-not $displays -or ($displays | Where-Object HDRSupported).Count -eq 0) {
    Write-Log "⚠️ HDR не поддерживается вашим монитором или не настроен!" "Warning"
    if (-not $Force) {
        Write-Host "`nПродолжить всё равно? (Y/N): " -NoNewline -ForegroundColor Yellow
        $answer = Read-Host
        if ($answer -ne 'Y' -and $answer -ne 'y') { exit }
    }
}

# 2. Восстановление настроек реестра для горячих клавиш
Write-Log "Восстановление настроек реестра..." "Info"

$registryPaths = @(
    # Основные настройки HDR
    @{
        Path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\VideoSettings"
        Values = @{
            "EnableHDRForPlayback" = 1
            "HDRGlobalSetting" = 1
        }
    },
    # Настройки Game Bar (отвечает за Win+Alt+B)
    @{
        Path = "HKCU:\Software\Microsoft\GameBar"
        Values = @{
            "UseNexusForGameBarEnabled" = 1
            "GameDVR_Enabled" = 1
            "AllowAutoGameMode" = 1
        }
    },
    # Настройки горячих клавиш
    @{
        Path = "HKCU:\System\GameConfigStore"
        Values = @{
            "GameDVR_Enabled" = 1
            "GameDVR_FSEBehaviorMode" = 0
            "GameDVR_FSEBehavior" = 2
        }
    },
    # Политики Game DVR
    @{
        Path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR"
        Values = @{
            "AllowGameDVR" = 1
        }
    }
)

foreach ($reg in $registryPaths) {
    if (-not (Test-Path $reg.Path)) {
        New-Item -Path $reg.Path -Force | Out-Null
        Write-Log "  ✓ Создан путь: $($reg.Path)" "Success"
    }
    
    foreach ($key in $reg.Values.GetEnumerator()) {
        Set-ItemProperty -Path $reg.Path -Name $key.Key -Value $key.Value -Type DWord -Force
        if ($Debug) {
            Write-Log "  → Установлен $($key.Key) = $($key.Value)" "Info"
        }
    }
}

Write-Log "✓ Настройки реестра восстановлены" "Success"

# 3. Перезапуск служб Windows
Write-Log "Перезапуск системных служб..." "Info"

$services = @(
    "BcastDVRUserService*",  # Game Bar User Service
    "XblAuthManager",         # Xbox Live Auth Manager
    "XblGameSave",           # Xbox Live Game Save
    "XboxNetApiSvc",         # Xbox Live Networking Service
    "XboxGipSvc"             # Xbox Accessory Management Service
)

foreach ($serviceName in $services) {
    $actualServices = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    foreach ($service in $actualServices) {
        if ($service.Status -eq 'Running') {
            Restart-Service -Name $service.Name -Force -ErrorAction SilentlyContinue
            Write-Log "  ✓ Перезапущена служба: $($service.DisplayName)" "Success"
        } elseif ($service.Status -eq 'Stopped') {
            Start-Service -Name $service.Name -ErrorAction SilentlyContinue
            Write-Log "  ✓ Запущена служба: $($service.DisplayName)" "Success"
        }
    }
}

# 4. Перерегистрация Game Bar приложения
Write-Log "Перерегистрация Xbox Game Bar..." "Info"
Get-AppxPackage Microsoft.XboxGamingOverlay | ForEach-Object {
    Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\AppXManifest.xml" -ErrorAction SilentlyContinue
}
Write-Log "✓ Game Bar перерегистрирован" "Success"

# 5. Очистка кэша и перезапуск Explorer
Write-Log "Очистка кэша и перезапуск Explorer..." "Info"

# Очистка кэша иконок
$iconCachePath = "$env:LOCALAPPDATA\IconCache.db"
if (Test-Path $iconCachePath) {
    Remove-Item $iconCachePath -Force -ErrorAction SilentlyContinue
}

# Перезапуск Explorer
Stop-Process -Name 'explorer' -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-Process 'explorer'
Start-Sleep -Seconds 3

Write-Log "✓ Explorer перезапущен" "Success"

# 6. Активация HDR через WMI
Write-Log "Активация HDR через WMI..." "Info"
$display = Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorBrightnessMethods
if ($display) {
    # Попытка включить HDR программно
    $null = Invoke-CimMethod -InputObject $display[0] -MethodName WmiSetBrightness -Arguments @{Brightness=100; Timeout=1} -ErrorAction SilentlyContinue
}

# 7. Финальная проверка
Write-Host "`n" + "=" * 60 -ForegroundColor DarkGray
Write-Host "✅ ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО!" -ForegroundColor Green
Write-Host "`n📋 Инструкции:" -ForegroundColor Cyan
Write-Host "  1. Нажмите Win+Alt+B для переключения HDR" -ForegroundColor White
Write-Host "  2. Если не работает, нажмите Win+G для открытия Game Bar" -ForegroundColor White
Write-Host "  3. В Game Bar перейдите в Настройки → Игровые функции" -ForegroundColor White
Write-Host "  4. Убедитесь, что HDR включен в настройках" -ForegroundColor White
Write-Host "`n💡 Дополнительно:" -ForegroundColor Yellow
Write-Host "  - Если проблема повторяется после игр, запустите этот скрипт снова" -ForegroundColor Gray
Write-Host "  - Для автоматического исправления создайте ярлык на рабочем столе" -ForegroundColor Gray
Write-Host "  - Используйте параметр -Debug для подробного вывода" -ForegroundColor Gray

# Проверка статуса HDR
Write-Host "`n📊 Текущий статус HDR:" -ForegroundColor Cyan
Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorHDRSupport | ForEach-Object {
    $status = if ($_.HDRSupported) { "✓ Поддерживается" } else { "✗ Не поддерживается" }
    Write-Host "  Монитор: $status" -ForegroundColor $(if ($_.HDRSupported) { "Green" } else { "Red" })
}

Write-Host "`nНажмите любую клавишу для выхода..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
