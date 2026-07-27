// ============================================================
//  His desk — one geometry, two palettes. The footer draws it
//  on a pale page with him asleep at it; the cave draws the
//  same desk at the same size on the cave floor. Toggling the
//  lights changes the colours and the lighting, never the size.
//
//  Coordinates are in figure units (see figure.ts): y measured
//  up from the floor the desk stands on.
// ============================================================

/** Height of the worksurface above the floor. The SLUMPED pose rests its
 *  head at exactly this height — change one, change the other. */
export const SURFACE_H = 26;

/** How far the desk reaches either side of the figure. */
export const REACH_LEFT = 34;
export const REACH_RIGHT = 152;

/** Top of the monitor above the floor — the tallest thing in the scene. */
export const SCENE_TOP = 56;

export interface DeskPalette {
  surface: string;
  frame: string;
  case: string;
  vent: string;
  bezel: string;
  screenTop: string;
  screenBottom: string;
  /** Warm lip along the worksurface; the cave floors have the same one. */
  lip: string | null;
  /** How the screen light behaves: additive in the dark, a soft local
   *  bloom on a pale page (additive there only tints the canvas). */
  glow: "additive" | "soft";
}

export const DESK_DARK: DeskPalette = {
  surface: "#3a3a44",
  frame: "#2b2b33",
  case: "#30303a",
  vent: "#22222a",
  bezel: "#202027",
  screenTop: "#3a78d8",
  screenBottom: "#1d4a96",
  lip: "rgba(224, 164, 88, 0.16)",
  glow: "additive",
};

export const DESK_LIGHT: DeskPalette = {
  surface: "#40404a",
  frame: "#3a3a44",
  case: "#35353e",
  vent: "#2a2a32",
  bezel: "#2a2a32",
  screenTop: "#3572d4",
  screenBottom: "#1c4792",
  lip: null,
  glow: "soft",
};

export interface Desk {
  floorY: number;
  left: number;
  right: number;
  monX: number;
  towerX: number;
  chairX: number;
}

/** Lay the desk out around where he sits, clipped to the given span. */
export function deskLayout(
  atX: number,
  floorY: number,
  minX = -Infinity,
  maxX = Infinity,
): Desk {
  const left = Math.max(minX, atX - REACH_LEFT);
  const right = Math.min(maxX, atX + REACH_RIGHT);
  return {
    floorY,
    left,
    right,
    monX: Math.min(right - 26, atX + 76),
    towerX: Math.min(right - 62, atX + 42),
    chairX: atX - 18,
  };
}

/** Where the screen sits — the light source for the scene. */
export function monitorGlow(d: Desk): { x: number; y: number } {
  return { x: d.monX, y: d.floorY - 42 };
}

/** Chair, tower, legs, monitor — everything that sits behind him. */
export function drawDeskBehind(
  ctx: CanvasRenderingContext2D,
  d: Desk,
  camY: number,
  time: number,
  pal: DeskPalette,
): void {
  const f = d.floorY - camY;

  // --- Task chair -------------------------------------------------
  ctx.fillStyle = pal.frame;
  ctx.save();
  ctx.translate(d.chairX - 12, f - 14);
  ctx.rotate(-0.16);
  ctx.beginPath();
  ctx.roundRect(-3, -16, 6, 16, 3);
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.roundRect(d.chairX - 14, f - 14, 26, 3.5, 1.75); // seat
  ctx.roundRect(d.chairX - 2, f - 11, 3.5, 8, 1.5); // cylinder
  ctx.fill();

  ctx.strokeStyle = pal.frame;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(d.chairX - 12, f - 1);
  ctx.lineTo(d.chairX, f - 4);
  ctx.lineTo(d.chairX + 12, f - 1);
  ctx.stroke();

  // --- Tower, parked under the desk -------------------------------
  ctx.fillStyle = pal.case;
  ctx.beginPath();
  ctx.roundRect(d.towerX, f - 21, 15, 21, 1.5);
  ctx.fill();

  ctx.fillStyle = pal.vent;
  ctx.beginPath();
  ctx.roundRect(d.towerX + 3, f - 18, 9, 1.5, 0.75); // optical drive
  for (let i = 0; i < 2; i++) ctx.roundRect(d.towerX + 3, f - 14 + i * 3, 6, 1, 0.5);
  ctx.fill();

  // It's been on the whole time.
  const led = 0.5 + Math.sin(time * 1.6) * 0.3;
  ctx.fillStyle = `rgba(126, 214, 160, ${led.toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(d.towerX + 11, f - 12, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // --- Desk legs --------------------------------------------------
  ctx.fillStyle = pal.frame;
  ctx.beginPath();
  ctx.roundRect(d.left + 4, f - SURFACE_H + 4, 4, SURFACE_H - 4, 1);
  ctx.roundRect(d.right - 8, f - SURFACE_H + 4, 4, SURFACE_H - 4, 1);
  ctx.fill();

  monitor(ctx, d, f, time, pal);
}

function monitor(
  ctx: CanvasRenderingContext2D,
  d: Desk,
  f: number,
  time: number,
  pal: DeskPalette,
): void {
  const x = d.monX;
  const glow = 0.88 + Math.sin(time * 2.1) * 0.07 + Math.sin(time * 7.3) * 0.05;
  const gy = f - 42;

  if (pal.glow === "additive") {
    // The cave is dark enough for the screen light to read as real spill.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const spill = ctx.createRadialGradient(x, gy, 0, x, gy, 96);
    spill.addColorStop(0, `rgba(52, 104, 190, ${(0.5 * glow).toFixed(3)})`);
    spill.addColorStop(0.45, `rgba(42, 84, 158, ${(0.16 * glow).toFixed(3)})`);
    spill.addColorStop(1, "rgba(36, 72, 140, 0)");
    ctx.fillStyle = spill;
    ctx.beginPath();
    ctx.arc(x, gy, 96, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // A tight bloom only. Radius stays well inside the canvas so the
    // gradient is fully transparent before it can meet an edge.
    const r = 46;
    const b = ctx.createRadialGradient(x, gy, 0, x, gy, r);
    b.addColorStop(0, `rgba(72, 122, 208, ${(0.15 * glow).toFixed(3)})`);
    b.addColorStop(1, "rgba(72, 122, 208, 0)");
    ctx.fillStyle = b;
    ctx.beginPath();
    ctx.arc(x, gy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = pal.bezel;
  ctx.beginPath();
  ctx.roundRect(x - 9, f - 27.5, 18, 1.5, 0.75); // base
  ctx.roundRect(x - 2.5, f - 30, 5, 4, 1); // neck
  ctx.roundRect(x - 23, f - SCENE_TOP, 46, 26, 2.5); // bezel
  ctx.fill();

  const screen = ctx.createLinearGradient(0, f - 53.5, 0, f - 32.5);
  screen.addColorStop(0, pal.screenTop);
  screen.addColorStop(1, pal.screenBottom);
  ctx.save();
  ctx.globalAlpha = glow;
  ctx.fillStyle = screen;
  ctx.beginPath();
  ctx.roundRect(x - 20, f - 53.5, 40, 21, 1.5);
  ctx.fill();

  // Still open where he left it.
  ctx.clip();
  ctx.fillStyle = "rgba(255, 255, 255, 0.26)";
  const lines = [21, 14, 26, 11];
  lines.forEach((len, i) => ctx.fillRect(x - 16, f - 50 + i * 4.5, len, 1.4));
  if (Math.sin(time * 3.4) > 0) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillRect(x - 16 + lines[3] + 2, f - 50 + 3 * 4.5 - 0.6, 2.4, 2.6);
  }
  ctx.restore();
}

/** The worksurface, drawn last so it passes in front of him. */
export function drawDeskFront(
  ctx: CanvasRenderingContext2D,
  d: Desk,
  camY: number,
  pal: DeskPalette,
): void {
  const y = d.floorY - camY - SURFACE_H;
  const w = d.right - d.left;

  ctx.fillStyle = pal.surface;
  ctx.beginPath();
  ctx.roundRect(d.left, y, w, 4, 1.5);
  ctx.fill();

  if (pal.lip) {
    ctx.fillStyle = pal.lip;
    ctx.fillRect(d.left + 1, y, w - 2, 1);
  }

  // Screen light pooling along the surface, clipped so it can't leak.
  const g = ctx.createRadialGradient(d.monX, y, 0, d.monX, y, 84);
  g.addColorStop(0, "rgba(96, 148, 226, 0.42)");
  g.addColorStop(1, "rgba(96, 148, 226, 0)");
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(d.left, y, w, 4, 1.5);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}
