#!/usr/bin/env bash
# Spin Tour — preview: the generated take exactly as the model cut it (hard cuts), no added
# transitions, no music, no captions (decision 2026-10-05).
# Usage: ./build.sh work/take.mp4  -> preview.mp4, preview-web.mp4, thumbnail.jpg
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
TAKE="$1"
ffmpeg -v error -y -i "$TAKE" -map 0:v:0 -vf "scale=1080:1920:flags=lanczos,setsar=1" -an -c:v libx264 -crf 18 -maxrate 12M -bufsize 24M -preset slow -pix_fmt yuv420p -movflags +faststart preview.mp4
ffmpeg -v error -y -i preview.mp4 -vf "scale=720:1280:flags=lanczos" -an -c:v libx264 -crf 24 -maxrate 3M -bufsize 6M -preset slow -pix_fmt yuv420p -movflags +faststart preview-web.mp4
ffmpeg -v error -y -ss 4.0 -i preview.mp4 -frames:v 1 -q:v 2 thumbnail.jpg
echo "preview.mp4 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 preview.mp4) s, no audio)"
