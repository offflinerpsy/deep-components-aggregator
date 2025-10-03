@echo off
echo === Quick Card v2 Upload ===
set SERVER=5.129.228.88
set REMOTE_DIR=/opt/deep-agg

echo [1/4] Uploading tokens.css...
pscp.exe -batch -pw "hKsxPKR+2ayZ^c" public\styles\tokens.css root@%SERVER%:%REMOTE_DIR%/public/styles/tokens.css

echo [2/4] Uploading card-detail.css...
pscp.exe -batch -pw "hKsxPKR+2ayZ^c" public\styles\card-detail.css root@%SERVER%:%REMOTE_DIR%/public/styles/card-detail.css

echo [3/4] Uploading product-v2.html...
pscp.exe -batch -pw "hKsxPKR+2ayZ^c" ui\product-v2.html root@%SERVER%:%REMOTE_DIR%/ui/product-v2.html

echo [4/4] Uploading product-v2.js...
pscp.exe -batch -pw "hKsxPKR+2ayZ^c" ui\product-v2.js root@%SERVER%:%REMOTE_DIR%/ui/product-v2.js

echo.
echo === Upload Complete! ===
echo Visit: http://%SERVER%:9201/ui/product-v2.html?id=LM317
echo.
