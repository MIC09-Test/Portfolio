// ============================================================
//  Covers the page in darkness, then punches light out of it:
//  the torch, and a faint ember at each section heading so the
//  visitor can spot where to go from afar.
// ============================================================

export interface Marker {
  x: number; // screen-space x
  y: number; // world-space y
  r?: number; // ember radius (default 34)
  a?: number; // ember strength 0..1 (default 0.55)
}

export class Lighting {
  private layer = document.createElement("canvas");
  private lctx = this.layer.getContext("2d")!;

  /** All coords screen-space except torchY/marker y, which are world-space. */
  render(
    ctx: CanvasRenderingContext2D,
    width: number, // canvas pixels
    height: number,
    dpr: number,
    camY: number,
    torchX: number,
    torchY: number,
    markers: Marker[],
    time: number,
    /** Torch brightness 0..1 — ramps up while he's still waking. */
    intensity = 1,
    /** How closed the darkness is, 0..1. Ramps up as the view travels down
     *  to his desk, so the lights appear to go out rather than cut out. */
    veil = 1,
  ): void {
    if (veil <= 0.001) {
      // Fully open: nothing to composite, leave the page as it is.
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.restore();
      return;
    }
    if (this.layer.width !== width || this.layer.height !== height) {
      this.layer.width = width;
      this.layer.height = height;
    }

    const l = this.lctx;
    l.globalCompositeOperation = "source-over";
    l.clearRect(0, 0, width, height);
    l.fillStyle = `rgba(5, 5, 8, ${(0.955 * veil).toFixed(4)})`;
    l.fillRect(0, 0, width, height);

    l.globalCompositeOperation = "destination-out";

    // Torch light with a gentle organic flicker.
    const flicker =
      1 +
      Math.sin(time * 11) * 0.025 +
      Math.sin(time * 23 + 1.7) * 0.02 +
      Math.sin(time * 5.3) * 0.015;
    // An unlit torch still leaves a sliver of light around him, so he
    // isn't a silhouette in a void while he's getting up.
    const r = 330 * dpr * flicker * (0.12 + 0.88 * intensity);
    const tx = torchX * dpr;
    const ty = (torchY - camY) * dpr;
    const g = l.createRadialGradient(tx, ty, 0, tx, ty, r);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(0.42, "rgba(0,0,0,0.86)");
    g.addColorStop(0.75, "rgba(0,0,0,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    l.fillStyle = g;
    l.beginPath();
    l.arc(tx, ty, r, 0, Math.PI * 2);
    l.fill();

    // A quiet ember at each section heading.
    for (const m of markers) {
      const sy = (m.y - camY) * dpr;
      if (sy < -200 || sy > height + 200) continue;
      const sx = m.x * dpr;
      const sr = (m.r ?? 34) * dpr * (1 + Math.sin(time * 2 + m.y) * 0.08);
      const sg = l.createRadialGradient(sx, sy, 0, sx, sy, sr);
      sg.addColorStop(0, `rgba(0,0,0,${m.a ?? 0.55})`);
      sg.addColorStop(1, "rgba(0,0,0,0)");
      l.fillStyle = sg;
      l.beginPath();
      l.arc(sx, sy, sr, 0, Math.PI * 2);
      l.fill();
    }

    // Composite the darkness, then a whisper of warm tint at the flame.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
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
