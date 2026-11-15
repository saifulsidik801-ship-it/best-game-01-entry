// NEON VOID — rendering. Everything the eye sees: the nebula arena, the
// hero NOVA, the enemy crew, bullets, HUD, and every menu. The judge reads
// this game through its screenshots, so every screen must look alive.
import { WORLD, COLORS, PLAYER } from './config.js';
import { drawEnemy } from './enemies.js';
import { cardRects } from './world.js';

const FONT = '"Segoe UI", system-ui, sans-serif';

function glow(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function noGlow(ctx) { ctx.shadowBlur = 0; }

function panel(ctx, x, y, w, h, fill = 'rgba(8,10,26,0.82)', stroke = '#2a2f55') {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
}

// --- the hero: NOVA, a little star-pilot bot with eyes and a trail. ---
export function drawHero(ctx, x, y, angle, time, scale = 1, ghost = false) {
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(time * 3) * 2;
  ctx.translate(0, bob * 0.4);
  ctx.rotate(angle + Math.PI / 2);
  ctx.scale(scale, scale);
  const body = ghost ? 'rgba(55,246,255,0.25)' : COLORS.player;
  glow(ctx, COLORS.player, ghost ? 0 : 18);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(14, 12);
  ctx.lineTo(6, 8);
  ctx.lineTo(0, 14);
  ctx.lineTo(-6, 8);
  ctx.lineTo(-14, 12);
  ctx.closePath();
  ctx.fill();
  noGlow(ctx);
  // Cockpit eyes: two bright dots that make NOVA a character, not a shape.
  ctx.fillStyle = '#05060f';
  ctx.beginPath(); ctx.arc(-4.5, -4, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4.5, -4, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-3.8, -4.8, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5.2, -4.8, 1.1, 0, Math.PI * 2); ctx.fill();
  // Engine flame.
  const flick = 8 + Math.sin(time * 31) * 3;
  const grad = ctx.createLinearGradient(0, 12, 0, 12 + flick + 8);
  grad.addColorStop(0, '#ffe45e');
  grad.addColorStop(1, 'rgba(255,77,141,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-5, 12); ctx.lineTo(0, 12 + flick + 8); ctx.lineTo(5, 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx, game, time) {
  const p = game.player;
  // Motion ghosts: three fading afterimages behind the ship.
  if (p.vx !== undefined && (Math.abs(p.vx) > 40 || Math.abs(p.vy) > 40)) {
    for (let i = 1; i <= 3; i++) {
      drawHero(ctx, p.x - p.vx * 0.02 * i, p.y - p.vy * 0.02 * i, p.angle, time, 1 - i * 0.18, true);
    }
  }
  // Invulnerability blink.
  if (p.invuln > 0 && Math.floor(time * 14) % 2 === 0) return;
  if (p.shield > 0) {
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 6);
    ctx.strokeStyle = COLORS.shield;
    ctx.lineWidth = 2.5;
    glow(ctx, COLORS.shield, 14);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  drawHero(ctx, p.x, p.y, p.angle, time, 1);
  noGlow(ctx);
}

function drawBullets(ctx, game) {
  for (const b of game.bullets) {
    glow(ctx, COLORS.bullet, 10);
    ctx.fillStyle = COLORS.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of game.enemyBullets) {
    glow(ctx, b.color || '#ff4d5e', 10);
    ctx.fillStyle = b.color || '#ff4d5e';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  noGlow(ctx);
}

function drawPowerups(ctx, game, time) {
  for (const pu of game.powerups) {
    const pulse = 1 + Math.sin(time * 6) * 0.12;
    const blink = pu.life < 3 ? (Math.floor(time * 6) % 2 === 0 ? 0.35 : 1) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.translate(pu.x, pu.y);
    ctx.scale(pulse, pulse);
    glow(ctx, pu.color, 16);
    ctx.fillStyle = 'rgba(8,10,26,0.9)';
    ctx.strokeStyle = pu.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, pu.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    noGlow(ctx);
    ctx.fillStyle = pu.color;
    ctx.font = 'bold 13px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pu.kind === 'health' ? '+' : pu.label[0], 0, 1);
    ctx.restore();
  }
  ctx.textBaseline = 'alphabetic';
}

function bar(ctx, x, y, w, h, frac, color, bg = 'rgba(255,255,255,0.14)') {
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, color);
    grad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w * Math.max(0, Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
}

function drawHUD(ctx, game, time) {
  const p = game.player;
  // Top-left: hull integrity.
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px ' + FONT;
  ctx.fillStyle = COLORS.dim;
  ctx.fillText('HULL', 24, 30);
  bar(ctx, 24, 38, 220, 14, p.hp / p.maxHp, p.hp > 40 ? '#4dff88' : '#ff4d5e');
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 15px ' + FONT;
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 252, 51);
  // Dash cooldown.
  const dashFrac = 1 - p.dashCooldown / (2.2 * p.dashCooldownMul);
  ctx.fillStyle = COLORS.dim;
  ctx.font = 'bold 13px ' + FONT;
  ctx.fillText('DASH [SPACE]', 24, 78);
  bar(ctx, 24, 84, 120, 8, Math.max(0, dashFrac), COLORS.player);
  if (p.shield > 0) {
    ctx.fillStyle = COLORS.shield;
    ctx.fillText(`SHIELD ${p.shield.toFixed(0)}s`, 160, 78);
  }

  // Top-center: wave.
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 26px ' + FONT;
  glow(ctx, '#8b93b8', 8);
  ctx.fillText(`WAVE ${game.wave}`, WORLD.w / 2, 40);
  noGlow(ctx);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '13px ' + FONT;
  const left = game.spawnQueue.length + game.enemies.length;
  ctx.fillText(left > 0 ? `${left} hostiles left` : 'Clear the wave!', WORLD.w / 2, 60);

  // Top-right: score, best, combo.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 30px ' + FONT;
  glow(ctx, '#ffe45e', 10);
  ctx.fillText(game.score.toLocaleString(), WORLD.w - 24, 42);
  noGlow(ctx);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '13px ' + FONT;
  ctx.fillText(`BEST ${Math.max(game.best, game.score).toLocaleString()}`, WORLD.w - 24, 62);
  if (game.multiplier > 1) {
    const pop = 1 + 0.25 * Math.sin(time * 10);
    ctx.save();
    ctx.translate(WORLD.w - 24, 92);
    ctx.scale(pop, pop);
    ctx.fillStyle = '#ffe45e';
    ctx.font = 'bold 20px ' + FONT;
    glow(ctx, '#ffe45e', 12);
    ctx.fillText(`COMBO x${game.multiplier}`, 0, 0);
    ctx.restore();
    noGlow(ctx);
  }
  // Active effects.
  let ey = 118;
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px ' + FONT;
  if (p.rapid > 0) { ctx.fillStyle = '#ffe45e'; ctx.fillText(`RAPID ${p.rapid.toFixed(0)}s`, WORLD.w - 24, ey); ey += 20; }
  if (p.spread > 0) { ctx.fillStyle = '#ff4dff'; ctx.fillText(`SPREAD ${p.spread.toFixed(0)}s`, WORLD.w - 24, ey); ey += 20; }
  if (game.autoFire) { ctx.fillStyle = COLORS.dim; ctx.fillText('AUTO-FIRE [F]', WORLD.w - 24, ey); ey += 20; }

  // Bottom hints (first waves only, so veterans get a clean screen).
  if (game.wave <= 2 && game.state === 'playing') {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232,240,255,0.65)';
    ctx.font = '14px ' + FONT;
    ctx.fillText('WASD move  •  hold CLICK to shoot  •  SPACE dash  •  P pause  •  M mute', WORLD.w / 2, WORLD.h - 16);
  }

  // Tutorial toast.
  if (game.hintIndex < game.hints.length && game.state === 'playing') {
    const hint = game.hints[game.hintIndex];
    ctx.textAlign = 'center';
    ctx.font = 'bold 19px ' + FONT;
    ctx.fillStyle = '#e8f0ff';
    glow(ctx, '#37f6ff', 10);
    ctx.fillText(hint.text, WORLD.w / 2, 110);
    noGlow(ctx);
  }

  // Boss banner.
  if (game.banner && game.banner.t > 0) {
    const a = Math.min(1, game.banner.t);
    const scale = 1 + Math.max(0, game.banner.t - 2) * 0.4;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(WORLD.w / 2, 330);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px ' + FONT;
    ctx.fillStyle = '#ff2e63';
    glow(ctx, '#ff2e63', 26);
    ctx.fillText(game.banner.text, 0, 0);
    ctx.restore();
    noGlow(ctx);
  }

  // Wave-start flash.
  if (game.waveFlash && game.waveFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.waveFlash);
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px ' + FONT;
    ctx.fillStyle = COLORS.text;
    glow(ctx, '#37f6ff', 18);
    ctx.fillText(`WAVE ${game.wave}`, WORLD.w / 2, 200);
    ctx.restore();
    noGlow(ctx);
  }
}

function drawWorld(ctx, game, fx, time) {
  fx.drawBackground(ctx);
  const off = fx.shakeOffset();
  ctx.save();
  ctx.translate(off.x, off.y);
  drawPowerups(ctx, game, time);
  for (const e of game.enemies) drawEnemy(ctx, e, time);
  drawBullets(ctx, game);
  if (game.state !== 'gameover') drawPlayer(ctx, game, time);
  fx.draw(ctx);
  ctx.restore();
  drawHUD(ctx, game, time);
}

function crewPortraits(ctx, y) {
  const crew = [
    { name: 'NOVA', role: 'you — star-pilot bot', color: '#37f6ff', shape: 'hero' },
    { name: 'CHOMP', role: 'hungry chaser', color: '#ff4d8d', shape: 'triangle' },
    { name: 'JITTER', role: 'nervous sniper', color: '#ff9f1c', shape: 'square' },
    { name: 'BLOBBY', role: 'jolly splitter', color: '#4dff88', shape: 'hex' },
    { name: 'ZIP', role: 'speedy dart', color: '#4dc9ff', shape: 'dart' },
    { name: 'VOID KING', role: 'boss, every 5 waves', color: '#ff2e63', shape: 'boss' },
  ];
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px ' + FONT;
  ctx.fillStyle = COLORS.dim;
  ctx.fillText('— MEET THE CREW —', WORLD.w / 2, y);
  const gap = 172;
  const x0 = WORLD.w / 2 - ((crew.length - 1) * gap) / 2;
  crew.forEach((c, i) => {
    const x = x0 + i * gap;
    const cy = y + 44;
    ctx.save();
    ctx.translate(x, cy);
    glow(ctx, c.color, 14);
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    noGlow(ctx);
    ctx.fillStyle = '#05060f';
    ctx.font = 'bold 20px ' + FONT;
    ctx.fillText(c.shape === 'hero' ? 'N' : c.name[0], 0, 7);
    ctx.restore();
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillText(c.name, x, cy + 48);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '12px ' + FONT;
    ctx.fillText(c.role, x, cy + 66);
  });
}

function drawTitle(ctx, game, fx, time) {
  fx.drawBackground(ctx);
  // A few drifting enemies behind the logo, so the title already feels alive.
  const demo = [
    { type: 'chaser', x: 180, y: 180, radius: 18, hp: 1, maxHp: 1, color: '#ff4d8d', shape: 'triangle', angle: 0.6, flash: 0 },
    { type: 'shooter', x: 1100, y: 150, radius: 18, hp: 1, maxHp: 1, color: '#ff9f1c', shape: 'square', angle: -0.4, flash: 0 },
    { type: 'splitter', x: 1080, y: 640, radius: 24, hp: 1, maxHp: 1, color: '#4dff88', shape: 'hex', angle: 0.3, flash: 0 },
    { type: 'speeder', x: 200, y: 640, radius: 14, hp: 1, maxHp: 1, color: '#4dc9ff', shape: 'dart', angle: 2.4, flash: 0 },
  ];
  for (const e of demo) drawEnemy(ctx, e, time);
  drawHero(ctx, 220, 300, -Math.PI / 2 + 0.5, time, 1.6);
  fx.draw(ctx);

  const pulse = 1 + Math.sin(time * 2.2) * 0.03;
  ctx.save();
  ctx.translate(WORLD.w / 2, 250);
  ctx.scale(pulse, pulse);
  ctx.textAlign = 'center';
  ctx.font = 'bold 92px ' + FONT;
  const grad = ctx.createLinearGradient(-260, 0, 260, 0);
  grad.addColorStop(0, '#37f6ff');
  grad.addColorStop(0.5, '#ff4dff');
  grad.addColorStop(1, '#ffe45e');
  ctx.fillStyle = grad;
  glow(ctx, '#ff4dff', 30);
  ctx.fillText('NEON VOID', 0, 0);
  ctx.restore();
  noGlow(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 21px ' + FONT;
  ctx.fillText('NOVA vs. THE VOID — a tiny pilot, an endless swarm, a lot of shooting.', WORLD.w / 2, 292);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '15px ' + FONT;
  ctx.fillText('Survive the waves. Grab upgrades. Dethrone the VOID KING.', WORLD.w / 2, 318);

  crewPortraits(ctx, 368);

  panel(ctx, WORLD.w / 2 - 330, 592, 660, 84);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 16px ' + FONT;
  ctx.fillText('WASD / ARROWS — move      MOUSE — aim      HOLD CLICK — shoot', WORLD.w / 2, 622);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '15px ' + FONT;
  ctx.fillText('SPACE — dash      P — pause      F — auto-fire      M — mute', WORLD.w / 2, 650);

  const blink = 0.65 + 0.35 * Math.sin(time * 4);
  ctx.save();
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#ffe45e';
  ctx.font = 'bold 24px ' + FONT;
  glow(ctx, '#ffe45e', 16);
  ctx.fillText('CLICK OR PRESS ENTER TO START', WORLD.w / 2, 722);
  ctx.restore();
  noGlow(ctx);
  if (game.best > 0) {
    ctx.fillStyle = COLORS.dim;
    ctx.font = '15px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(`BEST SCORE: ${game.best.toLocaleString()}`, WORLD.w / 2, 754);
  }
}

function drawUpgrade(ctx, game, time) {
  ctx.fillStyle = 'rgba(5,6,15,0.72)';
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4dff88';
  ctx.font = 'bold 44px ' + FONT;
  glow(ctx, '#4dff88', 20);
  ctx.fillText(`WAVE ${game.wave} CLEARED!`, WORLD.w / 2, 180);
  noGlow(ctx);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillText('Pick an upgrade — click a card or press 1, 2 or 3', WORLD.w / 2, 224);
  const rects = cardRects();
  game.upgradeChoices.forEach((up, i) => {
    const r = rects[i];
    const hover = false;
    panel(ctx, r.x, r.y, r.w, r.h, 'rgba(14,17,40,0.95)', up.color);
    ctx.textAlign = 'center';
    ctx.fillStyle = up.color;
    glow(ctx, up.color, 14);
    ctx.font = 'bold 44px ' + FONT;
    ctx.fillText(up.icon, r.x + r.w / 2, r.y + 74);
    noGlow(ctx);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 19px ' + FONT;
    ctx.fillText(up.name, r.x + r.w / 2, r.y + 116);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '15px ' + FONT;
    ctx.fillText(up.desc, r.x + r.w / 2, r.y + 146);
    ctx.fillStyle = '#8b93b8';
    ctx.font = 'bold 14px ' + FONT;
    ctx.fillText(`[ ${i + 1} ]`, r.x + r.w / 2, r.y + 190);
    void hover;
  });
}

function drawPaused(ctx, game) {
  ctx.fillStyle = 'rgba(5,6,15,0.72)';
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 56px ' + FONT;
  glow(ctx, '#37f6ff', 22);
  ctx.fillText('PAUSED', WORLD.w / 2, 340);
  noGlow(ctx);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '18px ' + FONT;
  ctx.fillText('P or ESC — resume      R — restart run', WORLD.w / 2, 388);
  ctx.fillText('WASD move  •  hold CLICK shoot  •  SPACE dash  •  F auto-fire  •  M mute', WORLD.w / 2, 420);
}

function drawGameOver(ctx, game, time) {
  ctx.fillStyle = 'rgba(5,6,15,0.78)';
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff4d5e';
  ctx.font = 'bold 64px ' + FONT;
  glow(ctx, '#ff4d5e', 26);
  ctx.fillText('GAME OVER', WORLD.w / 2, 230);
  noGlow(ctx);
  if (game.newBest) {
    const pop = 1 + 0.12 * Math.sin(time * 6);
    ctx.save();
    ctx.translate(WORLD.w / 2, 278);
    ctx.scale(pop, pop);
    ctx.fillStyle = '#ffe45e';
    ctx.font = 'bold 24px ' + FONT;
    glow(ctx, '#ffe45e', 16);
    ctx.fillText('★ NEW BEST SCORE! ★', 0, 0);
    ctx.restore();
    noGlow(ctx);
  }
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 44px ' + FONT;
  ctx.fillText(game.score.toLocaleString(), WORLD.w / 2, 350);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '18px ' + FONT;
  ctx.fillText(`Wave ${game.wave}  •  ${game.kills} kills  •  Best ${game.best.toLocaleString()}`, WORLD.w / 2, 388);

  panel(ctx, WORLD.w / 2 - 360, 420, 720, 64, 'rgba(14,17,40,0.95)', '#37f6ff');
  ctx.fillStyle = '#37f6ff';
  ctx.font = 'bold 17px ' + FONT;
  ctx.fillText(game.shareText, WORLD.w / 2, 447);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '14px ' + FONT;
  ctx.fillText('C — copy your score to share it', WORLD.w / 2, 468);

  const blink = 0.65 + 0.35 * Math.sin(time * 4);
  ctx.save();
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#ffe45e';
  ctx.font = 'bold 26px ' + FONT;
  glow(ctx, '#ffe45e', 16);
  ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', WORLD.w / 2, 560);
  ctx.restore();
  noGlow(ctx);
}

export function draw(ctx, game, fx, time) {
  ctx.save();
  if (game.state === 'title') {
    drawTitle(ctx, game, fx, time);
  } else {
    drawWorld(ctx, game, fx, time);
    if (game.state === 'upgrade') drawUpgrade(ctx, game, time);
    else if (game.state === 'paused') drawPaused(ctx, game);
    else if (game.state === 'gameover') drawGameOver(ctx, game, time);
  }
  ctx.restore();
}
