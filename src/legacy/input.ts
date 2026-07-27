const pressed = new Set<string>();

window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
    e.preventDefault();
  }
  pressed.add(e.code);
});

window.addEventListener("keyup", (e) => pressed.delete(e.code));
window.addEventListener("blur", () => {
  pressed.clear();
  virtual.left = virtual.right = virtual.jump = virtual.down = false;
});

// State fed by the on-screen touch buttons.
const virtual = { left: false, right: false, jump: false, down: false };

export function bindTouchControls(): void {
  const bindings: [string, keyof typeof virtual][] = [
    ["btn-left", "left"],
    ["btn-right", "right"],
    ["btn-jump", "jump"],
    ["btn-down", "down"],
  ];
  for (const [id, key] of bindings) {
    const el = document.getElementById(id);
    if (!el) continue;
    const press = (e: Event) => {
      e.preventDefault();
      virtual[key] = true;
      el.classList.add("held");
    };
    const release = () => {
      virtual[key] = false;
      el.classList.remove("held");
    };
    el.addEventListener("pointerdown", press);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("pointerleave", release);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }
}

export const input = {
  get left(): boolean {
    return virtual.left || pressed.has("ArrowLeft") || pressed.has("KeyA");
  },
  get right(): boolean {
    return virtual.right || pressed.has("ArrowRight") || pressed.has("KeyD");
  },
  get jump(): boolean {
    return virtual.jump || pressed.has("ArrowUp") || pressed.has("KeyW") || pressed.has("Space");
  },
  get down(): boolean {
    return virtual.down || pressed.has("ArrowDown") || pressed.has("KeyS");
  },
  get any(): boolean {
    return pressed.size > 0 || virtual.left || virtual.right || virtual.jump || virtual.down;
  },
};
