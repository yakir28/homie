#!/usr/bin/env bash
# Builds the week-01 Reels (1080x1920) from demo footage + overlays rendered by render.mjs.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
B=social/instagram/week-01/build; O=$B/overlays; S6="prompt six stop the scroll"
FIT="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,format=yuv420p"
ENC="-c:v libx264 -crf 19 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart"

ffmpeg -v error -y \
 -loop 1 -t 1.1 -i "$S6/images/02-front-facade.png" -loop 1 -t 1.1 -i "$S6/images/04-living-room.png" -loop 1 -t 1.1 -i "$S6/images/05-kitchen.png" \
 -i "$S6/video/stop-the-scroll-final-20s.mp4" -loop 1 -t 2.5 -i $O/end.png -i $O/r1-hook.png -i $O/r1-turn.png \
 -f lavfi -t 3.3 -i anullsrc=r=44100:cl=stereo -f lavfi -t 2.5 -i anullsrc=r=44100:cl=stereo \
 -filter_complex "[0]$FIT[a];[1]$FIT[b];[2]$FIT[c];[a][b][c]concat=n=3:v=1:a=0[st];[st][5]overlay=0:0[sto];\
[3:v]$FIT[v];[v][6]overlay=0:0:enable='lt(t,2.5)'[vo];[4]$FIT[e];[3:a]aresample=44100,aformat=channel_layouts=stereo[va];\
[sto][7][vo][va][e][8]concat=n=3:v=1:a=1[outv][outa]" \
 -map "[outv]" -map "[outa]" $ENC $B/reel-1-photos-to-tour.mp4

ffmpeg -v error -y -i "prompt one video/real-estate-director-clean-18s.mp4" -loop 1 -t 2.5 -i $O/end.png -i $O/r2-hook.png \
 -f lavfi -t 2.5 -i anullsrc=r=44100:cl=stereo \
 -filter_complex "[0:v]$FIT[v];[v][2]overlay=0:0:enable='lt(t,3.2)'[vo];[1]$FIT[e];[0:a]aresample=44100,aformat=channel_layouts=stereo[a];\
[vo][a][e][3]concat=n=2:v=1:a=1[ov][oa]" \
 -map "[ov]" -map "[oa]" $ENC $B/reel-2-no-camera-crew.mp4
