#!/usr/bin/env bash
# Grand Entrance — preview edit: chapter 1 (avatar arrival, native sound) hard-cuts into chapter 2 (FPV tour).
# No captions by decision. Steady music under the native sound; one whoosh on the chapter cut.
# Usage: ./build.sh work/ch1.mp4 work/ch2.mp4 work/music.mp3  -> preview.mp4 + thumbnail.jpg
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
CH1="$1"; CH2="$2"; MUSIC="$3"
SFX=${BRAG_DIR:-/home/user/latent-spaces/brag/skills/brag}/assets/sfx
MUSIC_VOL="${MUSIC_VOL:-0.55}"; NATIVE_VOL="${NATIVE_VOL:-1.0}"; MUSIC_OFFSET="${MUSIC_OFFSET:-12.5}"
D1=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$CH1")
D2=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$CH2")
DUR=$(python3 -c "print(round($D1+$D2,3))")
CUT=$(python3 -c "print(int(($D1-0.12)*1000))")
WHOOSH=$(ls "$SFX"/*/*whoosh* "$SFX"/*/*swoosh* 2>/dev/null | head -1 || true)
FIT="scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,fps=30,setsar=1,format=yuv420p,settb=AVTB"
SFX_IN=(); SFX_F=""; SFX_L=""; N=2
if [ -n "$WHOOSH" ]; then SFX_IN=(-i "$WHOOSH"); SFX_F="[3:a]aresample=48000,aformat=channel_layouts=stereo,adelay=$CUT:all=1,volume=0.35[wh];"; SFX_L="[wh]"; N=3; fi
ffmpeg -v error -y -i "$CH1" -i "$CH2" -ss "$MUSIC_OFFSET" -i "$MUSIC" "${SFX_IN[@]}" -filter_complex "\
[0:v]$FIT[v1];[1:v]$FIT[v2];[v1][v2]concat=n=2:v=1:a=0[v];\
[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=$NATIVE_VOL,apad=whole_dur=$DUR[nat];\
[2:a]atrim=0:$DUR,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,volume=$MUSIC_VOL,afade=t=in:d=0.4,afade=t=out:st=$(python3 -c "print($DUR-1.3)"):d=1.3[mus];\
$SFX_F[nat][mus]${SFX_L}amix=inputs=$N:normalize=0:duration=longest,atrim=0:$DUR,alimiter=limit=0.95[a]" \
  -map "[v]" -map "[a]" -t "$DUR" -c:v libx264 -crf 18 -maxrate 12M -bufsize 24M -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart preview.mp4
ffmpeg -v error -y -ss 7.6 -i preview.mp4 -frames:v 1 -q:v 2 thumbnail.jpg
echo "preview.mp4 ($DUR s, whoosh: ${WHOOSH:-none})"
