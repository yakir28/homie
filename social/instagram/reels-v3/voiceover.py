# Generates the Reel 1 voiceover with Kokoro (kokoro-onnx, local) and places each line on the timeline.
# Usage: python3 voiceover.py <kokoro-v1.0.onnx> <voices-v1.0.bin> [voice]
# Writes work/vo/line-*.wav and work/vo/reel-1-vo.wav (mono, 24 kHz, 19.6s).
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

MODEL, VOICES = sys.argv[1], sys.argv[2]
VOICE = sys.argv[3] if len(sys.argv) > 3 else "af_heart"
TOTAL = 19.6
SR = 24000

# (start seconds, line) — aligned with the on-screen beats in timelines.mjs
LINES = [
    (0.25, "These are just listing photos."),
    (2.85, "Watch them turn into a home tour."),
    (7.55, "No shoot. No editing. No prompts."),
    (11.6, "Just pick a style, and approve it."),
    (14.8, "Same photos. Now they move."),
    (17.3, "Try Homie free. Link in bio."),
]

out = Path(__file__).parent / "work" / "vo"
out.mkdir(parents=True, exist_ok=True)
kokoro = Kokoro(MODEL, VOICES)
track = np.zeros(int(TOTAL * SR), dtype=np.float32)
for i, (start, text) in enumerate(LINES):
    samples, sr = kokoro.create(text, voice=VOICE, speed=1.05, lang="en-us")
    assert sr == SR, sr
    sf.write(out / f"line-{i + 1}.wav", samples, sr)
    end = start + len(samples) / sr
    nxt = LINES[i + 1][0] if i + 1 < len(LINES) else TOTAL
    flag = "  <-- overlaps next line" if end > nxt else ""
    print(f"{i + 1}: {start:5.2f}-{end:5.2f}s  {text}{flag}")
    a = int(start * SR)
    seg = samples[: len(track) - a]
    track[a : a + len(seg)] += seg
sf.write(out / "reel-1-vo.wav", track, SR)
print("wrote", out / "reel-1-vo.wav")
