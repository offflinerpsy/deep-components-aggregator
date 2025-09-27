# Windows PowerShell version of verify-prod.sh
param(
    [string]$BaseURL = "http://127.0.0.1:9201",
    [string[]]$HealthPaths = @("/_version", "/api/health")
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outDir = "reports/VERIFY_$timestamp"
$artDir = "$outDir/artifacts"

Write-Host "[1/7] Clean install"
npm ci

Write-Host "[2/7] Ensure Playwright chromium"
npx playwright install --with-deps chromium | Out-Null

Write-Host "[3/7] Start server"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
New-Item -ItemType Directory -Path $artDir -Force | Out-Null

$serverProcess = Start-Process -FilePath "npm" -ArgumentList "run", "start" -RedirectStandardOutput "$outDir/server.log" -RedirectStandardError "$outDir/server.log" -NoNewWindow -PassThru
$serverProcess.Id | Out-File "$outDir/server.pid"

Start-Sleep -Seconds 3

Write-Host "[4/7] Health check"
$healthOk = $false
for ($i = 1; $i -le 60; $i++) {
    foreach ($path in $HealthPaths) {
        try {
            $response = Invoke-WebRequest -Uri "$BaseURL$path" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                $healthOk = $true
                break
            }
        } catch {
            # Continue trying
        }
    }
    if ($healthOk) { break }
    Start-Sleep -Seconds 0.5
}

if (-not $healthOk) {
    Write-Host "Health check failed"
    if (Test-Path "$outDir/server.log") {
        Get-Content "$outDir/server.log"
    }
    if ($serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force
    }
    exit 1
}

Write-Host "[5/7] API smoke snapshots"
New-Item -ItemType Directory -Path "$outDir/api" -Force | Out-Null
try {
    Invoke-WebRequest -Uri "$BaseURL/api/search?q=LM317T" -UseBasicParsing | Select-Object -ExpandProperty Content | Out-File "$outDir/api/search_LM317T.json" -Encoding UTF8
    Invoke-WebRequest -Uri "$BaseURL/api/product?mpn=LM317T" -UseBasicParsing | Select-Object -ExpandProperty Content | Out-File "$outDir/api/product_LM317T.json" -Encoding UTF8
    Invoke-WebRequest -Uri "$BaseURL/api/product?mpn=1N4148W-TP" -UseBasicParsing | Select-Object -ExpandProperty Content | Out-File "$outDir/api/product_1N4148W-TP.json" -Encoding UTF8
} catch {
    Write-Warning "Some API calls failed: $($_.Exception.Message)"
}

Write-Host "[6/7] Playwright e2e"
$env:PWDEBUG = "0"
npx playwright test --reporter=line --trace=on

# Collect artifacts
if (Test-Path "test-results") {
    Copy-Item -Path "test-results" -Destination "$artDir/test-results" -Recurse -Force
}
if (Test-Path "playwright-report") {
    Copy-Item -Path "playwright-report" -Destination "$artDir/playwright-report" -Recurse -Force
}
if (Test-Path "traces") {
    Copy-Item -Path "traces" -Destination "$artDir/traces" -Recurse -Force
}
if (Test-Path "videos") {
    Copy-Item -Path "videos" -Destination "$artDir/videos" -Recurse -Force
}

Write-Host "[7/7] Summarize"
$passCnt = 0
$failCnt = 0

# Try to parse test results
$resultFiles = Get-ChildItem "$artDir/test-results" -Filter "*.json" -ErrorAction SilentlyContinue
foreach ($file in $resultFiles) {
    try {
        $content = Get-Content $file.FullName | ConvertFrom-Json
        # Simple counting logic for test results
        if ($content.stats) {
            $passCnt += $content.stats.expected
            $failCnt += $content.stats.unexpected + $content.stats.flaky
        }
    } catch {
        # Continue if JSON parsing fails
    }
}

$summary = @"
# VERIFY SUMMARY
- base: $BaseURL
- health: OK
- passed: $passCnt
- failed: $failCnt
- artifacts: $artDir
"@

$summary | Out-File "$outDir/summary.md" -Encoding UTF8

# Create archive
try {
    Compress-Archive -Path "$outDir/artifacts", "$outDir/api", "$outDir/server.log", "$outDir/summary.md" -DestinationPath "$outDir/artifacts.zip" -Force
} catch {
    Write-Warning "Failed to create archive: $($_.Exception.Message)"
}

# Stop server
if ($serverProcess -and -not $serverProcess.HasExited) {
    Stop-Process -Id $serverProcess.Id -Force
}

Write-Host "DONE → $outDir"
