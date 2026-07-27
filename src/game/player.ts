// ============================================================
//  The explorer — the visitor's torch-bearing avatar. Physics
//  is a small platformer: walk, jump, drop through ledges.
//  Platforms live in a mix of spaces: x in viewport pixels
//  (the stage is horizontally centered, no x-camera), y in
//  world/page pixels.
// ============================================================

import {
  AWAKE,
  blendPose,
  drawAwakeLegs,
  drawPosedLegs,
  drawUpperBody,
  easeWake,
  litness,
} from "./figure";
import { input } from "./input";

export interface Platform {
  x: number;
  y: number;
  w: number;
  solid?: boolean; // cannot be dropped through (the final floor)
  floor?: boolean; // section floors render as long ground lines
  hidden?: boolean; // content platforms: the text itself is the visual
  launch?: number; // landing here fires the player upward at this speed
  /** The bit of the page this ledge was measured from, so the engine can
   *  light up whatever he is standing on. Absent for floors and the desk. */
  el?: HTMLElement;
}

const WALK_SPEED = 250; // px/s
const ACCEL = 1600;
const FRICTION = 1400;
export const GRAVITY = 1900;
const JUMP_V = 720; // clears the ~104px ladder steps with margin

const HALF_W = 10;

export class Player {
  x = 0;
  y = 0; // feet position, world space
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  grounded = true;
  walkPhase = 0;
  /** 0 = asleep at the desk, 1 = upright and in the visitor's hands. */
  wake = 1;
  /** The platform currently underfoot, if grounded. */
  support: Platform | null = null;

  /** Set by the engine on every rebuild. */
  platforms: Platform[] = [];
  minX = 0;
  maxX = 0;

  private jumpHeld = false;
  private dropHeld = false;
  private dropTimer = 0; // while > 0, one-way platforms are ignored

  private overlaps(p: Platform): boolean {
    return this.x + HALF_W > p.x && this.x - HALF_W < p.x + p.w;
  }

  private findSupport(): Platform | null {
    for (const p of this.platforms) {
      if (Math.abs(this.y - p.y) < 2 && this.overlaps(p)) return p;
    }
    return null;
  }

  update(dt: number): void {
    // Horizontal
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) {
      this.vx += dir * ACCEL * dt;
      this.vx = Math.max(-WALK_SPEED, Math.min(WALK_SPEED, this.vx));
      this.facing = dir as 1 | -1;
    } else if (this.vx !== 0) {
      const drop = FRICTION * dt;
      this.vx = Math.abs(this.vx) <= drop ? 0 : this.vx - Math.sign(this.vx) * drop;
    }
    this.x += this.vx * dt;
    this.x = Math.max(this.minX, Math.min(this.maxX, this.x));

    // Walked off an edge?
    if (this.grounded) {
      this.support = this.findSupport();
      if (!this.support) {
        this.grounded = false;
        this.vy = 0;
      }
    } else {
      this.support = null;
    }

    // Descend: drop through one-way platforms.
    if (input.down && !this.dropHeld && this.grounded) {
      const sup = this.findSupport();
      if (sup && !sup.solid) {
        this.grounded = false;
        this.dropTimer = 0.2;
        this.y += 1;
        this.vy = 90;
      }
    }
    this.dropHeld = input.down;

    // Jump
    if (input.jump && this.grounded && !this.jumpHeld) {
      this.vy = -JUMP_V;
      this.grounded = false;
    }
    this.jumpHeld = input.jump;

    // Vertical
    if (!this.grounded) {
      this.dropTimer -= dt;
      const prevY = this.y;
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.vy > 0) {
        for (const p of this.platforms) {
          if (!p.solid && this.dropTimer > 0) continue;
          if (this.overlaps(p) && prevY <= p.y && this.y >= p.y) {
            this.y = p.y;
            if (p.launch) {
              // The launcher: a super-trampoline back to the very top.
              this.vy = -p.launch;
              this.grounded = false;
            } else {
              this.vy = 0;
              this.grounded = true;
              this.support = p;
            }
            break;
          }
        }
      }
    }

    if (this.grounded && Math.abs(this.vx) > 20) {
      this.walkPhase += dt * Math.abs(this.vx) * 0.05;
    } else {
      this.walkPhase = 0;
    }
  }

  /** Where the flame is in figure-local space — it travels with the pose. */
  private get flame(): readonly [number, number] {
    return this.wake >= 1 ? AWAKE.flame : blendPose(easeWake(this.wake)).flame;
  }

  /** World position of the torch flame — the light source. */
  get torchX(): number {
    return this.x + this.facing * this.flame[0];
  }
  get torchY(): number {
    return this.y + this.flame[1];
  }

  /** Torch brightness, so the darkness can bloom in as it catches. */
  get torchIntensity(): number {
    return this.wake >= 1 ? 1 : litness(easeWake(this.wake));
  }

  /** Draw at screen coords: x is already screen-space, y = world y - camY. */
  draw(ctx: CanvasRenderingContext2D, camY: number, time: number): void {
    ctx.save();
    ctx.translate(this.x, this.y - camY);
    ctx.scale(this.facing, 1);
    ctx.lineCap = "round";

    const rising = this.wake < 1;
    const r = rising ? easeWake(this.wake) : 1;
    const p = rising ? blendPose(r) : AWAKE;

    const striding = !rising && this.grounded && Math.abs(this.vx) > 20;
    const swing = striding ? Math.sin(this.walkPhase) * 8 : 0;
    const idle =
      !rising && !striding && this.grounded ? Math.sin(time * 1.6) * 0.8 : 0;
    const bob = striding ? Math.abs(Math.cos(this.walkPhase)) * -2 : idle;

    // Legs. Standing they swing; rising they unfold from the chair, drawn
    // as the same pair of lines so the two paths meet without a pop.
    if (rising) {
      drawPosedLegs(ctx, p, bob);
    } else {
      drawAwakeLegs(ctx, bob, swing, !this.grounded);
    }

    drawUpperBody(ctx, p, bob, time, rising ? litness(r) : 1);

    ctx.restore();
  }
}
