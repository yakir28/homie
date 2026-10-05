#!/usr/bin/env bash
# Spin Tour — preview edit. One continuous 20 s take, cut at its room changes, and each change gets
# its own camera-motivated transition (never the same move twice in a row):
#   1 native push-blur (beat drop) · 2 whip-pan left · 3 whip tilt-up · 4 one roll · 5 zoom punch · 6 whip-pan right
# No captions.
# Usage: ./build.sh work/take.mp4 work/song.wav  -> preview.mp4, preview-web.mp4, thumbnail.jpg
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
TAKE="$1"; SONG="$2"; DROP="${DROP:-32.97}"; MUSIC_VOL="${MUSIC_VOL:-0.8}"
D="${XF:-0.18}"   # overlap of each whip / zoom transition
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TAKE")

# room changes = large frame-to-frame differences, at least 1.5 s apart
CUTS=$(python3 - "$TAKE" <<'EOF'
import subprocess, sys, numpy as np
out = subprocess.run(["ffmpeg","-v","error","-i",sys.argv[1],"-vf","fps=24,scale=16:28,format=rgb24","-f","rawvideo","-"],capture_output=True).stdout
f = np.frombuffer(out,np.uint8).reshape(-1,28,16,3).astype(float)
d = np.abs(np.diff(f,axis=0)).mean(axis=(1,2,3))
cuts = []
for i in np.argsort(d)[::-1]:
    t = (i+1)/24
    if d[i] < 20: break
    if all(abs(t-c) >= 1.5 for c in cuts) and 0.8 < t < len(f)/24 - 0.8: cuts.append(t)
print(" ".join(f"{c:.3f}" for c in sorted(cuts)))
EOF
)
echo "room changes: $CUTS"
FIRST=$(echo $CUTS | cut -d' ' -f1)
OFF=$(python3 -c "print(round(max(0, $DROP - $FIRST), 3))")

read -r FILTER OUTDUR THUMB < <(python3 - "$DUR" "$D" $CUTS <<'EOF'
import sys
dur, D = float(sys.argv[1]), float(sys.argv[2]); cuts = [float(c) for c in sys.argv[3:]]
moves = ["native", "whipleft", "whipup", "roll", "zoom", "whipright"]
moves = (moves * 3)[:len(cuts)]
edges = [0.0] + cuts + [dur]
n = len(edges) - 1
f = [f"[0:v]scale=1080:1920:flags=lanczos,fps=30,setsar=1,format=yuv420p,split={n}" + "".join(f"[r{i}]" for i in range(n))]
for i in range(n):
    f.append(f"[r{i}]trim={edges[i]:.3f}:{edges[i+1]:.3f},setpts=PTS-STARTPTS,settb=1/30[s{i}]")
cur, length, windows, roll_at = "s0", edges[1], [], None
for i, move in enumerate(moves, start=1):
    seg = edges[i+1] - edges[i]; out = f"j{i}"
    if move in ("native", "roll"):
        f.append(f"[{cur}][s{i}]concat=n=2:v=1:a=0,settb=1/30[{out}]")
        if move == "roll": roll_at = length
        length += seg
    else:
        kind = {"whipleft": "slideleft", "whipup": "slideup", "zoom": "zoomin", "whipright": "slideright"}[move]
        off = length - D
        f.append(f"[{cur}][s{i}]xfade=transition={kind}:duration={D}:offset={off:.3f},settb=1/30[{out}]")
        windows.append((move, off - 0.06, off + D + 0.06))
        length += seg - D
    cur = out
# motion blur that matches each move's direction
blur = {"whipleft": "gblur=sigma=34:sigmaV=0.01", "whipright": "gblur=sigma=34:sigmaV=0.01",
        "whipup": "gblur=sigma=0.01:sigmaV=46", "zoom": "gblur=sigma=5"}
f.append(f"[{cur}]split={len(windows)+1}[b0]" + "".join(f"[w{k}]" for k in range(len(windows))))
prev = "b0"
for k, (move, a, b) in enumerate(windows):
    f.append(f"[w{k}]format=gbrp,{blur[move]},format=yuv420p[wb{k}]")
    f.append(f"[{prev}][wb{k}]overlay=0:0:enable='between(t,{a:.3f},{b:.3f})'[o{k}]")
    prev = f"o{k}"
# the single roll: ease into ±90° before the cut, out of ∓90° after it; zoom crops the empty corners
if roll_at is not None:
    h = 0.24; c = roll_at
    A = (f"(if(between(T,{c-h:.3f},{c:.3f}),PI/2*pow((T-{c-h:.3f})/{h},2),0)"
         f"-if(between(T,{c:.3f},{c+h:.3f}),PI/2*pow(1-(T-{c:.3f})/{h},2),0))")
    rot, zt = A.replace("T", "t"), A.replace("T", "(on/30)")
    f.append(f"[{prev}]split[ra][rb];[rb]tmix=frames=3[rbt];[ra][rbt]overlay=0:0:enable='between(t,{c-h:.3f},{c+h:.3f})'[rm]")
    f.append(f"[rm]scale=iw*2:ih*2,rotate=a='{rot}':ow=iw:oh=ih:c=black,"
             f"zoompan=z='cos({zt})+1.7778*abs(sin({zt}))':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1080x1920:fps=30,format=yuv420p[v]")
else:
    f.append(f"[{prev}]null[v]")
print(";".join(f), f"{length:.3f}", f"{edges[1] + 1.6:.3f}")
EOF
)
echo "output ${OUTDUR} s"
ffmpeg -v error -y -i "$TAKE" -ss "$OFF" -i "$SONG" -filter_complex "$FILTER;\
[1:a]atrim=0:$OUTDUR,asetpts=PTS-STARTPTS,aresample=48000,volume=$MUSIC_VOL,afade=t=in:d=0.3,afade=t=out:st=$(python3 -c "print($OUTDUR-1.2)"):d=1.2,alimiter=limit=0.9[a]" \
  -map "[v]" -map "[a]" -t "$OUTDUR" -c:v libx264 -crf 18 -maxrate 12M -bufsize 24M -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart preview.mp4
ffmpeg -v error -y -i preview.mp4 -vf "scale=720:1280:flags=lanczos" -c:v libx264 -crf 24 -maxrate 3M -bufsize 6M -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart preview-web.mp4
ffmpeg -v error -y -ss "$THUMB" -i preview.mp4 -frames:v 1 -q:v 2 thumbnail.jpg
echo "preview.mp4 ($OUTDUR s, song offset $OFF s)"
