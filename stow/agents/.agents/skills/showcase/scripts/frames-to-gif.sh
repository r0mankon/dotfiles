#!/usr/bin/env bash
# Frame burst -> GIF, via a generated palette so gradients and dark UI don't band.
#
#   frames-to-gif.sh OUT.gif FPS WIDTH frames/*.png
#
# Capture the frames by screenshotting in a loop while the UI animates (map
# trails, send animation, theme switch). 10-12 fps is the sweet spot: smooth
# enough to read, small enough to attach.
set -euo pipefail

out=${1:?usage: frames-to-gif.sh OUT.gif FPS WIDTH frames...}
fps=${2:?fps, e.g. 12}
width=${3:?output width, e.g. 480}
shift 3
[ "$#" -ge 2 ] || { echo "need at least 2 frames" >&2; exit 1; }

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

i=0
for f in "$@"; do cp "$f" "$tmp/$(printf '%04d' $i).png"; i=$((i+1)); done

# Pass 1: palette from the whole sequence. Pass 2: dither against it.
ffmpeg -loglevel error -y -framerate "$fps" -i "$tmp/%04d.png" \
   -vf "scale=${width}:-1:flags=lanczos,palettegen=stats_mode=diff" "$tmp/pal.png"

ffmpeg -loglevel error -y -framerate "$fps" -i "$tmp/%04d.png" -i "$tmp/pal.png" \
   -lavfi "scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle" \
   -loop 0 "$out"

echo "wrote $out  ($(du -h "$out" | cut -f1), ${i} frames @ ${fps}fps)"
