// ============================================================
//  The companion — a small torch-bearing figure who paces the
//  bottom edge of the page. He mirrors your scroll position:
//  top of the page puts him on the left, the end on the right.
//  Click near him and he hops. He is decoration, not the show.
// ============================================================

const BODY = "#46464e";
const LIMB = "#3a3a42";
const WALK_ANIM_SPEED = 0.055;
const EDGE_PAD = 56; // how close to the screen edges he will walk

export class Companion {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private reduced: boolean;

  private x = EDGE_PAD;
  private vx = 0;
  private facing: 1 | -1 = 1;
  private walkPhase = 0;

  // Hop physics (y is an offset above the ground line, positive = up).
  private hopY = 0;
  private hopV = 0;

  // Flame grows a little when the reader reaches the end of the page.
  private flameScale = 1;

  private lastT = performance.now();
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.addEventListener("resize", () => this.resize());
    this.resize();

    // A click near the bottom strip, close to him, makes him hop.
    // We never preventDefault — page clicks still work normally.
    document.addEventListener("click", (e) => {
      if (this.canvas.classList.contains("hidden")) return;
      const nearBottom = e.clientY > window.innerHeight - this.canvas.clientHeight;
      const nearHim = Math.abs(e.clientX - this.x) < 60;
      if (nearBottom && nearHim && this.hopY === 0) {
        this.hopV = this.reduced ? 0 : 300;
      }
    });

    if (this.reduced) {
      // No animation loop: place him statically and redraw on scroll only.
      this.snapToScroll();
      this.drawFrame(0);
      window.addEventListener("scroll", () => {
        this.snapToScroll();
        this.drawFrame(0);
      }, { passive: true });
    } else {
      this.running = true;
      requestAnimationFrame((t) => this.frame(t));
    }
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.round(this.canvas.clientHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.running) {
      this.snapToScroll();
      this.drawFrame(0);
    }
  }

  /** 0 at the top of the page, 1 at the very bottom. */
  private scrollProgress(): number {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }

  private targetX(): number {
    const w = this.canvas.clientWidth;
    return EDGE_PAD + this.scrollProgress() * Math.max(0, w - EDGE_PAD * 2);
  }

  private snapToScroll(): void {
    this.x = this.targetX();
  }

  private frame(now: number): void {
    const dt = Math.min((now - this.lastT) / 1000, 1 / 30);
    this.lastT = now;

    // Walk toward wherever the scroll position says he should be.
    const dx = this.targetX() - this.x;
    const desired = Math.max(-220, Math.min(220, dx * 4));
    this.vx += (desired - this.vx) * Math.min(1, 12 * dt);
    if (Math.abs(this.vx) < 2 && Math.abs(dx) < 1) this.vx = 0;
    this.x += this.vx * dt;

    const walking = Math.abs(this.vx) > 18;
    if (walking) {
      this.facing = this.vx > 0 ? 1 : -1;
      this.walkPhase += dt * Math.abs(this.vx) * WALK_ANIM_SPEED;
    } else {
      this.walkPhase = 0;
    }

    // Hop.
    if (this.hopY > 0 || this.hopV > 0) {
      this.hopV -= 1400 * dt;
      this.hopY = Math.max(0, this.hopY + this.hopV * dt);
      if (this.hopY === 0) this.hopV = 0;
    }

    // Flame swells when the reader reaches the end.
    const target = this.scrollProgress() > 0.97 ? 1.35 : 1;
    this.flameScale += (target - this.flameScale) * Math.min(1, 4 * dt);

    this.drawFrame(now / 1000);
    requestAnimationFrame((t) => this.frame(t));
  }

  private drawFrame(time: number): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // A whisper of a gradient so the strip reads as "ground" without
    // ever becoming a solid bar over the content.
    const fade = ctx.createLinearGradient(0, 0, 0, h);
    fade.addColorStop(0, "rgba(11, 11, 14, 0)");
    fade.addColorStop(1, "rgba(11, 11, 14, 0.8)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, w, h);

    const groundY = h - 16;
    const airborne = this.hopY > 0;
    const feetY = groundY - this.hopY;

    // Soft shadow on the ground.
    ctx.fillStyle = `rgba(0, 0, 0, ${airborne ? 0.25 : 0.4})`;
    ctx.beginPath();
    ctx.ellipse(this.x, groundY + 3, airborne ? 10 : 14, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    this.drawFigure(ctx, this.x, feetY, time, airborne);
  }

  private drawFigure(
    ctx: CanvasRenderingContext2D,
    x: number,
    feetY: number,
    time: number,
    airborne: boolean,
  ): void {
    ctx.save();
    ctx.translate(x, feetY);
    ctx.scale(this.facing, 1);
    ctx.lineCap = "round";

    const striding = !airborne && Math.abs(this.vx) > 18;
    const swing = striding ? Math.sin(this.walkPhase) * 8 : 0;
    const idleBob = this.reduced ? 0 : Math.sin(time * 1.6) * 0.8;
    const bob = striding ? Math.abs(Math.cos(this.walkPhase)) * -2 : idleBob;

    // Legs.
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

    // Torso.
    ctx.fillStyle = BODY;
    ctx.beginPath();
    ctx.roundRect(-8, -44 + bob, 16, 26, 8);
    ctx.fill();

    // Head.
    ctx.beginPath();
    ctx.arc(0, -51 + bob, 7, 0, Math.PI * 2);
    ctx.fill();

    // Arm holding the torch forward.
    ctx.strokeStyle = BODY;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(3, -37 + bob);
    ctx.lineTo(15, -42 + bob);
    ctx.stroke();

    // Torch handle.
    ctx.strokeStyle = "#4a4048";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(16.5, -40.5 + bob);
    ctx.lineTo(18.5, -51 + bob);
    ctx.stroke();

    // Flame with a warm halo.
    const flicker = this.reduced
      ? 1
      : 1 + Math.sin(time * 15) * 0.12 + Math.sin(time * 27 + 2) * 0.08;
    const f = flicker * this.flameScale;
    const fx = 18.5;
    const fy = -55.5 + bob;

    const halo = ctx.createRadialGradient(fx, fy, 0, fx, fy, 26 * this.flameScale);
    halo.addColorStop(0, "rgba(255, 176, 88, 0.30)");
    halo.addColorStop(1, "rgba(255, 150, 60, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(fx, fy, 26 * this.flameScale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff9d42";
    ctx.beginPath();
    ctx.ellipse(fx, fy, 4 * f, 5.6 * f, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd98a";
    ctx.beginPath();
    ctx.ellipse(fx, fy + 1, 2.1 * f, 3.1 * f, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
