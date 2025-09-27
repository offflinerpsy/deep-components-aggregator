import os, sys, tempfile, subprocess
from faster_whisper import WhisperModel

def rec_wav(path):
    # запись с автостопом по тишине (~1.2с)
    cmd = ["sox","-q","-d","-r","16000","-c","1","-b","16",path,
           "silence","1","0.10","1%","1","1.2","1%"]
    subprocess.run(cmd, check=True)

def to_clip(text):
    try:
        import pyperclip; pyperclip.copy(text)
    except Exception:
        if os.name=="nt":
            p = subprocess.Popen("clip", stdin=subprocess.PIPE, shell=True)
            p.stdin.write(text.encode("utf-16le")); p.stdin.close(); p.wait()

model_name = os.getenv("FW_MODEL","small")          # tiny|base|small|medium|large
compute    = os.getenv("FW_COMPUTE","int8")         # int8|int8_float16|float16|float32
model = WhisperModel(model_name, device="auto", compute_type=compute)

tmp = os.path.join(tempfile.gettempdir(), "voice_ru.wav")
print("���️ Говори… (стоп по тишине ~1с)", file=sys.stderr)
rec_wav(tmp)

segments, info = model.transcribe(tmp, language="ru", vad_filter=True)
text = "".join(s.text for s in segments).strip()
to_clip(text)
print(text)
print("\n✅ Скопировано в буфер обмена.", file=sys.stderr)
