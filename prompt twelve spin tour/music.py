# Original music bed for the Spin Tour preview, synthesized from scratch (no samples, no licensing).
# Minimal warm house, 120 BPM, A minor: pads + sub bass from 0 s; drums enter on the first room cut.
# Usage: python3 music.py <seconds> <drums_start_seconds> work/music.wav
import sys
import numpy as np
import soundfile as sf

SR = 48000
dur, drop, out = float(sys.argv[1]), float(sys.argv[2]), sys.argv[3]
bpm = 120.0; beat = 60 / bpm
n = int(dur * SR); t = np.arange(n) / SR
rng = np.random.default_rng(7)
mix = np.zeros((n, 2))

def note(freq, start, length, amp, kind="pad"):
    a, b = int(start * SR), min(n, int((start + length) * SR))
    if a >= n: return
    tt = np.arange(b - a) / SR
    if kind == "pad":   # detuned saws, slow attack, soft lowpass via averaging
        w = sum(((tt * freq * d) % 1) * 2 - 1 for d in (0.995, 1.0, 1.005)) / 3
        w = np.convolve(w, np.ones(24) / 24, "same")
        env = np.minimum(1, tt / 0.6) * np.minimum(1, (length - tt) / 0.8)
    else:               # sine sub bass with a short pluck envelope
        w = np.sin(2 * np.pi * freq * tt)
        env = np.minimum(1, tt / 0.01) * np.exp(-tt * 2.2)
    seg = (w * env * amp)[:, None]
    pan = np.array([[0.9, 1.0]]) if kind == "pad" else np.array([[1.0, 1.0]])
    mix[a:b] += seg * pan

# Am – F – C – G, one chord per bar (2 s)
chords = [(220.0, 261.63, 329.63), (174.61, 220.0, 261.63), (130.81, 196.0, 261.63), (196.0, 246.94, 293.66)]
roots = [55.0, 43.65, 65.41, 49.0]
bar = 4 * beat
for k in range(int(dur / bar) + 1):
    c = chords[k % 4]
    for f in c: note(f, k * bar, bar + 0.4, 0.05)
    for s in range(8):  # eighth-note sub pulse
        note(roots[k % 4], k * bar + s * beat / 2, beat / 2, 0.22 if s % 2 == 0 else 0.12, "bass")

def hit(start, kind):
    a = int(start * SR)
    if a >= n: return
    L = int((0.35 if kind == "kick" else 0.12) * SR); L = min(L, n - a); tt = np.arange(L) / SR
    if kind == "kick":
        f = 50 + 90 * np.exp(-tt * 30); w = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9) * 0.9
    elif kind == "clap":
        w = rng.standard_normal(L) * np.exp(-tt * 28) * 0.28
    else:
        w = np.diff(rng.standard_normal(L + 1)) * np.exp(-tt * 70) * 0.10
    mix[a:a + L] += w[:, None]

steps = int((dur - drop) / (beat / 2)) + 1
for s in range(steps):
    when = drop + s * beat / 2
    if s % 2 == 0: hit(when, "kick")
    else: hit(when, "hat")
    if s % 4 == 2: hit(when, "clap")
# drop: tiny riser into the first cut
r = int(max(0, drop - 1.0) * SR), int(drop * SR)
mix[r[0]:r[1]] += (rng.standard_normal(r[1] - r[0]) * np.linspace(0, 0.08, r[1] - r[0]))[:, None]

mix *= 0.9 / np.max(np.abs(mix))
fade = int(1.2 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
sf.write(out, mix.astype(np.float32), SR)
print(f"{out}: {dur:.2f}s, drums from {drop:.2f}s")
