# Original swells for the how-to reel, synthesized (no samples): a short whip, a riser and a sub drop.
# Usage: python3 sound.py <out-dir>
import sys
import numpy as np
import soundfile as sf
SR = 48000; out = sys.argv[1]; rng = np.random.default_rng(11)
def swell(seconds, lo, hi, peak):
    n = int(seconds * SR); t = np.arange(n) / SR
    noise = rng.standard_normal((n, 2))
    # band sweeps upward as it rises: one-pole lowpass with a rising cutoff
    cut = np.linspace(lo, hi, n); a = np.exp(-2 * np.pi * cut / SR); y = np.zeros_like(noise)
    for i in range(1, n): y[i] = (1 - a[i]) * noise[i] + a[i] * y[i - 1]
    y -= np.convolve(y[:, 0], np.ones(40) / 40, "same")[:, None] * 0.6
    env = (t / seconds) ** 2.2; env[int(peak * n):] *= np.linspace(1, 0, n - int(peak * n)) ** 0.3
    y *= env[:, None]; return y / np.max(np.abs(y)) * 0.8
sf.write(f"{out}/whoosh.wav", swell(0.3, 500, 8000, 0.95).astype(np.float32), SR)
sf.write(f"{out}/riser.wav", swell(0.6, 200, 9000, 0.98).astype(np.float32), SR)
# sub drop for the reveal: a sine that falls from 90 to 35 Hz
t = np.arange(int(0.8 * SR)) / SR; f = 35 + 55 * np.exp(-t * 6)
sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.5) * 0.9
sf.write(f"{out}/subdrop.wav", np.stack([sub, sub], 1).astype(np.float32), SR)
print("whoosh.wav 0.3s, riser.wav 0.6s, subdrop.wav 0.8s")
