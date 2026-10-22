# Sunjin UpRising icons

The current master is `sunjin-healing-watercolor-20261022-1024.png`. It gives
the single healing snake, staff and new leaves a watercolor treatment with
deep teal, emerald and warm gold. The square background is opaque; the
operating system applies the home-screen corner mask. The artwork is centered
with margins for rounded home-screen corners. Manifest icons use `purpose: any`;
the full leaf tips are not designed for every maskable-icon crop. The earlier
vector master and its PNG exports remain available as the previous design.

PNG exports: 180 px for the Apple touch icon, 192/512 px for the web manifest,
32/512 px for browser favicons, and 192 px for page brand marks. Filenames are
versioned to avoid reusing a stale image URL.

To regenerate the committed derivatives with ImageMagick:

```sh
for icon_size in 32 180 192 512; do
  convert public/icons/sunjin-healing-watercolor-20261022-1024.png \
    -filter Lanczos -resize "${icon_size}x${icon_size}" -strip -depth 8 \
    -define png:color-type=2 \
    "public/icons/sunjin-healing-watercolor-20261022-${icon_size}.png"
done
npm run build
node scripts/check-site-icons.mjs
```

The manifest and HTML paths remain inside the GitHub Pages base path. No service
worker or offline caching of care records is introduced. Existing installed
home-screen icons may remain cached; add a fresh shortcut from Safari to inspect
the new icon. Do not clear all browser data: local rehabilitation activity logs
may be stored in that browser.

## Artwork generation

Created with the built-in image generation tool, using the previous 512 px icon
as the style-transfer input. The generated artwork was normalized to the
committed 1024 px master; all smaller exports derive from that master.

Final prompt:

> Use case: style-transfer / logo-brand. Edit target: the provided existing Sunjin UpRising healing emblem. Create a polished painterly WATERCOLOUR app icon, preserving its central idea of ONE friendly healing serpent winding upwards around ONE vertical staff, crowned by two small fresh leaves. Replace the flat vector execution with expressive, masterfully controlled hand-painted watercolor, not a flat vector filter. Rich sophisticated jewel palette: deep peacock petrol teal and midnight indigo background, luminous emerald and pale verdigris highlights on the serpent, restrained warm antique gold/ochre on the staff and leaf accents. Paint granulation, layered transparent pigment, subtly irregular brush edges and cold-pressed paper texture should be visible, with intentional defined high-contrast contours. The serpent must read instantly at 40px and 180px: a bold continuous graceful S-shaped body, gently tapered tail, one small rounded clear head with one understated dark eye, calm and benevolent, anatomically coherent single body winding in front of/behind the staff. A few elegant pigment blooms at edges, but a clear silhouette and rich depth, no busy splatter. A refined fine-art emblem, hopeful and alive. Keep large simple composition centered and within the central 78% safe area. Full-bleed perfectly square OPAQUE painted deep teal background right to all four corners; no rounded corner mask, no white border, no inset frame, no tile mockup, no shadow outside a tile. No lettering, no words, no watermark, no extra snakes, no wings, no scales micro-detail, no tongue, no scary fangs, no caduceus, no extra medical objects. Deliver one square finished artwork at high resolution.
