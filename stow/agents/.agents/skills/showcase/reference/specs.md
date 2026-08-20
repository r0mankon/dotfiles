# Store asset specs

Verify with `sips -g pixelWidth -g pixelHeight FILE` before uploading.

## Google Play

| Asset | Spec | Notes |
|---|---|---|
| Phone screenshots | **2–8**, PNG/JPEG, 320–3840px per side, max ratio 2:1 | 1080×1920 is the safe default (9:16 = 1.78:1) |
| 7" tablet | up to 8, same rules | only if you list tablet support |
| 10" tablet | up to 8, same rules | |
| Feature graphic | **1024×500**, PNG/JPEG, no alpha | required; keep copy inside a safe area — it gets cropped on some surfaces |
| App icon | **512×512**, 32-bit PNG with alpha, ≤1MB | a 24-bit PNG may be rejected; add an alpha channel with `sips -s format png` if needed |
| Promo video | **YouTube URL** — not an upload | deliver the file, the user posts it |
| App name | 30 chars | indexed for search; a readable descriptor is fine, comma-separated keyword lists read as stuffing |
| Short description | 80 chars | |
| Full description | 4000 chars | |

Metadata policy: no fake urgency, no "#1"/"best" claims without proof, no
competitor names, no emoji spam, no ALL CAPS.

## App Store (iOS)

| Asset | Spec |
|---|---|
| 6.9" / 6.7" screenshots | 1290×2796 or 1320×2868 (portrait) |
| 6.5" | 1242×2688 or 1284×2778 |
| 5.5" | 1242×2208 |
| iPad 12.9" | 2048×2732 |
| App icon | 1024×1024, no alpha, no rounded corners |
| App preview | **uploaded video**, 15–30s, per-device resolution, ≤500MB |

Apple requires screenshots for the largest supported device; smaller sizes are
derived if omitted.

## Handy conversions

```bash
# dimensions
sips -g pixelWidth -g pixelHeight shot.png

# crop from the top-left (sips crops centred by default)
sips -c 1260 1170 --cropOffset 0 0 in.png --out out.png

# add an alpha channel to a 24-bit icon
magick icon.png -alpha set PNG32:icon-32.png

# downscale a raw capture for a README
magick shot.png -resize 420x -strip README-shot.png
```
