import { ANCHORS } from "./world";

export interface LightView {
  camX: number;
  camY: number;
  scale: number; // world units → canvas pixels
  width: number; // canvas pixels
  height: number;
}

/**
 * Covers the site in darkness, then punches light out of it: the torch, and
 * a faint pinprick at each section marker so visitors can spot them afar.
 */
export class Lighting {
  private layer = document.createElement("canvas");
  private lctx = this.layer.getContext("2d")!;

  render(
    ctx: CanvasRenderingContext2D,
    view: LightView,
    torchX: number,
    torchY: number,
    time: number,
  ): void {
    const { camX, camY, scale, width, height } = view;
    if (this.layer.width !== width || this.layer.height !== height) {
      this.layer.width = width;
      this.layer.height = height;
    }

    const toSX = (wx: number) => (wx - camX) * scale;
    const toSY = (wy: number) => (wy - camY) * scale;

    const l = this.lctx;
    l.globalCompositeOperation = "source-over";
    l.clearRect(0, 0, width, height);
    l.fillStyle = "rgba(5, 5, 8, 0.94)";
    l.fillRect(0, 0, width, height);

    l.globalCompositeOperation = "destination-out";

    // Torch light with a gentle organic flicker.
    const flicker =
      1 + Math.sin(time * 11) * 0.025 + Math.sin(time * 23 + 1.7) * 0.02 + Math.sin(time * 5.3) * 0.015;
    const r = 300 * scale * flicker;
    const tx = toSX(torchX);
    const ty = toSY(torchY);
    const g = l.createRadialGradient(tx, ty, 0, tx, ty, r);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(0.4, "rgba(0,0,0,0.85)");
    g.addColorStop(0.75, "rgba(0,0,0,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    l.fillStyle = g;
    l.beginPath();
    l.arc(tx, ty, r, 0, Math.PI * 2);
    l.fill();

    // A quiet glow at each section marker.
    for (const a of ANCHORS) {
      const sy = toSY(a.y - 8);
      if (sy < -200 || sy > height + 200) continue;
      const sx = toSX(a.x);
      const sr = 34 * scale * (1 + Math.sin(time * 2 + a.y) * 0.08);
      const sg = l.createRadialGradient(sx, sy, 0, sx, sy, sr);
      sg.addColorStop(0, "rgba(0,0,0,0.6)");
      sg.addColorStop(1, "rgba(0,0,0,0)");
      l.fillStyle = sg;
      l.beginPath();
      l.arc(sx, sy, sr, 0, Math.PI * 2);
      l.fill();
    }

    // Composite the darkness, then a whisper of warm tint around the flame.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.layer, 0, 0);

    ctx.globalCompositeOperation = "lighter";
    const warm = ctx.createRadialGradient(tx, ty, 0, tx, ty, r * 0.7);
    warm.addColorStop(0, "rgba(255, 160, 70, 0.09)");
    warm.addColorStop(1, "rgba(255, 130, 40, 0)");
    ctx.fillStyle = warm;
    ctx.beginPath();
    ctx.arc(tx, ty, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
