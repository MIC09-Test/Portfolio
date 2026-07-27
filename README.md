# Internship Portfolio — a descent in the dark

A minimalist portfolio laid out like a normal vertical page — except there is
no scrolling. The site is dark, and you control a small figure with a torch:
press **↓** to drop through the floor to the next section (that's your scroll
wheel), and jump your way back up the stepping-stone platforms to re-read
something. Sections (About, Skills, Projects, Experience, Contact) emerge
from the darkness as the torchlight reaches them.

Built with **TypeScript + Vite + HTML5 Canvas**, no frameworks, no assets.

## Controls

- **← → / A D** — walk
- **↑ / W / Space** — jump (platforms are one-way: you jump up through them)
- **↓ / S** — descend through the platform you're standing on
- On touch devices, on-screen buttons (◀ ▶ ▼ ▲) appear automatically.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
```

## Edit the portfolio content

All visitor-facing text lives in [`src/content.ts`](src/content.ts) — an
ordered list of sections, top to bottom, each with a `title` and `lines`.
The first entry (`hero: true`) is the big name card. Add, remove, or reorder
sections freely: floors, stepping stones, numbering, and world height are all
derived automatically.

## Deploy to GitHub Pages

```bash
npm run deploy
```

This builds and pushes `dist/` to a `gh-pages` branch (requires the repo to
have a GitHub remote). Then enable Pages for the `gh-pages` branch in the
repo settings.

## Code map

| File | What it does |
| --- | --- |
| `src/content.ts` | Portfolio text, in page order (the only file to edit for content) |
| `src/world.ts` | Derives floors/platforms from content; renders them + typography |
| `src/player.ts` | Movement physics, one-way platforms, drop-through, the character |
| `src/lighting.ts` | Darkness overlay, torch light, section glows |
| `src/main.ts` | Game loop, 2D camera, dust motes |
| `src/input.ts` | Keyboard + touch state |
