@echo off
echo Updating public/index.js on server...
pscp.exe -pw DCIIcWfISxT3R4hT public\index.js root@89.104.69.77:/opt/deep-agg/public/index.js
echo Done!
