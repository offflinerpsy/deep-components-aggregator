#!/usr/bin/env bash
# Video transcription pipeline
# Requires: ffmpeg, Python 3.8+, faster-whisper

set -euo pipefail

VIDEO_PATH="${1:-C:/Users/Makkaroshka/Videos/vokoscreenNG-2025-10-03_18-39-35.mkv}"
ARTIFACTS_DIR="docs/_artifacts/video"
AUDIO_FILE="$ARTIFACTS_DIR/audio.wav"
TRANSCRIPT_FILE="$ARTIFACTS_DIR/transcript.txt"

echo "=== Video Transcription Pipeline ==="
echo "Video: $VIDEO_PATH"
echo "Artifacts: $ARTIFACTS_DIR"
echo ""

# Create artifacts directory
mkdir -p "$ARTIFACTS_DIR"

# Step 1: Extract audio with FFmpeg
if ! command -v ffmpeg &> /dev/null; then
  echo "Error: ffmpeg not installed"
  echo "Install: https://ffmpeg.org/download.html"
  echo "Or via chocolatey: choco install ffmpeg"
  exit 1
fi

echo "[1/3] Extracting audio from video..."
ffmpeg -y -i "$VIDEO_PATH" -vn -ac 1 -ar 16000 "$AUDIO_FILE" 2>&1 | grep -E "Duration|Stream|Output" || true
echo "✓ Audio extracted: $AUDIO_FILE"
echo ""

# Step 2: Transcribe with faster-whisper
echo "[2/3] Transcribing audio (this may take several minutes)..."

if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
  echo "Error: Python not found"
  exit 1
fi

PYTHON_CMD=$(command -v python3 || command -v python)

# Check if faster-whisper is installed
if ! $PYTHON_CMD -c "import faster_whisper" 2>/dev/null; then
  echo "Installing faster-whisper..."
  $PYTHON_CMD -m pip install --quiet faster-whisper
fi

$PYTHON_CMD - << 'PY'
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
    language="ru"  # Russian language
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
PY

echo ""

# Step 3: Extract TODOs
echo "[3/3] Extracting TODOs from transcript..."
node scripts/extract_todos.mjs

echo ""
echo "=== Pipeline Complete ==="
echo "Files created:"
echo "  - $AUDIO_FILE"
echo "  - $TRANSCRIPT_FILE"
echo "  - docs/VIDEO-REQUIREMENTS.md"
echo ""
echo "Next: Review docs/VIDEO-REQUIREMENTS.md and commit:"
echo "  git add docs/_artifacts/video docs/VIDEO-REQUIREMENTS.md"
echo "  git commit -m '[VIDEO] transcript + auto-extracted TODOs'"
