# Sunjin UpRising icons

The editable master is `sunjin-healing-20261022.svg`. One snake winds around a
staff with new leaves, using the project's recovery/renewal symbolism rather
than any institution's emblem. The square background is opaque; the operating
system applies the home-screen corner mask. Essential artwork stays within the
central maskable-icon safe area.

PNG exports: 180 px for the Apple touch icon, 192/512 px for the web manifest,
and 32 px for the browser favicon. Every page uses the same master for its
brand mark. Filenames are versioned to avoid reusing a stale image URL.

To regenerate the committed PNGs with Inkscape:

```sh
for icon_size in 32 180 192 512; do
  inkscape public/icons/sunjin-healing-20261022.svg \
    --export-type=png \
    --export-filename="public/icons/sunjin-healing-20261022-${icon_size}.png" \
    --export-width="$icon_size" --export-height="$icon_size"
done
npm run build
node scripts/check-site-icons.mjs
```

The manifest and HTML paths remain inside the GitHub Pages base path. No service
worker or offline caching of care records is introduced. Existing installed
home-screen icons may remain cached; add a fresh shortcut from Safari to inspect
the new icon. Do not clear all browser data: local rehabilitation activity logs
may be stored in that browser.
