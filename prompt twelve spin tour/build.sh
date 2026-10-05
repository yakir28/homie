#!/usr/bin/env bash
# Spin Tour — preview edit. One continuous 20 s take; every room change becomes a "spin cut":
# the frame rolls 90° into the cut and out of the next room in the same direction, with motion blur
# and a zoom (applied after the rotation) that crops the rotated frame's empty corners away. Song beat drop lands on the first cut.
# No captions.
# Usage: ./build.sh work/take.mp4 work/song.wav  -> preview.mp4, preview-web.mp4, thumbnail.jpg
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
TAKE="$1"; SONG="$2"; DROP="${DROP:-32.97}"; MUSIC_VOL="${MUSIC_VOL:-0.8}"
HALF="${HALF:-0.22}"   # seconds of rotation on each side of a cut
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
echo "spin cuts: $CUTS"
FIRST=$(echo $CUTS | cut -d' ' -f1)
OFF=$(python3 -c "print(round(max(0, $DROP - $FIRST), 3))")

# angle a(t): ease-in to ±90° before each cut, ease-out from ∓90° after it (same visual direction)
read -r ANGLE ZOOM BLUR < <(python3 - "$HALF" $CUTS <<'EOF'
import sys
h = float(sys.argv[1]); cuts = [float(c) for c in sys.argv[2:]]
terms, wins = [], []
for i, c in enumerate(cuts):
    s = 1 if i % 2 == 0 else -1
    terms.append(f"{s}*(if(between(t,{c-h:.3f},{c:.3f}),PI/2*pow((t-{c-h:.3f})/{h},2),0)-if(between(t,{c:.3f},{c+h:.3f}),PI/2*pow(1-(t-{c:.3f})/{h},2),0))")
    wins.append(f"between(t,{c-h:.3f},{c+h:.3f})")
a = "+".join(terms)
print(a.replace(" ", ""), "cos(A)+1.7778*abs(sin(A))", "+".join(wins))
EOF
)
ZANGLE=$(echo "$ANGLE" | sed "s/\bt\b/(on\/30)/g"); ZEXPR="cos($ZANGLE)+1.7778*abs(sin($ZANGLE))"
FIT="scale=1080:1920:flags=lanczos,fps=30,setsar=1"
ffmpeg -v error -y -i "$TAKE" -ss "$OFF" -i "$SONG" -filter_complex "\
[0:v]$FIT,format=yuv420p,split=2[p][m];\
[m]tmix=frames=5:weights='1 1 2 1 1'[mb];\
[p][mb]overlay=0:0:enable='$BLUR'[blurred];\
[blurred]scale=iw*2:ih*2,rotate=a='$ANGLE':ow=iw:oh=ih:c=black,\
zoompan=z='$ZEXPR':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1080x1920:fps=30,format=yuv420p[v];\
[1:a]atrim=0:$DUR,asetpts=PTS-STARTPTS,aresample=48000,volume=$MUSIC_VOL,afade=t=in:d=0.3,afade=t=out:st=$(python3 -c "print($DUR-1.2)"):d=1.2,alimiter=limit=0.9[a]" \
  -map "[v]" -map "[a]" -t "$DUR" -c:v libx264 -crf 18 -maxrate 12M -bufsize 24M -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart preview.mp4
ffmpeg -v error -y -i preview.mp4 -vf "scale=720:1280:flags=lanczos" -c:v libx264 -crf 24 -maxrate 3M -bufsize 6M -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart preview-web.mp4
ffmpeg -v error -y -ss "$(python3 -c "print($FIRST+1.6)")" -i preview.mp4 -frames:v 1 -q:v 2 thumbnail.jpg
echo "preview.mp4 ($DUR s, song offset $OFF s)"
