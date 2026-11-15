// NEON VOID — tuning constants. One place for every number the game
// balances on, so difficulty and feel can be tuned without touching logic.
export const WORLD = { w: 1280, h: 800 };

export const COLORS = {
  bg: '#05060f',
  grid: '#12142a',
  player: '#37f6ff',
  playerCore: '#e8feff',
  bullet: '#ffe45e',
  chaser: '#ff4d8d',
  shooter: '#ff9f1c',
  splitter: '#4dff88',
  speeder: '#4dc9ff',
  mini: '#7dff9e',
  boss: '#ff2e63',
  bossCore: '#ffd6e7',
  shield: '#37f6ff',
  rapid: '#ffe45e',
  spread: '#ff4dff',
  health: '#4dff88',
  text: '#e8f0ff',
  dim: '#8b93b8',
  danger: '#ff4d5e',
};

export const PLAYER = {
  radius: 16,
  speed: 320,
  hp: 100,
  fireInterval: 0.16,
  bulletSpeed: 720,
  bulletDamage: 12,
  bulletRadius: 5,
  dashSpeed: 980,
  dashTime: 0.18,
  dashCooldown: 2.2,
  invulnTime: 0.9,
  pickupRadius: 70,
};

// The hero: NOVA, a little star-pilot bot with eyes and an engine flame.
export const HERO = { name: 'NOVA', title: 'star-pilot bot' };

// Enemy definitions by type. hp and speed scale with the wave (see world.js).
// Every enemy is a character with a name and a personality, not a shape.
export const ENEMIES = {
  chaser: {
    name: 'CHOMP', blurb: 'hungry chaser',
    radius: 18, hp: 22, speed: 120, damage: 12, score: 100,
    color: COLORS.chaser, shape: 'triangle',
  },
  shooter: {
    name: 'JITTER', blurb: 'nervous sniper',
    radius: 18, hp: 30, speed: 85, damage: 10, score: 150,
    color: COLORS.shooter, shape: 'square', fireInterval: 2.4, bulletSpeed: 260,
  },
  splitter: {
    name: 'BLOBBY', blurb: 'jolly splitter',
    radius: 24, hp: 40, speed: 70, damage: 14, score: 200,
    color: COLORS.splitter, shape: 'hex', splitsInto: 'mini', splitCount: 2,
  },
  mini: {
    name: 'MINI BLOB', blurb: 'blobby offspring',
    radius: 11, hp: 10, speed: 190, damage: 8, score: 50,
    color: COLORS.mini, shape: 'triangle',
  },
  speeder: {
    name: 'ZIP', blurb: 'speedy dart',
    radius: 14, hp: 16, speed: 250, damage: 10, score: 150,
    color: COLORS.speeder, shape: 'dart',
  },
};

export const BOSS = {
  name: 'VOID KING', title: 'VOID KING appears!',
  radius: 64, hp: 900, speed: 55, damage: 20, score: 5000,
  color: COLORS.boss, burstInterval: 2.6, burstCount: 12, bulletSpeed: 210,
  minionInterval: 5, minionMax: 6,
};

// Wave makeup: how many enemies, and how the mix shifts as waves go on.
// Wave 1 stays gentle (5 slow chasers) so a first-time player learns the
// game before the swarm arrives.
export function waveComp(wave) {
  const total = 3 + wave * 2;
  const weights = { chaser: 4, shooter: wave >= 2 ? 2 : 0, splitter: wave >= 3 ? 2 : 0, speeder: wave >= 4 ? 2 : 0 };
  return { total, weights };
}

export const POWERUPS = {
  shield: { color: COLORS.shield, label: 'SHIELD', seconds: 6, chance: 0.25 },
  rapid: { color: COLORS.rapid, label: 'RAPID', seconds: 8, chance: 0.3 },
  spread: { color: COLORS.spread, label: 'SPREAD', seconds: 10, chance: 0.25 },
  health: { color: COLORS.health, label: '+30 HP', chance: 0.2 },
};

export const COMBO_WINDOW = 2.5; // seconds between kills to keep the combo alive
export const COMBO_CAP = 5; // max score multiplier
export const DROP_CHANCE = 0.12; // base power-up drop chance per kill
export const DROP_CHANCE_EARLY = 0.25; // waves 1-2, so new players feel strong fast
