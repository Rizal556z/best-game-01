// Emberhold — Lantern Defense: shared constants for the whole game.
// One place for every number the rules, the renderer and the screenshots agree on.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 56;

// The playfield: 16 columns by 10 rows of 64 px cells, with a 256 px sidebar on the right.
export const GRID = { cols: 16, rows: 10, cell: 64, ox: 0, oy: HUD_H };
export const SIDEBAR_X = 1024;
export const SIDEBAR_W = 256;

export const TOTAL_WAVES = 12;
export const START_GOLD = 140;
export const HEART_HP = 20;
export const SELL_RATE = 0.7;
export const MAX_TOWER_LEVEL = 3;

// The winding road the horde walks, as grid cells. The Emberheart lantern stands at the end.
export const PATH_CELLS = [
  [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],
  [5, 3], [5, 4], [5, 5], [5, 6], [5, 7],
  [6, 7], [7, 7], [8, 7], [9, 7], [10, 7],
  [10, 6], [10, 5], [10, 4],
  [11, 4], [12, 4], [13, 4], [14, 4], [15, 4],
];

// The same road as pixel waypoints (cell centres), starting off the left edge.
export const WAYPOINTS = [
  { x: -40, y: 216 }, { x: 352, y: 216 }, { x: 352, y: 536 },
  { x: 672, y: 536 }, { x: 672, y: 344 }, { x: 992, y: 344 },
];
export const HEART_POS = { x: 992, y: 344 };

// Tower kinds. damage/rate/range grow with level; upgradeCost is per level step.
export const TOWERS = {
  ember: {
    key: '1', name: 'Ember Turret', cost: 60, range: 118, damage: 12, rate: 2.4,
    projSpeed: 460, color: '#ff9a3c', glow: '#ffcf7a', slow: 0, splash: 0,
    blurb: 'Fast fire, steady burn',
  },
  frost: {
    key: '2', name: 'Frost Spire', cost: 90, range: 108, damage: 5, rate: 1.1,
    projSpeed: 380, color: '#7fd4ff', glow: '#cfeeff', slow: 0.45, slowDur: 1.5, splash: 0,
    blurb: 'Chills foes, slows the horde',
  },
  spark: {
    key: '3', name: 'Spark Coil', cost: 130, range: 138, damage: 34, rate: 0.75,
    projSpeed: 520, color: '#c9a7ff', glow: '#efe6ff', slow: 0, splash: 58,
    blurb: 'Crackling arcs, splash damage',
  },
};
export const TOWER_ORDER = ['ember', 'frost', 'spark'];

// Enemy kinds. hp is the wave-1 value; waves scale it up.
export const ENEMIES = {
  mite: { hp: 32, speed: 78, reward: 5, leak: 1, score: 10, radius: 10, color: '#ffb347', dark: '#c47b1e' },
  wisp: { hp: 85, speed: 52, reward: 8, leak: 2, score: 20, radius: 13, color: '#9fe8ff', dark: '#3f7d9e' },
  flutter: { hp: 48, speed: 105, reward: 8, leak: 1, score: 15, radius: 11, color: '#ff8fb3', dark: '#a84a68' },
  hulk: { hp: 260, speed: 30, reward: 16, leak: 3, score: 30, radius: 17, color: '#b9c4a8', dark: '#6d7a58' },
  herald: { hp: 1900, speed: 24, reward: 160, leak: 10, score: 300, radius: 26, color: '#c77dff', dark: '#6d3bb0' },
};

/** The horde for wave `n` (1-based): a shuffled list of enemy kinds, boss last on every 4th wave. */
export function buildWave(n, rng) {
  const list = [];
  const push = (kind, count) => { for (let i = 0; i < count; i += 1) list.push(kind); };
  push('mite', 5 + n);
  if (n >= 2) push('wisp', 2 + n);
  if (n >= 3) push('flutter', 1 + Math.floor(n / 2));
  if (n >= 4) push('hulk', Math.floor(n / 2));
  // Fisher-Yates with the seeded rng so the same wave always plays the same.
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = list[i]; list[i] = list[j]; list[j] = tmp;
  }
  if (n % 4 === 0) list.push('herald');
  return list;
}

/** Spawn gap for wave `n`, in seconds. */
export function waveInterval(n) {
  return Math.max(0.45, 0.85 - 0.03 * n);
}

/** Enemy hp multiplier for wave `n`. */
export function waveHpScale(n) {
  return 1 + 0.22 * (n - 1);
}

/** Gold bonus for clearing wave `n`. */
export function waveClearBonus(n) {
  return 25 + 5 * n;
}

/** Cost to raise a tower from `level` to `level + 1`. */
export function upgradeCost(kind, level) {
  return Math.round(TOWERS[kind].cost * 0.9 * level);
}

/** Damage multiplier at a tower level. */
export function levelDamageMul(level) {
  return Math.pow(1.35, level - 1);
}

/** Range bonus at a tower level. */
export function levelRangeBonus(level) {
  return 14 * (level - 1);
}
