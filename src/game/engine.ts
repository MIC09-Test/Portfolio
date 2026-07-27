// ============================================================
//  The engine turns the rendered portfolio page into a cave.
//
//  The platforms ARE the content: the engine measures real DOM
//  details — the name, link pills, section labels, paragraphs,
//  skill chips, project titles, the email — and makes their top
//  edges standable, invisibly. The content is the only footing —
//  nothing else is inserted to stand on.
//
//  Both side edges of the stage are open shafts:
//    · LEFT — the pit. Step off any floor's left edge and free-
//      fall all the way to the cave bottom.
//    · RIGHT — the launcher. Fall in and a glowing pad at the
//      bottom fires the explorer back to the very top, where a
//      ledge catches the landing.
//
//  Lights-off starts at the BOTTOM, at his desk: the same desk
//  the footer shows him asleep at. He gets up, the torch
//  catches, and control passes to the visitor — who can climb,
//  or walk right into the launcher for the top.
// ============================================================

import {
  DESK_DARK,
  deskLayout,
  drawDeskBehind,
  drawDeskFront,
  monitorGlow,
  SCENE_TOP,
  SURFACE_H,
  type Desk,
} from "./desk";
import { bindTouchControls, input } from "./input";
import { Lighting, type Marker } from "./lighting";
import { GRAVITY, Platform, Player } from "./player";
import { AT_X, FLOOR_Y, Sleeper } from "./sleeper";

/** Width of the pit / launcher shafts. Proportional, not fixed: 84px is 6.5%
 *  of a desktop but 21.5% of a phone, and the text column runs nearly edge to
 *  edge down there — so fixed lanes ate the left of every line. Short
 *  left-aligned things (the section labels above all) were clipped away
 *  entirely, which took out the footholds bridging one section to the next
 *  and left the cave genuinely unclimbable on a phone. */
function laneWidth(vw: number): number {
  return Math.round(Math.max(40, Math.min(84, vw * 0.075)));
}
const FLOOR_DROP = 34; // floor sits this far below a section's last line
const BOTTOM_DROP = 104; // fallback cave floor, if the desk canvas is missing
const WAKE_SECONDS = 1.25; // he gets this long to come round before controls live
const EXIT_SECONDS = 0.6; // how long the darkness takes to lift on the way out

// Nothing here dims the text. The cave used to fade each section in and out
// with the torch, on top of the darkness canvas — but the darkness already
// decides what can be seen, so the fade was a second, redundant curtain, and
// during the pan down it drew the wrong thing entirely: the camera travels
// while the torch stays parked at the desk, so every section the camera flew
// past sat at zero. Panning into the cave showed a blank page. The lit page
// keeps its reveal (main.ts); down here, the torch is the reveal.

/** Slow at both ends — a travelling camera, not a scroll jump. */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Which DOM details can be stood upon. Their top edge becomes a platform.
// Sparse stretches are what make a cave unclimbable, so anything with real
// text in it earns footing — including the hero's own lines, which sit in a
// <header> and so were never caught by "section p".
const STANDABLE = [
  ".hero h1",
  ".hero .role",
  ".hero .tagline",
  ".hero .link-row a",
  ".hero .meta",
  ".section-label",
  "section p",
  ".skill-group .group-label",
  ".chip",
  ".project h3",
  ".xp h3",
  ".xp li",
  ".cert h3",
  // Right-aligned against their headings, so each date is a perch on the far
  // side of the column from the title it belongs to — a reason to cross.
  ".period",
  ".cert-verify",
  ".email",
  "footer span",
  // The switch plate is a solid object screwed to the wall, so it holds him
  // like anything else — and it is the way out of the cave, which is the one
  // thing that must not come down to landing in a 12px window at the end of
  // a line. Touching it throws it, so he never actually gets to stand here.
  "#lights-toggle",
].join(", ");

// Blocks of prose stand a line at a time. A paragraph that offers only its
// top edge is a blank wall however many words are in it — which is what made
// About unclimbable — and its own ragged right edge is better cave geography
// than anything that could be invented: long lines make long ledges, the
// short last line of a paragraph a narrow perch out on its own.
const PROSE = ["section p", ".hero .tagline", ".xp li"].join(", ");

// Wide lines used to be cut to 58% of their width, alternating sides, to
// force the climb across the column instead of straight up it. Once ledges
// became the inked text rather than the block around it, that stopped paying
// for itself — measured, it made no difference to how often a hop needs a
// sideways move (47% with, 49% without), because the ragged right edge of
// real prose already varies every line. All it bought was letters you could
// see but not stand on. The text's own shape is the level design now.

// How tall he stands, feet to head — figure.ts puts AWAKE.head at -51.
const PLAYER_H = 51;

interface Mote {
  x: number;
  y: number;
  seed: number;
}

export class Engine {
  private world: HTMLElement;
  private app: HTMLElement;
  private scene: HTMLCanvasElement;
  private actor: HTMLCanvasElement;
  private light: HTMLCanvasElement;
  private sceneCtx: CanvasRenderingContext2D;
  private actorCtx: CanvasRenderingContext2D;
  private lightCtx: CanvasRenderingContext2D;
  private lighting = new Lighting();
  private player = new Player();

  private platforms: Platform[] = [];
  private markers: Marker[] = [];
  private motes: Mote[] = [];
  private pad: Platform | null = null;
  private desk: Desk | null = null;
  private waking = 0;
  private enterAt = 0;

  // Entering the cave runs in three beats: the view travels down to his
  // desk while the darkness closes in, he gets up, then it's the visitor's.
  private phase: "pan" | "waking" | "live" | "exit" = "live";
  private panT = 0;
  private panDur = 0;
  private panFrom = 0;
  private panTo = 0;
  private exitT = 0;
  private onExit: (() => void) | null = null;
  private stageLeft = 0;
  private stageW = 0;
  private worldH = 0;

  private camY = 0;
  private lastT = performance.now();
  private enabled = false;
  private rafId = 0;
  private spawned = false;
  private onFirstInput: (() => void) | null;

  // The switch by his name, and whether it is still waiting to be hit. Armed
  // afresh every time the lights go out, so the way home is always there.
  /** Whatever is currently lit under his feet, so it can be put out again. */
  private litStep: HTMLElement | null = null;

  private switchBox: { x: number; y: number; w: number; h: number } | null = null;
  private switchArmed = false;
  private readonly onSwitch: () => void;

  constructor(onFirstInput: () => void, onSwitch: () => void) {
    this.world = document.getElementById("world")!;
    this.app = document.getElementById("app")!;
    this.scene = document.getElementById("scene") as HTMLCanvasElement;
    this.actor = document.getElementById("actor") as HTMLCanvasElement;
    this.light = document.getElementById("light") as HTMLCanvasElement;
    this.sceneCtx = this.scene.getContext("2d")!;
    this.actorCtx = this.actor.getContext("2d")!;
    this.lightCtx = this.light.getContext("2d")!;
    this.onFirstInput = onFirstInput;
    this.onSwitch = onSwitch;

    bindTouchControls();

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (this.enabled) this.rebuild();
      }, 120);
    });

    // Keyboard focus jumps can still nudge the scroll position even with
    // overflow hidden — pin it, the camera is the only scroller here.
    window.addEventListener("scroll", () => {
      // Not while exiting: the lit page has the scrollbar back by then.
      if (this.enabled && this.phase !== "exit") window.scrollTo(0, 0);
    });

    // Re-measure once webfonts settle (layout heights can shift).
    document.fonts?.ready.then(() => {
      if (this.enabled) this.rebuild();
    });
  }

  /** Where the camera is, in world/page pixels. Both modes share the same
   *  layout, so this doubles as a scroll position for the lit page. */
  get cameraY(): number {
    return this.camY;
  }

  /** Turning the lights on: hold the darkness on screen and lift it, rather
   *  than cutting to the lit page. Calls `done` when it has fully lifted. */
  beginExit(done: () => void): void {
    if (!this.enabled || this.phase === "exit") {
      done();
      return;
    }
    this.phase = "exit";
    this.exitT = 0;
    this.onExit = done;
  }

  /** `atScrollY` is where the lit page was looking, so the toggle can keep
   *  the visitor's viewpoint instead of teleporting them. */
  setEnabled(on: boolean, atScrollY = 0): void {
    if (on === this.enabled) return;
    this.enabled = on;
    if (on) {
      this.enterAt = atScrollY;
      this.switchArmed = true;
      window.scrollTo(0, 0);
      // Every time the lights go out he is asleep at his desk again, so
      // re-place him at the bottom and replay the wake.
      this.spawned = false;
      this.waking = 0;
      this.panT = 0;
      this.phase = "pan";
      this.player.wake = 0;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.facing = 1;
      this.rebuild();
      this.lastT = performance.now();
      this.rafId = requestAnimationFrame((t) => this.frame(t));
    } else {
      cancelAnimationFrame(this.rafId);
      this.world.style.transform = "";
      this.world.style.height = "";
      // Put out whatever he was standing on; the lit page has no footing.
      this.litStep?.classList.remove("lit-step");
      this.litStep = null;
    }
  }

  /** World-space top/left of an element (offsetParent chain ends at #world). */
  private worldPos(el: HTMLElement): { x: number; y: number } {
    let x = 0;
    let y = 0;
    let node: HTMLElement | null = el;
    while (node && node !== this.world) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    return { x, y };
  }

  /** Where the letters actually are: one ledge per line of text, spanning
   *  only the inked run of that line rather than the width of the block it
   *  happens to sit in. A section label is a 612px-wide block holding 52px
   *  of "02 Skills" — standing on the other 560px was standing on nothing. */
  private textLedges(el: HTMLElement, thin: boolean): { x: number; right: number; y: number }[] {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width >= 1 && r.height >= 4);
    if (!rects.length) return [];

    // Rects come back per inline fragment, not per line: his name arrives as
    // "M", the bulb span, "chael L", the other bulb, "m". Merge anything
    // sharing a baseline or the name would be five stepping stones.
    const lines: { top: number; left: number; right: number }[] = [];
    for (const r of rects) {
      const line = lines.find((l) => Math.abs(l.top - r.top) <= 4);
      if (!line) {
        lines.push({ top: r.top, left: r.left, right: r.right });
        continue;
      }
      line.left = Math.min(line.left, r.left);
      line.right = Math.max(line.right, r.right);
    }
    lines.sort((a, b) => a.top - b.top);

    // Prose only: every line would be a rung every ~26px, a ladder you climb
    // by holding jump. Every other one — plus always the short last line,
    // the best perch in any paragraph.
    const kept =
      thin && lines.length > 1
        ? lines.filter((_, i) => i % 2 === 0 || i === lines.length - 1)
        : lines;

    // Client rects and world coords differ by whatever transform the camera
    // has on #world right now; the element and its own lines share it, so one
    // measurement of the element converts all of them.
    const box = el.getBoundingClientRect();
    const pos = this.worldPos(el);
    const dx = pos.x - box.left;
    const dy = pos.y - box.top;
    return kept.map((l) => ({ x: l.left + dx, right: l.right + dx, y: l.top + dy }));
  }

  /** Read the footer desk canvas to find, in world coordinates, where he
   *  stands and where his floor is. Returns null if the canvas is absent. */
  private deskAnchor(): { x: number; floorY: number } | null {
    const c = document.querySelector<HTMLCanvasElement>(".desk");
    if (!c || !c.offsetWidth) return null;
    const pos = this.worldPos(c);
    const scale = c.offsetWidth / Sleeper.WIDTH;
    return { x: pos.x + AT_X * scale, floorY: pos.y + FLOOR_Y * scale };
  }

  /** Measure the real DOM layout and build the world around it. */
  rebuild(): void {
    const vw = window.innerWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [this.scene, this.actor, this.light]) {
      c.width = Math.round(vw * dpr);
      c.height = Math.round(window.innerHeight * dpr);
    }

    // The stage is the whole viewport — floors run edge to edge and the
    // shafts occupy the true corners of the screen.
    this.stageW = vw;
    this.stageLeft = 0;
    const laneW = laneWidth(vw);
    const innerL = this.stageLeft + laneW; // left edge of walkable ground
    const innerR = this.stageLeft + this.stageW - laneW;

    this.platforms = [];
    this.markers = [];

    // --- Content platforms: stand on the details themselves ---
    const ledges: { x: number; right: number; y: number; el: HTMLElement }[] = [];
    const add = (rawX: number, rawRight: number, y: number, el: HTMLElement): void => {
      // Clip to the ground span so nothing juts into the shafts.
      const x = Math.max(rawX, innerL + 6);
      const right = Math.min(rawRight, innerR - 6);
      // Too narrow to stand on, so it isn't footing — except for the switch,
      // which is the way out. On a phone the plate is 46px wide and sits half
      // inside the left shaft, leaving 24px: the width rule would delete it,
      // and it is the only step between the name and the line under it.
      // A 24px perch is still wider than he is.
      if (right - x < (el.id === "lights-toggle" ? 20 : 26)) return;
      // Marks it as something he can stand on, which the stylesheet uses to
      // arm the fade — see `.footing` / `.lit-step` in style.css.
      el.classList.add("footing");
      ledges.push({ x, right, y, el });
    };

    for (const el of this.app.querySelectorAll<HTMLElement>(STANDABLE)) {
      if (el.offsetWidth === 0) continue;
      // A chip or a link pill is drawn as a solid object, so the whole of it
      // is footing, padding included — you can see it, you can stand on it.
      // Everything else is bare text on the page, and only the letters count.
      const cs = getComputedStyle(el);
      const painted =
        cs.backgroundColor !== "rgba(0, 0, 0, 0)" || parseFloat(cs.borderTopWidth) > 0;
      const lines = painted ? [] : this.textLedges(el, el.matches(PROSE));
      if (lines.length) {
        for (const l of lines) add(l.x, l.right, l.y, el);
      } else {
        const pos = this.worldPos(el);
        add(pos.x, pos.x + el.offsetWidth, pos.y, el);
      }
    }

    ledges.sort((a, b) => a.y - b.y || a.x - b.x);
    for (const l of ledges) {
      const { x, right } = l;
      this.platforms.push({
        x: Math.round(x),
        y: Math.round(l.y),
        w: Math.round(right - x),
        hidden: true,
        el: l.el,
      });
    }

    // --- The switch by his name: the way out of the cave --------------
    // Not standable on purpose. He has to knock it with the torch, which
    // means jumping into it, not perching on it. The ember is how it can be
    // found from below — the whole climb needs something to aim at.
    const sw = document.getElementById("lights-toggle");
    if (sw && sw.offsetWidth) {
      const p = this.worldPos(sw);
      this.switchBox = { x: p.x, y: p.y, w: sw.offsetWidth, h: sw.offsetHeight };
      this.markers.push({
        x: p.x + sw.offsetWidth / 2,
        y: p.y + sw.offsetHeight / 2,
        r: 54,
        a: 0.62,
      });
    } else {
      this.switchBox = null;
    }

    // --- Where the footer's desk canvas puts his floor ---------------
    // The footer keeps that canvas in the layout even in the cave, so its
    // own floor line is a real page coordinate. Standing the cave floor on
    // it means he wakes on exactly the spot he was asleep on.
    const anchor = this.deskAnchor();

    // --- Floors: a ground line under each section, shafts left open ---
    const sections = Array.from(this.app.children) as HTMLElement[];
    let lastFloor = 0;
    let topFloor = -1;
    for (const el of sections) {
      const pos = this.worldPos(el);
      const isLast = el === sections[sections.length - 1];
      const floorY = isLast
        ? Math.round(anchor?.floorY ?? pos.y + el.offsetHeight + BOTTOM_DROP)
        : Math.round(pos.y + el.offsetHeight + FLOOR_DROP);
      // Every floor stops at both shafts — open pits in each corner.
      // The cave bottom alone spans everything.
      this.platforms.push({
        x: isLast ? this.stageLeft : innerL,
        y: floorY,
        w: isLast ? this.stageW : innerR - innerL,
        floor: true,
        solid: isLast, // the cave bottom catches the pit and hosts the pad
      });
      if (topFloor < 0) topFloor = floorY;
      this.markers.push({ x: this.stageLeft + this.stageW / 2, y: pos.y + 26 });
      lastFloor = floorY;
    }

    // --- The launcher: the words "BACK TO TOP" are the trampoline.
    // Stepping into that zone on the cave floor fires the launch —
    // no physical plank, the phrase alone is the trigger.
    const launchV = Math.sqrt(2 * GRAVITY * (lastFloor - topFloor + 150));
    this.pad = {
      x: innerR + 8,
      y: lastFloor - 10,
      w: laneW - 16,
      launch: launchV,
    };

    // Embers so both corners can be found in the dark.
    this.markers.push({ x: innerR + laneW / 2, y: lastFloor - 14, r: 70, a: 0.8 }); // pad
    this.markers.push({ x: this.stageLeft + laneW / 2, y: topFloor - 6, r: 30, a: 0.45 }); // pit mouth

    // --- His desk, on the exact spot the footer drew it ---
    const deskX = Math.round(
      anchor?.x ?? this.stageLeft + this.stageW * 0.36,
    );
    this.desk = deskLayout(deskX, lastFloor, innerL + 6, innerR - 6);

    // The desk holds his weight. Not because the climb needs it — the words
    // alone get him out of the cave — but because it is the one thing within
    // arm's reach when he wakes, and a 26px step up onto the worksurface then
    // 30px onto the monitor is a gentler first move than the 106px hop to the
    // copyright line. Nothing is invented here: both are already drawn
    // standing on that floor. The climb out just starts on his own desk.
    this.platforms.push({
      x: Math.round(this.desk.left),
      y: Math.round(lastFloor - SURFACE_H),
      w: Math.round(this.desk.right - this.desk.left),
      hidden: true,
    });
    this.platforms.push({
      x: Math.round(this.desk.monX - 23), // the bezel's own width
      y: Math.round(lastFloor - SCENE_TOP),
      w: 46,
      hidden: true,
    });

    const mg = monitorGlow(this.desk);
    this.markers.push({ x: mg.x, y: mg.y, r: 130, a: 0.66 }); // the monitor

    // Match the world to the lit page's own height, so camera range and
    // scroll range are the same interval and the toggle round-trips exactly.
    this.world.style.height = "";
    const natural = this.world.offsetHeight;
    this.worldH = Math.max(natural, lastFloor + 60);
    this.world.style.height = `${this.worldH}px`;

    // Hand the fresh geometry to the player.
    this.player.platforms = this.platforms;
    this.player.minX = this.stageLeft + 14;
    this.player.maxX = this.stageLeft + this.stageW - 14;
    if (!this.spawned) {
      // Wakes at his desk, at the very bottom.
      this.player.x = deskX;
      this.player.y = lastFloor;
      this.player.grounded = true;
      const vh = window.innerHeight;
      const maxCam = Math.max(0, this.worldH - vh);
      // Start from exactly where the lit page was looking and travel down to
      // him, however far that is — the visitor should see where they went.
      this.panFrom = Math.min(maxCam, Math.max(0, this.enterAt));
      this.panTo = Math.min(maxCam, Math.max(0, this.player.y - vh * 0.58));
      this.camY = this.panFrom;
      const dist = Math.abs(this.panTo - this.panFrom);
      // Long trips take longer, but not proportionally — a whole page still
      // arrives in a couple of seconds.
      this.panDur = Math.min(2.3, 0.5 + dist / 2000);
      if (dist < 8) {
        this.panDur = 0;
        this.phase = "waking"; // already there; nothing to travel
      }
      this.spawned = true;
    } else {
      this.player.x = Math.max(this.player.minX, Math.min(this.player.maxX, this.player.x));
      this.player.y = Math.min(this.player.y, lastFloor);
    }

    // Dust motes drifting in the torchlight.
    this.motes = [];
    const count = Math.min(220, Math.round(this.worldH / 34));
    for (let i = 0; i < count; i++) {
      this.motes.push({
        x: this.stageLeft - 60 + Math.random() * (this.stageW + 120),
        y: Math.random() * this.worldH,
        seed: Math.random() * 100,
      });
    }
  }

  private frame(now: number): void {
    if (!this.enabled) return;
    const dt = Math.min((now - this.lastT) / 1000, 1 / 30);
    this.lastT = now;
    const time = now / 1000;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Three beats on the way in — the visitor only gets the controls on the
    // third. `veil` closes the darkness as the view travels down to him.
    let veil = 1;
    if (this.phase === "exit") {
      // The page underneath is already lit and scrolling normally; all that's
      // left is to raise the darkness off it.
      this.exitT += dt;
      const t = Math.min(1, this.exitT / EXIT_SECONDS);
      veil = 1 - easeInOut(t);
      this.camY = window.scrollY; // the scrollbar owns the view again
      if (t >= 1) {
        const done = this.onExit;
        this.onExit = null;
        this.setEnabled(false);
        this.lightCtx.clearRect(0, 0, this.light.width, this.light.height);
        done?.();
        return;
      }
    } else if (this.phase === "pan") {
      this.panT += dt;
      const t = Math.min(1, this.panT / this.panDur);
      this.camY = this.panFrom + (this.panTo - this.panFrom) * easeInOut(t);
      // Dark well before arrival, so he's found by his monitor, not by daylight.
      veil = easeInOut(Math.min(1, t / 0.75));
      if (t >= 1) {
        this.phase = "waking";
        this.waking = 0;
      }
    } else if (this.phase === "waking") {
      this.waking += dt;
      this.player.wake = Math.min(1, this.waking / WAKE_SECONDS);
      if (this.player.wake >= 1) this.phase = "live";
    } else {
      this.player.update(dt);
    }
    const rising = this.phase !== "live";

    // Standing under the "BACK TO TOP" phrase? That's the trampoline —
    // fire the launch back up to the hero floor.
    const pad = this.pad;
    if (
      !rising &&
      pad?.launch &&
      this.player.grounded &&
      Math.abs(this.player.y - (pad.y + 10)) < 6 &&
      this.player.x + 10 > pad.x &&
      this.player.x - 10 < pad.x + pad.w
    ) {
      this.player.vy = -pad.launch;
      this.player.grounded = false;
      this.player.y -= 2;
    }

    // The ground lights under his feet. The platforms ARE the content, so
    // what lights is a chip, a heading, a line of prose — whichever he has
    // his weight on. Standing still holds it; stepping off lets it fade.
    // The class goes on the element the ledge was measured from, so walking
    // along one line of a paragraph lights that paragraph.
    const stood = this.player.support?.el ?? null;
    if (stood !== this.litStep) {
      this.litStep?.classList.remove("lit-step");
      stood?.classList.add("lit-step");
      this.litStep = stood;
    }

    // He hits the switch and the room comes back. Any part of him counts —
    // the flame, or simply walking into it. The switch sits beside the name
    // at the name's own height, but the ledge is the TOP of the name, so
    // anyone standing up there has the whole of themselves above the plate;
    // flame-only detection made the obvious move (walk to the end of your
    // name and lean on it) do nothing at all. This is the one thing standing
    // between a visitor and a page they can read: it is deliberately easy.
    const sb = this.switchBox;
    if (!rising && this.switchArmed && sb) {
      const pad = 14;
      const hitsBox = (x: number, y: number, halfW: number, hUp: number): boolean =>
        x + halfW > sb.x - pad &&
        x - halfW < sb.x + sb.w + pad &&
        y > sb.y - pad - hUp &&
        y < sb.y + sb.h + pad;
      // His body, feet to head, and the flame out on its own.
      if (
        hitsBox(this.player.x, this.player.y, 10, PLAYER_H) ||
        hitsBox(this.player.torchX, this.player.torchY, 0, 0)
      ) {
        this.switchArmed = false;
        this.onSwitch();
      }
    }

    if (!rising && this.onFirstInput && input.any) {
      this.onFirstInput();
      this.onFirstInput = null;
    }

    // Camera follows the explorer, hard-clamped so pit falls and
    // launcher flights never leave him offscreen.
    // During the exit the page is scrolling normally again — leave the world
    // untransformed and let the scrollbar drive, or the two would fight.
    const exiting = this.phase === "exit";
    if (!exiting && this.phase !== "pan") {
      // The pan drives camY itself; otherwise the camera follows him.
      const targetY = Math.max(
        0,
        Math.min(Math.max(0, this.worldH - vh), this.player.y - vh * 0.58),
      );
      this.camY += (targetY - this.camY) * (1 - Math.exp(-6 * dt));
      if (this.phase === "live") {
        const maxLag = vh * 0.32;
        this.camY = Math.max(targetY - maxLag, Math.min(targetY + maxLag, this.camY));
      }
    }
    if (!exiting) {
      this.world.style.transform = `translate3d(0, ${-this.camY}px, 0)`;
    }

    // --- Scene canvas (behind the text): ground, stones, shafts ---
    const s = this.sceneCtx;
    s.setTransform(dpr, 0, 0, dpr, 0, -this.camY * dpr);
    s.clearRect(0, this.camY, vw, vh);
    for (const p of this.platforms) {
      if (p.hidden || p.launch) continue;
      if (p.y < this.camY - 40 || p.y > this.camY + vh + 40) continue;
      if (p.floor) {
        s.fillStyle = "#2c2c33";
        s.fillRect(p.x, p.y, p.w, 2.5);
        s.fillStyle = "rgba(224, 164, 88, 0.14)";
        s.fillRect(p.x, p.y, p.w, 1);
      } else {
        s.fillStyle = "#232329";
        s.beginPath();
        s.roundRect(p.x, p.y, p.w, 7, 3.5);
        s.fill();
        s.fillStyle = "#34343c";
        s.fillRect(p.x + 2, p.y, p.w - 4, 1.5);
      }
    }

    // The trampoline is the phrase itself — a floating "back to top"
    // hovering over its trigger zone in the right corner.
    if (this.pad && this.pad.y > this.camY - 80 && this.pad.y < this.camY + vh + 80) {
      const p = this.pad;
      const ly = p.y - 34 + Math.sin(time * 1.7) * 5;
      s.font = "600 11px 'Inter', 'Segoe UI', system-ui, sans-serif";
      s.textAlign = "center";
      // The phrase is wider than the shaft it labels once the lanes narrow on
      // a phone, so keep it on screen rather than half off the right edge.
      const half = s.measureText("BACK TO TOP").width / 2 + 6;
      const cx = Math.min(vw - half, Math.max(half, p.x + p.w / 2));
      s.fillStyle = "rgba(224, 164, 88, 0.8)";
      s.fillText("BACK TO TOP", cx, ly);
    }

    // --- Actor canvas (in front of the text): character + motes ---
    const a = this.actorCtx;
    a.setTransform(dpr, 0, 0, dpr, 0, 0);
    a.clearRect(0, 0, vw, vh);

    // Nothing marks which text is standable — no glint under his feet. The
    // footing is there to be discovered, not advertised.

    // His desk brackets him: the machine behind, the worksurface in front,
    // so he reads as sitting at it rather than standing before it.
    const deskOnScreen =
      this.desk !== null &&
      this.desk.floorY > this.camY - 80 &&
      this.desk.floorY < this.camY + vh + 80;
    if (deskOnScreen) drawDeskBehind(a, this.desk!, this.camY, time, DESK_DARK);

    this.player.draw(a, this.camY, time);

    if (deskOnScreen) drawDeskFront(a, this.desk!, this.camY, DESK_DARK);

    a.globalCompositeOperation = "lighter";
    for (const m of this.motes) {
      if (m.y < this.camY - 20 || m.y > this.camY + vh + 20) continue;
      const mx = m.x + Math.sin(time * 0.4 + m.seed) * 12;
      const my = m.y + Math.sin(time * 0.7 + m.seed * 2) * 14;
      const dist = Math.hypot(mx - this.player.torchX, my - this.player.torchY);
      const lit = Math.max(0, 1 - dist / 320);
      if (lit <= 0.01) continue;
      const blink = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.8 + m.seed * 3));
      a.fillStyle = `rgba(255, 205, 150, ${(0.32 * blink * lit).toFixed(3)})`;
      a.beginPath();
      a.arc(mx, my - this.camY, 1.4, 0, Math.PI * 2);
      a.fill();
    }
    a.globalCompositeOperation = "source-over";

    // --- Light canvas (on top of everything): darkness + torch ---
    this.lighting.render(
      this.lightCtx,
      this.light.width,
      this.light.height,
      dpr,
      this.camY,
      this.player.torchX,
      this.player.torchY,
      this.markers,
      time,
      this.player.torchIntensity,
      veil,
    );

    this.rafId = requestAnimationFrame((t) => this.frame(t));
  }
}
