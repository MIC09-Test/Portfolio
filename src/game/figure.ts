// ============================================================
//  The character — one set of proportions and one drawing
//  routine, shared by both modes. He is exactly the same size
//  asleep at the desk in the footer as he is awake in the cave,
//  so the lights toggle never resizes him.
//
//  Coordinates are figure-local pixels: feet at y=0, facing +x.
// ============================================================

export type Pt = readonly [number, number];

export interface Pose {
  hip: Pt;
  knee: Pt;
  foot: Pt;
  torsoA: Pt; // the torso is a capsule: a thick round-capped line A→B
  torsoB: Pt;
  head: Pt;
  shoulder: Pt;
  hand: Pt;
  torchA: Pt;
  torchB: Pt;
  flame: Pt;
}

export const BODY = "#46464e";
export const LIMB = "#3a3a42";
const TORCH = "#4a4048";

/** Face down at the desk, torch unlit on the surface beside him. */
export const SLUMPED: Pose = {
  hip: [-4, -15],
  knee: [10, -14],
  foot: [13, 0],
  torsoA: [-4, -19],
  torsoB: [11, -28],
  head: [17, -33],
  shoulder: [10, -31],
  hand: [24, -28],
  torchA: [25, -26],
  torchB: [31, -28],
  flame: [32, -28],
};

/** Upright with the torch — the pose the platformer runs on. */
export const AWAKE: Pose = {
  hip: [0, -21],
  knee: [0, -10.5],
  foot: [0, 0],
  torsoA: [0, -26],
  torsoB: [0, -36],
  head: [0, -51],
  shoulder: [3, -37],
  hand: [15, -42],
  torchA: [16.5, -40.5],
  torchB: [18.5, -51],
  flame: [18.5, -55.5],
};

export const HEAD_R = 7;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** A beat of stillness, then he pushes himself up. */
export function easeWake(t: number): number {
  const u = clamp01((t - 0.12) / 0.88);
  return u * u * (3 - 2 * u);
}

/** How lit the torch is — it catches partway through the rise. */
export const litness = (r: number): number => clamp01((r - 0.5) / 0.35);

export function blendPose(r: number): Pose {
  const mix = (a: Pt, b: Pt): Pt => [lerp(a[0], b[0], r), lerp(a[1], b[1], r)];
  return {
    hip: mix(SLUMPED.hip, AWAKE.hip),
    knee: mix(SLUMPED.knee, AWAKE.knee),
    foot: mix(SLUMPED.foot, AWAKE.foot),
    torsoA: mix(SLUMPED.torsoA, AWAKE.torsoA),
    torsoB: mix(SLUMPED.torsoB, AWAKE.torsoB),
    head: mix(SLUMPED.head, AWAKE.head),
    shoulder: mix(SLUMPED.shoulder, AWAKE.shoulder),
    hand: mix(SLUMPED.hand, AWAKE.hand),
    torchA: mix(SLUMPED.torchA, AWAKE.torchA),
    torchB: mix(SLUMPED.torchB, AWAKE.torchB),
    flame: mix(SLUMPED.flame, AWAKE.flame),
  };
}

/** Legs from the pose: hip → knee → foot, drawn as the same pair of lines
 *  the standing figure uses so the two paths meet without a pop. */
export function drawPosedLegs(
  ctx: CanvasRenderingContext2D,
  p: Pose,
  bob: number,
): void {
  ctx.strokeStyle = LIMB;
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (const dx of [-2, 2]) {
    ctx.moveTo(p.hip[0] + dx, p.hip[1] + bob);
    ctx.lineTo(p.knee[0] + dx, p.knee[1] + bob * 0.5);
    ctx.lineTo(p.foot[0] + dx, p.foot[1]);
  }
  ctx.stroke();
}

/** Legs of the upright figure: they stride when he walks, tuck when he's in
 *  the air. */
export function drawAwakeLegs(
  ctx: CanvasRenderingContext2D,
  bob: number,
  swing: number,
  airborne: boolean,
): void {
  ctx.strokeStyle = LIMB;
  ctx.lineWidth = 5;
  const hipY = -21 + bob;
  ctx.beginPath();
  if (airborne) {
    ctx.moveTo(-2, hipY);
    ctx.lineTo(-6, -7);
    ctx.moveTo(2, hipY);
    ctx.lineTo(7, -5);
  } else {
    ctx.moveTo(-2, hipY);
    ctx.lineTo(-2 + swing, 0);
    ctx.moveTo(2, hipY);
    ctx.lineTo(2 - swing, 0);
  }
  ctx.stroke();
}

/** Torso, head, arm, and the torch — everything above the hips. */
export function drawUpperBody(
  ctx: CanvasRenderingContext2D,
  p: Pose,
  bob: number,
  time: number,
  /** 0 = no torch at all, 1 = fully lit. */
  lit: number,
): void {
  // Torso — a capsule, which is what a roundRect of this width draws.
  ctx.strokeStyle = BODY;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(p.torsoA[0], p.torsoA[1] + bob);
  ctx.lineTo(p.torsoB[0], p.torsoB[1] + bob);
  ctx.stroke();

  ctx.fillStyle = BODY;
  ctx.beginPath();
  ctx.arc(p.head[0], p.head[1] + bob, HEAD_R, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = BODY;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(p.shoulder[0], p.shoulder[1] + bob);
  ctx.lineTo(p.hand[0], p.hand[1] + bob);
  ctx.stroke();

  if (lit <= 0) return;

  ctx.save();
  ctx.globalAlpha = lit;

  ctx.strokeStyle = TORCH;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.torchA[0], p.torchA[1] + bob);
  ctx.lineTo(p.torchB[0], p.torchB[1] + bob);
  ctx.stroke();

  // Flame with a warm halo, gently flickering.
  const f = 1 + Math.sin(time * 15) * 0.12 + Math.sin(time * 27 + 2) * 0.08;
  const fx = p.flame[0];
  const fy = p.flame[1] + bob;
  const halo = ctx.createRadialGradient(fx, fy, 0, fx, fy, 24);
  halo.addColorStop(0, "rgba(255, 176, 88, 0.32)");
  halo.addColorStop(1, "rgba(255, 150, 60, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(fx, fy, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff9d42";
  ctx.beginPath();
  ctx.ellipse(fx, fy, 4.2 * f, 5.8 * f, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd98a";
  ctx.beginPath();
  ctx.ellipse(fx, fy + 1, 2.2 * f, 3.3 * f, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
