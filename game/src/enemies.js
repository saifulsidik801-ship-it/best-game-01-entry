// NEON VOID — enemies. Four regular types plus the boss that shows up
// every 5th wave. Each type moves and attacks its own way; the world only
// calls update() and drawShape() and lets the type decide.
import { ENEMIES, BOSS, WORLD } from './config.js';

let nextId = 1;

export function makeEnemy(type, x, y, wave, rng) {
  const def = ENEMIES[type];
  const hpScale = 1 + (wave - 1) * 0.18;
  const speedScale = 1 + Math.min(0.5, (wave - 1) * 0.03);
  const e = {
    id: nextId++, type, x, y,
    vx: 0, vy: 0,
    radius: def.radius,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    speed: def.speed * speedScale * (0.9 + rng() * 0.2),
    damage: def.damage,
    score: def.score,
    color: def.color,
    shape: def.shape,
    angle: rng() * Math.PI * 2,
    fireTimer: 1 + rng() * 1.5,
    dartTimer: 1 + rng(),
    dartDir: { x: 0, y: 0 },
    darting: false,
    flash: 0,
    spin: rng() * Math.PI * 2,
  };
  return e;
}

export function makeBoss(wave) {
  const hpScale = 1 + (wave / 5 - 1) * 0.8;
  return {
    id: nextId++, type: 'boss', isBoss: true,
    x: WORLD.w / 2, y: -80,
    vx: 0, vy: 0,
    radius: BOSS.radius,
    hp: Math.round(BOSS.hp * hpScale),
    maxHp: Math.round(BOSS.hp * hpScale),
    speed: BOSS.speed,
    damage: BOSS.damage,
    score: BOSS.score,
    color: BOSS.color,
    angle: 0,
    burstTimer: 2,
    minionTimer: BOSS.minionInterval,
    flash: 0,
    entering: true,
    phase: 1,
  };
}

// Steer an enemy toward the player, by type. Returns bullets it fires.
export function updateEnemy(e, player, dt, rng, fireBullet) {
  e.flash = Math.max(0, e.flash - dt * 6);
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;

  if (e.type === 'chaser' || e.type === 'mini') {
    e.vx = nx * e.speed; e.vy = ny * e.speed;
    e.angle = Math.atan2(dy, dx);
  } else if (e.type === 'shooter') {
    // Keep some distance and strafe, firing aimed shots.
    const want = 260;
    const toward = dist > want + 40 ? 1 : dist < want - 40 ? -0.6 : 0;
    const strafe = Math.sin(e.id * 1.7 + performance.now() / 900) * 0.7;
    e.vx = (nx * toward + -ny * strafe) * e.speed;
    e.vy = (ny * toward + nx * strafe) * e.speed;
    e.angle = Math.atan2(dy, dx);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0 && dist < 560) {
      e.fireTimer = ENEMIES.shooter.fireInterval * (0.85 + rng() * 0.3);
      fireBullet(e.x, e.y, nx, ny, ENEMIES.shooter.bulletSpeed, e.damage, e.color);
    }
  } else if (e.type === 'splitter') {
    e.vx = nx * e.speed; e.vy = ny * e.speed;
    e.spin += dt * 1.5;
    e.angle = e.spin;
  } else if (e.type === 'speeder') {
    e.dartTimer -= dt;
    if (!e.darting && e.dartTimer <= 0 && dist < 420) {
      e.darting = true;
      e.dartDir = { x: nx, y: ny };
      e.dartTime = 0.55;
    }
    if (e.darting) {
      e.dartTime -= dt;
      e.vx = e.dartDir.x * e.speed * 2.1;
      e.vy = e.dartDir.y * e.speed * 2.1;
      if (e.dartTime <= 0) { e.darting = false; e.dartTimer = 1.6 + rng(); }
    } else {
      e.vx = nx * e.speed * 0.45; e.vy = ny * e.speed * 0.45;
    }
    e.angle = Math.atan2(e.vy, e.vx);
  } else if (e.type === 'boss') {
    updateBoss(e, player, dt, rng, fireBullet);
    return;
  }

  e.x += e.vx * dt;
  e.y += e.vy * dt;
  e.x = Math.max(e.radius, Math.min(WORLD.w - e.radius, e.x));
  e.y = Math.max(e.radius, Math.min(WORLD.h - e.radius, e.y));
}

function updateBoss(b, player, dt, rng, fireBullet) {
  if (b.entering) {
    b.y += 60 * dt;
    if (b.y >= 130) { b.entering = false; }
    return;
  }
  b.phase = b.hp < b.maxHp * 0.5 ? 2 : 1;
  // Slow horizontal drift, always roughly facing the player.
  const targetX = player.x;
  b.vx = Math.max(-1, Math.min(1, (targetX - b.x) / 240)) * b.speed * (b.phase === 2 ? 1.6 : 1);
  b.vy = Math.sin(performance.now() / 1400) * 22;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.x = Math.max(b.radius, Math.min(WORLD.w - b.radius, b.x));
  b.y = Math.max(90, Math.min(300, b.y));
  b.angle += dt * 0.4;

  b.burstTimer -= dt;
  if (b.burstTimer <= 0) {
    b.burstTimer = BOSS.burstInterval / (b.phase === 2 ? 1.5 : 1);
    const n = BOSS.burstCount + (b.phase === 2 ? 6 : 0);
    const offset = rng() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = offset + (i / n) * Math.PI * 2;
      fireBullet(b.x, b.y, Math.cos(a), Math.sin(a), BOSS.bulletSpeed, b.damage, b.color);
    }
  }
  b.minionTimer -= dt;
}

// Draw one enemy (or the boss) as a character: each type has a face and a
// mannerism — CHOMP wobbles hungrily, JITTER shakes nervously, BLOBBY beams,
// ZIP leaves a streak. Flash turns it white on hit.
export function drawEnemy(ctx, e, time = 0) {
  ctx.save();
  ctx.translate(e.x, e.y);
  // Personality motion: chaser wobbles, shooter trembles, splitter bobs.
  if (e.type === 'chaser') {
    const wob = Math.sin(time * 7 + e.id) * 0.08;
    ctx.rotate((e.angle || 0) + wob);
    ctx.scale(1 + Math.sin(time * 7 + e.id) * 0.05, 1 - Math.sin(time * 7 + e.id) * 0.05);
  } else if (e.type === 'shooter') {
    const jx = (Math.sin(time * 23 + e.id * 3) + Math.sin(time * 31 + e.id)) * 0.9;
    const jy = (Math.cos(time * 27 + e.id * 2)) * 0.9;
    ctx.translate(jx, jy);
    ctx.rotate(e.angle || 0);
  } else if (e.type === 'splitter' || e.type === 'mini') {
    const bob = Math.sin(time * 4 + e.id) * 0.06;
    ctx.rotate(e.angle || 0);
    ctx.scale(1 + bob, 1 - bob);
  } else {
    ctx.rotate(e.angle || 0);
  }
  const body = e.flash > 0.2 ? '#ffffff' : e.color;
  ctx.fillStyle = body;
  ctx.strokeStyle = body;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 16;
  ctx.lineWidth = 2;
  const r = e.radius;
  ctx.beginPath();
  if (e.isBoss) {
    // VOID KING: a big spiked orb — a crowned circle with jagged points.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rr = i % 2 === 0 ? r : r * 0.78;
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
  } else if (e.shape === 'triangle') {
    ctx.moveTo(r, 0); ctx.lineTo(-r * 0.8, r * 0.75); ctx.lineTo(-r * 0.8, -r * 0.75);
  } else if (e.shape === 'square') {
    ctx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
  } else if (e.shape === 'hex') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  } else if (e.shape === 'dart') {
    ctx.moveTo(r * 1.3, 0); ctx.lineTo(-r * 0.9, r * 0.6); ctx.lineTo(-r * 0.4, 0); ctx.lineTo(-r * 0.9, -r * 0.6);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Faces: the thing that makes each one a character.
  ctx.fillStyle = '#05060f';
  if (e.type === 'chaser') {
    // Hungry eyes + a wide grin.
    ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.28, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.3, r * 0.28, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#05060f';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(r * 0.55, 0, r * 0.3, -0.9, 0.9); ctx.stroke();
  } else if (e.type === 'shooter') {
    // Worried eyes, angled brows.
    ctx.beginPath(); ctx.arc(r * 0.25, -r * 0.25, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.25, r * 0.25, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#05060f';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(r * 0.05, -r * 0.55); ctx.lineTo(r * 0.45, -r * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.05, r * 0.55); ctx.lineTo(r * 0.45, r * 0.4); ctx.stroke();
  } else if (e.type === 'splitter' || e.type === 'mini') {
    // Jolly closed happy eyes + a big smile.
    ctx.strokeStyle = '#05060f';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.15, r * 0.22, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.15, r * 0.22, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.1, r * 0.15, r * 0.4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  } else if (e.type === 'speeder') {
    // Determined slit eyes + speed streaks.
    ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.2, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.3, r * 0.2, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = e.color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r * 1.2, -r * 0.3); ctx.lineTo(-r * 2.1, -r * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 1.2, r * 0.3); ctx.lineTo(-r * 2.1, r * 0.3); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  if (e.isBoss) {
    // VOID KING: crown spikes + angry eyes, drawn in world space.
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle || 0);
    ctx.fillStyle = '#ffd6e7';
    ctx.shadowColor = '#ff2e63';
    ctx.shadowBlur = 18;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 26 - 9, -e.radius + 6);
      ctx.lineTo(i * 26, -e.radius - 18);
      ctx.lineTo(i * 26 + 9, -e.radius + 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#05060f';
    ctx.beginPath(); ctx.arc(-e.radius * 0.3, -e.radius * 0.15, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.radius * 0.3, -e.radius * 0.15, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#05060f';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-e.radius * 0.5, -e.radius * 0.42); ctx.lineTo(-e.radius * 0.12, -e.radius * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(e.radius * 0.5, -e.radius * 0.42); ctx.lineTo(e.radius * 0.12, -e.radius * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, e.radius * 0.25, e.radius * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.restore();
    // Boss health bar BELOW the boss, so it never collides with the HUD.
    const w = 150;
    ctx.fillStyle = '#1a0a12';
    ctx.fillRect(e.x - w / 2, e.y + e.radius + 18, w, 8);
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x - w / 2, e.y + e.radius + 18, w * Math.max(0, e.hp / e.maxHp), 8);
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd6e7';
    ctx.fillText('VOID KING', e.x, e.y + e.radius + 12);
  } else if (e.hp < e.maxHp) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 9, w, 4);
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 9, w * Math.max(0, e.hp / e.maxHp), 4);
  }
}
