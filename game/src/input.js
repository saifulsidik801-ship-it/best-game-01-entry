// NEON VOID — input. Keyboard + mouse, nothing else. The canvas is scaled
// to fit the window, so mouse pixels are mapped back to logical game pixels.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered: consumed once per press
    this.mouseX = 640;
    this.mouseY = 400;
    this.mouseDown = false;
    this.mouseClicked = false; // edge-triggered click (for menus)
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; });

    canvas.addEventListener('mousemove', (e) => this.updateMouse(e));
    canvas.addEventListener('mousedown', (e) => {
      this.updateMouse(e);
      this.mouseDown = true;
      this.mouseClicked = true;
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  updateMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = (e.clientX - rect.left - this.offsetX) / this.scale;
    this.mouseY = (e.clientY - rect.top - this.offsetY) / this.scale;
  }

  // Called every frame after the canvas is resized to the window.
  setView(scale, offsetX, offsetY) {
    this.scale = scale;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  down(...codes) { return codes.some((c) => this.keys.has(c)); }
  wasPressed(...codes) { return codes.some((c) => this.pressed.has(c)); }
  consumePressed(...codes) {
    const hit = this.wasPressed(...codes);
    for (const c of codes) this.pressed.delete(c);
    return hit;
  }

  // Movement vector from WASD or arrow keys, normalised.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA', 'ArrowLeft')) x -= 1;
    if (this.down('KeyD', 'ArrowRight')) x += 1;
    if (this.down('KeyW', 'ArrowUp')) y -= 1;
    if (this.down('KeyS', 'ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
  }

  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
  }
}

// A small seeded RNG so screenshot modes play the same every time.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng, min, max) { return min + rng() * (max - min); }
export function pickWeighted(rng, weights) {
  let total = 0;
  for (const k of Object.keys(weights)) total += weights[k];
  let roll = rng() * total;
  for (const k of Object.keys(weights)) {
    roll -= weights[k];
    if (roll <= 0) return k;
  }
  return Object.keys(weights)[0];
}
