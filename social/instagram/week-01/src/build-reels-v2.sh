#!/usr/bin/env bash
# Builds the v2 Reels (1080x1920, 30fps) from template footage + graphics rendered by render-reels-v2.mjs.
#   Reel 1: animated photo-card intro -> Stop the Scroll raw clips with branded labels -> animated end card.
#   Reel 2: Picture Day template with branded hook/labels -> animated end card.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
OUT=social/instagram/week-01/build
G=$OUT/v2; OV=$G/ov
STS="prompt six stop the scroll/video"
PD="prompt seven picture day/video/picture-day-high-pace-v1.mp4"
FIT="scale=1080:1920:flags=lanczos,setsar=1,fps=30,format=yuv420p,settb=AVTB"
ENC="-c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart"

# overlay NAME IN OUT -> appends an input + fade filter for a timed overlay
ov_inputs=(); ov_filters=""; ov_chain=""; ov_n=0
overlay() {
  local idx=$((BASE + ov_n))
  ov_inputs+=(-loop 1 -framerate 30 -t "$TOTAL" -i "$OV/$1.png")
  ov_filters+="[$idx]format=rgba,fade=t=in:st=$2:d=0.25:alpha=1,fade=t=out:st=$3:d=0.25:alpha=1[o$ov_n];"
  ov_chain+="[v$ov_n][o$ov_n]overlay=0:0[v$((ov_n + 1))];"
  ov_n=$((ov_n + 1))
}

# ---------------- Reel 1 ----------------
TOTAL=19.6; BASE=9; ov_inputs=(); ov_filters=""; ov_chain=""; ov_n=0
labels=(exterior living kitchen dining bedroom backyard)
for k in 0 1 2 3 4 5; do
  s=$(echo "2.6 + 2.4*$k" | bc -l)
  overlay "lbl-${labels[$k]}" "$(echo "$s + 0.35" | bc -l)" "$(echo "$s + 2.2" | bc -l)"
done
overlay r1-now-tour 2.75 4.6
overlay r1-no-shoot 7.6 11.4
overlay r1-same-photos 14.7 16.7

ffmpeg -v error -y \
  -framerate 30 -i "$G/intro/%04d.png" \
  -i "$STS/clips/01-hook.mp4" \
  -i "$STS/clips/02-living.mp4" -i "$STS/clips/03-kitchen.mp4" -i "$STS/clips/04-dining.mp4" \
  -i "$STS/clips/05-bedroom.mp4" -i "$STS/clips/06-backyard.mp4" \
  -framerate 30 -i "$G/end/%04d.png" \
  -i "$STS/soundtrack.wav" \
  "${ov_inputs[@]}" \
  -filter_complex "\
[0]$FIT[intro];\
[1]trim=0:2.8,setpts=PTS-STARTPTS,$FIT[c1];\
[2]trim=0.2:3.0,setpts=PTS-STARTPTS,$FIT[c2];\
[3]trim=0.2:3.0,setpts=PTS-STARTPTS,$FIT[c3];\
[4]trim=0.2:3.0,setpts=PTS-STARTPTS,$FIT[c4];\
[5]trim=0.2:3.0,setpts=PTS-STARTPTS,$FIT[c5];\
[6]trim=0.2:3.0,setpts=PTS-STARTPTS,$FIT[c6];\
[7]$FIT[end];\
[c1][c2]xfade=transition=fade:duration=0.4:offset=2.4[x1];\
[x1][c3]xfade=transition=fade:duration=0.4:offset=4.8[x2];\
[x2][c4]xfade=transition=fade:duration=0.4:offset=7.2[x3];\
[x3][c5]xfade=transition=fade:duration=0.4:offset=9.6[x4];\
[x4][c6]xfade=transition=fade:duration=0.4:offset=12.0[tour];\
[intro][tour]concat=n=2:v=1:a=0,settb=AVTB[body];\
[body][end]xfade=transition=fade:duration=0.4:offset=17.0[v0];\
$ov_filters$ov_chain\
[8]atrim=0:$TOTAL,afade=t=in:d=0.3,afade=t=out:st=18.2:d=1.4[a]" \
  -map "[v$ov_n]" -map "[a]" -t $TOTAL $ENC $OUT/reel-1-photos-to-tour-v2.mp4

# ---------------- Reel 2 ----------------
TOTAL=20.2; BASE=2; ov_inputs=(); ov_filters=""; ov_chain=""; ov_n=0
overlay r2-hook 0.05 3.2
overlay r2-photos 3.6 8.6
overlay r2-mid 9.15 12.2

ffmpeg -v error -y \
  -i "$PD" \
  -framerate 30 -i "$G/end/%04d.png" \
  "${ov_inputs[@]}" \
  -filter_complex "\
[0:v]$FIT[pd];[1]$FIT[end];\
[pd][end]xfade=transition=fade:duration=0.4:offset=17.6[v0];\
$ov_filters$ov_chain\
[0:a]aresample=44100,afade=t=out:st=16.8:d=1.4,apad[a]" \
  -map "[v$ov_n]" -map "[a]" -t $TOTAL $ENC $OUT/reel-2-picture-day-v2.mp4
