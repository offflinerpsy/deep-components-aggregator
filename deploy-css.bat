@echo off
echo Deploying CSS...
echo hKsxPKR+2ayZ^c| plink -batch -ssh root@5.129.228.88 "cat > /opt/deep-agg/public/styles/product.css" < public\styles\product.css
echo Done!
pause
