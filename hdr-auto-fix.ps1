# Auto HDR Fix - Запускать после выхода из игр
# Usage: powershell -ExecutionPolicy Bypass -File "hdr-auto-fix.ps1"

param(
    [switch]$Silent = $false
)

if (-not $Silent) {
    Write-Host "=== HDR AUTO FIX ===" -ForegroundColor Magenta
    Write-Host "Fixing HDR after game exit..." -ForegroundColor Yellow
}

# Kill any remaining game processes that might interfere
$gameProcesses = @('steam', 'origin', 'uplay', 'epicgames', 'battle.net')
foreach ($process in $gameProcesses) {
    Get-Process -Name $process -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

# Restart explorer
Stop-Process -Name 'explorer' -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Start-Process 'explorer'
Start-Sleep -Seconds 2

# Refresh display settings
Start-Process 'ms-settings:display' -WindowStyle Minimized

if (-not $Silent) {
    Write-Host "HDR hotkeys restored!" -ForegroundColor Green
    Write-Host "Try Win+Alt+B now" -ForegroundColor Cyan
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
