@echo off
:: Quick HDR Hotkeys Fix - Быстрое восстановление Win+Alt+B
:: Запускает PowerShell скрипт с правами администратора

echo ========================================
echo   HDR HOTKEYS FIX - Win+Alt+B
echo ========================================
echo.
echo Запуск восстановления горячих клавиш HDR...
echo.

:: Запуск PowerShell скрипта с правами администратора
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process PowerShell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%~dp0fix-hdr-hotkeys.ps1""' -Verb RunAs"

echo.
echo Скрипт запущен в отдельном окне с правами администратора.
echo Следуйте инструкциям в новом окне.
echo.
pause
