#!/usr/bin/env bash
# Builds the "Comment PROMPT" UGC Reel from the Higgsfield avatar video (talking head only).
# Edit follows ugc/reference/ref-01 (split screen, seam captions) + /brag rules: beat-locked music,
# SFX that land with the motion, every text beat kinetic, poster baked as frame 0.
# Usage: ./build.sh <avatar.mp4> [crop_y]   -> reel.mp4
#   crop_y: top of the 1080x960 window cut from the 1080x1920 avatar for the bottom half (default 120).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
AV="$1"; CROP_Y="${2:-120}"
ROOT="$(cd ../../../.. && pwd)"
BRAG=${BRAG_DIR:-/home/user/latent-spaces/brag/skills/brag}
SFX="$BRAG/assets/sfx"
MUSIC="${MUSIC:-$HERE/work/music.mp3}"   # background track supplied with the brief
MUSIC_VOL="${MUSIC_VOL:-0.5}"            # steady level, no ducking
VOICE_VOL="${VOICE_VOL:-2.0}"
mkdir -p work

python3 align.py "$AV" > work/timing.json
[ -f work/music-cues.json ] || python3 "$BRAG/scripts/analyze_music_cues.py" "$MUSIC" \
  --output-json work/music-cues.json --output-md work/music-cues.md --window-duration 40 >/dev/null
# beat-lock: start the track so its first beat lands on the cut to the full-frame "no camera crew" beat
MUSIC_OFFSET=$(python3 - <<'EOF'
import json
t = json.load(open("work/timing.json")); c = json.load(open("work/music-cues.json"))
beats = [b if isinstance(b, (int, float)) else b["time"] for b in c["beats"]]
off = max(0.0, beats[0] - t["phrases"][1]["start"])
json.dump([round(b - off, 3) for b in beats if 0 <= b - off <= t["duration"]], open("work/beats.json", "w"))
print(round(off, 3))
EOF
)
node timeline.mjs
DUR=$(python3 -c "import json;print(json.load(open('work/timing.json'))['duration'])")
NODE_PATH=/opt/node-tools/node_modules node "$ROOT/.claude/skills/homie-reel/scripts/render-frames.mjs" work/timeline.html "$DUR" work/gfx
read AX AY AW AH AT0 AT1 TX TY TW TH TT0 FT0 FT1 < <(python3 -c "
import json;L=json.load(open('work/layout.json'));a=L['holes']['after'];t=L['holes']['tour'];f=L['full']
print(a['x'],a['y'],a['w'],a['h'],a['t0'],a['t1'],t['x'],t['y'],t['w'],t['h'],t['t0'],f['t0'],f['t1'])")

# SFX inputs + delayed/leveled branches from work/sfx.json
read -r SFX_INPUTS SFX_FILTERS SFX_LABELS SFX_N < <(python3 - "$SFX" <<'EOF'
import json, sys
cues = json.load(open("work/sfx.json")); base = 5
inputs = " ".join(f"-i {sys.argv[1]}/{c['f']}" for c in cues)
filt = "".join(f"[{base+i}]aresample=44100,aformat=channel_layouts=stereo,adelay={int(c['t']*1000)}:all=1,volume={c['v']}[s{i}];" for i, c in enumerate(cues))
labels = "".join(f"[s{i}]" for i in range(len(cues)))
print(inputs.replace(" ", "|"), filt, labels, len(cues))
EOF
)
IFS='|' read -r -a SFX_ARGS <<< "$SFX_INPUTS"

TOUR="$ROOT/prompt seven picture day/video/picture-day-high-pace-v1.mp4"  # Picture Day tour, no text overlays
AFTER="$ROOT/prompt six stop the scroll/video/clips/01-hook.mp4"          # tour of the 'Before' house
FIT="fps=30,format=yuv420p,settb=AVTB"
ZOOM="1+0.07*min(1,max(0,(it-$FT0)/($FT1-$FT0)))"                       # slow push-in on the full-frame beat
ffmpeg -v error -y \
  -i "$AV" -i "$AFTER" -i "$TOUR" -reinit_filter 0 -framerate 30 -i work/gfx/%05d.png -ss "$MUSIC_OFFSET" -i "$MUSIC" \
  "${SFX_ARGS[@]}" \
  -filter_complex "\
color=c=black:s=1080x1920:r=30:d=$DUR,format=yuv420p,settb=AVTB[bg];\
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,$FIT,split=2[avA][avB];\
[avA]crop=1080:960:0:$CROP_Y[avBottom];\
[bg][avBottom]overlay=0:960[v1];\
[avB]zoompan=z='$ZOOM':d=1:x='iw/2-(iw/zoom/2)':y='ih/3-(ih/zoom/3)':s=1080x1920:fps=30,setsar=1,settb=AVTB[avFull];\
[v1][avFull]overlay=0:0:enable='between(t,$FT0,$FT1)'[v2];\
[1:v]scale=$AW:$AH:force_original_aspect_ratio=increase,crop=$AW:$AH,$FIT,setpts=PTS-STARTPTS+$AT0/TB[after];\
[v2][after]overlay=$AX:$AY:enable='between(t,$AT0,$AT1)':eof_action=pass[v3];\
[2:v]trim=3.4,setpts=PTS-STARTPTS,scale=$TW:$TH:force_original_aspect_ratio=increase,crop=$TW:$TH,$FIT,setpts=PTS-STARTPTS+$TT0/TB[tour];\
[v3][tour]overlay=$TX:$TY:enable='gte(t,$TT0)':eof_action=repeat[v4];\
[3]format=rgba,settb=AVTB[gfx];\
[v4][gfx]overlay=0:0:eof_action=pass,format=yuv420p[v];\
[0:a]aresample=44100,aformat=channel_layouts=stereo,volume=$VOICE_VOL[vo];\
[4]atrim=0:$DUR,asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo,volume=$MUSIC_VOL,afade=t=in:d=0.4,afade=t=out:st=$(python3 -c "print($DUR-1.0)"):d=1.0[mus];\
$SFX_FILTERS\
[vo][mus]$SFX_LABELS amix=inputs=$((SFX_N + 2)):normalize=0:duration=first,alimiter=limit=0.95[a]" \
  -map "[v]" -map "[a]" -t "$DUR" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart work/reel-raw.mp4

# poster: the settled "no camera crew" frame, baked as frame 0 so the idle thumbnail shows it
POSTER_T=$(python3 -c "print(round($FT1-0.25,3))")
ffmpeg -v error -y -ss "$POSTER_T" -i work/reel-raw.mp4 -frames:v 1 poster.jpg
ffmpeg -v error -y -i work/reel-raw.mp4 -i poster.jpg -filter_complex "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]" \
  -map "[v]" -map 0:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a copy -movflags +faststart reel.mp4
echo "reel.mp4 ($DUR s, music offset $MUSIC_OFFSET s)"
