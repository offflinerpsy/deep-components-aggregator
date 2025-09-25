@echo off
echo 🔧 Быстрое восстановление HDR...
powershell -ExecutionPolicy Bypass -File "%~dp0fix-hdr.ps1"
pause
