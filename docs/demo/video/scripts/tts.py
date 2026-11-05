"""Narration: Kokoro 0.9.4 (local, offline after the first weights download), English.

Reads each scene's words from src/generated/data.json, which prebuild.mjs extracts from section 4 of
the approved demo script, so the words are never copied by hand. Writes, per scene:
  audio/<id>.wav          24 kHz mono
  audio/<id>.words.json   word timings from Kokoro's token start_ts/end_ts, in seconds from scene start
Usage: .venv\\Scripts\\python.exe scripts\\tts.py [S1 S2 ...]
"""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "src" / "generated" / "data.json").read_text(encoding="utf-8"))
OUT = ROOT / "audio"
OUT.mkdir(exist_ok=True)

VOICE = "af_heart"
SPEED = 1.0
SR = 24000
only = set(sys.argv[1:])

pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")  # American English

total = 0.0
for scene in DATA["scenes"]:
    sid = scene["id"]
    if only and sid not in only:
        continue
    chunks, words, offset = [], [], 0.0
    for result in pipe(scene["text"], voice=VOICE, speed=SPEED):
        audio = result.audio
        arr = audio.detach().cpu().numpy() if hasattr(audio, "detach") else np.asarray(audio)
        for t in result.tokens or []:
            if t.start_ts is None or t.end_ts is None:
                continue
            words.append({"text": t.text, "start": round(offset + t.start_ts, 3), "end": round(offset + t.end_ts, 3), "ws": t.whitespace})
        chunks.append(arr)
        offset += len(arr) / SR
    audio = np.concatenate(chunks)
    dur = len(audio) / SR
    total += dur
    sf.write(OUT / f"{sid}.wav", audio, SR)
    (OUT / f"{sid}.words.json").write_text(
        json.dumps({"id": sid, "duration": round(dur, 3), "voice": VOICE, "speed": SPEED, "planned": scene["seconds"], "words": words}, indent=1),
        encoding="utf-8",
    )
    print(f"{sid}: {dur:5.2f}s spoken (planned {scene['seconds']}s), {len(words)} timed tokens")
print(f"total spoken: {total:.1f}s")
