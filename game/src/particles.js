// NEON VOID — particles, floating text, shockwaves and screen shake.
// Pure visual juice: nothing here changes gameplay, it only makes every
// hit feel like something happened.
export class Particles {
  constructor() {
    this.list = [];
    this.texts = [];
    this.rings = [];
    this.trauma = 0;
    this.stars = [];
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: Math.random() * 1280, y: Math.random() * 800,
        size: Math.random() * 1.8 + 0.4, speed: Math.random() * 12 + 3,
        tw: Math.random() * Math.PI * 2,
      });
    }
  }

  burst(x, y, color, count, speed, life = 0.6, size = 3) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.list.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: life * (0.5 + Math.random() * 0.5), maxLife: life,
        size: size * (0.6 + Math.random() * 0.8), color,
        drag: 0.92, glow: true,
      });
    }
  }

  trail(x, y, color) {
    this.list.push({
      x, y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
      life: 0.3, maxLife: 0.3, size: 2.5, color, drag: 0.9, glow: true,
    });
  }

  ring(x, y, color, maxR = 90) {
    this.rings.push({ x, y, r: 8, maxR, color, life: 0.45, maxLife: 0.45 });
  }

  text(x, y, str, color, size = 16) {
    this.texts.push({ x, y, str, color, size, life: 0.9, maxLife: 0.9 });
  }

  shake(amount) { this.trauma = Math.min(1, this.trauma + amount); }

  shakeOffset() {
    const s = this.trauma * this.trauma * 14;
    return { x: (Math.random() - 0.5) * s, y: (Math.random() - 0.5) * s };
  }

  update(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    for (const p of this.list) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= p.drag; p.vy *= p.drag;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
    for (const t of this.texts) { t.y -= 42 * dt; t.life -= dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const r of this.rings) { r.r += (r.maxR - r.r) * dt * 7; r.life -= dt; }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const s of this.stars) {
      s.y += s.speed * dt;
      s.tw += dt * 2;
      if (s.y > 800) { s.y = -4; s.x = Math.random() * 1280; }
    }
  }

  drawBackground(ctx) {
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, 1280, 800);
    // Nebula: three soft colour clouds so the arena never reads as flat black.
    const clouds = [
      { x: 220, y: 170, r: 340, c: 'rgba(88,28,135,0.20)' },
      { x: 1060, y: 620, r: 380, c: 'rgba(8,110,140,0.16)' },
      { x: 1050, y: 130, r: 280, c: 'rgba(160,20,90,0.13)' },
      { x: 240, y: 680, r: 300, c: 'rgba(20,60,140,0.14)' },
    ];
    for (const cl of clouds) {
      const g = ctx.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, cl.r);
      g.addColorStop(0, cl.c);
      g.addColorStop(1, 'rgba(5,6,15,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cl.x - cl.r, cl.y - cl.r, cl.r * 2, cl.r * 2);
    }
    for (const s of this.stars) {
      const a = 0.25 + 0.35 * Math.abs(Math.sin(s.tw));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#cfe6ff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#12142a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= 1280; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, 800); }
    for (let y = 0; y <= 800; y += 64) { ctx.moveTo(0, y); ctx.lineTo(1280, y); }
    ctx.stroke();
  }

  draw(ctx) {
    for (const p of this.list) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 8; }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    for (const r of this.rings) {
      const a = Math.max(0, r.life / r.maxLife);
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      const a = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = a;
      ctx.font = `bold ${t.size}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 6;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}
