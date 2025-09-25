@echo off
echo ========================================
echo    EMERGENCY HDR FIX - GAME KILLER
echo ========================================
echo.
echo This will force-kill all game processes
echo and restore HDR functionality.
echo.
pause
powershell -ExecutionPolicy Bypass -File "%~dp0emergency-hdr-fix.ps1"
