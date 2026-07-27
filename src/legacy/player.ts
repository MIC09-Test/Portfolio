import { input } from "./input";
import { PLATFORMS, START_X, START_Y, WORLD_W, type Platform } from "./world";

const WALK_SPEED = 250; // px/s
const ACCEL = 1600;
const FRICTION = 1400;
const GRAVITY = 1900;
const JUMP_V = 720; // clears the 104px step gap with margin

const HALF_W = 10;
const BODY = "#38383f";
const LIMB = "#303037";

export class Player {
  x = START_X;
  y = START_Y; // feet position
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  grounded = true;
  walkPhase = 0;
  private jumpHeld = false;
  private dropHeld = false;
  private dropTimer = 0; // while > 0, one-way platforms are ignored

  private overlaps(p: Platform): boolean {
    return this.x + HALF_W > p.x && this.x - HALF_W < p.x + p.w;
  }

  private findSupport(): Platform | null {
    for (const p of PLATFORMS) {
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
    this.x = Math.max(70, Math.min(WORLD_W - 70, this.x));

    // Walked off an edge?
    if (this.grounded && !this.findSupport()) {
      this.grounded = false;
      this.vy = 0;
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
        for (const p of PLATFORMS) {
          if (!p.solid && this.dropTimer > 0) continue;
          if (this.overlaps(p) && prevY <= p.y && this.y >= p.y) {
            this.y = p.y;
            this.vy = 0;
            this.grounded = true;
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

  /** World position of the torch flame — the light source. */
  get torchX(): number {
    return this.x + this.facing * 21;
  }
  get torchY(): number {
    return this.y - 60;
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);
    ctx.lineCap = "round";

    const striding = this.grounded && Math.abs(this.vx) > 20;
    const swing = striding ? Math.sin(this.walkPhase) * 9 : 0;
    const bob = striding ? Math.abs(Math.cos(this.walkPhase)) * -2 : 0;

    // Legs — two capsule strokes from the hips to the floor.
    ctx.strokeStyle = LIMB;
    ctx.lineWidth = 6;
    const hipY = -24 + bob;
    if (this.grounded) {
      ctx.beginPath();
      ctx.moveTo(-2, hipY);
      ctx.lineTo(-2 + swing, 0);
      ctx.moveTo(2, hipY);
      ctx.lineTo(2 - swing, 0);
      ctx.stroke();
    } else {
      // Tucked in the air
      ctx.beginPath();
      ctx.moveTo(-2, hipY);
      ctx.lineTo(-7, -8);
      ctx.moveTo(2, hipY);
      ctx.lineTo(8, -6);
      ctx.stroke();
    }

    // Torso — a soft capsule.
    ctx.fillStyle = BODY;
    ctx.beginPath();
    ctx.roundRect(-9, -50 + bob, 18, 30, 9);
    ctx.fill();

    // Head.
    ctx.beginPath();
    ctx.arc(0, -58 + bob, 8, 0, Math.PI * 2);
    ctx.fill();

    // Arm reaching forward to the torch.
    ctx.strokeStyle = BODY;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(4, -42 + bob);
    ctx.lineTo(17, -48 + bob);
    ctx.stroke();

    // Torch handle.
    ctx.strokeStyle = "#4a4048";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(19, -46 + bob);
    ctx.lineTo(21, -58 + bob);
    ctx.stroke();

    // Flame — a soft teardrop with a warm halo, gently flickering.
    const f = 1 + Math.sin(time * 15) * 0.12 + Math.sin(time * 27 + 2) * 0.08;
    const fx = 21;
    const fy = -63 + bob;
    const halo = ctx.createRadialGradient(fx, fy, 0, fx, fy, 22);
    halo.addColorStop(0, "rgba(255, 176, 88, 0.35)");
    halo.addColorStop(1, "rgba(255, 150, 60, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(fx, fy, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff9d42";
    ctx.beginPath();
    ctx.ellipse(fx, fy, 4.6 * f, 6.4 * f, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd98a";
    ctx.beginPath();
    ctx.ellipse(fx, fy + 1, 2.4 * f, 3.6 * f, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
