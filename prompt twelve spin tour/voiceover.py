# Spin Tour voiceover with Kokoro (kokoro-onnx, local); one line per room, placed on the cut times.
# Usage: python3 voiceover.py <kokoro.onnx> <voices.bin> work/vo.wav [voice]
import sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

MODEL, VOICES, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
VOICE = sys.argv[4] if len(sys.argv) > 4 else "am_michael"
TOTAL, SR = 20.04, 24000
LINES = [  # (start s, line) — facade, great room, kitchen, foyer, bedroom, bath, aerial
    (0.30, "Some homes don't need an introduction."),
    (2.60, "Two storeys of light."),
    (5.60, "Black marble, crystal, and room to gather."),
    (8.40, "An entrance worth slowing down for."),
    (11.45, "A suite made for slow mornings."),
    (14.45, "A spa you won't want to leave."),
    (16.75, "Made from listing photos. With Homie."),
]
k = Kokoro(MODEL, VOICES)
track = np.zeros(int(TOTAL * SR), dtype=np.float32)
for i, (start, text) in enumerate(LINES):
    s, sr = k.create(text, voice=VOICE, speed=1.0, lang="en-us"); assert sr == SR
    end = start + len(s) / SR; nxt = LINES[i + 1][0] if i + 1 < len(LINES) else TOTAL
    print(f"{start:5.2f}-{end:5.2f}s {'OVERLAP ' if end > nxt else ''}{text}")
    a = int(start * SR); seg = s[: len(track) - a]; track[a:a + len(seg)] += seg
sf.write(OUT, track, SR)
