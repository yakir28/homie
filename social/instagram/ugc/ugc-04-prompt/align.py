# Aligns the known script to the avatar's speech without an ASR model:
# detects speech regions with ffmpeg silencedetect, maps them onto the script's phrases,
# then spreads each phrase's words by character weight.
# Usage: python3 align.py <avatar.mp4|wav> > work/timing.json
import json
import re
import subprocess
import sys

PHRASES = [
    ["These", "are", "real", "estate", "videos,"],
    ["made", "without", "a", "camera", "crew."],
    ["Just", "the", "listing", "photos", "you", "already", "have."],
    ["Go", "to", ("homie-app.com", "homie app dot com")],
    ["pick", "a", "style,"],
    ["and", "get", "a", "home", "tour", "you'd", "actually", "post."],
    ["Comment", "PROMPT", "and", "I'll", "send", "you", "the", "link."],
]

src = sys.argv[1]
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src],
                           capture_output=True, text=True).stdout)
log = subprocess.run(["ffmpeg", "-i", src, "-af", "silencedetect=noise=-32dB:d=0.16", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
# speech segments = gaps between silences
segs, t = [], 0.0
for s, e in zip(starts, ends + [dur]):
    if s - t > 0.12:
        segs.append([t, s])
    t = e
if dur - t > 0.12:
    segs.append([t, dur])

weight = lambda p: sum(len(w if isinstance(w, str) else w[1]) for w in p)
n = len(PHRASES)
# merge the closest neighbours until we have one segment per phrase
while len(segs) > n:
    gaps = [segs[i + 1][0] - segs[i][1] for i in range(len(segs) - 1)]
    i = gaps.index(min(gaps))
    segs[i:i + 2] = [[segs[i][0], segs[i + 1][1]]]
# split the longest segments if speech ran phrases together
while len(segs) < n:
    i = max(range(len(segs)), key=lambda k: segs[k][1] - segs[k][0])
    a, b = segs[i]
    m = a + (b - a) / 2
    segs[i:i + 1] = [[a, m], [m, b]]

out = []
for (a, b), p in zip(segs, PHRASES):
    total, words, cur = weight([p][0]), [], a
    for w in p:
        disp, spoken = (w, w) if isinstance(w, str) else w
        d = (b - a) * len(spoken) / total
        words.append({"w": disp, "start": round(cur, 3), "end": round(cur + d, 3)})
        cur += d
    out.append({"text": " ".join(x["w"] for x in words), "start": round(a, 3), "end": round(b, 3), "words": words})
json.dump({"duration": round(dur, 3), "phrases": out}, sys.stdout, indent=1)
