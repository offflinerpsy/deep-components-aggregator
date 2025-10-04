#!/usr/bin/env bash
# Video ingestion pipeline: extract audio → transcribe → extract requirements
# Usage: ./scripts/video_ingest.sh <path-to-video.mkv>

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <video-file>"
  echo "Example: $0 ~/videos/requirements.mkv"
  exit 1
fi

IN="$1"
ARTIFACTS_DIR="docs/_artifacts/video"

# Ensure ffmpeg is available
if ! command -v ffmpeg &> /dev/null; then
  echo "Error: ffmpeg is not installed. Install with: sudo apt-get install ffmpeg"
  exit 1
fi

echo "=== Video Ingestion Pipeline ==="
echo "Input: $IN"
echo "Artifacts: $ARTIFACTS_DIR"
echo ""

# Create artifacts directory
mkdir -p "$ARTIFACTS_DIR"

# Step 1: Extract audio (mono, 16kHz for Whisper compatibility)
echo "[1/3] Extracting audio..."
ffmpeg -y -i "$IN" -vn -ac 1 -ar 16000 "$ARTIFACTS_DIR/audio.wav" 2>&1 | grep -E "Duration|Stream|Output"
echo "✓ Audio extracted: $ARTIFACTS_DIR/audio.wav"
echo ""

# Step 2: Transcribe
# Option A: whisper-cpp (if available locally)
# Option B: Python whisper library
# Option C: Cloud API (OpenAI, AssemblyAI, etc.)
echo "[2/3] Transcribing audio..."

if command -v whisper &> /dev/null; then
  # Python whisper library (pip install openai-whisper)
  echo "Using Python Whisper..."
  whisper "$ARTIFACTS_DIR/audio.wav" \
    --model base \
    --language ru \
    --output_dir "$ARTIFACTS_DIR" \
    --output_format txt \
    --fp16 False
  mv "$ARTIFACTS_DIR/audio.txt" "$ARTIFACTS_DIR/transcript.txt" 2>/dev/null || true
  echo "✓ Transcript saved: $ARTIFACTS_DIR/transcript.txt"
elif [ -f "./whisper-cpp/main" ]; then
  # whisper.cpp local binary
  echo "Using whisper.cpp..."
  ./whisper-cpp/main \
    -m ./whisper-cpp/models/ggml-base.bin \
    -f "$ARTIFACTS_DIR/audio.wav" \
    -of "$ARTIFACTS_DIR/transcript.txt"
  echo "✓ Transcript saved: $ARTIFACTS_DIR/transcript.txt"
else
  echo "⚠️  No transcription tool found. Options:"
  echo "   - Install Python Whisper: pip install openai-whisper"
  echo "   - Build whisper.cpp: https://github.com/ggerganov/whisper.cpp"
  echo ""
  echo "Creating placeholder transcript..."
  cat > "$ARTIFACTS_DIR/transcript.txt" <<EOF
[PLACEHOLDER]
Manual transcription required.
Place transcribed text here and re-run requirement extraction.
EOF
fi
echo ""

# Step 3: Extract requirements (keywords: сделай, нужно, обязательно, etc.)
echo "[3/3] Extracting requirements..."
grep -n -iE "(сделай|нужно|обязательно|починить|проблема|задача|исправить|требуется|добавить|реализовать|важно)" \
  "$ARTIFACTS_DIR/transcript.txt" \
  > "$ARTIFACTS_DIR/requirements.txt" || true

if [ -s "$ARTIFACTS_DIR/requirements.txt" ]; then
  echo "✓ Requirements extracted: $ARTIFACTS_DIR/requirements.txt"
  echo "  Found $(wc -l < "$ARTIFACTS_DIR/requirements.txt") potential requirements"
else
  echo "⚠️  No requirements found (check transcript quality)"
  echo "    Creating empty requirements.txt"
  touch "$ARTIFACTS_DIR/requirements.txt"
fi
echo ""

echo "=== Pipeline Complete ==="
echo "Next steps:"
echo "  1. Review: $ARTIFACTS_DIR/transcript.txt"
echo "  2. Check: $ARTIFACTS_DIR/requirements.txt"
echo "  3. Update: docs/VIDEO-REQUIREMENTS.md"
echo ""
