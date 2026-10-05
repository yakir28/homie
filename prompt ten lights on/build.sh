#!/usr/bin/env bash
# Lights On — preview edit. Two Seedance chapters in, one 20 s 9:16 film out.
# Edit layer from video-plan.md §4: 3x3 grid reveal on the first cut, white flash on the
# exterior→interior cut, beat-locked music, teal/orange grade, grain and vignette.
# Usage: ./build.sh work/ch1.mp4 work/ch2.mp4 [work/music.mp3]  -> preview.mp4 + thumbnail.jpg
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
CH1="$1"; CH2="$2"; MUSIC="${3:-}"
MUSIC_VOL="${MUSIC_VOL:-0.8}"
W=1080; H=1920; FPS=30
mkdir -p work

# cut points inside chapter 1 (scene changes)
mapfile -t CUTS < <(ffmpeg -v info -i "$CH1" -vf "select='gt(scene,0.28)',showinfo" -f null - 2>&1 \
  | grep -o 'pts_time:[0-9.]*' | cut -d: -f2)
read -r TG TF < <(python3 - "${CUTS[@]}" <<'EOF'
import sys
cuts = [float(c) for c in sys.argv[1:]]
# grid reveal replaces the first cut (sconce -> facade, planned at 1.5 s)
tg = min(cuts, key=lambda c: abs(c - 1.5)) if cuts else 1.5
# flash sits on the cut from the last exterior shot into the first room (planned at 5.5-6.5 s)
tf = min(cuts, key=lambda c: abs(c - 6.2)) if cuts else 6.2
print(round(tg, 3), round(tf, 3))
EOF
)
echo "grid reveal at $TG s, flash at $TF s"

D1=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$CH1")
D2=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$CH2")
DUR=$(python3 -c "print(round(min(20.0, $D1 - 0.30 + $D2), 3))")
FIT="scale=$W:$H:force_original_aspect_ratio=increase:flags=lanczos,crop=$W:$H,fps=$FPS,setsar=1,format=yuv420p,settb=AVTB"

# 3x3 grid reveal: each tile of the facade shot pops in over the sconce shot, 60 ms apart,
# in a centre-out order; thin grid lines sit over the sconce shot and fade out as it resolves.
TW=$((W/3)); TH=$((H/3))
GRID=$(python3 - "$TG" "$TW" "$TH" <<'EOF'
import sys
tg, tw, th = float(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
order = [4, 1, 5, 7, 3, 2, 8, 6, 0]       # centre, then around
start = tg - 0.30                          # sconce frame still holding when the tiles start
f, prev = "", "a0"
f += "[b]split=9" + "".join(f"[b{i}]" for i in range(9)) + ";"
for k, i in enumerate(order):
    x, y = (i % 3) * tw, (i // 3) * th
    t = round(start + k * 0.06, 3)
    f += f"[b{i}]crop={tw}:{th}:{x}:{y}[t{i}];[{prev}][t{i}]overlay={x}:{y}:enable='gte(t,{t})'[a{k+1}];"
    prev = f"a{k+1}"
end = round(start + 9 * 0.06 + 0.15, 3)
lines = ",".join(
    [f"drawbox=x={tw*c-1}:y=0:w=2:h=ih:color=white@0.30:t=fill:enable='lt(t,{end})'" for c in (1, 2)] +
    [f"drawbox=x=0:y={th*r-1}:w=iw:h=2:color=white@0.30:t=fill:enable='lt(t,{end})'" for r in (1, 2)])
f += f"[{prev}]{lines}[grid]"
print(f)
EOF
)

# music: start the track so a beat lands on the grid reveal
AUDIO_IN=(); AUDIO_F="anullsrc=r=48000:cl=stereo,atrim=0:$DUR[a]"
if [ -n "$MUSIC" ]; then
  OFF=$(python3 - "$MUSIC" "$TG" <<'EOF'
import sys, warnings; warnings.filterwarnings("ignore")
import librosa
y, sr = librosa.load(sys.argv[1], duration=60)
_, b = librosa.beat.beat_track(y=y, sr=sr)
beats = librosa.frames_to_time(b, sr=sr)
tg = float(sys.argv[2]) - 0.30
# first beat after the intro bar that leaves room before the reveal
cand = [x for x in beats if x - tg >= 0]
print(round((cand[min(4, len(cand) - 1)] if cand else 0) - tg, 3))
EOF
)
  echo "music offset $OFF s"
  AUDIO_IN=(-ss "$OFF" -i "$MUSIC")
  AUDIO_F="[2:a]atrim=0:$DUR,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,volume=$MUSIC_VOL,afade=t=in:d=0.3,afade=t=out:st=$(python3 -c "print($DUR-1.2)"):d=1.2[a]"
fi

GRADE="colorbalance=rs=-0.04:bs=0.05:rh=0.05:bh=-0.04,eq=contrast=1.06:saturation=1.08,vignette=angle=PI/5,noise=alls=5:allf=t"

SHIFT=0.30   # the reveal starts this much before the cut, so everything after it moves earlier
V1END=$(python3 -c "print(round($D1-$SHIFT,3))")
TFO=$(python3 -c "print(round($TF-$SHIFT,3))")
FLASH="color=c=white:s=${W}x${H}:r=$FPS:d=$DUR,format=rgba,fade=t=in:st=$(python3 -c "print($TFO-0.07)"):d=0.07:alpha=1,fade=t=out:st=$TFO:d=0.2:alpha=1,settb=AVTB[flash]"
ffmpeg -v error -y -i "$CH1" -i "$CH2" "${AUDIO_IN[@]}" -filter_complex "\
[0:v]$FIT,split=2[c1a][c1b];\
[c1a]trim=0:$TG,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=$D1[a0];\
[c1b]trim=start=$TG,setpts=PTS-STARTPTS+($TG-$SHIFT)/TB[b];\
$GRID;\
[grid]trim=0:$V1END,setpts=PTS-STARTPTS[v1];\
[1:v]$FIT[c2];\
[v1][c2]concat=n=2:v=1:a=0,settb=AVTB[cat];\
$FLASH;\
[cat][flash]overlay=0:0:format=auto,$GRADE,trim=0:$DUR,format=yuv420p[v];\
$AUDIO_F" \
  -map "[v]" -map "[a]" -t "$DUR" -c:v libx264 -crf 18 -maxrate 14M -bufsize 28M -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart preview.mp4

# thumbnail: the blue-hour facade once the grid has resolved
ffmpeg -v error -y -ss "$(python3 -c "print($TG+1.0)")" -i preview.mp4 -frames:v 1 -q:v 2 thumbnail.jpg
echo "preview.mp4 ($DUR s)"
