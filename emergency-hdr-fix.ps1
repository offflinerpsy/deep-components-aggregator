# EMERGENCY HDR FIX - Принудительное восстановление HDR
Write-Host "=== EMERGENCY HDR FIX ===" -ForegroundColor Red
Write-Host "Force killing game processes..." -ForegroundColor Yellow

# Kill all game-related processes
$gameProcesses = @(
    'steam', 'steamwebhelper', 'EASteamProxy', 'EAAntiCheat.GameService.e',
    'GameSDK', 'GameBarPresenceWriter', 'origin', 'epic', 'uplay', 
    'battle.net', 'discord', 'obs64', 'obs32'
)

foreach ($process in $gameProcesses) {
    try {
        $procs = Get-Process -Name $process -ErrorAction SilentlyContinue
        if ($procs) {
            Write-Host "Killing $process..." -ForegroundColor Red
            $procs | Stop-Process -Force -ErrorAction SilentlyContinue
        }
    } catch {
        # Ignore errors
    }
}

Write-Host "Restarting graphics services..." -ForegroundColor Cyan

# Restart explorer
Stop-Process -Name 'explorer' -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-Process 'explorer'

# Restart Windows Audio (often helps with HDR)
Restart-Service -Name 'AudioSrv' -Force -ErrorAction SilentlyContinue

# Refresh display settings
Start-Sleep -Seconds 3
Start-Process 'ms-settings:display'

Write-Host "HDR should be restored!" -ForegroundColor Green
Write-Host "Try Win+Alt+B now" -ForegroundColor Cyan
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
