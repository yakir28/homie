#!/usr/bin/env bash
# Spin Tour — preview edit: one continuous 20 s take + the song, beat drop locked to the first spin cut
# (night facade -> first room). No captions.
# Usage: ./build.sh work/take.mp4 work/song.wav  -> preview.mp4, preview-web.mp4, thumbnail.jpg
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
TAKE="$1"; SONG="$2"; DROP="${DROP:-32.97}"; MUSIC_VOL="${MUSIC_VOL:-0.8}"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TAKE")
CUT=$(ffmpeg -v info -i "$TAKE" -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep -o 'pts_time:[0-9.]*' | cut -d: -f2 \
  | python3 -c "import sys; c=[float(x) for x in sys.stdin]; print(min(c, key=lambda x: abs(x-2.0)) if c else 2.0)")
OFF=$(python3 -c "print(round(max(0, $DROP - $CUT), 3))")
echo "first spin cut $CUT s, song offset $OFF s"
ffmpeg -v error -y -i "$TAKE" -ss "$OFF" -i "$SONG" -filter_complex "\
[0:v]scale=1080:1920:flags=lanczos,fps=30,setsar=1,format=yuv420p[v];\
[1:a]atrim=0:$DUR,asetpts=PTS-STARTPTS,aresample=48000,volume=$MUSIC_VOL,afade=t=in:d=0.3,afade=t=out:st=$(python3 -c "print($DUR-1.2)"):d=1.2,alimiter=limit=0.9[a]" \
  -map "[v]" -map "[a]" -t "$DUR" -c:v libx264 -crf 18 -maxrate 12M -bufsize 24M -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart preview.mp4
ffmpeg -v error -y -i preview.mp4 -vf "scale=720:1280:flags=lanczos" -c:v libx264 -crf 24 -maxrate 3M -bufsize 6M -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart preview-web.mp4
ffmpeg -v error -y -ss "$(python3 -c "print($CUT+1.5)")" -i preview.mp4 -frames:v 1 -q:v 2 thumbnail.jpg
echo "preview.mp4 ($DUR s)"
