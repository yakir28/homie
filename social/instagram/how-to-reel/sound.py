# Original swells for the how-to reel, synthesized (no samples): a rising whoosh and a riser.
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
sf.write(f"{out}/whoosh.wav", swell(0.6, 300, 6000, 0.97).astype(np.float32), SR)
sf.write(f"{out}/riser.wav", swell(1.0, 200, 9000, 0.98).astype(np.float32), SR)
print("whoosh.wav 0.6s, riser.wav 1.0s")
