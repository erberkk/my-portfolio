# Erberk Akbulut — logo

**The idea:** a liquid-metal *e*. The lower terminal does not end, it gathers into a drop that is about to fall, the same
liquid chrome the site renders live. One sentence, one detail, readable at 16 px.

## Files

| File | Use |
|---|---|
| `erberk-symbol-black.svg` / `-white.svg` | Master symbol, one colour. Default for print, docs, light or dark grounds. |
| `erberk-symbol-chrome.svg` | Screen-only chrome gradient. Use on black, never print it. |
| `erberk-symbol-small.svg` | Small-size cut (heavier stroke, bigger drop). Use below 48 px: favicon, nav, avatars. |
| `erberk-wordmark-black.svg` | "Erberk Akbulut", Archivo Expanded ExtraBold, outlined. |
| `erberk-lockup-horizontal-*.svg` | Symbol + wordmark side by side. Default lockup. |
| `erberk-lockup-stacked-*.svg` | Symbol over wordmark, for square spaces. |
| `favicon.svg`, `erberk-app-icon-512.png` | White small cut on a black rounded tile (radius 22 %). |

Web icons (`favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icon-192/512.png`, `og.png`) live in `../project/`.

## Rules

- **Colour:** black `#000000` and white `#FFFFFF`. Chrome is an effect for screens, not a brand colour.
- **Clear space:** at least the width of the bowl's stroke on every side (36 / 256 of the symbol's height).
- **Minimum size:** master symbol 48 px; below that switch to `erberk-symbol-small.svg` (works down to 16 px).
- **Don't:** recolour it, add shadows or glows, stretch it, rotate it, redraw the drop, set the wordmark in another
  typeface, or put the chrome version on a light or busy background.

## Notes

- Built as one filled path per file: no live text, strokes, masks or filters.
- Wordmark set in Archivo (SIL Open Font License, see `Archivo-OFL.txt`), which permits logo use; glyphs are outlined.
- Trademark clearance was not checked. Run a trademark and reverse-image search before relying on it commercially.
