# GiANT Tools

Interactive versions of GiANT leadership tools. Static pages only: no database, no logins, and nothing users enter or upload leaves their device.

Kept fully separate from the Matchstic Time Tracker (its own repo and its own Railway project).

## Layout

```
public/
  index.html               landing page listing the tools
  shared/                  mirror.css + mirror.js: the mirror, fog, glow, meter and photo handling
                           tools.css + tools.js: the tool list, landing cards and left Tools navigation
  leadership-mirror/       one folder per tool, served at /<folder>/
  resistant-responsive/
  serve.json               static server config (clean URLs, no-index headers)
  robots.txt               keeps search engines out
drafts/                    local experiments, not committed or deployed
```

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Add a new tool

1. Copy an existing tool's `index.html` into `public/<tool-name>/` and change the question and sliders. The page only holds its own content; `/shared/mirror.js` builds the mirror. Keep `<meta name="robots" content="noindex, nofollow">` in the head.
   - Optional: `data-mid` on a slider shows a center word under its midpoint; a `.poles` header adds overall pole labels (see `resistant-responsive`).
2. Add the tool to the `TOOLS` list in `public/shared/tools.js`. The landing page and the left navigation both build from it (`letter` puts a letter in its mirror thumbnail).
3. Commit and push to `main`. Railway deploys automatically.

## Photo privacy

Photos never leave the device. A downscaled copy is kept in `sessionStorage` so it follows the person between tools in the same tab; the browser clears it when the tab or window closes, and "Forget my photo" clears it immediately.

## Deploy

Railway project "GiANT Tools", connected to this repo's `main` branch. `railway.json` runs `npm start`, which serves `public/` on Railway's `PORT`.
