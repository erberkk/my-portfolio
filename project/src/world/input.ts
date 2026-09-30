// Keyboard, mouse (pointer lock) and touch input, flattened into one state
// object the player controller reads every frame.

export const input = {
  forward: 0,
  right: 0,
  sprint: false,
  /** Queued one-shot actions, consumed by the controller. */
  attack: false,
  dodge: false,
  interact: false,
  /** Deflect press (one-shot) and guard (held). */
  parry: false,
  guard: false,
  /** Toggle lock-on (one-shot). */
  lock: false,
  /** Accumulated look delta in pixels since last frame. */
  lookX: 0,
  lookY: 0,
  /** Virtual joystick (touch), -1..1. */
  stick: { x: 0, y: 0, active: false },
};

const keys = new Set<string>();

function recompute() {
  const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const r = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  input.forward = f;
  input.right = r;
  input.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
}

const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyF', 'KeyJ', 'KeyK', 'KeyQ', 'KeyL', 'KeyR']);

/**
 * Listens while `enabled()` is true (the game is being played), so the page
 * keeps normal keyboard behaviour otherwise.
 */
export function bindInput(enabled: () => boolean, canvas: HTMLElement) {
  const down = (e: KeyboardEvent) => {
    if (!enabled() || e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable]')) return;
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'KeyK') input.dodge = true;
    if (e.code === 'KeyE') input.interact = true;
    if (e.code === 'KeyF' || e.code === 'KeyJ') input.attack = true;
    if (e.code === 'KeyQ' || e.code === 'KeyL') { input.parry = true; input.guard = true; }
    if (e.code === 'KeyR') input.lock = true;
    recompute();
  };
  const up = (e: KeyboardEvent) => {
    keys.delete(e.code);
    if (e.code === 'KeyQ' || e.code === 'KeyL') input.guard = false;
    recompute();
  };
  const blur = () => { keys.clear(); recompute(); };

  const mouseDown = (e: MouseEvent) => {
    if (!enabled()) return;
    if (document.pointerLockElement !== canvas) return;
    if (e.button === 0) input.attack = true;
    if (e.button === 2) { input.parry = true; input.guard = true; }
    if (e.button === 1) { e.preventDefault(); input.lock = true; }
  };
  const mouseUp = (e: MouseEvent) => { if (e.button === 2) input.guard = false; };
  const noMenu = (e: Event) => { if (enabled()) e.preventDefault(); };
  const mouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return;
    input.lookX += e.movementX;
    input.lookY += e.movementY;
  };

  // Drag to look for touch and for browsers without pointer lock.
  let dragId: number | null = null;
  let lastX = 0, lastY = 0;
  const pDown = (e: PointerEvent) => {
    if (!enabled() || document.pointerLockElement === canvas) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
  };
  const pMove = (e: PointerEvent) => {
    if (e.pointerId !== dragId) return;
    input.lookX += (e.clientX - lastX) * 1.4;
    input.lookY += (e.clientY - lastY) * 1.4;
    lastX = e.clientX; lastY = e.clientY;
  };
  const pUp = (e: PointerEvent) => { if (e.pointerId === dragId) dragId = null; };

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  canvas.addEventListener('mousedown', mouseDown);
  window.addEventListener('mouseup', mouseUp);
  canvas.addEventListener('contextmenu', noMenu);
  window.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('pointerdown', pDown);
  window.addEventListener('pointermove', pMove);
  window.addEventListener('pointerup', pUp);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
    canvas.removeEventListener('mousedown', mouseDown);
    window.removeEventListener('mouseup', mouseUp);
    canvas.removeEventListener('contextmenu', noMenu);
    window.removeEventListener('mousemove', mouseMove);
    canvas.removeEventListener('pointerdown', pDown);
    window.removeEventListener('pointermove', pMove);
    window.removeEventListener('pointerup', pUp);
    keys.clear();
    recompute();
  };
}

export function clearInput() {
  keys.clear();
  recompute();
  input.attack = input.dodge = input.interact = input.parry = input.guard = input.lock = false;
  input.lookX = input.lookY = 0;
}
