#!/usr/bin/env python3
"""
Transcribe audio with faster-whisper (Russian language)
"""
from faster_whisper import WhisperModel
import sys
from pathlib import Path

print("=== Whisper Transcription ===")

# Paths
audio_file = Path("docs/_artifacts/video/audio.wav")
transcript_file = Path("docs/_artifacts/video/transcript.txt")

if not audio_file.exists():
    print(f"Error: Audio file not found: {audio_file}")
    sys.exit(1)

print(f"Audio: {audio_file}")
print(f"Output: {transcript_file}")
print()

# Load model (base model, CPU with int8 quantization for speed)
print("Loading Whisper model (base, CPU, int8)...")
print("This may take a few minutes on first run (downloading model)...")
model = WhisperModel("base", device="cpu", compute_type="int8")

# Transcribe with VAD filtering and Russian language
print()
print("Transcribing audio (this will take several minutes)...")
print("Processing 10+ minutes of audio with Russian language model...")
print()

segments, info = model.transcribe(
    str(audio_file),
    vad_filter=True,
    language="ru",
    beam_size=5,
    best_of=5,
    temperature=0.0
)

print(f"Detected language: {info.language} (probability: {info.language_probability:.2%})")
print()

# Write transcript with timestamps
print(f"Writing transcript to: {transcript_file}")
transcript_file.parent.mkdir(parents=True, exist_ok=True)

segment_count = 0
with open(transcript_file, "w", encoding="utf-8") as f:
    for segment in segments:
        timestamp = f"[{segment.start:.2f}-{segment.end:.2f}]"
        text = segment.text.strip()
        line = f"{timestamp} {text}\n"
        f.write(line)
        
        segment_count += 1
        if segment_count % 10 == 0:
            print(f"  Processed {segment_count} segments...")
        
        # Also print first few for preview
        if segment_count <= 5:
            preview = text[:80] + "..." if len(text) > 80 else text
            print(f"  {timestamp} {preview}")

print()
print(f"✓ Transcription complete: {segment_count} segments")
print(f"✓ Saved to: {transcript_file}")
print()
print("Next step: node scripts/extract_todos.mjs")
