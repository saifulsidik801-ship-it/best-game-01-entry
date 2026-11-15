// NEON VOID — the world. Owns the whole game state and every rule that
// is not drawing: movement, shooting, waves, collisions, power-ups, score,
// combo and game over. Render only reads this state, never changes it.
import {
  WORLD, PLAYER, ENEMIES, BOSS, POWERUPS, COMBO_WINDOW, COMBO_CAP,
  DROP_CHANCE, DROP_CHANCE_EARLY, waveComp,
} from './config.js';
import { makeEnemy, makeBoss, updateEnemy } from './enemies.js';
import { rollUpgrades } from './upgrades.js';
import { mulberry32, randRange, pickWeighted } from './input.js';

export function bestScore() {
  try { return Number(localStorage.getItem('neonvoid.best') || 0); } catch { return 0; }
}
export function saveBest(score) {
  try {
    if (score > bestScore()) localStorage.setItem('neonvoid.best', String(score));
  } catch { /* storage unavailable: best score just does not persist */ }
}

export function createGame(seed = 1234) {
  const rng = mulberry32(seed);
  return {
    state: 'title', // title | playing | upgrade | paused | gameover
    time: 0,
    rng,
    seed,
    player: {
      x: WORLD.w / 2, y: WORLD.h / 2, angle: -Math.PI / 2,
      radius: PLAYER.radius, hp: PLAYER.hp, maxHp: PLAYER.hp,
      speedMul: 1, damageMul: 1, fireMul: 1, bulletSpeedMul: 1,
      dashCooldownMul: 1, pickupMul: 1, comboMul: 1,
      extraBullets: 0, shieldOnWave: false,
      fireTimer: 0, dashTimer: 0, dashCooldown: 0, dashing: false,
      dashDir: { x: 0, y: -1 }, invuln: 0,
      shield: 0, rapid: 0, spread: 0,
    },
    bullets: [], // player bullets
    enemyBullets: [],
    enemies: [],
    powerups: [],
    wave: 0,
    spawnQueue: [],
    spawnTimer: 0,
    betweenTimer: 0,
    waveClearTimer: 0,
    score: 0,
    best: bestScore(),
    kills: 0,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    upgradeChoices: [],
    hints: [],
    hintIndex: 0,
    shakeHint: false,
    bossWarned: false,
    muted: false,
    autoFire: false,
    shareText: '',
    newBest: false,
  };
}

export function startRun(game) {
  const keepBest = game.best;
  const fresh = createGame((Math.random() * 1e9) | 0);
  fresh.best = keepBest;
  Object.assign(game, fresh);
  game.state = 'playing';
  startWave(game, 1);
  game.hints = [
    { text: 'Move with WASD or ARROW KEYS', t: 4 },
    { text: 'Hold CLICK to shoot — aim with the mouse', t: 4 },
    { text: 'SPACE to dash through danger', t: 4 },
  ];
  game.hintIndex = 0;
}

export function startWave(game, n) {
  game.wave = n;
  game.spawnQueue = [];
  if (n % 5 === 0) {
    game.spawnQueue.push({ type: 'boss', delay: 1.2 });
    const minis = 2 + Math.floor(n / 5);
    for (let i = 0; i < minis; i++) game.spawnQueue.push({ type: 'chaser', delay: 2 + i * 0.8 });
    game.bossWarned = true;
  } else {
    const comp = waveComp(n);
    for (let i = 0; i < comp.total; i++) {
      game.spawnQueue.push({ type: pickWeighted(game.rng, comp.weights), delay: 0.6 + i * (n === 1 ? 1.1 : 0.55) });
    }
  }
  game.spawnTimer = 0;
  game.waveClearTimer = 0;
  game.waveFlash = 1.6;
  if (game.player.shieldOnWave) game.player.shield = 4;
}

function spawnPoint(game) {
  const m = 40;
  const side = Math.floor(game.rng() * 4);
  if (side === 0) return { x: randRange(game.rng, m, WORLD.w - m), y: -30 };
  if (side === 1) return { x: randRange(game.rng, m, WORLD.w - m), y: WORLD.h + 30 };
  if (side === 2) return { x: -30, y: randRange(game.rng, m, WORLD.h - m) };
  return { x: WORLD.w + 30, y: randRange(game.rng, m, WORLD.h - m) };
}

function spawnEnemyNow(game, type) {
  if (type === 'boss') {
    game.enemies.push(makeBoss(game.wave));
    game.banner = { text: 'VOID KING appears!', t: 2.6 };
    return;
  }
  const p = spawnPoint(game);
  game.enemies.push(makeEnemy(type, p.x, p.y, game.wave, game.rng));
}

export function dropPowerup(game, x, y) {
  const chance = game.wave <= 2 ? DROP_CHANCE_EARLY : DROP_CHANCE;
  if (game.rng() > chance) return;
  const keys = Object.keys(POWERUPS);
  const total = keys.reduce((s, k) => s + POWERUPS[k].chance, 0);
  let roll = game.rng() * total;
  let kind = keys[0];
  for (const k of keys) { roll -= POWERUPS[k].chance; if (roll <= 0) { kind = k; break; } }
  game.powerups.push({ kind, x, y, vx: 0, vy: 26, life: 12, radius: 14, color: POWERUPS[kind].color, label: POWERUPS[kind].label });
}

export function killEnemy(game, e, fx, audio) {
  game.kills++;
  game.combo++;
  game.comboTimer = COMBO_WINDOW * game.player.comboMul;
  game.multiplier = Math.min(COMBO_CAP, 1 + Math.floor(game.combo / 4));
  const gained = e.score * game.multiplier;
  game.score += gained;
  fx.burst(e.x, e.y, e.color, e.isBoss ? 60 : 18, e.isBoss ? 320 : 220, 0.7, e.isBoss ? 5 : 3.5);
  fx.ring(e.x, e.y, e.color, e.isBoss ? 160 : 60);
  fx.text(e.x, e.y - 10, `+${gained}`, '#ffffff', e.isBoss ? 26 : 16);
  if (game.multiplier > 1) fx.text(e.x, e.y - 32, `COMBO x${game.multiplier}`, '#ffe45e', 13);
  fx.shake(e.isBoss ? 0.9 : 0.25);
  audio.explosion(e.isBoss);
  dropPowerup(game, e.x, e.y);
  if (e.type === 'splitter') {
    for (let i = 0; i < ENEMIES.splitter.splitCount; i++) {
      const mini = makeEnemy('mini', e.x + (i === 0 ? -16 : 16), e.y, game.wave, game.rng);
      game.enemies.push(mini);
    }
  }
  if (e.isBoss) {
    game.score += 0; // boss score already counted in gained
    fx.text(WORLD.w / 2, 200, 'BOSS DOWN!', '#ff2e63', 34);
  }
}

function damagePlayer(game, amount, fx, audio) {
  const p = game.player;
  if (p.invuln > 0 || p.dashing) return;
  if (p.shield > 0) {
    fx.text(p.x, p.y - 26, 'BLOCKED', '#37f6ff', 15);
    audio.hit();
    return;
  }
  p.hp -= amount;
  p.invuln = PLAYER.invulnTime;
  fx.burst(p.x, p.y, '#ff4d5e', 14, 200, 0.5, 3);
  fx.shake(0.5);
  audio.hit();
  if (p.hp <= 0) {
    p.hp = 0;
    game.state = 'gameover';
    game.newBest = game.score > game.best;
    saveBest(game.score);
    game.best = Math.max(game.best, game.score);
    game.shareText = `I scored ${game.score.toLocaleString()} in NEON VOID (wave ${game.wave}) — beat that!`;
    fx.burst(p.x, p.y, '#37f6ff', 70, 380, 1.0, 5);
    fx.ring(p.x, p.y, '#37f6ff', 180);
    audio.gameOver();
  }
}

function firePlayerBullet(game, angle) {
  const p = game.player;
  const speed = PLAYER.bulletSpeed * p.bulletSpeedMul;
  game.bullets.push({
    x: p.x + Math.cos(angle) * (p.radius + 6),
    y: p.y + Math.sin(angle) * (p.radius + 6),
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    damage: PLAYER.bulletDamage * p.damageMul,
    radius: PLAYER.bulletRadius, life: 1.1,
  });
}

export function update(game, input, fx, audio, dt) {
  game.time += dt;
  const p = game.player;

  if (game.state === 'playing') {
    // --- timers ---
    p.fireTimer -= dt;
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.shield = Math.max(0, p.shield - dt);
    p.rapid = Math.max(0, p.rapid - dt);
    p.spread = Math.max(0, p.spread - dt);
    if (game.comboTimer > 0) {
      game.comboTimer -= dt;
      if (game.comboTimer <= 0) { game.combo = 0; game.multiplier = 1; }
    }

    // --- hints for first-time players ---
    if (game.hintIndex < game.hints.length) {
      game.hints[game.hintIndex].t -= dt;
      if (game.hints[game.hintIndex].t <= 0) game.hintIndex++;
    }

    // --- movement ---
    const mv = input.moveVector();
    const speed = PLAYER.speed * p.speedMul;
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.x += p.dashDir.x * PLAYER.dashSpeed * dt;
      p.y += p.dashDir.y * PLAYER.dashSpeed * dt;
      p.vx = p.dashDir.x * PLAYER.dashSpeed;
      p.vy = p.dashDir.y * PLAYER.dashSpeed;
      fx.trail(p.x, p.y, '#37f6ff');
      if (p.dashTimer <= 0) p.dashing = false;
    } else {
      p.x += mv.x * speed * dt;
      p.y += mv.y * speed * dt;
      p.vx = mv.x * speed;
      p.vy = mv.y * speed;
    }
    p.x = Math.max(p.radius, Math.min(WORLD.w - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(WORLD.h - p.radius, p.y));
    p.angle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);

    // --- dash ---
    if (input.consumePressed('Space', 'ShiftLeft', 'ShiftRight') && p.dashCooldown <= 0) {
      p.dashing = true;
      p.dashTimer = PLAYER.dashTime;
      p.dashCooldown = PLAYER.dashCooldown * p.dashCooldownMul;
      p.dashDir = mv.x !== 0 || mv.y !== 0 ? { x: mv.x, y: mv.y } : { x: Math.cos(p.angle), y: Math.sin(p.angle) };
      fx.ring(p.x, p.y, '#37f6ff', 50);
      audio.dash();
    }

    // --- shooting ---
    const wantFire = input.mouseDown || p.autoFire || game.autoFire;
    if (wantFire && p.fireTimer <= 0) {
      const interval = PLAYER.fireInterval * p.fireMul * (p.rapid > 0 ? 0.55 : 1);
      p.fireTimer = interval;
      const shots = 1 + p.extraBullets + (p.spread > 0 ? 1 : 0);
      const spreadStep = 0.14;
      for (let i = 0; i < shots; i++) {
        const off = (i - (shots - 1) / 2) * spreadStep;
        firePlayerBullet(game, p.angle + off);
      }
      fx.burst(p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22, '#ffe45e', 2, 90, 0.15, 2);
      audio.shoot();
    }

    // --- spawning ---
    if (game.spawnQueue.length > 0) {
      game.spawnTimer += dt;
      while (game.spawnQueue.length > 0 && game.spawnTimer >= game.spawnQueue[0].delay) {
        const next = game.spawnQueue.shift();
        spawnEnemyNow(game, next.type);
        if (next.type === 'boss') audio.bossWarn();
      }
    }

    // --- enemies ---
    const fireEnemyBullet = (x, y, nx, ny, speed, damage, color) => {
      game.enemyBullets.push({ x, y, vx: nx * speed, vy: ny * speed, damage, radius: 6, life: 4, color });
    };
    for (const e of game.enemies) updateEnemy(e, p, dt, game.rng, fireEnemyBullet);

    // --- bullets ---
    for (const b of game.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    }
    game.bullets = game.bullets.filter((b) => b.life > 0 && b.x > -20 && b.x < WORLD.w + 20 && b.y > -20 && b.y < WORLD.h + 20);
    for (const b of game.enemyBullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    }
    game.enemyBullets = game.enemyBullets.filter((b) => b.life > 0 && b.x > -20 && b.x < WORLD.w + 20 && b.y > -20 && b.y < WORLD.h + 20);

    // --- bullet vs enemy ---
    for (const b of game.bullets) {
      for (const e of game.enemies) {
        if (e.hp <= 0) continue;
        const d = Math.hypot(e.x - b.x, e.y - b.y);
        if (d < e.radius + b.radius) {
          e.hp -= b.damage;
          e.flash = 1;
          b.life = 0;
          fx.burst(b.x, b.y, e.color, 4, 120, 0.25, 2);
          if (e.hp <= 0) killEnemy(game, e, fx, audio);
          break;
        }
      }
    }
    game.enemies = game.enemies.filter((e) => e.hp > 0);

    // --- enemy vs player ---
    for (const e of game.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < e.radius + p.radius - 4) damagePlayer(game, e.damage, fx, audio);
      if (game.state !== 'playing') break;
    }

    // --- enemy bullets vs player ---
    if (game.state === 'playing') {
      for (const b of game.enemyBullets) {
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < b.radius + p.radius - 4) {
          b.life = 0;
          damagePlayer(game, b.damage, fx, audio);
          if (game.state !== 'playing') break;
        }
      }
      game.enemyBullets = game.enemyBullets.filter((b) => b.life > 0);
    }

    // --- power-ups ---
    for (const pu of game.powerups) {
      pu.y += pu.vy * dt;
      pu.life -= dt;
      const magnetR = PLAYER.pickupRadius * p.pickupMul;
      const d = Math.hypot(pu.x - p.x, pu.y - p.y);
      if (d < magnetR * 2.2) {
        const pull = 420 * dt;
        pu.x += ((p.x - pu.x) / (d || 1)) * pull;
        pu.y += ((p.y - pu.y) / (d || 1)) * pull;
      }
      if (d < p.radius + pu.radius + 6) {
        pu.life = 0;
        if (pu.kind === 'shield') p.shield = POWERUPS.shield.seconds;
        if (pu.kind === 'rapid') p.rapid = POWERUPS.rapid.seconds;
        if (pu.kind === 'spread') p.spread = POWERUPS.spread.seconds;
        if (pu.kind === 'health') p.hp = Math.min(p.maxHp, p.hp + 30);
        fx.text(p.x, p.y - 30, pu.label, pu.color, 16);
        fx.ring(p.x, p.y, pu.color, 60);
        audio.powerup();
      }
    }
    game.powerups = game.powerups.filter((pu) => pu.life > 0);

    // --- wave cleared? ---
    if (game.spawnQueue.length === 0 && game.enemies.length === 0 && game.state === 'playing') {
      game.waveClearTimer += dt;
      if (game.waveClearTimer > 1.2) {
        game.upgradeChoices = rollUpgrades(game.rng, 3);
        game.state = 'upgrade';
        game.waveClearTimer = 0;
        audio.upgrade();
      }
    }

    // --- pause / mute / autofire ---
    if (input.consumePressed('KeyP', 'Escape')) { game.state = 'paused'; audio.click(); }
    if (input.consumePressed('KeyM')) { game.muted = audio.toggleMute(); }
    if (input.consumePressed('KeyF')) { game.autoFire = !game.autoFire; fx.text(p.x, p.y - 30, game.autoFire ? 'AUTO-FIRE ON' : 'AUTO-FIRE OFF', '#8b93b8', 14); }
  } else if (game.state === 'upgrade') {
    // Click a card or press 1/2/3.
    for (let i = 0; i < game.upgradeChoices.length; i++) {
      const key = `Digit${i + 1}`;
      if (input.consumePressed(key)) { applyUpgrade(game, i, fx, audio); break; }
    }
    if (input.mouseClicked) {
      const card = cardAt(game, input.mouseX, input.mouseY);
      if (card >= 0) applyUpgrade(game, card, fx, audio);
    }
    if (input.consumePressed('KeyM')) { game.muted = audio.toggleMute(); }
  } else if (game.state === 'paused') {
    if (input.consumePressed('KeyP', 'Escape', 'Enter', 'Space')) { game.state = 'playing'; audio.click(); }
    if (input.consumePressed('KeyR')) { startRun(game); audio.click(); }
  } else if (game.state === 'title') {
    if (input.consumePressed('Enter', 'Space') || input.mouseClicked) {
      audio.unlock();
      audio.click();
      startRun(game);
    }
  } else if (game.state === 'gameover') {
    if (input.consumePressed('KeyR', 'Enter', 'Space') || input.mouseClicked) {
      audio.click();
      startRun(game);
    }
  }

  fx.update(dt);
}

// Upgrade card layout, shared with render.js.
export function cardRects() {
  const w = 260;
  const h = 220;
  const gap = 30;
  const total = w * 3 + gap * 2;
  const x0 = (WORLD.w - total) / 2;
  const y0 = 300;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y: y0, w, h }));
}

export function cardAt(game, mx, my) {
  const rects = cardRects();
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return i;
  }
  return -1;
}

function applyUpgrade(game, i, fx, audio) {
  const up = game.upgradeChoices[i];
  if (!up) return;
  up.apply(game.player);
  fx.text(game.player.x, game.player.y - 40, up.name, up.color, 20);
  audio.upgrade();
  game.upgradeChoices = [];
  game.state = 'playing';
  startWave(game, game.wave + 1);
  audio.waveStart();
}
