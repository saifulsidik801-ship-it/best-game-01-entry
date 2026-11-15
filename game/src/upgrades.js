// NEON VOID — upgrades. After every cleared wave the player picks 1 of 3
// cards. Each upgrade is one small, readable power gain; together they let
// a run snowball into something silly by wave 8.
export const UPGRADE_POOL = [
  {
    id: 'damage', name: 'HEAVY ROUNDS', icon: '▲', color: '#ffe45e',
    desc: '+35% bullet damage',
    apply: (p) => { p.damageMul *= 1.35; },
  },
  {
    id: 'firerate', name: 'OVERDRIVE', icon: '≫', color: '#ff9f1c',
    desc: '+25% fire rate',
    apply: (p) => { p.fireMul *= 0.8; },
  },
  {
    id: 'speed', name: 'ION THRUSTERS', icon: '»', color: '#4dc9ff',
    desc: '+15% move speed',
    apply: (p) => { p.speedMul *= 1.15; },
  },
  {
    id: 'hull', name: 'REINFORCED HULL', icon: '▣', color: '#4dff88',
    desc: '+25 max HP and heal 25',
    apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  },
  {
    id: 'spread', name: 'SPLIT SHOT', icon: '✦', color: '#ff4dff',
    desc: '+1 bullet per shot',
    apply: (p) => { p.extraBullets += 1; },
  },
  {
    id: 'dash', name: 'PHASE DASH', icon: '↯', color: '#37f6ff',
    desc: 'Dash recharges 40% faster',
    apply: (p) => { p.dashCooldownMul *= 0.6; },
  },
  {
    id: 'magnet', name: 'TRACTOR FIELD', icon: '◎', color: '#c792ff',
    desc: 'Power-ups fly to you',
    apply: (p) => { p.pickupMul *= 2.2; },
  },
  {
    id: 'combo', name: 'CHAIN REACTION', icon: '∞', color: '#ff4d8d',
    desc: 'Combo lasts twice as long',
    apply: (p) => { p.comboMul *= 2; },
  },
  {
    id: 'shieldstart', name: 'AEGIS START', icon: '⛨', color: '#37f6ff',
    desc: 'Start every wave shielded',
    apply: (p) => { p.shieldOnWave = true; },
  },
  {
    id: 'velocity', name: 'RAILGUN', icon: '➤', color: '#ffe45e',
    desc: '+30% bullet speed, +10% damage',
    apply: (p) => { p.bulletSpeedMul *= 1.3; p.damageMul *= 1.1; },
  },
];

// Roll 3 distinct upgrade cards for the between-wave choice.
export function rollUpgrades(rng, count = 3) {
  const pool = [...UPGRADE_POOL];
  const picks = [];
  while (picks.length < count && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}
