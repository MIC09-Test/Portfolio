import { bindTouchControls, input } from "./input";
import { Lighting } from "./lighting";
import { Player } from "./player";
import {
  ANCHORS,
  BG,
  WORLD_H,
  WORLD_W,
  drawPlatforms,
  drawSectionText,
} from "./world";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const hint = document.getElementById("hint")!;

const player = new Player();
const lighting = new Lighting();

// On touch devices, show on-screen buttons and adjust the hint.
const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
if (isTouch) {
  document.body.classList.add("touch");
  hint.textContent = "◀ ▶ walk · ▲ jump · ▼ descend";
}
bindTouchControls();

// The camera never shows fewer world units than these — otherwise portrait
// phones would crop the text, and landscape would zoom in too far.
const MIN_VIEW_W = 560;
const VIEW_H_TARGET = 640;

// --- Dust motes drifting in the torchlight ---
interface Mote {
  x: number;
  y: number;
  seed: number;
}
const motes: Mote[] = [];
for (let i = 0; i < 160; i++) {
  motes.push({
    x: Math.random() * WORLD_W,
    y: Math.random() * WORLD_H,
    seed: Math.random() * 100,
  });
}

let camX = 0;
let camY = 0;
let lastT = performance.now();
let hintHidden = false;

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
}
window.addEventListener("resize", resize);
resize();

function frame(now: number): void {
  const dt = Math.min((now - lastT) / 1000, 1 / 30);
  lastT = now;
  const time = now / 1000;

  player.update(dt);

  if (!hintHidden && input.any) {
    hintHidden = true;
    hint.style.opacity = "0";
  }

  // Camera: the world is a narrow column — wider screens center it with dark
  // margins; narrower ones pan horizontally. Vertically it follows the player.
  const scale = Math.min(canvas.height / VIEW_H_TARGET, canvas.width / MIN_VIEW_W);
  const viewW = canvas.width / scale;
  const viewH = canvas.height / scale;
  const targetX =
    viewW >= WORLD_W
      ? -(viewW - WORLD_W) / 2
      : Math.max(0, Math.min(WORLD_W - viewW, player.x - viewW / 2));
  const targetY = Math.max(0, Math.min(Math.max(0, WORLD_H - viewH), player.y - viewH * 0.55));
  camX += (targetX - camX) * (1 - Math.exp(-6 * dt));
  camY += (targetY - camY) * (1 - Math.exp(-6 * dt));

  // --- Background ---
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // --- World platforms, lit by the torch ---
  ctx.setTransform(scale, 0, 0, scale, -camX * scale, -camY * scale);
  drawPlatforms(ctx, camX, camY, viewW, viewH);

  // --- Darkness + torch ---
  lighting.render(
    ctx,
    { camX, camY, scale, width: canvas.width, height: canvas.height },
    player.torchX,
    player.torchY,
    time,
  );

  // --- Typography emerges above the darkness near the torch ---
  ctx.setTransform(scale, 0, 0, scale, -camX * scale, -camY * scale);
  for (const a of ANCHORS) {
    if (a.y > camY - 400 && a.y < camY + viewH + 400) {
      drawSectionText(ctx, a, player.x, player.y);
    }
  }

  // The character walks in front of the page.
  player.draw(ctx, time);

  // --- Dust motes shimmer in the torchlight ---
  ctx.globalCompositeOperation = "lighter";
  for (const m of motes) {
    if (m.y < camY - 20 || m.y > camY + viewH + 20) continue;
    const mx = m.x + Math.sin(time * 0.4 + m.seed) * 12;
    const my = m.y + Math.sin(time * 0.7 + m.seed * 2) * 14;
    const dist = Math.hypot(mx - player.torchX, my - player.torchY);
    const lit = Math.max(0, 1 - dist / 320);
    if (lit <= 0.01) continue;
    const blink = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.8 + m.seed * 3));
    ctx.fillStyle = `rgba(255, 205, 150, ${(0.32 * blink * lit).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(mx, my, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
