#!/usr/bin/env pwsh
# Fast deployment to production - NO HANGING
# Uses: deploy_key for SSH auth
# Server: 5.129.228.88:/opt/deep-agg

param([switch]$SkipBuild)

$SERVER = "root@5.129.228.88"
$KEY = ".\deploy_key"
$DIR = "/opt/deep-agg"

Write-Host "`n🚀 Quick Deploy to Production`n" -ForegroundColor Cyan

# Step 1: Create archive (only existing files)
Write-Host "[1/4] Creating archive..." -ForegroundColor Yellow
$files = @("server.js", "package.json", "package-lock.json", "src", "ui", "public", "scripts", "backend", "api", "metrics", "adapters", "config", "db", "middleware", "schemas", ".env.example")
$existing = $files | Where-Object { Test-Path $_ }

Write-Host "  Including: $($existing -join ', ')" -ForegroundColor DarkGray
tar -czf deploy.tar.gz --exclude=node_modules --exclude=.git $existing
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Archive failed" -ForegroundColor Red; exit 1 }

# Step 2: Upload
Write-Host "[2/4] Uploading..." -ForegroundColor Yellow
& scp -i $KEY -o ConnectTimeout=5 -o ServerAliveInterval=5 deploy.tar.gz ${SERVER}:${DIR}/
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Upload failed" -ForegroundColor Red; exit 1 }

# Step 3: Deploy (extract, install deps, restart - with proper error checking)
Write-Host "[3/4] Extracting & installing..." -ForegroundColor Yellow
$deployCmd = @"
cd $DIR && \
tar -xzf deploy.tar.gz && \
rm deploy.tar.gz && \
npm ci --omit=dev && \
pkill -f 'node.*server.js' || true && \
nohup node server.js > server.log 2>&1 &
"@
& ssh -i $KEY -o ConnectTimeout=10 -o ServerAliveInterval=5 $SERVER $deployCmd

# Step 4: Verify
Write-Host "[4/4] Verifying..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$health = Invoke-RestMethod -Uri "http://5.129.228.88:9201/api/health" -TimeoutSec 5 -ErrorAction SilentlyContinue

if ($health) {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host "🌐 Live: http://5.129.228.88:9201`n" -ForegroundColor Cyan
} else {
    Write-Host "⚠️ Service restarted but health check failed" -ForegroundColor Yellow
}

# Cleanup
Remove-Item deploy.tar.gz -ErrorAction SilentlyContinue
