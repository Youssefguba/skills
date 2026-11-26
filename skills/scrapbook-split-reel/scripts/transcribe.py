"""Word-level transcript for a reel.

Usage (run with the venv's python, -I so nothing loads from the cwd):
  python -I transcribe.py <video> <out.json> ["topic, technical terms, names"] [lang]

Prints one line per segment, then every word as word@start so you can time
captions and attachments. Writes the same data to out.json.
"""
import json, sys
import librosa
from faster_whisper import WhisperModel

src, out = sys.argv[1], sys.argv[2]
prompt = sys.argv[3] if len(sys.argv) > 3 else None
lang = sys.argv[4] if len(sys.argv) > 4 else "ar"

# faster-whisper's own decoder fails on some Pythons; decoded audio always works.
audio, _ = librosa.load(src, sr=16000)
model = WhisperModel("mobiuslabsgmbh/faster-whisper-large-v3-turbo", device="cpu", compute_type="int8")
segments, _ = model.transcribe(audio, language=lang, word_timestamps=True, beam_size=5, initial_prompt=prompt)

data = []
for s in segments:
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text}", flush=True)
    data.append({"start": s.start, "end": s.end, "text": s.text,
                 "words": [{"w": w.word.strip(), "s": w.start, "e": w.end} for w in s.words]})
json.dump(data, open(out, "w"), ensure_ascii=False, indent=1)
print()
for s in data:
    print(" ".join(f"{w['w']}@{w['s']:.2f}" for w in s["words"]))
