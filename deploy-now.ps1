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
$filesToInclude = @("server.js", "package.json", "package-lock.json")
$dirsToInclude = @("src", "ui", "public", "scripts", "backend") | Where-Object { Test-Path $_ }

tar -czf deploy.tar.gz --exclude=node_modules --exclude=.git @filesToInclude @dirsToInclude
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Archive failed" -ForegroundColor Red; exit 1 }

# Step 2: Upload
Write-Host "[2/4] Uploading..." -ForegroundColor Yellow
& scp -i $KEY -o ConnectTimeout=5 -o ServerAliveInterval=5 deploy.tar.gz ${SERVER}:${DIR}/
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Upload failed" -ForegroundColor Red; exit 1 }

# Step 3: Deploy (single command, times out in 30s)
Write-Host "[3/4] Extracting & restarting..." -ForegroundColor Yellow
$deployCmd = "cd $DIR && tar -xzf deploy.tar.gz && rm deploy.tar.gz && npm ci --omit=dev 2>&1 | tail -5 && systemctl restart deep-agg && sleep 2 && curl -sf http://localhost:9201/api/health"
& ssh -i $KEY -o ConnectTimeout=5 -o ServerAliveInterval=5 $SERVER "timeout 30 bash -c '$deployCmd'"

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
