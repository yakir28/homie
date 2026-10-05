#!/usr/bin/env bash
# Builds the "Comment PROMPT" UGC Reel from the Higgsfield avatar video (talking head only).
# Usage: ./build.sh <avatar.mp4> [crop_y]   -> reel.mp4
#   crop_y: top of the 1080x960 window cut from the 1080x1920 avatar for the bottom half (default 420).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
AV="$1"; CROP_Y="${2:-420}"
ROOT="$(cd ../../../.. && pwd)"
SFX=${BRAG_SFX:-/home/user/latent-spaces/brag/skills/brag/assets/sfx}
mkdir -p work
python3 align.py "$AV" > work/timing.json
node timeline.mjs
DUR=$(python3 -c "import json;print(json.load(open('work/timing.json'))['duration'])")
NODE_PATH=/opt/node-tools/node_modules node "$ROOT/.claude/skills/homie-reel/scripts/render-frames.mjs" work/timeline.html "$DUR" work/gfx
read AX AY AW AH AT0 AT1 TX TY TW TH TT0 FT0 FT1 < <(python3 -c "
import json;L=json.load(open('work/layout.json'));a=L['holes']['after'];t=L['holes']['tour'];f=L['full']
print(a['x'],a['y'],a['w'],a['h'],a['t0'],a['t1'],t['x'],t['y'],t['w'],t['h'],t['t0'],f['t0'],f['t1'])")
TOUR="$ROOT/prompt seven picture day/video/picture-day-high-pace-v1.mp4"  # Picture Day tour, no text overlays
AFTER="$ROOT/prompt six stop the scroll/video/clips/01-hook.mp4"  # tour of the 'Before' house
MUSIC="$ROOT/prompt six stop the scroll/video/soundtrack.wav"
FIT="fps=30,format=yuv420p,settb=AVTB"
ffmpeg -v error -y \
  -i "$AV" -i "$AFTER" -i "$TOUR" -reinit_filter 0 -framerate 30 -i work/gfx/%05d.png -i "$MUSIC" \
  -filter_complex "\
color=c=black:s=1080x1920:r=30:d=$DUR,format=yuv420p,settb=AVTB[bg];\
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,$FIT,split=2[avA][avB];\
[avA]crop=1080:960:0:$CROP_Y[avBottom];\
[bg][avBottom]overlay=0:960[v1];\
[v1][avB]overlay=0:0:enable='between(t,$FT0,$FT1)'[v2];\
[1:v]scale=$AW:$AH:force_original_aspect_ratio=increase,crop=$AW:$AH,$FIT,setpts=PTS-STARTPTS+$AT0/TB[after];\
[v2][after]overlay=$AX:$AY:enable='between(t,$AT0,$AT1)':eof_action=pass[v3];\
[2:v]trim=3.4,setpts=PTS-STARTPTS,scale=$TW:$TH:force_original_aspect_ratio=increase,crop=$TW:$TH,$FIT,setpts=PTS-STARTPTS+$TT0/TB[tour];\
[v3][tour]overlay=$TX:$TY:enable='gte(t,$TT0)':eof_action=repeat[v4];\
[3]format=rgba,settb=AVTB[gfx];\
[v4][gfx]overlay=0:0:eof_action=pass,format=yuv420p[v];\
[0:a]aresample=44100,aformat=channel_layouts=stereo,volume=1.4,asplit=2[vo][sc];\
[4]atrim=0:$DUR,aresample=44100,aformat=channel_layouts=stereo,volume=0.35,afade=t=out:st=$(python3 -c "print($DUR-1.2)"):d=1.2[mus0];\
[mus0][sc]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=300[mus];\
[vo][mus]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]" \
  -map "[v]" -map "[a]" -t "$DUR" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart reel.mp4
echo "reel.mp4 ($DUR s)"
