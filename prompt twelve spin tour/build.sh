#!/usr/bin/env bash
# Spin Tour — preview: the generated take with its own hard cuts (no added transitions), plus a
# Kokoro voiceover (voiceover.py) and an original synthesized music bed (music.py). Steady music, no ducking.
# Usage: ./build.sh work/take.mp4 work/vo.wav work/music.wav  -> preview.mp4, preview-web.mp4, thumbnail.jpg
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
TAKE="$1"; VO="$2"; MUSIC="$3"; VO_VOL="${VO_VOL:-1.6}"; MUSIC_VOL="${MUSIC_VOL:-0.32}"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TAKE")
ffmpeg -v error -y -i "$TAKE" -i "$VO" -i "$MUSIC" -filter_complex "\
[0:v]scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p[v];\
[1:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=80,acompressor=threshold=0.1:ratio=3:attack=5:release=80,volume=$VO_VOL[vo];\
[2:a]aresample=48000,aformat=channel_layouts=stereo,volume=$MUSIC_VOL[mu];\
[vo][mu]amix=inputs=2:normalize=0:duration=longest,atrim=0:$DUR,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map "[v]" -map "[a]" -t "$DUR" -c:v libx264 -crf 18 -maxrate 12M -bufsize 24M -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart preview.mp4
ffmpeg -v error -y -i preview.mp4 -vf "scale=720:1280:flags=lanczos" -c:v libx264 -crf 24 -maxrate 3M -bufsize 6M -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart preview-web.mp4
ffmpeg -v error -y -ss 4.0 -i preview.mp4 -frames:v 1 -q:v 2 thumbnail.jpg
echo "preview.mp4 ($DUR s)"
