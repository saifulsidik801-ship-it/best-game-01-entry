// NEON VOID — boot and game loop. Owns the canvas, the clock and the
// screenshot modes (?shot=start|play|boss|end&seed=N) that stage a real
// render of the game for the dossier screenshots.
import { WORLD } from './config.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { Particles } from './particles.js';
import { createGame, startRun, startWave, update, saveBest } from './world.js';
import { makeEnemy, makeBoss } from './enemies.js';
import { draw } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const audio = new AudioSys();
const fx = new Particles();
const game = createGame(20261116);
const statusEl = document.getElementById('status');

const params = new URLSearchParams(location.search);
const shotMode = params.get('shot');
const seed = Number(params.get('seed') || 7);

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = WORLD.w * dpr;
  canvas.height = WORLD.h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const scale = Math.min(window.innerWidth / WORLD.w, window.innerHeight / WORLD.h);
  canvas.style.width = `${WORLD.w * scale}px`;
  canvas.style.height = `${WORLD.h * scale}px`;
  input.setView(scale, (window.innerWidth - WORLD.w * scale) / 2, (window.innerHeight - WORLD.h * scale) / 2);
}
window.addEventListener('resize', resize);
resize();

function announce() {
  if (!statusEl) return;
  if (game.state === 'playing') {
    statusEl.textContent = `Wave ${game.wave}, score ${game.score}, hull ${Math.ceil(game.player.hp)}.`;
  } else if (game.state === 'gameover') {
    statusEl.textContent = `Game over. Score ${game.score}, wave ${game.wave}. Press R to play again.`;
  }
}

// Stage a deterministic scene for a screenshot, using the game's own
// state and render code — never a fake image.
function stageShot(mode) {
  if (mode === 'start') {
    game.state = 'title';
    return;
  }
  if (mode === 'play') {
    startRun(game);
    game.wave = 3;
    game.score = 2450;
    game.combo = 8;
    game.multiplier = 3;
    game.comboTimer = 2;
    game.player.hp = 78;
    const spots = [
      ['chaser', 300, 220], ['chaser', 980, 180], ['shooter', 1050, 420],
      ['splitter', 240, 520], ['speeder', 700, 150], ['chaser', 520, 640],
      ['shooter', 180, 380], ['speeder', 900, 620],
    ];
    for (const [type, x, y] of spots) {
      const e = makeEnemy(type, x, y, 3, game.rng);
      e.angle = Math.atan2(game.player.y - y, game.player.x - x);
      game.enemies.push(e);
    }
    for (let i = 0; i < 6; i++) {
      const a = -0.6 + i * 0.24;
      game.bullets.push({
        x: game.player.x + Math.cos(a) * 60, y: game.player.y + Math.sin(a) * 60,
        vx: Math.cos(a) * 720, vy: Math.sin(a) * 720,
        damage: 12, radius: 5, life: 0.5,
      });
    }
    fx.burst(300, 220, '#ff4d8d', 16, 220, 0.6, 3.5);
    fx.burst(980, 180, '#ff9f1c', 12, 200, 0.6, 3);
    fx.text(300, 190, '+300', '#ffffff', 16);
    fx.text(700, 130, 'COMBO x3', '#ffe45e', 14);
    return;
  }
  if (mode === 'boss') {
    startRun(game);
    game.wave = 5;
    game.score = 9800;
    game.combo = 12;
    game.multiplier = 4;
    game.player.hp = 64;
    const boss = makeBoss(5);
    boss.x = 640; boss.y = 170; boss.entering = false;
    boss.hp = Math.round(boss.maxHp * 0.62);
    game.enemies.push(boss);
    game.banner = { text: 'VOID KING appears!', t: 2.2 };
    game.waveFlash = 0; // the banner is the announcement here, not the flash
    game.hintIndex = 99; // no tutorial toast during the boss fight shot
    for (const [type, x, y] of [['chaser', 260, 420], ['speeder', 1020, 380], ['shooter', 180, 220]]) {
      game.enemies.push(makeEnemy(type, x, y, 5, game.rng));
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      game.enemyBullets.push({
        x: 640 + Math.cos(a) * 80, y: 170 + Math.sin(a) * 80,
        vx: Math.cos(a) * 210, vy: Math.sin(a) * 210,
        damage: 20, radius: 6, life: 2, color: '#ff2e63',
      });
    }
    fx.ring(640, 170, '#ff2e63', 160);
    return;
  }
  if (mode === 'end') {
    startRun(game);
    game.wave = 6;
    game.kills = 87;
    game.score = 12450;
    game.best = 12450;
    game.newBest = true;
    game.shareText = 'I scored 12,450 in NEON VOID (wave 6) — beat that!';
    game.waveFlash = 0; // no wave flash ghosting behind GAME OVER
    game.hintIndex = 99;
    game.state = 'gameover';
  }
}

let last = performance.now();
let announceTimer = 0;
let shotReady = false;

function frame(now) {
  const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
  last = now;
  const time = now / 1000;

  if (!shotMode) {
    update(game, input, fx, audio, dt);
    if (game.state === 'gameover' && input.consumePressed('KeyC')) {
      try { void navigator.clipboard.writeText(game.shareText); } catch { /* clipboard blocked: share text is still on screen */ }
    }
  } else if (!shotReady) {
    // Screenshot mode: stage once, settle particles, then freeze.
    stageShot(shotMode);
    fx.update(0.4);
    shotReady = true;
    window.__shotReady = true;
  }

  // Wave-start flash + boss banner timers tick down in real play.
  if (game.waveFlash > 0) game.waveFlash -= dt;
  if (game.banner && game.banner.t > 0) game.banner.t -= dt;

  draw(ctx, game, fx, time);
  announceTimer += dt;
  if (announceTimer > 1) { announceTimer = 0; announce(); }
  input.endFrame();
  requestAnimationFrame(frame);
}

if (shotMode) {
  // Screenshot runs must not depend on storage: a fixed best keeps the
  // title and game-over shots identical every time.
  try { localStorage.setItem('neonvoid.best', '9850'); } catch { /* ignore */ }
  game.best = 9850;
}
// Debug handle: lets a play-test read the live state (harmless in play).
window.__game = game;
requestAnimationFrame(frame);

// Keep the tab's best score honest when the player leaves.
window.addEventListener('beforeunload', () => saveBest(game.score));
