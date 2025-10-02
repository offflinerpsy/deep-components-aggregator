@echo off
echo Starting SSH tunnel for API proxy...
echo This will route server API requests through your Windows machine
echo.
plink.exe -batch -ssh -R 40001:127.0.0.1:40001 root@89.104.69.77 -pw DCIIcWfISxT3R4hT -N
