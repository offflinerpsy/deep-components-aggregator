# HDR Fix Script
Write-Host "Fixing HDR..." -ForegroundColor Yellow

# Restart explorer to restore hotkeys
Write-Host "Restarting Explorer..." -ForegroundColor Cyan
Stop-Process -Name 'explorer' -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-Process 'explorer'

# Wait for startup
Start-Sleep -Seconds 3

# Open display settings
Write-Host "Opening display settings..." -ForegroundColor Cyan
Start-Process 'ms-settings:display'

Write-Host "HDR fixed! Try Win+Alt+B" -ForegroundColor Green
Write-Host "Tip: Run this script after exiting games" -ForegroundColor Yellow
