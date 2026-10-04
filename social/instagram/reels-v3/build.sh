#!/usr/bin/env bash
# Composites the v3 Reels: footage track (ffmpeg) + graphics frames (timelines.mjs -> render-frames.mjs) + sound.
# Run from anywhere after rendering frames into work/r1 and work/r2.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
cd "$ROOT"
W=$HERE/work
SFX=${BRAG_SFX:-/home/user/latent-spaces/brag/skills/brag/assets/sfx}
STS="prompt six stop the scroll/video"
PD="prompt seven picture day/video/picture-day-high-pace-v1.mp4"
FIT="scale=1080:1920:flags=lanczos,setsar=1,fps=30,format=yuv420p,settb=AVTB"
ENC="-c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart"
mkdir -p "$HERE/reel-1" "$HERE/reel-2"

# ---------------- Reel 1 (19.6s) ----------------
ffmpeg -v error -y \
  -f lavfi -t 2.6 -i "color=c=black:s=1080x1920:r=30" \
  -i "$STS/clips/01-hook.mp4" -i "$STS/clips/02-living.mp4" -i "$STS/clips/03-kitchen.mp4" \
  -i "$STS/clips/04-dining.mp4" -i "$STS/clips/05-bedroom.mp4" -i "$STS/clips/06-backyard.mp4" \
  -reinit_filter 0 -framerate 30 -i "$W/r1/%05d.png" \
  -i "$STS/soundtrack.wav" \
  -i "$SFX/interface/bong_001.ogg" -i "$SFX/impact/impactSoft_medium_001.ogg" -i "$SFX/impact/impactSoft_medium_004.ogg" \
  -filter_complex "\
[0]format=yuv420p,settb=AVTB[blk];\
[1]trim=0:2.8,setpts=PTS-STARTPTS,$FIT[c1];\
[2]trim=0.2:3.0,setpts=PTS-STARTPTS,$FIT[c2];\
[3]trim=0.2:3.0,setpts=PTS-STARTPTS,$FIT[c3];\
[4]trim=0.2:3.0,setpts=PTS-STARTPTS,$FIT[c4];\
[5]trim=0.2:3.0,setpts=PTS-STARTPTS,$FIT[c5];\
[6]trim=0.2:3.6,setpts=PTS-STARTPTS,$FIT[c6];\
[c1][c2]xfade=transition=smoothleft:duration=0.4:offset=2.4[x1];\
[x1][c3]xfade=transition=smoothleft:duration=0.4:offset=4.8[x2];\
[x2][c4]xfade=transition=smoothleft:duration=0.4:offset=7.2[x3];\
[x3][c5]xfade=transition=smoothleft:duration=0.4:offset=9.6[x4];\
[x4][c6]xfade=transition=smoothleft:duration=0.4:offset=12.0[tour];\
[blk][tour]concat=n=2:v=1:a=0,settb=AVTB,tpad=stop_mode=clone:stop_duration=3[base];\
[7]format=rgba,settb=AVTB[gfx];\
[base][gfx]overlay=0:0:eof_action=pass,format=yuv420p[v];\
[8]atrim=0:19.6,afade=t=in:d=0.3,afade=t=out:st=18.2:d=1.4[mus];\
[9]asplit=3[s1][s2][s3];\
[s1]adelay=450:all=1,volume=0.35[a1];[s2]adelay=950:all=1,volume=0.35[a2];[s3]adelay=1450:all=1,volume=0.35[a3];\
[10]adelay=2050:all=1,volume=0.4[a4];[11]adelay=17050:all=1,volume=0.4[a5];\
[mus][a1][a2][a3][a4][a5]amix=inputs=6:normalize=0:duration=first[a]" \
  -map "[v]" -map "[a]" -t 19.6 $ENC "$HERE/reel-1/reel.mp4"

# ---------------- Reel 2 (20.2s) ----------------
ffmpeg -v error -y \
  -i "$PD" -reinit_filter 0 -framerate 30 -i "$W/r2/%05d.png" \
  -i "$SFX/ui/click2.ogg" -i "$SFX/impact/impactSoft_medium_004.ogg" \
  -filter_complex "\
[0:v]$FIT,tpad=stop_mode=clone:stop_duration=3[base];\
[1]format=rgba,settb=AVTB[gfx];\
[base][gfx]overlay=0:0:eof_action=pass,format=yuv420p[v];\
[0:a]aresample=44100,afade=t=out:st=17.0:d=1.6,apad=whole_dur=20.2,atrim=0:20.2[mus];\
[2]asplit=3[s1][s2][s3];\
[s1]adelay=14900:all=1,volume=0.35[a1];[s2]adelay=15150:all=1,volume=0.35[a2];[s3]adelay=15400:all=1,volume=0.35[a3];\
[3]adelay=17650:all=1,volume=0.4[a4];\
[mus][a1][a2][a3][a4]amix=inputs=5:normalize=0:duration=first[a]" \
  -map "[v]" -map "[a]" -t 20.2 $ENC "$HERE/reel-2/reel.mp4"
echo done

# ---------------- Reel 1 + voiceover (run voiceover.py first) ----------------
if [ -f "$W/vo/reel-1-vo.wav" ]; then
ffmpeg -v error -y -i "$HERE/reel-1/reel.mp4" -i "$W/vo/reel-1-vo.wav" -filter_complex "\
[1]aresample=44100,aformat=channel_layouts=stereo,volume=1.6,asplit=2[vo][sc];\
[0:a][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[bed];\
[bed][vo]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart "$HERE/reel-1/reel-vo.mp4"
fi
