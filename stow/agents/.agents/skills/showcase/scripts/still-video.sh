#!/usr/bin/env bash
# Compose finished store stills into a paced demo clip.
#
#   still-video.sh OUT.mp4 SECONDS_PER_SHOT shot-01.png shot-02.png ...
#
# Each still gets a slow Ken Burns push and crossfades into the next, which
# reads as deliberate rather than as a slideshow. Output is 1080x1920 H.264,
# yuv420p so it plays everywhere (QuickTime, Slack, YouTube).
#
# For genuine UI motion (animated maps, send animations, theme switches),
# capture a burst of screenshots in a loop instead and use frames-to-video.sh.
set -euo pipefail

out=${1:?usage: still-video.sh OUT.mp4 SECONDS_PER_SHOT img...}
per=${2:?seconds per shot, e.g. 2.5}
shift 2
[ "$#" -ge 2 ] || { echo "need at least 2 stills" >&2; exit 1; }

fps=30
xf=0.6                                   # crossfade seconds
frames=$(python3 -c "print(int($per*$fps))")
W=1080; H=1920

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

i=0
for img in "$@"; do
   # zoompan needs a large working canvas or the push judders on straight lines.
   ffmpeg -loglevel error -y -loop 1 -i "$img" \
      -vf "scale=${W}*4:-1,zoompan=z='min(zoom+0.0006,1.10)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${fps},format=yuv420p" \
      -t "$per" -c:v libx264 -preset veryfast -crf 18 "$tmp/$(printf '%03d' $i).mp4"
   i=$((i+1))
done

# Chain crossfades; each xfade offset is cumulative minus the overlap so far.
inputs=(); filter=""; n=0
for f in "$tmp"/*.mp4; do inputs+=(-i "$f"); n=$((n+1)); done

if [ "$n" -eq 1 ]; then
   cp "$tmp/000.mp4" "$out"
else
   prev="[0:v]"; off=$(python3 -c "print($per-$xf)")
   for ((k=1; k<n; k++)); do
      lbl="[v$k]"
      filter+="${prev}[$k:v]xfade=transition=fade:duration=${xf}:offset=${off}${lbl};"
      prev="$lbl"
      off=$(python3 -c "print(round($off + $per - $xf, 3))")
   done
   filter=${filter%;}
   ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex "$filter" -map "$prev" \
      -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart "$out"
fi

echo "wrote $out"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration \
   -of default=nw=1 "$out"
