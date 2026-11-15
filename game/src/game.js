// Emberhold — Lantern Defense: the game itself. The state machine (title, build,
// wave, victory, defeat), the economy, the input the player gives it, and the
// autopilot the screenshot scenes use to play it on their own.
// DOM-free: main.js wires the sound in; node can import this file to balance-test.
import {
  HEART_HP, HEART_POS, SIDEBAR_W, SIDEBAR_X, SELL_RATE, START_GOLD,
  TOTAL_WAVES, TOWERS, TOWER_ORDER, buildWave, waveClearBonus, waveInterval,
} from './config.js';
import { Enemy } from './enemies.js';
import { mulberry32 } from './random.js';
import { cellAt, cellCentre, isBuildable, isPathCell, makeDecorations, roadWaypoints } from './level.js';
import { Particles } from './particles.js';
import { Tower } from './towers.js';

export const STEP = 1 / 60;

// Sidebar layout, shared by the hit test here and the drawing in render.js.
export const UI = {
  cards: TOWER_ORDER.map((kind, i) => ({ kind, x: SIDEBAR_X + 16, y: 108 + i * 88, w: SIDEBAR_W - 32, h: 76 })),
  sendWave: { x: SIDEBAR_X + 16, y: 392, w: SIDEBAR_W - 32, h: 52 },
  upgrade: { x: SIDEBAR_X + 16, y: 524, w: 106, h: 44 },
  sell: { x: SIDEBAR_X + 134, y: 524, w: 106, h: 44 },
  pause: { x: 1150, y: 10, w: 56, h: 36 },
  mute: { x: 1214, y: 10, w: 56, h: 36 },
};

/** Where the autopilot builds, in order: [after wave, kind, col, row]. */
export const AUTO_PLAN = [
  [0, 'ember', 4, 3], [0, 'ember', 6, 6],
  [1, 'frost', 9, 6], [1, 'ember', 11, 5],
  [2, 'ember', 3, 1], [2, 'spark', 6, 3],
  [3, 'frost', 11, 3], [3, 'ember', 12, 5],
  [4, 'spark', 9, 3], [5, 'ember', 7, 8],
  [6, 'spark', 13, 3], [7, 'frost', 2, 3],
];

const BEST_KEY = 'emberhold-best';

export class Game {
  constructor(seed = 20261115, sfx = null) {
    this.seed = seed;
    this.sfx = sfx;
    this.decorations = makeDecorations(seed);
    this.particles = new Particles(seed + 7);
    this.reset();
  }

  reset() {
    this.state = 'title';
    this.paused = false;
    this.time = 0;
    this.gold = START_GOLD;
    this.score = 0;
    this.kills = 0;
    this.heartHp = HEART_HP;
    this.wave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnGap = 0.8;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles.clear();
    this.selectedBuild = null;
    this.selectedTower = null;
    this.hoverCell = null;
    this.banner = null;
    this.bannerTime = 0;
    this.hint = '';
    this.hintTime = 0;
    this.stats = { earned: 0, leaked: 0, built: 0, upgraded: 0, sold: 0 };
    this.rng = mulberry32(this.seed);
    this.best = this.readBest();
  }

  readBest() {
    try {
      if (typeof localStorage === 'undefined') return 0;
      return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
    } catch {
      return 0;
    }
  }

  saveBest() {
    try {
      if (typeof localStorage === 'undefined') return;
      if (this.score > this.best) {
        this.best = this.score;
        localStorage.setItem(BEST_KEY, String(this.best));
      }
    } catch { /* best score is a nicety, never a crash */ }
  }

  // ---- flow ---------------------------------------------------------------

  startGame() {
    this.reset();
    this.state = 'build';
    this.setHint('Build towers on the meadow, then send wave 1 — Space works too.');
    if (this.sfx) this.sfx.click();
  }

  startWave() {
    if (this.state !== 'build' || this.wave >= TOTAL_WAVES) return false;
    this.wave += 1;
    this.spawnQueue = buildWave(this.wave, this.rng);
    this.spawnGap = waveInterval(this.wave);
    this.spawnTimer = 0.4;
    this.state = 'wave';
    this.selectedBuild = null;
    this.selectedTower = null;
    this.showBanner(`WAVE ${this.wave}`, this.wave % 4 === 0 ? 'The Gloom Herald marches…' : `${this.spawnQueue.length} foes approach the lantern`);
    if (this.sfx) this.sfx.horn();
    return true;
  }

  waveCleared() {
    const bonus = waveClearBonus(this.wave);
    this.gold += bonus;
    this.stats.earned += bonus;
    this.score += bonus * 2;
    this.showBanner(`WAVE ${this.wave} CLEARED`, `+${bonus} gold lantern bonus`);
    if (this.sfx) this.sfx.coin();
    if (this.wave >= TOTAL_WAVES) {
      this.state = 'victory';
      this.saveBest();
      if (this.sfx) this.sfx.win();
    } else {
      this.state = 'build';
    }
  }

  defeat() {
    this.state = 'defeat';
    this.saveBest();
    if (this.sfx) this.sfx.lose();
  }

  showBanner(title, sub) {
    this.banner = { title, sub };
    this.bannerTime = 2.2;
  }

  setHint(text) {
    this.hint = text;
    this.hintTime = 4;
  }

  togglePause() {
    if (this.state !== 'build' && this.state !== 'wave') return;
    this.paused = !this.paused;
    if (this.sfx) this.sfx.click();
  }

  // ---- building ------------------------------------------------------------

  towerAt(col, row) {
    return this.towers.find((t) => t.col === col && t.row === row) || null;
  }

  buildTower(kind, col, row) {
    const def = TOWERS[kind];
    if (!def) return false;
    if (!isBuildable(col, row) || this.towerAt(col, row)) return false;
    if (this.gold < def.cost) {
      this.setHint(`Not enough gold — ${def.name} costs ${def.cost}.`);
      if (this.sfx) this.sfx.error();
      return false;
    }
    const centre = cellCentre(col, row);
    this.gold -= def.cost;
    const tower = new Tower(kind, col, row, centre.x, centre.y);
    this.towers.push(tower);
    this.stats.built += 1;
    this.particles.ring(centre.x, centre.y, def.color, 12);
    if (this.sfx) this.sfx.build();
    return true;
  }

  upgradeSelected() {
    const t = this.selectedTower;
    if (!t || !t.canUpgrade) return false;
    if (this.gold < t.nextUpgradeCost) {
      this.setHint(`Upgrade costs ${t.nextUpgradeCost} gold.`);
      if (this.sfx) this.sfx.error();
      return false;
    }
    this.gold -= t.nextUpgradeCost;
    t.upgrade();
    this.stats.upgraded += 1;
    this.particles.ring(t.x, t.y, '#ffe9a8', 16);
    if (this.sfx) this.sfx.upgrade();
    return true;
  }

  sellSelected() {
    const t = this.selectedTower;
    if (!t) return false;
    const refund = Math.round(t.invested * SELL_RATE);
    this.gold += refund;
    this.towers = this.towers.filter((o) => o !== t);
    this.selectedTower = null;
    this.stats.sold += 1;
    this.setHint(`Sold for ${refund} gold.`);
    if (this.sfx) this.sfx.sell();
    return true;
  }

  // ---- input ---------------------------------------------------------------

  pointIn(rect, x, y) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  handleClick(x, y) {
    if (this.sfx) this.sfx.ensure();
    if (this.pointIn(UI.pause, x, y)) { this.togglePause(); return; }
    if (this.pointIn(UI.mute, x, y)) {
      if (this.sfx) { this.sfx.setMuted(!this.sfx.muted); this.sfx.click(); }
      return;
    }
    if (this.state === 'title') { this.startGame(); return; }
    if (this.state === 'victory' || this.state === 'defeat') { this.startGame(); return; }
    if (this.paused) return;
    for (const card of UI.cards) {
      if (this.pointIn(card, x, y)) {
        this.selectedBuild = this.selectedBuild === card.kind ? null : card.kind;
        this.selectedTower = null;
        if (this.sfx) this.sfx.click();
        return;
      }
    }
    if (this.state === 'build' && this.pointIn(UI.sendWave, x, y)) { this.startWave(); return; }
    if (this.selectedTower) {
      if (this.pointIn(UI.upgrade, x, y)) { this.upgradeSelected(); return; }
      if (this.pointIn(UI.sell, x, y)) { this.sellSelected(); return; }
    }
    const cell = cellAt(x, y);
    if (!cell) { this.selectedTower = null; this.selectedBuild = null; return; }
    const existing = this.towerAt(cell.col, cell.row);
    if (existing) {
      this.selectedTower = existing;
      this.selectedBuild = null;
      if (this.sfx) this.sfx.click();
      return;
    }
    if (this.selectedBuild) {
      if (isPathCell(cell.col, cell.row)) {
        this.setHint('The horde walks there — build on the meadow.');
        if (this.sfx) this.sfx.error();
        return;
      }
      this.buildTower(this.selectedBuild, cell.col, cell.row);
      return;
    }
    this.selectedTower = null;
  }

  handleMouseMove(x, y) {
    this.hoverCell = cellAt(x, y);
  }

  handleKey(key) {
    if (this.sfx) this.sfx.ensure();
    const k = key.toLowerCase();
    if (k === 'm') {
      if (this.sfx) { this.sfx.setMuted(!this.sfx.muted); }
      return;
    }
    if (k === 'p' || k === 'escape' && this.paused) { this.togglePause(); return; }
    if (k === 'escape') { this.selectedTower = null; this.selectedBuild = null; return; }
    if (this.state === 'title' && (k === ' ' || k === 'enter')) { this.startGame(); return; }
    if ((this.state === 'victory' || this.state === 'defeat') && (k === ' ' || k === 'enter' || k === 'r')) { this.startGame(); return; }
    if (k === 'r') { this.startGame(); return; }
    if (this.paused) return;
    if (k === ' ') { this.startWave(); return; }
    if (k === 'u') { this.upgradeSelected(); return; }
    if (k === 'x') { this.sellSelected(); return; }
    for (const kind of TOWER_ORDER) {
      if (TOWERS[kind].key === k) {
        this.selectedBuild = this.selectedBuild === kind ? null : kind;
        this.selectedTower = null;
        if (this.sfx) this.sfx.click();
        return;
      }
    }
  }

  // ---- autopilot (screenshot scenes) ----------------------------------------

  /** Spend gold on the plan, then on upgrades, keeping a small reserve. */
  autoSpend() {
    for (const [afterWave, kind, col, row] of AUTO_PLAN) {
      if (afterWave > this.wave) continue;
      if (this.towerAt(col, row)) continue;
      if (this.gold >= TOWERS[kind].cost) this.buildTower(kind, col, row);
    }
    for (;;) {
      const upgradable = this.towers.filter((t) => t.canUpgrade)
        .sort((a, b) => a.nextUpgradeCost - b.nextUpgradeCost);
      if (upgradable.length === 0) break;
      const cheapest = upgradable[0];
      if (this.gold < cheapest.nextUpgradeCost + 40) break;
      this.gold -= cheapest.nextUpgradeCost;
      cheapest.upgrade();
      this.stats.upgraded += 1;
    }
  }

  // ---- simulation -----------------------------------------------------------

  update(dt) {
    this.time += dt;
    if (this.bannerTime > 0) this.bannerTime -= dt;
    if (this.hintTime > 0) this.hintTime -= dt;
    if (this.paused) return;
    if (this.state === 'title' || this.state === 'victory' || this.state === 'defeat') {
      this.particles.update(dt);
      return;
    }
    if (this.state === 'wave') this.updateSpawning(dt);
    for (const tower of this.towers) tower.update(dt, this.enemies, this.projectiles, this.sfx);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.particles.update(dt);
    if (this.sfx) this.sfx.tickMusic(this.time);
    if (this.state === 'wave' && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.waveCleared();
    }
  }

  updateSpawning(dt) {
    if (this.spawnQueue.length === 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = this.spawnGap;
    const kind = this.spawnQueue.shift();
    this.enemies.push(new Enemy(kind, this.wave, roadWaypoints()));
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (p.update(dt)) {
        const hit = p.land(this.enemies, this.time);
        for (const e of hit) {
          if (e.flash > 0) this.particles.burst(e.x, e.y, p.def.color, 3, 60, 2, 0.3);
          if (e.dead) p.tower.kills += 1;
        }
        if (hit.length > 0 && this.sfx) this.sfx.hit();
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.spent);
  }

  updateEnemies(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const e = this.enemies[i];
      e.update(dt, this.time);
      if (e.dead) {
        this.enemies.splice(i, 1);
        this.gold += e.reward;
        this.score += e.score;
        this.kills += 1;
        this.stats.earned += e.reward;
        this.particles.burst(e.x, e.y, e.def.color, 10, 110, 3, 0.55);
        this.particles.ring(e.x, e.y, e.def.color, 8);
        this.particles.floatText(e.x, e.y - 14, `+${e.reward}g`, '#ffd97a');
        if (this.sfx) this.sfx.pop();
        continue;
      }
      if (e.escaped) {
        this.enemies.splice(i, 1);
        this.heartHp -= e.leak;
        this.stats.leaked += e.leak;
        this.particles.burst(HEART_POS.x, HEART_POS.y, '#ff5a5a', 14, 130, 3, 0.6);
        this.particles.floatText(HEART_POS.x, HEART_POS.y - 30, `-${e.leak} heart`, '#ff7a7a');
        if (this.sfx) this.sfx.leak();
        if (this.heartHp <= 0) {
          this.heartHp = 0;
          this.defeat();
          return;
        }
      }
    }
  }

  /** A small read-only snapshot for the playtest harness and the debug hook. */
  snapshot() {
    return {
      state: this.state,
      paused: this.paused,
      gold: this.gold,
      score: this.score,
      kills: this.kills,
      heartHp: this.heartHp,
      wave: this.wave,
      towers: this.towers.length,
      enemies: this.enemies.length,
      queued: this.spawnQueue.length,
      best: this.best,
    };
  }
}
