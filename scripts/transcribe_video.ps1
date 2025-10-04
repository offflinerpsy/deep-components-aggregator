# PowerShell Video Transcription Pipeline
# Requires: ffmpeg in PATH, Python 3.8+

param(
    [string]$VideoPath = "C:\Users\Makkaroshka\Videos\vokoscreenNG-2025-10-03_18-39-35.mkv"
)

$ErrorActionPreference = "Stop"

$ArtifactsDir = "docs\_artifacts\video"
$AudioFile = Join-Path $ArtifactsDir "audio.wav"
$TranscriptFile = Join-Path $ArtifactsDir "transcript.txt"

Write-Host "=== Video Transcription Pipeline ===" -ForegroundColor Cyan
Write-Host "Video: $VideoPath"
Write-Host "Artifacts: $ArtifactsDir"
Write-Host ""

# Create artifacts directory
New-Item -ItemType Directory -Force -Path $ArtifactsDir | Out-Null

# Step 1: Check FFmpeg
Write-Host "[1/3] Checking FFmpeg..." -ForegroundColor Yellow
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host "Error: ffmpeg not installed" -ForegroundColor Red
    Write-Host "Install via Chocolatey: choco install ffmpeg"
    Write-Host "Or download from: https://ffmpeg.org/download.html"
    exit 1
}

Write-Host "Extracting audio from video..."
ffmpeg -y -i $VideoPath -vn -ac 1 -ar 16000 $AudioFile 2>&1 | Select-String -Pattern "Duration|Stream|Output"
Write-Host "✓ Audio extracted: $AudioFile" -ForegroundColor Green
Write-Host ""

# Step 2: Transcribe with faster-whisper
Write-Host "[2/3] Transcribing audio (this may take several minutes)..." -ForegroundColor Yellow

$PythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $PythonCmd) {
    $PythonCmd = Get-Command python3 -ErrorAction SilentlyContinue
}
if (-not $PythonCmd) {
    Write-Host "Error: Python not found" -ForegroundColor Red
    exit 1
}

# Check if faster-whisper is installed
$HasWhisper = & $PythonCmd.Source -c "import faster_whisper" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing faster-whisper..."
    & $PythonCmd.Source -m pip install --quiet faster-whisper
}

# Run transcription
$PythonScript = @'
from faster_whisper import WhisperModel
import sys

print("Loading Whisper model (base, CPU)...")
model = WhisperModel("base", device="cpu", compute_type="int8")

audio_file = "docs/_artifacts/video/audio.wav"
transcript_file = "docs/_artifacts/video/transcript.txt"

print(f"Transcribing: {audio_file}")
segments, info = model.transcribe(
    audio_file, 
    vad_filter=True,
    language="ru"
)

print(f"Detected language: {info.language} (probability: {info.language_probability:.2f})")
print(f"Writing transcript to: {transcript_file}")

with open(transcript_file, "w", encoding="utf-8") as f:
    for segment in segments:
        timestamp = f"[{segment.start:.2f}-{segment.end:.2f}]"
        text = segment.text.strip()
        line = f"{timestamp} {text}\n"
        f.write(line)
        print(f"  {timestamp} {text[:60]}...")

print("✓ Transcription complete")
'@

& $PythonCmd.Source -c $PythonScript

Write-Host ""

# Step 3: Extract TODOs
Write-Host "[3/3] Extracting TODOs from transcript..." -ForegroundColor Yellow
node scripts\extract_todos.mjs

Write-Host ""
Write-Host "=== Pipeline Complete ===" -ForegroundColor Green
Write-Host "Files created:"
Write-Host "  - $AudioFile"
Write-Host "  - $TranscriptFile"
Write-Host "  - docs\VIDEO-REQUIREMENTS.md"
Write-Host ""
Write-Host "Next: Review docs\VIDEO-REQUIREMENTS.md and commit:"
Write-Host "  git add docs\_artifacts\video docs\VIDEO-REQUIREMENTS.md"
Write-Host "  git commit -m '[VIDEO] transcript + auto-extracted TODOs'"
