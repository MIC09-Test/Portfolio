# Portfolio: the page is the cave

A personal portfolio that reads as an ordinary page, until you turn the lights
off.

With the lights on it is a plain, fast, vertical CV: name, projects, skills,
about, experience, certifications, contact. A small figure is asleep at a desk
in the footer.

Flip the switch beside the name and the room goes dark. The figure wakes up,
picks up a torch, and the page becomes somewhere to climb because **every
ledge in the cave is a real line of text measured out of the live DOM.** The
top edge of a heading is a platform. So is each line of a paragraph, each skill
chip, each link pill. Nothing is authored twice: change a sentence in
`src/content.ts` and the terrain under it changes with it.

The only way back to the light is to climb up and knock the switch with the
torch. (Esc, or the ☀ button on a phone, is there for anyone who came to read
a CV and not to platform for one.)

Built with **TypeScript + Vite + HTML5 Canvas**. No frameworks, no libraries,
no image assets: the character, the desk, and the darkness are all drawn in
code.

## How the two modes stay in sync

Both modes share one layout. The cave is not a separate scene; it is the same
DOM with a darkness canvas over it and the camera driven by the character
instead of the scrollbar. That constraint drives most of the design:

- Platform geometry is measured with `offsetTop` / `offsetLeft`, so anything
  that only changes **paint** is safe (`opacity`, `color`, `text-shadow`), and
  anything that changes **layout or the containing block** is not. A
  `transform` or a `filter` on a measured element moves the ground under the
  character's feet.
- Per-line ledges come from `Range.getClientRects()`, which returns one rect
  per inline fragment. Rects sharing a baseline are merged, or a name with
  styled letters inside it becomes five separate stepping stones.
- The lit page and the cave must have identical element heights. That is why
  the note taped by the switch is hidden with `visibility` rather than
  `display`: removing it from flow would shift every platform below it.

## Controls (lights off)

| Key | Does |
| --- | --- |
| **← →** / **A D** | walk |
| **↑** / **W** / **Space** | jump (ledges are one-way, you pass up through them) |
| **↓** / **S** | drop through the ledge you are standing on |
| **Esc** | turn the lights back on from anywhere |

On touch devices the on-screen buttons (◀ ▶ ▲ ▼) and a ☀ lights button appear
automatically.

## Develop

```bash
npm install
npm run dev      # dev server
npm run build    # type-check + production build into dist/
npm run preview  # serve the built dist/
npm run deploy   # build and publish dist/ to the gh-pages branch
```

## Editing the content

All visitor-facing text lives in [`src/content.ts`](src/content.ts): profile,
about, skills, projects, experience, certifications, contact. It is the only
file you need to touch to update the portfolio; the layout, the platforms and
the climb all follow from it.

## Code map

| File | What it does |
| --- | --- |
| `src/content.ts` | All portfolio text, the only file to edit for content |
| `src/main.ts` | Builds the page from the content, wires the lights switch, scroll reveals |
| `src/style.css` | Everything visual in both modes |
| `src/game/engine.ts` | Measures the DOM into platforms, runs the cave loop and camera |
| `src/game/player.ts` | Walk/jump/drop physics against one-way ledges |
| `src/game/figure.ts` | The character, drawn in code with the same proportions in both modes |
| `src/game/desk.ts` | The desk, one geometry with a lit and an unlit palette |
| `src/game/sleeper.ts` | The footer scene: him asleep at that desk with the lights on |
| `src/game/lighting.ts` | The darkness, the torchlight, the embers on distant headings |
| `src/game/input.ts` | Keyboard and touch state |
