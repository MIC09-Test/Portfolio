import { SECTIONS, type Section } from "./content";

export const BG = "#0b0b0e";
const ACCENT = "#e0a458";
const TEXT_PRIMARY = [232, 230, 225] as const;
const TEXT_SECONDARY = [154, 152, 160] as const;

// --- Vertical world geometry --------------------------------------------
// The page is a tall dark column. Each section rests on a wide floor line;
// small stepping platforms zigzag between floors for the climb back up.

export const WORLD_W = 840;
export const SECTION_GAP = 520; // vertical distance between section floors
const FIRST_FLOOR_Y = 420;
const STEP_GAP = 104; // vertical spacing of stepping platforms (must be jumpable)

export interface Anchor {
  s: Section;
  x: number;
  y: number; // the section's floor line
}

export const ANCHORS: Anchor[] = SECTIONS.map((s, i) => ({
  s,
  x: WORLD_W / 2,
  y: FIRST_FLOOR_Y + i * SECTION_GAP,
}));

export const WORLD_H = ANCHORS[ANCHORS.length - 1].y + 150;
export const START_X = WORLD_W / 2;
export const START_Y = FIRST_FLOOR_Y;

export interface Platform {
  x: number;
  y: number;
  w: number;
  solid?: boolean; // solid platforms can't be dropped through (the very bottom)
  floor?: boolean; // section floors render slightly brighter
}

export const PLATFORMS: Platform[] = [];
for (let i = 0; i < ANCHORS.length; i++) {
  PLATFORMS.push({
    x: 60,
    y: ANCHORS[i].y,
    w: WORLD_W - 120,
    floor: true,
    solid: i === ANCHORS.length - 1,
  });
  // Stepping stones down to the next floor, alternating lanes.
  if (i < ANCHORS.length - 1) {
    for (let k = 1; k * STEP_GAP < SECTION_GAP; k++) {
      const center = (i + k) % 2 === 0 ? 300 : 540;
      PLATFORMS.push({ x: center - 85, y: ANCHORS[i].y + k * STEP_GAP, w: 170 });
    }
  }
}

// --- Rendering -----------------------------------------------------------

const SANS = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif";
const FONT_HERO = `250 74px ${SANS}`;
const FONT_TITLE = `300 42px ${SANS}`;
const FONT_INDEX = `500 13px ${SANS}`;
const FONT_BODY = `400 16px ${SANS}`;
const LINE_H = 27;

export function drawPlatforms(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
): void {
  for (const p of PLATFORMS) {
    if (p.y < camY - 40 || p.y > camY + viewH + 40) continue;
    if (p.x > camX + viewW || p.x + p.w < camX) continue;
    ctx.fillStyle = p.floor ? "#4a4a54" : "#393941";
    ctx.fillRect(p.x, p.y, p.w, 2);
    // Soft end caps
    ctx.fillRect(p.x, p.y, 2, 5);
    ctx.fillRect(p.x + p.w - 2, p.y, 2, 5);
  }

  // Amber marker at each section floor's center
  ctx.fillStyle = ACCENT;
  for (const a of ANCHORS) {
    if (a.y < camY - 40 || a.y > camY + viewH + 40) continue;
    ctx.fillRect(a.x - 1.5, a.y - 14, 3, 14);
  }
}

// --- Sections: typography that emerges from the dark --------------------

export function sectionReveal(anchor: Anchor, px: number, py: number): number {
  const d = Math.hypot(px - anchor.x, py - (anchor.y - 140));
  return Math.max(0, Math.min(1, (470 - d) / 190));
}

/** Index label like "01" for non-hero sections, in content order. */
const INDEX_OF = new Map<Section, string>();
{
  let n = 0;
  for (const s of SECTIONS) {
    if (!s.hero) INDEX_OF.set(s, String(++n).padStart(2, "0"));
  }
}

export function drawSectionText(
  ctx: CanvasRenderingContext2D,
  anchor: Anchor,
  px: number,
  py: number,
): void {
  const a = sectionReveal(anchor, px, py);
  if (a <= 0.01) return;

  const { s, x, y } = anchor;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const primary = (alpha: number) =>
    `rgba(${TEXT_PRIMARY[0]}, ${TEXT_PRIMARY[1]}, ${TEXT_PRIMARY[2]}, ${alpha.toFixed(3)})`;
  const secondary = (alpha: number) =>
    `rgba(${TEXT_SECONDARY[0]}, ${TEXT_SECONDARY[1]}, ${TEXT_SECONDARY[2]}, ${alpha.toFixed(3)})`;

  if (s.hero) {
    ctx.font = FONT_HERO;
    ctx.fillStyle = primary(a);
    ctx.fillText(s.title, x, y - 190);

    ctx.fillStyle = `rgba(224, 164, 88, ${(0.9 * a).toFixed(3)})`;
    ctx.fillRect(x - 34, y - 166, 68, 2);

    ctx.font = FONT_BODY;
    ctx.fillStyle = secondary(a);
    s.lines.forEach((line, i) => {
      ctx.fillText(line, x, y - 126 + i * LINE_H);
    });
    return;
  }

  const idx = INDEX_OF.get(s);
  const lineCount = s.lines.length;
  const bodyBottom = y - 42; // last body line sits just above the floor
  const bodyTop = bodyBottom - (lineCount - 1) * LINE_H;
  const titleY = bodyTop - 46;

  if (idx) {
    ctx.font = FONT_INDEX;
    ctx.fillStyle = `rgba(224, 164, 88, ${(0.95 * a).toFixed(3)})`;
    const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    const prev = c.letterSpacing;
    try {
      c.letterSpacing = "4px";
      ctx.fillText(idx, x, titleY - 54);
    } finally {
      c.letterSpacing = prev ?? "0px";
    }
  }

  ctx.font = FONT_TITLE;
  ctx.fillStyle = primary(a);
  ctx.fillText(s.title, x, titleY);

  ctx.font = FONT_BODY;
  ctx.fillStyle = secondary(a);
  s.lines.forEach((line, i) => {
    ctx.fillText(line, x, bodyTop + i * LINE_H);
  });
}
