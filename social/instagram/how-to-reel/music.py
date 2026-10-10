# Original ad music for the how-to reel, synthesized (no samples): 128 BPM driving house in A minor.
# Drums from the first frame; a drum break before the reveal, then everything drops back in.
# Usage: python3 music.py <seconds> <break_start> <break_end> <out.wav>
import sys
import numpy as np
import soundfile as sf
SR = 48000
dur, b0, b1, out = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
beat = 60 / 128; n = int(dur * SR); rng = np.random.default_rng(5)
mix = np.zeros((n, 2))
def add(start, w, pan=(1.0, 1.0)):
    a = int(start * SR)
    if a >= n: return
    w = w[: n - a]; mix[a:a + len(w)] += w[:, None] * np.array(pan)
def tone(freq, length, amp, kind):
    tt = np.arange(int(length * SR)) / SR
    if kind == "pad":
        w = sum(((tt * freq * d) % 1) * 2 - 1 for d in (0.993, 1.0, 1.007)) / 3
        w = np.convolve(w, np.ones(18) / 18, "same"); env = np.minimum(1, tt / 0.005) * np.exp(-tt * 6)
    elif kind == "bass":
        w = np.tanh(2.2 * np.sin(2 * np.pi * freq * tt)); env = np.minimum(1, tt / 0.005) * np.exp(-tt * 5)
    else:  # pluck lead
        w = ((tt * freq) % 1) * 2 - 1; w = np.convolve(w, np.ones(10) / 10, "same"); env = np.exp(-tt * 9)
    return w * env * amp
in_break = lambda t: b0 <= t < b1
chords = [(220.0, 261.63, 329.63), (174.61, 220.0, 261.63), (130.81, 196.0, 261.63), (196.0, 246.94, 293.66)]
roots = [55.0, 43.65, 65.41, 49.0]; lead = [659.25, 523.25, 587.33, 493.88]
bar = 4 * beat
for k in range(int(dur / bar) + 1):
    for s in range(8):  # off-beat chord stabs and an eighth-note bass
        t = k * bar + s * beat / 2
        if in_break(t): continue
        if s % 2 == 1:
            for f in chords[k % 4]: add(t, tone(f, beat / 2, 0.05, "pad"), (0.85, 1.0))
        add(t, tone(roots[k % 4], beat / 2, 0.20, "bass"))
    for s in (0, 3, 6):
        t = k * bar + s * beat / 2
        add(t, tone(lead[(k + s) % 4], 0.3, 0.05, "lead"), (1.0, 0.8))
def drum(kind):
    if kind == "kick":
        tt = np.arange(int(0.3 * SR)) / SR; f = 48 + 110 * np.exp(-tt * 35)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 10) * 0.95
    if kind == "clap":
        tt = np.arange(int(0.15 * SR)) / SR; return rng.standard_normal(len(tt)) * np.exp(-tt * 25) * 0.3
    tt = np.arange(int(0.06 * SR)) / SR; return np.diff(rng.standard_normal(len(tt) + 1)) * np.exp(-tt * 80) * 0.12
for s in range(int(dur / (beat / 4)) + 1):
    t = s * beat / 4
    if in_break(t): continue
    if s % 4 == 0: add(t, drum("kick"))
    if s % 8 == 4: add(t, drum("clap"))
    if s % 2 == 1: add(t, drum("hat"), (0.8, 1.0))
# noise riser through the break into the drop
a, b = int(b0 * SR), int(b1 * SR)
mix[a:b] += (rng.standard_normal(b - a) * np.linspace(0, 0.18, b - a) ** 1.5)[:, None]
mix *= 0.9 / np.max(np.abs(mix)); fade = int(0.6 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
sf.write(out, mix.astype(np.float32), SR)
print(f"{out}: {dur:.2f}s at 128 BPM, break {b0:.2f}-{b1:.2f}s")
