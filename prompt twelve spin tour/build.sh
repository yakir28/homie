#!/usr/bin/env bash
# Spin Tour — preview: the generated take with its own hard cuts (no added transitions) and an
# original synthesized music bed (music.py). No voiceover, no captions (decision 2026-10-07).
# Usage: ./build.sh work/take.mp4 work/music.wav  -> preview.mp4, preview-web.mp4, thumbnail.jpg
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
TAKE="$1"; MUSIC="$2"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TAKE")
ffmpeg -v error -y -i "$TAKE" -i "$MUSIC" -filter_complex "\
[0:v]scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p[v];\
[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:$DUR,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map "[v]" -map "[a]" -t "$DUR" -c:v libx264 -crf 18 -maxrate 12M -bufsize 24M -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart preview.mp4
ffmpeg -v error -y -i preview.mp4 -vf "scale=720:1280:flags=lanczos" -c:v libx264 -crf 24 -maxrate 3M -bufsize 6M -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart preview-web.mp4
ffmpeg -v error -y -ss 4.0 -i preview.mp4 -frames:v 1 -q:v 2 thumbnail.jpg
echo "preview.mp4 ($DUR s, music only)"
