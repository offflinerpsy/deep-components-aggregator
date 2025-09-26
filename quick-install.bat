@echo off
echo Installing dependencies...
"C:\nvm4w\nodejs\node.exe" "C:\nvm4w\nodejs\node_modules\npm\bin\npm-cli.js" install express@4.19.2
"C:\nvm4w\nodejs\node.exe" "C:\nvm4w\nodejs\node_modules\npm\bin\npm-cli.js" install ajv@8.17.1
"C:\nvm4w\nodejs\node.exe" "C:\nvm4w\nodejs\node_modules\npm\bin\npm-cli.js" install cheerio@1.0.0-rc.12
"C:\nvm4w\nodejs\node.exe" "C:\nvm4w\nodejs\node_modules\npm\bin\npm-cli.js" install playwright@1.55.1
echo Done!
