# erberk — portfolio

A night-shrine portfolio. The top of the page is a small 3D game: you walk a
samurai up a sakura-lined path, cut bamboo, deflect ink ronin, and pray at sites
of grace to read each section. Below it, the same content as a normal page for
anyone who would rather scroll. Phones get an illustrated opening instead of
the game, which loads only on request.

## Stack

- Vite + React + TypeScript, deployed on Vercel from `project/`
- three.js via `@react-three/fiber`, `drei` and `postprocessing` (lazy-loaded chunk)
- Motion and Lenis for page animation and scrolling
- One serverless function: `api/contact.js` proxies the contact form to Web3Forms
- All 3D geometry, textures and sound are generated in code; no models or audio files

## Local dev

```bash
cd project
npm install
npm run dev          # site only
vercel dev           # site + /api/contact (needs .env.local with WEB3FORMS_ACCESS_KEY)
```

`npm run build` regenerates the Japanese font subset (`scripts/jp-glyphs.mjs`),
type-checks, and builds to `dist/`.

## Deploy

Vercel project root directory: `project`. `project/vercel.json` sets the Vite
build, so pushing to `main` deploys. Set `WEB3FORMS_ACCESS_KEY` in the project's
environment variables.

## Where things live

```
project/
├── api/contact.js        # Web3Forms proxy (rate limited)
├── scripts/jp-glyphs.mjs # requests only the kanji the site uses
├── src/data/site.ts      # all copy: profile, impact, projects, experience
├── src/content/          # section content, shared by the page and the grace menu
├── src/ui/               # nav, hero, HUD, combat overlay, page sections
└── src/world/            # the 3D shrine: layout, scene pieces, player, enemies, audio
```

To change projects or text, edit `src/data/site.ts`.
