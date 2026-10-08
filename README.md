# GiANT Tools

Interactive versions of GiANT leadership tools. Static pages only: no database, no logins, and nothing users enter or upload leaves their device.

Kept fully separate from the Matchstic Time Tracker (its own repo and its own Railway project).

## Layout

```
public/
  index.html               landing page listing the tools
  leadership-mirror/       one folder per tool, served at /<folder>/
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

1. Create `public/<tool-name>/index.html` (keep `<meta name="robots" content="noindex, nofollow">` in the head).
2. Add a card for it in `public/index.html`.
3. Commit and push to `main`. Railway deploys automatically.

## Deploy

Railway project "GiANT Tools", connected to this repo's `main` branch. `railway.json` runs `npm start`, which serves `public/` on Railway's `PORT`.
