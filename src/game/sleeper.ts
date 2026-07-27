// ============================================================
//  The footer scene — the explorer off duty. With the lights on
//  there is no cave to descend, so he is asleep at the foot of
//  the page, face down on the desk, monitor still burning blue.
//  Turning the lights off wakes him up right where he is.
//
//  Drawn from the SAME desk geometry and the SAME figure the
//  cave uses, at 1:1 figure units, so nothing changes size when
//  the lights go out. Only the palette and the lighting differ.
// ============================================================

import {
  DESK_LIGHT,
  SCENE_TOP,
  deskLayout,
  drawDeskBehind,
  drawDeskFront,
  type Desk,
} from "./desk";
import { SLUMPED, drawPosedLegs, drawUpperBody } from "./figure";

const PAD_X = 16; // breathing room either side of the desk
const HEAD_ROOM = 34; // space above the monitor for the z's

/** Where he stands inside the canvas. The engine reads these to place the
 *  cave's floor and desk on the very same spot, so lights-off wakes him
 *  exactly where the footer had him sleeping. */
export const AT_X = PAD_X + 34; // 34 = the desk's reach to his left
export const FLOOR_Y = HEAD_ROOM + SCENE_TOP;

const W = AT_X + 152 + PAD_X; // 152 = the desk's reach to his right
const H = FLOOR_Y + 8; // a little floor below him

const DESK: Desk = deskLayout(AT_X, FLOOR_Y);

export class Sleeper {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly still: boolean;
  private raf = 0;
  private enabled = false;
  private onScreen = false;
  private t0 = performance.now();

  /** CSS pixel size of the scene — the stylesheet needs to match it. */
  static readonly WIDTH = W;
  static readonly HEIGHT = H;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The footer is the last thing on the page — don't animate it while
    // it's parked off-screen.
    new IntersectionObserver(([entry]) => {
      this.onScreen = entry.isIntersecting;
      this.sync();
    }).observe(canvas);

    let timer = 0;
    window.addEventListener("resize", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (this.enabled && this.onScreen) {
          this.resize();
          this.render();
        }
      }, 120);
    });
  }

  setEnabled(on: boolean): void {
    if (on === this.enabled) return;
    this.enabled = on;
    this.sync();
  }

  private sync(): void {
    if (this.enabled && this.onScreen) {
      this.resize();
      // Reduced motion: he still sleeps, he just doesn't breathe at you.
      if (this.still) {
        this.render();
        return;
      }
      if (!this.raf) this.raf = requestAnimationFrame(() => this.frame());
    } else if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = this.canvas.clientWidth;
    if (!cw) return; // display:none — nothing to measure yet
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(this.canvas.clientHeight * dpr);
  }

  private frame(): void {
    this.render();
    this.raf = requestAnimationFrame(() => this.frame());
  }

  private render(): void {
    const time = this.still ? 0 : (performance.now() - this.t0) / 1000;
    draw(this.ctx, this.canvas.width / W, time);
  }
}

function draw(ctx: CanvasRenderingContext2D, scale: number, time: number): void {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = "round";

  // Breathing — the only thing moving on him.
  const bob = Math.sin(time * 1.05) * 1.1;

  contactShadows(ctx);
  floor(ctx);
  drawDeskBehind(ctx, DESK, 0, time, DESK_LIGHT);

  // Him, bracketed by the desk exactly as in the cave.
  ctx.save();
  ctx.translate(AT_X, FLOOR_Y);
  drawPosedLegs(ctx, SLUMPED, bob);
  drawUpperBody(ctx, SLUMPED, bob, time, 0); // no torch — he's asleep
  ctx.restore();

  drawDeskFront(ctx, DESK, 0, DESK_LIGHT);
  zzz(ctx, time);
}

/** A soft pool of shadow, squashed into an ellipse. */
function pool(
  ctx: CanvasRenderingContext2D,
  x: number,
  rx: number,
  ry: number,
  alpha: number,
): void {
  const g = ctx.createRadialGradient(x, FLOOR_Y, 0, x, FLOOR_Y, rx);
  g.addColorStop(0, `rgba(27, 27, 31, ${alpha})`);
  g.addColorStop(1, "rgba(27, 27, 31, 0)");
  ctx.save();
  ctx.translate(x, FLOOR_Y);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Where everything meets the floor — grounds it on a pale page. */
function contactShadows(ctx: CanvasRenderingContext2D): void {
  pool(ctx, DESK.towerX + 7, 18, 3, 0.15);
  pool(ctx, DESK.chairX, 22, 3.5, 0.13);
  pool(ctx, DESK.left + 6, 10, 2.5, 0.12);
  pool(ctx, DESK.right - 6, 10, 2.5, 0.12);
}

function floor(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = "rgba(20, 20, 24, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, FLOOR_Y);
  ctx.lineTo(W - 4, FLOOR_Y);
  ctx.stroke();
}

/** Three z's drifting off the top of his head. */
function zzz(ctx: CanvasRenderingContext2D, time: number): void {
  const fromX = AT_X + SLUMPED.head[0] + 6;
  const fromY = FLOOR_Y + SLUMPED.head[1] - 12;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < 3; i++) {
    const p = (((time * 0.34 + i / 3) % 1) + 1) % 1;
    const alpha = Math.sin(p * Math.PI) * 0.62;
    if (alpha <= 0.01) continue;
    const size = 7 + p * 4.5;
    ctx.font = `italic ${size.toFixed(1)}px "Inter", system-ui, sans-serif`;
    ctx.fillStyle = `rgba(92, 112, 158, ${alpha.toFixed(3)})`;
    ctx.fillText("z", fromX + p * 15 + Math.sin(p * 6.5) * 2.5, fromY - p * 26);
  }
}
